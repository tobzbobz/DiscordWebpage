'use client'

import { useState, useEffect, useCallback } from 'react'
import { updatePresence, getActivePresence, removePresence, Presence } from '../utils/apiClient'

interface PresenceIndicatorProps {
  incidentId: string
  patientLetter: string
  userDiscordId: string
  userCallsign: string
  pageName: string
}

export default function PresenceIndicator({
  incidentId,
  patientLetter,
  userDiscordId,
  userCallsign,
  pageName
}: PresenceIndicatorProps) {
  const [presences, setPresences] = useState<Presence[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  
  const updateMyPresence = useCallback(async () => {
    const result = await updatePresence(incidentId, patientLetter, userDiscordId, userCallsign, pageName)
    if (result.presences) {
      // Filter out current user from display
      setPresences(result.presences.filter(p => p.user_discord_id !== userDiscordId))
    }
  }, [incidentId, patientLetter, userDiscordId, userCallsign, pageName])
  
  useEffect(() => {
    // Initial presence update
    updateMyPresence()
    
    // Heartbeat every 10 seconds
    const interval = setInterval(updateMyPresence, 10000)
    
    // Cleanup on unmount
    return () => {
      clearInterval(interval)
      removePresence(incidentId, patientLetter, userDiscordId)
    }
  }, [updateMyPresence, incidentId, patientLetter, userDiscordId])
  
  // Don't render if no other users are viewing
  if (presences.length === 0) {
    return null
  }
  
  const getPageLabel = (pageName: string) => {
    const labels: Record<string, string> = {
      'incident': 'Incident',
      'patient-info': 'Patient Info',
      'primary-survey': 'Primary Survey',
      'vital-obs': 'Vitals',
      'hx-complaint': 'History',
      'past-medical-history': 'PMH',
      'clinical-impression': 'Clinical',
      'disposition': 'Disposition',
      'medications': 'Medications',
      'interventions': 'Interventions',
      'media': 'Media'
    }
    return labels[pageName] || pageName
  }
  
  const getColorForUser = (discordId: string) => {
    // Generate a consistent color based on discord ID
    const hash = discordId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const colors = ['#e74c3c', '#3498db', '#27ae60', '#9b59b6', '#f39c12', '#1abc9c', '#e67e22']
    return colors[hash % colors.length]
  }
  
  return (
    <div className="presence-indicator">
      <style jsx>{`
        .presence-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          position: relative;
        }
        
        .presence-avatars {
          display: flex;
          align-items: center;
        }
        
        .presence-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 11px;
          color: white;
          border: 2px solid white;
          margin-left: -8px;
          cursor: pointer;
          position: relative;
        }
        
        .presence-avatar:first-child {
          margin-left: 0;
        }
        
        .presence-avatar:hover {
          z-index: 10;
          transform: scale(1.1);
        }
        
        .presence-more {
          background: #7a8a9a;
          font-size: 10px;
        }
        
        .presence-label {
          font-size: 11px;
          color: #5a7a9a;
          margin-left: 6px;
        }
        
        .presence-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          background: white;
          border: 2px solid #5a7a9a;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          min-width: 200px;
          z-index: 100;
        }
        
        .presence-dropdown-header {
          padding: 10px 12px;
          border-bottom: 2px solid #e0e8f0;
          font-size: 12px;
          font-weight: bold;
          color: #2d4a5f;
        }
        
        .presence-dropdown-list {
          max-height: 200px;
          overflow-y: auto;
        }
        
        .presence-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-bottom: 1px solid #e0e8f0;
        }
        
        .presence-dropdown-item:last-child {
          border-bottom: none;
        }
        
        .presence-dropdown-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 10px;
          color: white;
        }
        
        .presence-dropdown-info {
          flex: 1;
        }
        
        .presence-dropdown-name {
          font-size: 12px;
          font-weight: bold;
          color: #2d4a5f;
        }
        
        .presence-dropdown-page {
          font-size: 10px;
          color: #7a8a9a;
        }
        
        .live-indicator {
          width: 8px;
          height: 8px;
          background: #27ae60;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      
      <div className="presence-avatars" onClick={() => setIsExpanded(!isExpanded)}>
        {presences.slice(0, 3).map(p => (
          <div
            key={p.user_discord_id}
            className="presence-avatar"
            style={{ background: getColorForUser(p.user_discord_id) }}
            title={`${p.user_callsign} - ${getPageLabel(p.page_name)}`}
          >
            {p.user_callsign?.charAt(0) || '?'}
          </div>
        ))}
        {presences.length > 3 && (
          <div className="presence-avatar presence-more">
            +{presences.length - 3}
          </div>
        )}
      </div>
      
      <span className="presence-label">
        {presences.length} viewing
      </span>
      
      {isExpanded && (
        <div className="presence-dropdown">
          <div className="presence-dropdown-header">
            Currently Viewing
          </div>
          <div className="presence-dropdown-list">
            {presences.map(p => (
              <div key={p.user_discord_id} className="presence-dropdown-item">
                <div
                  className="presence-dropdown-avatar"
                  style={{ background: getColorForUser(p.user_discord_id) }}
                >
                  {p.user_callsign?.charAt(0) || '?'}
                </div>
                <div className="presence-dropdown-info">
                  <div className="presence-dropdown-name">{p.user_callsign || 'User'}</div>
                  <div className="presence-dropdown-page">{getPageLabel(p.page_name)}</div>
                </div>
                <div className="live-indicator" title="Online now"></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
