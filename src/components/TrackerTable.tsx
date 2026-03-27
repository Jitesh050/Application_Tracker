import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { JobApplication } from '../types';
import { Trash2, Search, AlertTriangle, ChevronDown, Check, Building2, Briefcase, Calendar, Activity, FileText } from 'lucide-react';

interface TrackerTableProps {
  applications: JobApplication[];
  onUpdate: (id: string, updates: Partial<JobApplication>) => void;
  onDelete: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  'Applied': 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  'Pending': 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  'Interviewing': 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  'Selected': 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  'Offer': 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  'Rejected': 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
};

function EditableRow({ app, onUpdate, onDelete }: { app: JobApplication, onUpdate: (id: string, updates: Partial<JobApplication>) => void, onDelete: (id: string) => void }) {
  const [localApp, setLocalApp] = useState(app);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0 });
  
  const buttonRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalApp(app);
  }, [app]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (portalRef.current && portalRef.current.contains(event.target as Node)) {
        return;
      }
      setIsStatusOpen(false);
    }
    function handleScroll() {
      setIsStatusOpen(false);
    }
    
    if (isStatusOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleScroll);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isStatusOpen]);

  const openDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
      setIsStatusOpen(true);
    }
  };

  const handleBlur = (field: keyof JobApplication) => {
    if (localApp[field] !== app[field]) {
      if ((field === 'company' || field === 'role' || field === 'dateApplied') && !localApp[field]) {
        setLocalApp(app);
        return;
      }
      onUpdate(app.id, { [field]: localApp[field] });
    }
  };

  return (
    <tr className="hover:bg-gray-50/80 transition-colors group">
      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
        <input 
          type="text" 
          value={localApp.company || ''}
          onChange={(e) => setLocalApp({ ...localApp, company: e.target.value })}
          onBlur={() => handleBlur('company')}
          className="bg-transparent border border-transparent hover:border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-md px-2 py-1.5 -ml-2 text-sm font-semibold text-gray-900 w-full min-w-[120px] transition-all outline-none"
        />
      </td>
      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
        <input 
          type="text" 
          value={localApp.role || ''}
          onChange={(e) => setLocalApp({ ...localApp, role: e.target.value })}
          onBlur={() => handleBlur('role')}
          className="bg-transparent border border-transparent hover:border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-md px-2 py-1.5 -ml-2 text-sm text-gray-600 w-full min-w-[120px] transition-all outline-none"
        />
      </td>
      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
        <input 
          type="date" 
          value={localApp.dateApplied || ''}
          onChange={(e) => setLocalApp({ ...localApp, dateApplied: e.target.value })}
          onBlur={() => handleBlur('dateApplied')}
          className="bg-transparent border border-transparent hover:border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-md px-2 py-1.5 -ml-2 text-sm text-gray-600 transition-all outline-none"
        />
      </td>
      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
        <div 
          ref={buttonRef}
          onClick={openDropdown}
          className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-md px-3 py-1.5 cursor-pointer transition-all border ${STATUS_COLORS[localApp.status] || 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
        >
          {localApp.status || 'Applied'}
          <ChevronDown size={14} className={`transition-transform duration-200 opacity-70 ${isStatusOpen ? 'rotate-180' : ''}`} />
        </div>
        
        {isStatusOpen && createPortal(
          <div 
            ref={portalRef}
            className="absolute z-[9999] w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: dropdownCoords.top, left: dropdownCoords.left }}
          >
            {Object.keys(STATUS_COLORS).map(status => (
              <div
                key={status}
                onClick={() => {
                  const newStatus = status as any;
                  setLocalApp({ ...localApp, status: newStatus });
                  onUpdate(app.id, { status: newStatus });
                  setIsStatusOpen(false);
                }}
                className={`px-2 py-1.5 mx-1.5 my-0.5 text-sm cursor-pointer rounded-md flex items-center justify-between transition-colors ${localApp.status === status ? 'bg-blue-50/80' : 'hover:bg-gray-50'}`}
              >
                <span className={`text-xs font-medium rounded-md px-2.5 py-1 border ${STATUS_COLORS[status].replace(/hover:[^\s]+/g, '')}`}>
                  {status}
                </span>
                {localApp.status === status && <Check size={14} className="text-blue-600 mr-1" />}
              </div>
            ))}
          </div>,
          document.body
        )}
      </td>
      <td className="px-4 sm:px-6 py-3 sm:py-4">
        <textarea 
          value={localApp.notes || ''}
          onChange={(e) => setLocalApp({ ...localApp, notes: e.target.value })}
          onBlur={() => handleBlur('notes')}
          placeholder="Add notes..."
          className="bg-transparent border border-transparent hover:border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-md px-2 py-1.5 -ml-2 text-sm text-gray-600 w-full min-w-[150px] resize-none transition-all outline-none placeholder:text-gray-300"
          rows={1}
        />
      </td>
      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
        <button 
          onClick={() => onDelete(app.id)} 
          className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
          title="Delete application"
        >
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );
}

export function TrackerTable({ applications, onUpdate, onDelete }: TrackerTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredApplications = applications.filter(app => {
    const query = searchQuery.toLowerCase();
    return (
      (app.company && app.company.toLowerCase().includes(query)) ||
      (app.role && app.role.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="relative group max-w-md w-full">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Search applications..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all shadow-sm"
        />
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center gap-2"><Building2 size={14} className="text-gray-400"/> Company</div>
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center gap-2"><Briefcase size={14} className="text-gray-400"/> Role</div>
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center gap-2"><Calendar size={14} className="text-gray-400"/> Date</div>
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center gap-2"><Activity size={14} className="text-gray-400"/> Status</div>
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center gap-2"><FileText size={14} className="text-gray-400"/> Notes</div>
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
              {filteredApplications.map((app) => (
                <EditableRow key={app.id} app={app} onUpdate={onUpdate} onDelete={(id) => setDeletingId(id)} />
              ))}
              {filteredApplications.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 sm:px-6 py-12 sm:py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 border border-gray-100">
                        <Search size={20} className="text-gray-400 sm:w-6 sm:h-6" />
                      </div>
                      <p className="text-sm sm:text-base font-medium text-gray-900 mb-1">No applications found</p>
                      <p className="text-xs sm:text-sm text-gray-500 max-w-xs sm:max-w-sm px-4">
                        {applications.length === 0 
                          ? "Tell the agent about your recent job applications to get started tracking them here!"
                          : "We couldn't find any applications matching your search query. Try adjusting your filters."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {deletingId && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Application</h3>
                <p className="text-sm text-gray-500 mt-1">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-8">
              <button 
                onClick={() => setDeletingId(null)} 
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  onDelete(deletingId);
                  setDeletingId(null);
                }} 
                className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
              >
                Yes, delete it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
