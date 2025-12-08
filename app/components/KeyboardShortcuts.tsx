'use client';

import React, { useState, useEffect, useCallback } from 'react';

export interface ShortcutAction {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  action: () => void;
  category?: string;
}

interface KeyboardShortcutsProps {
  shortcuts: ShortcutAction[];
  enabled?: boolean;
  onOpenHelp?: () => void;
}

// Help modal for displaying all shortcuts
export function ShortcutsHelpModal({ 
  shortcuts, 
  onClose 
}: { 
  shortcuts: ShortcutAction[]; 
  onClose: () => void 
}) {
  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutAction[]>);

  const formatShortcut = (shortcut: ShortcutAction) => {
    const keys: string[] = [];
    if (shortcut.ctrlKey) keys.push('Ctrl');
    if (shortcut.shiftKey) keys.push('Shift');
    if (shortcut.altKey) keys.push('Alt');
    keys.push(shortcut.key.toUpperCase());
    return keys.join(' + ');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-sm font-medium text-slate-400 mb-3">{category}</h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between py-2 px-3 bg-slate-700/30 rounded-lg"
                  >
                    <span className="text-slate-200">{shortcut.description}</span>
                    <kbd className="px-2 py-1 bg-slate-700 text-slate-300 text-sm font-mono rounded border border-slate-600">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-700 text-center text-sm text-slate-400">
          Press <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs font-mono">Ctrl + /</kbd> anytime to open this help
        </div>
      </div>
    </div>
  );
}

export default function KeyboardShortcuts({
  shortcuts,
  enabled = true,
  onOpenHelp
}: KeyboardShortcutsProps) {
  const [showHelp, setShowHelp] = useState(false);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    const isInputField = 
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.tagName === 'SELECT' ||
      target.isContentEditable;

    // Allow Escape in input fields
    if (isInputField && e.key !== 'Escape') return;

    // Check for help shortcut (Ctrl + /)
    if (e.ctrlKey && e.key === '/') {
      e.preventDefault();
      setShowHelp(true);
      onOpenHelp?.();
      return;
    }

    // Check all registered shortcuts
    for (const shortcut of shortcuts) {
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrlKey === e.ctrlKey;
      const shiftMatch = !!shortcut.shiftKey === e.shiftKey;
      const altMatch = !!shortcut.altKey === e.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        e.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [enabled, shortcuts, onOpenHelp]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  return (
    <>
      {showHelp && (
        <ShortcutsHelpModal 
          shortcuts={shortcuts} 
          onClose={() => setShowHelp(false)} 
        />
      )}
    </>
  );
}

// Default shortcuts for the ePRF application
export function useDefaultShortcuts({
  onSave,
  onSearch,
  onNewRecord,
  onHistory,
  onDashboard,
  onCloseModal
}: {
  onSave?: () => void;
  onSearch?: () => void;
  onNewRecord?: () => void;
  onHistory?: () => void;
  onDashboard?: () => void;
  onCloseModal?: () => void;
}): ShortcutAction[] {
  return [
    // Navigation
    {
      key: 'k',
      ctrlKey: true,
      description: 'Open search',
      action: () => onSearch?.(),
      category: 'Navigation'
    },
    {
      key: 'n',
      ctrlKey: true,
      description: 'Create new record',
      action: () => onNewRecord?.(),
      category: 'Navigation'
    },
    {
      key: 'd',
      ctrlKey: true,
      shiftKey: true,
      description: 'Go to dashboard',
      action: () => onDashboard?.(),
      category: 'Navigation'
    },

    // Actions
    {
      key: 's',
      ctrlKey: true,
      description: 'Save current form',
      action: () => onSave?.(),
      category: 'Actions'
    },
    {
      key: 'h',
      ctrlKey: true,
      description: 'Open version history',
      action: () => onHistory?.(),
      category: 'Actions'
    },

    // General
    {
      key: 'Escape',
      description: 'Close modal/dialog',
      action: () => onCloseModal?.(),
      category: 'General'
    }
  ];
}
