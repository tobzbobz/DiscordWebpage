"use client"

import { useState, useEffect } from 'react'
import { getActiveBroadcast, Broadcast } from '../utils/apiClient'

export default function BroadcastBar() {
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null)

  useEffect(() => {
    const fetchBroadcast = async () => {
      const activeBroadcast = await getActiveBroadcast()
      setBroadcast(activeBroadcast)
    }

    fetchBroadcast()
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchBroadcast, 30000)
    return () => clearInterval(interval)
  }, [])

  if (!broadcast) return null

  return (
    <>
      <style jsx>{`
        .broadcast-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          background: linear-gradient(135deg, #dc3545 0%, #a71d2a 100%);
          color: white;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }

        .broadcast-content {
          display: flex;
          align-items: center;
          padding: 10px 0;
          animation: scroll-left 20s linear infinite;
          white-space: nowrap;
        }

        .broadcast-text {
          display: inline-flex;
          align-items: center;
          gap: 40px;
          padding: 0 40px;
        }

        .broadcast-icon {
          font-size: 18px;
        }

        .broadcast-message {
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.5px;
        }

        @keyframes scroll-left {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }

        /* When message is short, don't scroll */
        .broadcast-content.no-scroll {
          animation: none;
          justify-content: center;
        }
      `}</style>
      <div className="broadcast-bar">
        <div className={`broadcast-content ${broadcast.message.length < 100 ? 'no-scroll' : ''}`}>
          <div className="broadcast-text">
            <span className="broadcast-icon">📢</span>
            <span className="broadcast-message">{broadcast.message}</span>
            <span className="broadcast-icon">📢</span>
            <span className="broadcast-message">{broadcast.message}</span>
          </div>
        </div>
      </div>
    </>
  )
}
