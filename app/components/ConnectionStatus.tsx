'use client'

import { useState, useEffect } from 'react'

interface ConnectionStatusProps {
  className?: string
}

export default function ConnectionStatus({ className = '' }: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [isServerConnected, setIsServerConnected] = useState(true)

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check server connection
    const checkServer = async () => {
      try {
        const response = await fetch('/api/discord/health', { 
          method: 'GET',
          cache: 'no-store'
        })
        setIsServerConnected(response.ok)
      } catch {
        setIsServerConnected(false)
      }
    }

    // Initial check
    checkServer()

    // Check server every 30 seconds
    const interval = setInterval(checkServer, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className={`footer-left ${className}`}>
      <div className={`footer-btn internet ${isOnline ? 'connected' : 'disconnected'}`}>
        <span className="status-label">Internet</span>
        <span className="status-subtext">{isOnline ? 'Connected' : 'Disconnected'}</span>
      </div>
      <div className={`footer-btn server ${isServerConnected ? 'connected' : 'disconnected'}`}>
        <span className="status-label">Server</span>
        <span className="status-subtext">{isServerConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
    </div>
  )
}
