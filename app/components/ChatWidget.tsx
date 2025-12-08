'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  subscribeToRealtimeEvents,
  sendChatMessage,
  sendTypingIndicator,
  getChatHistory,
  type ChatMessage
} from '../utils/apiClient';

interface ChatWidgetProps {
  discordId: string;
  callsign: string;
  incidentId: string;
  patientLetter?: string;
  chatType?: 'incident' | 'patient';
  collaborators?: { discordId: string; callsign: string }[];
  onUnreadChange?: (count: number) => void;
  isOpen?: boolean;
}

interface TypingUser {
  callsign: string;
  timestamp: number;
}

export default function ChatWidget({
  discordId,
  callsign,
  incidentId,
  patientLetter = '',
  chatType = 'incident',
  collaborators = [],
  onUnreadChange,
  isOpen: externalIsOpen = false
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(externalIsOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load chat history
  const loadHistory = useCallback(async () => {
    const history = await getChatHistory(discordId, incidentId, chatType, patientLetter);
    setMessages(history);
  }, [discordId, incidentId, chatType, patientLetter]);

  // Initial load
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Subscribe to chat events
  useEffect(() => {
    const eventSource = subscribeToRealtimeEvents(
      discordId,
      ['chat'],
      incidentId,
      (event) => {
        if (event.type === 'chat') {
          const { senderDiscordId, patientLetter: msgPatient, chatType: msgChatType, message: msgContent, senderCallsign, createdAt, mentions } = event.payload;
          
          // Only show messages for the same chat context
          if (msgChatType !== chatType) return;
          if (chatType === 'patient' && msgPatient !== patientLetter) return;

          const newMsg: ChatMessage = {
            incidentId,
            patientLetter: msgPatient,
            chatType: msgChatType,
            senderDiscordId,
            senderCallsign,
            message: msgContent,
            mentions,
            createdAt
          };

          setMessages(prev => [...prev, newMsg]);
          
          // Increment unread if chat is closed or minimized
          if (!isOpen || isMinimized) {
            setUnreadCount(prev => prev + 1);
          }
          
          // Remove typing indicator for this user
          setTypingUsers(prev => {
            const newMap = new Map(prev);
            newMap.delete(senderDiscordId);
            return newMap;
          });

          scrollToBottom();
        } else if (event.type === 'typing') {
          const { discordId: typingUserId, callsign: typingCallsign, isTyping, patientLetter: typingPatient } = event.payload;
          
          if (typingUserId === discordId) return;
          if (chatType === 'patient' && typingPatient !== patientLetter) return;

          setTypingUsers(prev => {
            const newMap = new Map(prev);
            if (isTyping) {
              newMap.set(typingUserId, { callsign: typingCallsign, timestamp: Date.now() });
            } else {
              newMap.delete(typingUserId);
            }
            return newMap;
          });
        }
      },
      (error) => {
        console.error('Chat SSE error:', error);
      }
    );

    eventSourceRef.current = eventSource;

    return () => {
      eventSource?.close();
    };
  }, [discordId, incidentId, chatType, patientLetter, isOpen, isMinimized]);

  // Clean up stale typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        const entries = Array.from(newMap);
        entries.forEach(([id, user]) => {
          if (now - user.timestamp > 3000) {
            newMap.delete(id);
          }
        });
        return newMap;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  // Reset unread when opening, and notify parent
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setUnreadCount(0);
      if (onUnreadChange) onUnreadChange(0);
    }
  }, [isOpen, isMinimized, onUnreadChange]);
  // Notify parent of unread count
  useEffect(() => {
    if (onUnreadChange) onUnreadChange(unreadCount);
  }, [unreadCount, onUnreadChange]);
  // Sync external open state
  useEffect(() => {
    setIsOpen(externalIsOpen);
  }, [externalIsOpen]);

  // Handle typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    // Check for @ mention trigger
    const atIndex = value.lastIndexOf('@');
    if (atIndex !== -1) {
      const textAfterAt = value.slice(atIndex + 1);
      if (!textAfterAt.includes(' ')) {
        setShowMentions(true);
        setMentionFilter(textAfterAt.toLowerCase());
        setMentionIndex(0);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }

    // Send typing indicator (throttled)
    const now = Date.now();
    if (now - lastTypingRef.current > 2000) {
      lastTypingRef.current = now;
      sendTypingIndicator(discordId, callsign, incidentId, patientLetter, true);
    }

    // Clear typing after 3s of no input
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(discordId, callsign, incidentId, patientLetter, false);
    }, 3000);
  };

  // Insert mention
  const insertMention = (mentionCallsign: string) => {
    const atIndex = newMessage.lastIndexOf('@');
    if (atIndex !== -1) {
      const newValue = newMessage.slice(0, atIndex) + '@' + mentionCallsign + ' ';
      setNewMessage(newValue);
      setShowMentions(false);
      inputRef.current?.focus();
    }
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions) {
      const filteredCollaborators = collaborators.filter(c => 
        c.callsign.toLowerCase().includes(mentionFilter)
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredCollaborators.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredCollaborators.length) % filteredCollaborators.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredCollaborators[mentionIndex]) {
          insertMention(filteredCollaborators[mentionIndex].callsign);
        }
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim()) return;

    // Extract mentions from message
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(newMessage)) !== null) {
      const mentionedCallsign = match[1];
      const collaborator = collaborators.find(c => 
        c.callsign.toLowerCase() === mentionedCallsign.toLowerCase()
      );
      if (collaborator) {
        mentions.push(collaborator.discordId);
      }
    }

    const result = await sendChatMessage(discordId, callsign, {
      incidentId,
      patientLetter,
      chatType,
      senderDiscordId: discordId,
      senderCallsign: callsign,
      message: newMessage,
      mentions
    });

    if (result.success) {
      setNewMessage('');
      // Stop typing indicator
      sendTypingIndicator(discordId, callsign, incidentId, patientLetter, false);
    }
  };

  // Format timestamp
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Highlight mentions in message
  const renderMessage = (message: string) => {
    const parts = message.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const mentionCallsign = part.slice(1);
        const isSelf = mentionCallsign.toLowerCase() === callsign.toLowerCase();
        return (
          <span
            key={i}
            className={`font-semibold ${isSelf ? 'bg-yellow-500/30 text-yellow-300' : 'text-blue-400'}`}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Filtered collaborators for mention dropdown
  const filteredCollaborators = collaborators.filter(c =>
    c.callsign.toLowerCase().includes(mentionFilter) && c.discordId !== discordId
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg z-50 transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${isMinimized ? 'w-72' : 'w-96'}`}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div 
          className="bg-slate-900 p-3 flex items-center justify-between cursor-pointer"
          onClick={() => setIsMinimized(!isMinimized)}
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-white font-medium">
              {chatType === 'patient' ? `Patient ${patientLetter} Chat` : 'Incident Chat'}
            </span>
            {unreadCount > 0 && isMinimized && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
              className="text-slate-400 hover:text-white"
            >
              {isMinimized ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              className="text-slate-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        {!isMinimized && (
          <>
            <div className="h-80 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  <p>No messages yet</p>
                  <p className="text-sm">Start a conversation with your collaborators</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isSelf = msg.senderDiscordId === discordId;
                  return (
                    <div
                      key={i}
                      className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          isSelf
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-100'
                        }`}
                      >
                        {!isSelf && (
                          <p className="text-xs font-semibold text-blue-400 mb-1">
                            {msg.senderCallsign}
                          </p>
                        )}
                        <p className="text-sm break-words">{renderMessage(msg.message)}</p>
                        <p className={`text-xs mt-1 ${isSelf ? 'text-blue-200' : 'text-slate-400'}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing indicator */}
            {typingUsers.size > 0 && (
              <div className="px-4 py-1 text-xs text-slate-400">
                {Array.from(typingUsers.values()).map(u => u.callsign).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-slate-700 relative">
              {/* Mention dropdown */}
              {showMentions && filteredCollaborators.length > 0 && (
                <div className="absolute bottom-full left-3 right-3 mb-1 bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-lg">
                  {filteredCollaborators.slice(0, 5).map((collab, i) => (
                    <button
                      key={collab.discordId}
                      onClick={() => insertMention(collab.callsign)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 ${
                        i === mentionIndex ? 'bg-slate-700' : ''
                      }`}
                    >
                      <span className="text-blue-400">@</span>
                      <span className="text-white">{collab.callsign}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message... (@mention)"
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
