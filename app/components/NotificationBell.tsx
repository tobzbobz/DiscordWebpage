'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  getNotifications, 
  getUnreadNotificationCount, 
  markNotificationRead, 
  markAllNotificationsRead,
  Notification 
} from '../utils/apiClient'

interface NotificationBellProps {
  userDiscordId: string
}

export default function NotificationBell({ userDiscordId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const loadNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const [notifs, count] = await Promise.all([
        getNotifications(userDiscordId, false),
        getUnreadNotificationCount(userDiscordId)
      ])
      setNotifications(notifs)
      setUnreadCount(count)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userDiscordId])
  
  useEffect(() => {
    loadNotifications()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [loadNotifications])
  
  const handleMarkRead = async (notificationId: number) => {
    await markNotificationRead(notificationId, userDiscordId)
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }
  
  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(userDiscordId)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'collaborator_added': return '👥'
      case 'permission_changed': return '🔑'
      case 'patient_transferred': return '🔄'
      case 'eprf_completed': return '✅'
      case 'access_approved': return '✅'
      case 'access_rejected': return '❌'
      case 'access_requested': return '🙋'
      default: return '🔔'
    }
  }
  
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }
  
  return (
    <div className="notification-bell-container">
      <style jsx>{`
        .notification-bell-container {
          position: relative;
        }
        
        .bell-button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 24px;
          padding: 8px;
          position: relative;
          color: #2d4a5f;
        }
        
        .bell-button:hover {
          opacity: 0.8;
        }
        
        .unread-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          background: #e74c3c;
          color: white;
          font-size: 10px;
          font-weight: bold;
          min-width: 16px;
          height: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
        }
        
        .notification-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          width: 360px;
          max-height: 450px;
          background: white;
          border: 2px solid #5a7a9a;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }
        
        .notification-header {
          padding: 12px 16px;
          border-bottom: 2px solid #e0e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .notification-header h3 {
          margin: 0;
          font-size: 14px;
          color: #2d4a5f;
        }
        
        .mark-all-read {
          font-size: 12px;
          color: #3498db;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
        }
        
        .mark-all-read:hover {
          text-decoration: underline;
        }
        
        .notification-list {
          overflow-y: auto;
          flex: 1;
          max-height: 350px;
        }
        
        .notification-item {
          padding: 12px 16px;
          border-bottom: 1px solid #e0e8f0;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .notification-item:hover {
          background: #f5f8fa;
        }
        
        .notification-item.unread {
          background: #f0f7ff;
        }
        
        .notification-item.unread:hover {
          background: #e5f0fa;
        }
        
        .notification-content {
          display: flex;
          gap: 10px;
        }
        
        .notification-icon {
          font-size: 20px;
          flex-shrink: 0;
        }
        
        .notification-text {
          flex: 1;
        }
        
        .notification-title {
          font-weight: bold;
          font-size: 13px;
          color: #2d4a5f;
          margin-bottom: 2px;
        }
        
        .notification-message {
          font-size: 12px;
          color: #5a7a9a;
          margin-bottom: 4px;
        }
        
        .notification-time {
          font-size: 11px;
          color: #95a5a6;
        }
        
        .no-notifications {
          padding: 30px;
          text-align: center;
          color: #7a8a9a;
          font-size: 13px;
        }
        
        .loading-state {
          padding: 20px;
          text-align: center;
          color: #5a7a9a;
        }
      `}</style>
      
      <button 
        className="bell-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="unread-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="mark-all-read" onClick={handleMarkAllRead}>
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="notification-list">
            {isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="no-notifications">
                No notifications yet
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => !notification.read && handleMarkRead(notification.id)}
                >
                  <div className="notification-content">
                    <span className="notification-icon">
                      {getNotificationIcon(notification.notification_type)}
                    </span>
                    <div className="notification-text">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">
                        {formatTime(notification.created_at)}
                        {notification.from_user_callsign && (
                          <> · from {notification.from_user_callsign}</>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
