'use client'

import { useState, useEffect, useCallback } from 'react'
import { getActivityLog, ActivityLogEntry } from '../utils/apiClient'

interface ActivityLogProps {
  incidentId: string
  patientLetter: string
  isOpen: boolean
  onClose: () => void
}

export default function ActivityLog({
  incidentId,
  patientLetter,
  isOpen,
  onClose
}: ActivityLogProps) {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const loadActivities = useCallback(async () => {
    setIsLoading(true)
    try {
      const logs = await getActivityLog(incidentId, patientLetter)
      setActivities(logs)
    } catch (error) {
      console.error('Failed to load activity log:', error)
    } finally {
      setIsLoading(false)
    }
  }, [incidentId, patientLetter])
  
  useEffect(() => {
    if (isOpen) {
      loadActivities()
    }
  }, [isOpen, loadActivities])
  
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create': return '➕'
      case 'update': return '✏️'
      case 'delete': return '🗑️'
      case 'complete': return '✅'
      case 'transfer': return '🔄'
      case 'lock': return '🔒'
      case 'unlock': return '🔓'
      case 'collaborator_add': return '👥'
      case 'collaborator_remove': return '👤'
      default: return '📝'
    }
  }
  
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    let timeAgo = ''
    if (diffMins < 1) timeAgo = 'just now'
    else if (diffMins < 60) timeAgo = `${diffMins}m ago`
    else if (diffHours < 24) timeAgo = `${diffHours}h ago`
    else if (diffDays < 7) timeAgo = `${diffDays}d ago`
    else timeAgo = date.toLocaleDateString()
    
    return {
      timeAgo,
      fullTime: date.toLocaleString()
    }
  }
  
  const getSectionLabel = (section?: string) => {
    if (!section) return ''
    const labels: Record<string, string> = {
      'incident': 'Incident Details',
      'patient-info': 'Patient Info',
      'primary-survey': 'Primary Survey',
      'vital-obs': 'Vital Observations',
      'hx-complaint': 'History & Complaint',
      'past-medical-history': 'Past Medical History',
      'clinical-impression': 'Clinical Impression',
      'disposition': 'Disposition',
      'medications': 'Medications',
      'interventions': 'Interventions',
      'media': 'Media'
    }
    return labels[section] || section
  }
  
  if (!isOpen) return null
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="activity-modal" onClick={e => e.stopPropagation()}>
        <style jsx>{`
          .activity-modal {
            background: white;
            border: 4px solid #5a7a9a;
            border-radius: 10px;
            min-width: 500px;
            max-width: 650px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          }
          
          .activity-header {
            background: linear-gradient(to bottom, #5a7a9a 0%, #4a6a8a 100%);
            color: white;
            padding: 15px 20px;
            font-weight: bold;
            font-size: 16px;
            border-radius: 6px 6px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            opacity: 0.8;
          }
          
          .close-btn:hover {
            opacity: 1;
          }
          
          .activity-body {
            padding: 0;
            overflow-y: auto;
            flex: 1;
            max-height: 500px;
          }
          
          .activity-list {
            display: flex;
            flex-direction: column;
          }
          
          .activity-item {
            display: flex;
            gap: 12px;
            padding: 12px 16px;
            border-bottom: 1px solid #e0e8f0;
          }
          
          .activity-item:hover {
            background: #f8fafc;
          }
          
          .activity-icon {
            font-size: 18px;
            flex-shrink: 0;
            width: 24px;
            text-align: center;
          }
          
          .activity-content {
            flex: 1;
          }
          
          .activity-description {
            font-size: 13px;
            color: #2d4a5f;
            margin-bottom: 4px;
          }
          
          .activity-description strong {
            color: #1a3a4f;
          }
          
          .activity-meta {
            font-size: 11px;
            color: #7a8a9a;
            display: flex;
            gap: 12px;
          }
          
          .activity-section {
            background: #e8f0f8;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            color: #5a7a9a;
          }
          
          .activity-values {
            margin-top: 6px;
            font-size: 11px;
            background: #f5f8fa;
            padding: 8px;
            border-radius: 4px;
            border-left: 3px solid #5a7a9a;
          }
          
          .value-old {
            color: #e74c3c;
            text-decoration: line-through;
          }
          
          .value-new {
            color: #27ae60;
          }
          
          .empty-state {
            padding: 40px;
            text-align: center;
            color: #7a8a9a;
          }
          
          .loading-state {
            padding: 40px;
            text-align: center;
            color: #5a7a9a;
          }
        `}</style>
        
        <div className="activity-header">
          <span>📋 Activity Log - Patient {patientLetter}</span>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="activity-body">
          {isLoading ? (
            <div className="loading-state">Loading activity log...</div>
          ) : activities.length === 0 ? (
            <div className="empty-state">
              No activity recorded yet for this patient.
            </div>
          ) : (
            <div className="activity-list">
              {activities.map(activity => {
                const time = formatTime(activity.created_at)
                return (
                  <div key={activity.id} className="activity-item">
                    <span className="activity-icon">
                      {getActionIcon(activity.action_type)}
                    </span>
                    <div className="activity-content">
                      <div className="activity-description">
                        <strong>{activity.user_callsign || 'Unknown'}</strong>
                        {' '}
                        {activity.description || `performed ${activity.action_type}`}
                        {activity.field_name && (
                          <> on <strong>{activity.field_name}</strong></>
                        )}
                      </div>
                      
                      <div className="activity-meta">
                        <span title={time.fullTime}>{time.timeAgo}</span>
                        {activity.section && (
                          <span className="activity-section">
                            {getSectionLabel(activity.section)}
                          </span>
                        )}
                      </div>
                      
                      {(activity.old_value || activity.new_value) && (
                        <div className="activity-values">
                          {activity.old_value && (
                            <div className="value-old">- {activity.old_value}</div>
                          )}
                          {activity.new_value && (
                            <div className="value-new">+ {activity.new_value}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
