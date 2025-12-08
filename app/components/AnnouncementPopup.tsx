"use client"

import { useState, useEffect } from 'react'
import { getActiveAnnouncements, Announcement } from '../utils/apiClient'

export default function AnnouncementPopup() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const active = await getActiveAnnouncements()
      setAnnouncements(active)
    }

    // Load dismissed IDs from session storage
    const stored = sessionStorage.getItem('dismissedAnnouncements')
    if (stored) {
      setDismissedIds(new Set(JSON.parse(stored)))
    }

    fetchAnnouncements()
    
    // Poll for new announcements every minute
    const interval = setInterval(fetchAnnouncements, 60000)
    return () => clearInterval(interval)
  }, [])

  const dismissAnnouncement = (id: number) => {
    const newDismissed = new Set(dismissedIds)
    newDismissed.add(id)
    setDismissedIds(newDismissed)
    sessionStorage.setItem('dismissedAnnouncements', JSON.stringify(Array.from(newDismissed)))
  }

  const visibleAnnouncements = announcements.filter(a => !dismissedIds.has(a.id))

  if (visibleAnnouncements.length === 0) return null

  return (
    <>
      <style jsx>{`
        .announcements-container {
          position: fixed;
          top: 80px;
          right: 20px;
          z-index: 9998;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 400px;
        }

        .announcement-popup {
          background: linear-gradient(135deg, #1b2838 0%, #2d4156 100%);
          border: 1px solid #0099ff;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0, 153, 255, 0.3);
          overflow: hidden;
          animation: slide-in 0.3s ease-out;
        }

        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .announcement-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 15px;
          background: rgba(0, 153, 255, 0.2);
          border-bottom: 1px solid rgba(0, 153, 255, 0.3);
        }

        .announcement-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #0099ff;
          font-weight: 600;
          font-size: 14px;
        }

        .announcement-icon {
          font-size: 16px;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: #667788;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          transition: color 0.2s;
        }

        .close-btn:hover {
          color: white;
        }

        .announcement-body {
          padding: 15px;
          color: #ccc;
          font-size: 14px;
          line-height: 1.5;
        }

        .announcement-time {
          display: block;
          margin-top: 10px;
          font-size: 11px;
          color: #667788;
        }
      `}</style>
      <div className="announcements-container">
        {visibleAnnouncements.map(announcement => (
          <div key={announcement.id} className="announcement-popup">
            <div className="announcement-header">
              <span className="announcement-title">
                <span className="announcement-icon">📣</span>
                {announcement.title || 'System Announcement'}
              </span>
              <button 
                className="close-btn"
                onClick={() => dismissAnnouncement(announcement.id)}
                title="Dismiss"
              >
                ✕
              </button>
            </div>
            <div className="announcement-body">
              {announcement.message}
              <span className="announcement-time">
                {new Date(announcement.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
