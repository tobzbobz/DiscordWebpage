'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  subscribeToRealtimeEvents, 
  sendCursorUpdate,
  sendPresenceUpdate
} from '../utils/apiClient';

interface CursorData {
  discordId: string;
  callsign: string;
  fieldName: string;
  cursorColor: string;
  lastUpdate: number;
}

interface CursorOverlayProps {
  discordId: string;
  callsign: string;
  incidentId: string;
  patientLetter?: string;
  enabled?: boolean;
}

// Generate a consistent color based on discord ID
function getColorFromId(id: string): string {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f59e0b', // amber
  ];
  
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash;
  }
  
  return colors[Math.abs(hash) % colors.length];
}

export default function CursorOverlay({ 
  discordId, 
  callsign, 
  incidentId, 
  patientLetter = '',
  enabled = true 
}: CursorOverlayProps) {
  const [cursors, setCursors] = useState<Map<string, CursorData>>(new Map());
  const [activeField, setActiveField] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const cursorColor = useRef(getColorFromId(discordId));
  const lastSentField = useRef<string | null>(null);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup stale cursors every 5 seconds
  useEffect(() => {
    cleanupIntervalRef.current = setInterval(() => {
      const now = Date.now();
      setCursors(prev => {
        const newMap = new Map(prev);
        Array.from(newMap.entries()).forEach(([key, cursor]) => {
          // Remove cursors that haven't been updated in 5 seconds
          if (now - cursor.lastUpdate > 5000) {
            newMap.delete(key);
          }
        });
        return newMap;
      });
    }, 5000);

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, []);

  // Subscribe to cursor updates
  useEffect(() => {
    if (!enabled) return;

    const eventSource = subscribeToRealtimeEvents(
      discordId,
      ['cursors', 'presence'],
      incidentId,
      (event) => {
        if (event.type === 'cursor') {
          const { discordId: cursorUserId, callsign: cursorCallsign, fieldName, cursorColor: color, patientLetter: cursorPatient } = event.payload;
          
          // Ignore our own cursor updates
          if (cursorUserId === discordId) return;
          
          // Only show cursors for the same patient section
          if (cursorPatient !== patientLetter) return;
          
          setCursors(prev => {
            const newMap = new Map(prev);
            if (fieldName) {
              newMap.set(cursorUserId, {
                discordId: cursorUserId,
                callsign: cursorCallsign || 'User',
                fieldName,
                cursorColor: color || getColorFromId(cursorUserId),
                lastUpdate: Date.now()
              });
            } else {
              // User left the field
              newMap.delete(cursorUserId);
            }
            return newMap;
          });
        } else if (event.type === 'presence') {
          const { discordId: userId, status } = event.payload;
          
          if (userId === discordId) return;
          
          if (status === 'left') {
            setCursors(prev => {
              const newMap = new Map(prev);
              newMap.delete(userId);
              return newMap;
            });
          }
        }
      },
      (error) => {
        console.error('Cursor SSE error:', error);
      }
    );

    eventSourceRef.current = eventSource;

    // Send presence update when joining
    sendPresenceUpdate(discordId, callsign, incidentId, patientLetter, 'active');

    return () => {
      eventSource?.close();
      // Send presence update when leaving
      sendPresenceUpdate(discordId, callsign, incidentId, patientLetter, 'left');
    };
  }, [discordId, callsign, incidentId, patientLetter, enabled]);

  // Track focus changes on form fields
  useEffect(() => {
    if (!enabled) return;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const fieldName = target.getAttribute('name') || target.getAttribute('id') || target.getAttribute('data-field');
      
      if (fieldName && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        setActiveField(fieldName);
        
        // Only send if different from last sent
        if (fieldName !== lastSentField.current) {
          lastSentField.current = fieldName;
          sendCursorUpdate(discordId, callsign, {
            incidentId,
            patientLetter,
            fieldName,
            cursorColor: cursorColor.current
          });
        }
      }
    };

    const handleBlur = (e: FocusEvent) => {
      setActiveField(null);
      lastSentField.current = null;
      
      // Send cursor removal
      sendCursorUpdate(discordId, callsign, {
        incidentId,
        patientLetter,
        fieldName: ''
      });
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, [discordId, callsign, incidentId, patientLetter, enabled]);

  // Render cursor indicators next to form fields
  useEffect(() => {
    if (!enabled) return;

    // Find all form fields and add cursor indicators
    const updateCursorIndicators = () => {
      // Remove all existing indicators
      document.querySelectorAll('.cursor-indicator').forEach(el => el.remove());

      // Add indicators for each cursor
      cursors.forEach((cursor, userId) => {
        const field = document.querySelector(`[name="${cursor.fieldName}"], [id="${cursor.fieldName}"], [data-field="${cursor.fieldName}"]`);
        
        if (field) {
          const rect = field.getBoundingClientRect();
          const indicator = document.createElement('div');
          indicator.className = 'cursor-indicator';
          indicator.style.cssText = `
            position: fixed;
            top: ${rect.top - 24}px;
            left: ${rect.left}px;
            background: ${cursor.cursorColor};
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            z-index: 9999;
            pointer-events: none;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            animation: cursorFadeIn 0.2s ease-out;
            display: flex;
            align-items: center;
            gap: 4px;
          `;
          indicator.innerHTML = `
            <span style="width: 6px; height: 6px; background: white; border-radius: 50%; animation: cursorPulse 1s infinite;"></span>
            ${cursor.callsign}
          `;
          document.body.appendChild(indicator);

          // Add border to the field
          const prevBorder = (field as HTMLElement).style.border;
          const prevBoxShadow = (field as HTMLElement).style.boxShadow;
          (field as HTMLElement).style.border = `2px solid ${cursor.cursorColor}`;
          (field as HTMLElement).style.boxShadow = `0 0 0 2px ${cursor.cursorColor}33`;
          
          // Store original styles to restore later
          (field as any).__cursorOriginalBorder = prevBorder;
          (field as any).__cursorOriginalBoxShadow = prevBoxShadow;
        }
      });
    };

    updateCursorIndicators();

    // Update on scroll/resize
    const handleScroll = () => updateCursorIndicators();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
      // Clean up indicators
      document.querySelectorAll('.cursor-indicator').forEach(el => el.remove());
      // Restore original field styles
      document.querySelectorAll('[name], [id], [data-field]').forEach(field => {
        if ((field as any).__cursorOriginalBorder !== undefined) {
          (field as HTMLElement).style.border = (field as any).__cursorOriginalBorder;
          (field as HTMLElement).style.boxShadow = (field as any).__cursorOriginalBoxShadow;
        }
      });
    };
  }, [cursors, enabled]);

  // Add CSS keyframes for animations
  useEffect(() => {
    if (!enabled) return;

    const styleId = 'cursor-overlay-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes cursorFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cursorPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      const style = document.getElementById(styleId);
      if (style) style.remove();
    };
  }, [enabled]);

  if (!enabled) return null;

  // Render presence indicator
  return (
    <div className="fixed bottom-20 left-4 z-40">
      {cursors.size > 0 && (
        <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-xs text-slate-400 mb-2">Collaborators editing:</p>
          <div className="flex flex-wrap gap-2">
            {Array.from(cursors.values()).map((cursor) => (
              <div
                key={cursor.discordId}
                className="flex items-center gap-2 px-2 py-1 rounded-full text-xs text-white"
                style={{ backgroundColor: cursor.cursorColor }}
              >
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                {cursor.callsign}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
