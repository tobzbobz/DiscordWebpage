'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getExtendedNotifications, 
  getExtendedUnreadCount, 
  markExtendedNotificationRead, 
  markAllExtendedNotificationsRead,
  deleteExtendedNotification,
  clearAllExtendedNotifications,
  subscribeToRealtimeEvents,
  type ExtendedNotification 
} from '../utils/apiClient';

interface NotificationCenterProps {
  discordId: string;
  callsign: string;
}

export default function NotificationCenter({ discordId, callsign }: NotificationCenterProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ExtendedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        getExtendedNotifications(discordId, filter === 'unread'),
        getExtendedUnreadCount(discordId)
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
    setLoading(false);
  }, [discordId, filter]);

  // Initial load
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe to real-time notifications
  useEffect(() => {
    const eventSource = subscribeToRealtimeEvents(
      discordId,
      ['notifications'],
      undefined,
      (event) => {
        if (event.type === 'notification') {
          setNotifications(prev => [event.payload, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      },
      (error) => {
        console.error('SSE error:', error);
      }
    );

    eventSourceRef.current = eventSource;

    return () => {
      eventSource?.close();
    };
  }, [discordId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: ExtendedNotification) => {
    if (!notification.isRead && notification.id) {
      await markExtendedNotificationRead(discordId, notification.id);
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    if (notification.link) {
      router.push(notification.link);
      setIsOpen(false);
    } else if (notification.incidentId) {
      const path = notification.patientLetter 
        ? `/incident?id=${notification.incidentId}&patient=${notification.patientLetter}`
        : `/incident?id=${notification.incidentId}`;
      router.push(path);
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllExtendedNotificationsRead(discordId);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation();
    const deletedNotif = notifications.find(n => n.id === notificationId);
    await deleteExtendedNotification(discordId, notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (deletedNotif && !deletedNotif.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all notifications?')) {
      await clearAllExtendedNotifications(discordId);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention': return '📢';
      case 'access_request': return '🔑';
      case 'collaborator_added': return '👥';
      case 'record_updated': return '📝';
      case 'broadcast': return '📣';
      case 'kick': return '🚫';
      case 'announcement': return '📌';
      default: return '🔔';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <div className="notification-wrapper" ref={dropdownRef}>
        {/* Bell Icon Button */}
        <button
          className="notification-bell"
          onClick={() => setIsOpen(!isOpen)}
          title="Notifications"
        >
          🔔
          {unreadCount > 0 && (
            <span className="notification-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Popup Modal */}
        {isOpen && (
          <div className="notification-popup">
            <div className="notification-header">
              <span>Notifications</span>
              <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
            </div>
            
            <div className="notification-toolbar">
              <div className="filter-tabs">
                <button
                  className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  All
                </button>
                <button
                  className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
                  onClick={() => setFilter('unread')}
                >
                  Unread ({unreadCount})
                </button>
              </div>
              <div className="toolbar-actions">
                <button
                  className="toolbar-btn"
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                >
                  Mark all read
                </button>
                <button
                  className="toolbar-btn danger"
                  onClick={handleClearAll}
                  disabled={notifications.length === 0}
                >
                  Clear all
                </button>
              </div>
            </div>

            <div className="notification-list">
              {loading ? (
                <div className="empty-state">
                  <div className="loading-spinner"></div>
                  <p>Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-icon">🔔</p>
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <span className="notif-icon">{getNotificationIcon(notification.type)}</span>
                    <div className="notif-content">
                      {notification.title && (
                        <p className="notif-title">{notification.title}</p>
                      )}
                      <p className="notif-message">{notification.message}</p>
                      <div className="notif-meta">
                        {notification.fromCallsign && (
                          <span>from {notification.fromCallsign}</span>
                        )}
                        {notification.createdAt && (
                          <span>{formatTimeAgo(notification.createdAt)}</span>
                        )}
                      </div>
                    </div>
                    <div className="notif-actions">
                      {!notification.isRead && <span className="unread-dot"></span>}
                      <button
                        className="delete-btn"
                        onClick={(e) => notification.id && handleDeleteNotification(e, notification.id)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .notification-wrapper {
          position: relative;
          display: inline-block;
        }

        .notification-bell {
          background: none;
          border: none;
          font-size: 22px;
          cursor: pointer;
          padding: 6px 10px;
          position: relative;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
        }

        .notification-bell:hover {
          transform: scale(1.1);
        }

        .notification-badge {
          position: absolute;
          top: 0;
          right: 0;
          background: #dc3545;
          color: white;
          font-size: 10px;
          font-weight: bold;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          font-family: Arial, sans-serif;
        }

        .notification-popup {
          position: absolute;
          right: 0;
          top: 100%;
          margin-top: 8px;
          width: 380px;
          max-height: 500px;
          background: linear-gradient(to bottom, #b8d4ea 0%, #a0c4e0 100%);
          border: 3px solid #4a6d8c;
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          z-index: 1000;
          overflow: hidden;
        }

        .notification-header {
          background: linear-gradient(to bottom, #4a6d8c 0%, #3d5a75 100%);
          color: white;
          padding: 10px 15px;
          font-size: 16px;
          font-weight: bold;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          border-bottom: 2px solid #2d4a5f;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 22px;
          cursor: pointer;
          line-height: 1;
          padding: 0 5px;
        }

        .close-btn:hover {
          opacity: 0.8;
        }

        .notification-toolbar {
          padding: 10px 12px;
          background: rgba(255,255,255,0.4);
          border-bottom: 1px solid #5a7a9a;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .filter-tabs {
          display: flex;
          gap: 6px;
        }

        .filter-tab {
          padding: 5px 12px;
          font-size: 12px;
          font-weight: bold;
          border: 2px solid #5a7a9a;
          border-radius: 4px;
          background: white;
          color: #2d4a5f;
          cursor: pointer;
        }

        .filter-tab:hover {
          background: #e8f0f8;
        }

        .filter-tab.active {
          background: #5a7a9a;
          color: white;
        }

        .toolbar-actions {
          display: flex;
          gap: 8px;
        }

        .toolbar-btn {
          background: none;
          border: none;
          color: #1a3a5c;
          font-size: 11px;
          font-weight: bold;
          cursor: pointer;
          text-decoration: underline;
        }

        .toolbar-btn:hover {
          color: #0a2a4c;
        }

        .toolbar-btn:disabled {
          color: #8a9aaa;
          cursor: not-allowed;
        }

        .toolbar-btn.danger {
          color: #c44;
        }

        .toolbar-btn.danger:hover {
          color: #a22;
        }

        .notification-list {
          max-height: 350px;
          overflow-y: auto;
          background: white;
        }

        .empty-state {
          padding: 40px 20px;
          text-align: center;
          color: #5a7a9a;
        }

        .empty-icon {
          font-size: 36px;
          margin-bottom: 10px;
        }

        .loading-spinner {
          width: 30px;
          height: 30px;
          border: 3px solid #5a7a9a;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 10px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .notification-item {
          display: flex;
          gap: 10px;
          padding: 12px;
          border-bottom: 1px solid #e0e8f0;
          cursor: pointer;
          transition: background 0.15s;
        }

        .notification-item:hover {
          background: #e8f0f8;
        }

        .notification-item.unread {
          background: #f0f8ff;
        }

        .notification-item.unread:hover {
          background: #e0f0ff;
        }

        .notif-icon {
          font-size: 22px;
          flex-shrink: 0;
        }

        .notif-content {
          flex: 1;
          min-width: 0;
        }

        .notif-title {
          font-weight: bold;
          color: #1a3a5c;
          margin: 0 0 3px 0;
          font-size: 13px;
        }

        .notif-message {
          color: #3a5a7c;
          margin: 0;
          font-size: 12px;
          line-height: 1.4;
        }

        .notif-meta {
          display: flex;
          gap: 10px;
          margin-top: 5px;
          font-size: 11px;
          color: #7a9ab8;
        }

        .notif-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
        }

        .unread-dot {
          width: 8px;
          height: 8px;
          background: #4a8df0;
          border-radius: 50%;
        }

        .delete-btn {
          background: none;
          border: none;
          color: #aab;
          font-size: 18px;
          cursor: pointer;
          padding: 2px 5px;
          line-height: 1;
        }

        .delete-btn:hover {
          color: #c44;
        }
      `}</style>
    </>
  );
}
