/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { JobApplication, ChatMessage } from './types';
import { processUserMessage } from './lib/gemini';
import { ChatInterface } from './components/ChatInterface';
import { TrackerTable } from './components/TrackerTable';
import { Briefcase, Download, LogOut, LogIn, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { auth, db, signIn, logOut } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc, query, orderBy, getDocFromServer } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
          <pre className="bg-gray-100 p-4 rounded text-left overflow-auto text-sm">
            {this.state.error?.message}
          </pre>
          <button onClick={() => window.location.reload()} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'tracker'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const appsPath = `users/${user.uid}/applications`;
    const qApps = query(collection(db, appsPath));
    const unsubApps = onSnapshot(qApps, (snapshot) => {
      const apps: JobApplication[] = [];
      snapshot.forEach(doc => apps.push({ id: doc.id, ...doc.data() } as JobApplication));
      setApplications(apps);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, appsPath);
    });

    const chatsPath = `users/${user.uid}/chats`;
    const qChats = query(collection(db, chatsPath), orderBy('timestamp', 'asc'));
    const unsubChats = onSnapshot(qChats, (snapshot) => {
      const chats: ChatMessage[] = [];
      snapshot.forEach(doc => chats.push({ id: doc.id, ...doc.data() } as ChatMessage));
      setChatHistory(chats);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, chatsPath);
    });

    return () => {
      unsubApps();
      unsubChats();
    };
  }, [user, isAuthReady]);

  const handleSendMessage = async (file: File | null = null) => {
    if ((!inputText.trim() && !file) || !user) return;

    let base64Image = '';
    let mimeType = '';
    let imageUrl = '';

    if (file) {
      mimeType = file.type;
      const result = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      imageUrl = result;
      base64Image = result.split(',')[1];
    }

    const msgId = crypto.randomUUID();
    const newUserMsg: ChatMessage = {
      id: msgId,
      role: 'user',
      text: inputText || 'Uploaded an image.',
      timestamp: Date.now(),
      ...(imageUrl && { imageUrl })
    };

    setInputText('');
    setIsLoading(true);

    try {
      await setDoc(doc(db, `users/${user.uid}/chats`, msgId), {
        role: newUserMsg.role,
        text: newUserMsg.text,
        timestamp: newUserMsg.timestamp,
        ...(imageUrl && { imageUrl })
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/chats`);
    }

    try {
      const contents = chatHistory.map(msg => {
        const parts: any[] = [{ text: msg.text }];
        if (msg.imageUrl) {
          parts.push({
            inlineData: {
              data: msg.imageUrl.split(',')[1],
              mimeType: msg.imageUrl.split(';')[0].split(':')[1]
            }
          });
        }
        return {
          role: msg.role === 'user' ? 'user' : 'model',
          parts
        };
      });
      
      const currentParts: any[] = [];
      if (inputText) {
        currentParts.push({ text: inputText });
      } else if (file) {
        currentParts.push({ text: 'Extract job application details from this image.' });
      }
      
      if (base64Image) {
        currentParts.push({
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        });
      }
      
      contents.push({ role: 'user', parts: currentParts });
      
      const response = await processUserMessage(contents);
      let responseText = response.text || '';
      
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          if (call.name === 'addJobApplication') {
            const args = call.args as any;
            const appId = crypto.randomUUID();
            const newApp = {
              company: args.company,
              role: args.role,
              dateApplied: args.dateApplied || new Date().toISOString().split('T')[0],
              status: args.status || 'Applied',
              notes: args.notes || ''
            };
            try {
              await setDoc(doc(db, `users/${user.uid}/applications`, appId), newApp);
            } catch (error) {
              handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/applications`);
            }
            if (!responseText) responseText = `I've added your application to ${args.company} for the ${args.role} role.`;
          } else if (call.name === 'updateJobApplication') {
            const args = call.args as any;
            const appToUpdate = applications.find(a => a.company.toLowerCase().includes(args.company.toLowerCase()));
            if (appToUpdate) {
              const updates: any = {};
              if (args.status) updates.status = args.status;
              if (args.notes) updates.notes = appToUpdate.notes ? appToUpdate.notes + '\n' + args.notes : args.notes;
              
              try {
                await updateDoc(doc(db, `users/${user.uid}/applications`, appToUpdate.id), updates);
              } catch (error) {
                handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/applications/${appToUpdate.id}`);
              }
            }
            if (!responseText) responseText = `I've updated your application for ${args.company}.`;
          }
        }
      }

      if (!responseText) {
        responseText = "I've processed that for you.";
      }

      const modelMsgId = crypto.randomUUID();
      try {
        await setDoc(doc(db, `users/${user.uid}/chats`, modelMsgId), {
          role: 'model',
          text: responseText,
          timestamp: Date.now()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/chats`);
      }

    } catch (error) {
      console.error("Error processing message:", error);
      const errorMsgId = crypto.randomUUID();
      try {
        await setDoc(doc(db, `users/${user.uid}/chats`, errorMsgId), {
          role: 'model',
          text: "Sorry, I encountered an error processing your request.",
          timestamp: Date.now()
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/chats`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateApp = async (id: string, updates: Partial<JobApplication>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/applications`, id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/applications/${id}`);
    }
  };

  const handleDeleteApp = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/applications`, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/applications/${id}`);
    }
  };

  const exportToCSV = () => {
    const headers = ['Company', 'Role', 'Date Applied', 'Status', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...applications.map(app => 
        [
          `"${app.company.replace(/"/g, '""')}"`,
          `"${app.role.replace(/"/g, '""')}"`,
          `"${app.dateApplied}"`,
          `"${app.status}"`,
          `"${app.notes?.replace(/"/g, '""') || ''}"`
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'job_applications.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthReady) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-md text-center max-w-md w-full">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase size={32} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Job Tracker</h1>
          <p className="text-gray-600 mb-8">Sign in to sync your job applications across devices using Firebase.</p>
          <button 
            onClick={signIn}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            <LogIn size={20} />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-gray-100 font-sans overflow-hidden">
      {/* Mobile Navigation */}
      <div className="md:hidden flex border-b border-gray-200 bg-white z-20 shrink-0">
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${activeTab === 'chat' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
        >
          Chat Assistant
        </button>
        <button 
          onClick={() => setActiveTab('tracker')}
          className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${activeTab === 'tracker' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
        >
          Tracker Table
        </button>
      </div>

      {/* Left Pane: Chat */}
      <div className={`${activeTab === 'chat' ? 'flex' : 'hidden'} ${isSidebarOpen ? 'md:flex' : 'md:hidden'} w-full md:w-1/3 lg:w-1/4 flex-1 md:h-full md:flex-shrink-0 z-10 shadow-lg flex-col bg-white transition-all duration-300`}>
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <img src={user.photoURL || ''} alt="Profile" className="w-8 h-8 rounded-full bg-gray-200" />
            <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">{user.displayName}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsSidebarOpen(false)} className="hidden md:flex text-gray-500 hover:text-gray-700 transition-colors p-1.5 rounded-md hover:bg-gray-100" title="Collapse Sidebar">
              <PanelLeftClose size={18} />
            </button>
            <button onClick={logOut} className="md:hidden text-gray-500 hover:text-red-600 transition-colors p-1.5 rounded-md hover:bg-red-50" title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatInterface 
            chatHistory={chatHistory}
            inputText={inputText}
            setInputText={setInputText}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Right Pane: Tracker */}
      <div className={`${activeTab === 'tracker' ? 'block' : 'hidden'} md:block flex-1 md:h-full overflow-y-auto p-4 md:p-6 lg:p-8 transition-all duration-300`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div className="flex items-center gap-3">
              {!isSidebarOpen && (
                <button 
                  onClick={() => setIsSidebarOpen(true)} 
                  className="hidden md:flex items-center justify-center p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-700 rounded-lg transition-colors mr-1"
                  title="Expand Sidebar"
                >
                  <PanelLeftOpen size={20} />
                </button>
              )}
              <div className="bg-blue-600 p-2 rounded-lg text-white shrink-0">
                <Briefcase size={24} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Application Tracker</h1>
                <p className="text-xs sm:text-sm text-gray-500">Manage and track your job applications</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={exportToCSV}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm shrink-0"
              >
                <Download size={16} />
                Export CSV
              </button>
              <button 
                onClick={logOut}
                className="hidden md:flex items-center justify-center gap-2 bg-white border border-gray-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors shadow-sm shrink-0"
                title="Sign out"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>

          <TrackerTable 
            applications={applications}
            onUpdate={handleUpdateApp}
            onDelete={handleDeleteApp}
          />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

