'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
}

interface QuickActionsFABProps {
  discordId: string;
  callsign: string;
  incidentId?: string;
  patientLetter?: string;
  enabled?: boolean;
  customActions?: QuickAction[];
}

export default function QuickActionsFAB({
  discordId,
  callsign,
  incidentId,
  patientLetter,
  enabled = true,
  customActions = []
}: QuickActionsFABProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  if (!enabled) return null;

  // Default actions
  const defaultActions: QuickAction[] = [
    {
      id: 'new-record',
      label: 'New Record',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      onClick: () => router.push('/incident?new=true'),
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      id: 'search',
      label: 'Search Records',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      onClick: () => {
        // Trigger search modal or navigate to search page
        const event = new CustomEvent('openSearch');
        window.dispatchEvent(event);
      },
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      id: 'my-records',
      label: 'My Records',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      onClick: () => router.push('/dashboard?filter=my-records'),
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
      onClick: () => router.push('/dashboard'),
      color: 'bg-slate-600 hover:bg-slate-700'
    }
  ];

  // Conditional actions based on context
  const contextActions: QuickAction[] = [];

  if (incidentId) {
    contextActions.push({
      id: 'add-patient',
      label: 'Add Patient',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      onClick: () => {
        // Trigger add patient
        const event = new CustomEvent('addPatient', { detail: { incidentId } });
        window.dispatchEvent(event);
      },
      color: 'bg-cyan-600 hover:bg-cyan-700'
    });

    contextActions.push({
      id: 'share',
      label: 'Share Record',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      ),
      onClick: () => {
        const event = new CustomEvent('shareRecord', { detail: { incidentId, patientLetter } });
        window.dispatchEvent(event);
      },
      color: 'bg-indigo-600 hover:bg-indigo-700'
    });
  }

  const allActions = [...contextActions, ...defaultActions, ...customActions];

  return (
    <div ref={fabRef} className="fixed bottom-6 right-6 z-40">
      {/* Action buttons */}
      <div className={`flex flex-col-reverse items-end gap-3 mb-3 transition-all duration-300 ${
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        {allActions.map((action, index) => (
          <button
            key={action.id}
            onClick={() => {
              action.onClick();
              setIsOpen(false);
            }}
            className={`group flex items-center gap-3 ${action.color || 'bg-slate-600 hover:bg-slate-700'} text-white rounded-full pl-4 pr-4 py-3 shadow-lg transition-all duration-200`}
            style={{
              transitionDelay: isOpen ? `${index * 50}ms` : '0ms'
            }}
          >
            <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
            {action.icon}
          </button>
        ))}
      </div>

      {/* Main FAB button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen ? 'rotate-45 bg-red-600 hover:bg-red-700' : ''
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Keyboard shortcut hint */}
      {!isOpen && (
        <div className="absolute -top-8 right-0 text-xs text-slate-400 bg-slate-800/80 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Press <kbd className="px-1 py-0.5 bg-slate-700 rounded text-xs font-mono">Space</kbd>
        </div>
      )}
    </div>
  );
}
