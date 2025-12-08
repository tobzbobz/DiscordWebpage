'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getCurrentUser } from '../../utils/userService'
import { getShareLinkInfo, useShareLinkAPI, ShareLinkInfo } from '../../utils/apiClient'

export const runtime = 'edge'

export default function SharePage() {
  const params = useParams()
  const router = useRouter()
  const code = params?.code as string
  
  const [linkInfo, setLinkInfo] = useState<ShareLinkInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isActivating, setIsActivating] = useState(false)
  const [success, setSuccess] = useState(false)
  
  useEffect(() => {
    async function loadLinkInfo() {
      if (!code) return
      
      setIsLoading(true)
      try {
        const info = await getShareLinkInfo(code)
        if (!info) {
          setError('Share link not found or has expired')
        } else if (info.isExpired) {
          setError('This share link has expired')
        } else {
          setLinkInfo(info)
        }
      } catch (err) {
        setError('Failed to load share link information')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadLinkInfo()
  }, [code])
  
  const handleActivate = async () => {
    const user = getCurrentUser()
    if (!user) {
      router.push('/')
      return
    }
    
    if (!linkInfo) return
    
    // Check if link was used by someone else
    if (linkInfo.isUsed && linkInfo.usedBy !== user.discordId) {
      setError('This share link has already been used by another user')
      return
    }
    
    setIsActivating(true)
    try {
      const result = await useShareLinkAPI(code, user.discordId, user.callsign)
      if (result.success && result.incidentId) {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/incident?id=${encodeURIComponent(result.incidentId!)}`)
        }, 1500)
      } else {
        setError(result.message || 'Failed to activate share link')
      }
    } catch (err) {
      setError('Failed to activate share link')
    } finally {
      setIsActivating(false)
    }
  }
  
  const getPermissionLabel = (level: string) => {
    switch (level) {
      case 'owner': return '👑 Owner'
      case 'manage': return '⚙️ Manager'
      case 'edit': return '✏️ Editor'
      case 'view': return '👁️ Viewer'
      default: return level
    }
  }
  
  return (
    <div className="share-page">
      <style jsx>{`
        .share-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #e8f0f8 0%, #d0e0f0 100%);
          padding: 20px;
        }
        
        .share-card {
          background: white;
          border: 4px solid #5a7a9a;
          border-radius: 12px;
          padding: 30px 40px;
          max-width: 450px;
          width: 100%;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          text-align: center;
        }
        
        .share-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        
        h1 {
          font-size: 24px;
          color: #2d4a5f;
          margin: 0 0 10px 0;
        }
        
        .share-description {
          color: #5a7a9a;
          font-size: 14px;
          margin-bottom: 25px;
        }
        
        .share-details {
          background: #f5f8fa;
          border: 2px solid #e0e8f0;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 25px;
          text-align: left;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e0e8f0;
        }
        
        .detail-row:last-child {
          border-bottom: none;
        }
        
        .detail-label {
          color: #7a8a9a;
          font-size: 13px;
        }
        
        .detail-value {
          color: #2d4a5f;
          font-weight: bold;
          font-size: 13px;
        }
        
        .permission-badge {
          background: linear-gradient(to bottom, #3498db, #2980b9);
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
        }
        
        .activate-btn {
          padding: 12px 30px;
          font-size: 16px;
          font-weight: bold;
          background: linear-gradient(to bottom, #27ae60, #219a52);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          width: 100%;
        }
        
        .activate-btn:hover {
          opacity: 0.9;
        }
        
        .activate-btn:disabled {
          background: #95a5a6;
          cursor: not-allowed;
        }
        
        .error-message {
          background: #f8d7da;
          border: 2px solid #f5c6cb;
          color: #721c24;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        
        .success-message {
          background: #d4edda;
          border: 2px solid #c3e6cb;
          color: #155724;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        
        .loading-state {
          color: #5a7a9a;
          padding: 20px;
        }
        
        .login-link {
          color: #3498db;
          text-decoration: none;
          font-size: 13px;
          margin-top: 15px;
          display: inline-block;
        }
      `}</style>
      
      <div className="share-card">
        <div className="share-icon">🔗</div>
        <h1>ePRF Share Link</h1>
        
        {isLoading ? (
          <div className="loading-state">Loading share link...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : success ? (
          <div className="success-message">
            ✅ Access granted! Redirecting to ePRF...
          </div>
        ) : linkInfo ? (
          <>
            <p className="share-description">
              You've been invited to collaborate on an ePRF.
            </p>
            
            <div className="share-details">
              <div className="detail-row">
                <span className="detail-label">Incident ID</span>
                <span className="detail-value">{linkInfo.incidentId}</span>
              </div>
              {linkInfo.patientLetter && (
                <div className="detail-row">
                  <span className="detail-label">Patient</span>
                  <span className="detail-value">Patient {linkInfo.patientLetter}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Access Level</span>
                <span className="permission-badge">
                  {getPermissionLabel(linkInfo.permissionLevel)}
                </span>
              </div>
            </div>
            
            <button 
              className="activate-btn"
              onClick={handleActivate}
              disabled={isActivating}
            >
              {isActivating ? 'Activating...' : 'Accept & Open ePRF'}
            </button>
            
            <a href="/" className="login-link">
              Not logged in? Sign in first →
            </a>
          </>
        ) : null}
      </div>
    </div>
  )
}
