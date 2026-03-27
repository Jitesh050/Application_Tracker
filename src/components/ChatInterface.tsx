import React, { useRef, useEffect, useState } from 'react';
import { Send, Bot, User, Loader2, ImagePlus, X } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatInterfaceProps {
  chatHistory: ChatMessage[];
  inputText: string;
  setInputText: (text: string) => void;
  onSendMessage: (file: File | null) => void;
  isLoading: boolean;
}

export function ChatInterface({ chatHistory, inputText, setInputText, onSendMessage, isLoading }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB limit to fit within Firestore 1MB doc limit when base64 encoded
        setFileError('Image must be less than 500KB');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFileError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = () => {
    if (!inputText.trim() && !selectedFile) return;
    onSendMessage(selectedFile);
    clearFile();
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200">
      <div className="p-4 bg-white border-b border-gray-200 flex items-center gap-2">
        <Bot className="text-blue-600" />
        <h2 className="font-semibold text-gray-800">Tracker Agent</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            <p>Hi! I'm your job tracking assistant.</p>
            <p className="text-sm mt-2">Try saying: "I applied to Google today for a Frontend Engineer role."</p>
          </div>
        )}
        {chatHistory.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'}`}>
              {msg.imageUrl && (
                <img src={msg.imageUrl} alt="Uploaded" className="max-w-full h-auto rounded-lg mb-2 max-h-48 object-contain bg-white/10" />
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-2 flex items-center">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-200">
        {fileError && (
          <div className="mb-2 text-xs text-red-500 bg-red-50 p-2 rounded-md border border-red-100">
            {fileError}
          </div>
        )}
        {previewUrl && (
          <div className="mb-3 relative inline-block">
            <img src={previewUrl} alt="Preview" className="h-20 w-auto rounded-lg border border-gray-200 object-cover" />
            <button
              onClick={clearFile}
              className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 hover:bg-gray-700 transition-colors shadow-sm"
            >
              <X size={12} />
            </button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 shrink-0 mb-0.5"
            title="Upload image"
          >
            <ImagePlus size={20} />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Tell me about an application or upload an email..."
            className="flex-1 rounded-2xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || (!inputText.trim() && !selectedFile)}
            className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 mb-0.5"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
