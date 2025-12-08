'use client'

import { useState, useEffect } from 'react'
import { User, getOtherLoggedInUsers, getCurrentUser } from '../utils/userService'
import * as api from '../utils/apiClient'

interface TransferModalProps {
  isOpen: boolean
  onClose: () => void
  onTransferComplete: (targetUser: User) => void
  incidentId: string
  patientLetter?: string // If provided, transfer single patient. Otherwise transfer all.
  isLoading?: boolean
}

export default function TransferModal({
  isOpen,
  onClose,
  onTransferComplete,
  incidentId,
  patientLetter,
  isLoading = false
}: TransferModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadUsers()
      setSelectedUser(null)
      setShowConfirmation(false)
    }
  }, [isOpen])

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      // Try API first
      const currentUser = getCurrentUser()
      const apiUsers = await api.getActiveUsers()
      
      // Filter out current user and map to local User format
      const otherUsers = apiUsers
        .filter(u => u.discord_id !== currentUser?.discordId)
        .map(u => ({
          discordId: u.discord_id,
          discordUsername: u.discord_username,
          callsign: u.callsign,
          vehicle: u.vehicle,
          loginTime: u.last_login
        }))
      
      if (otherUsers.length > 0) {
        setUsers(otherUsers)
      } else {
        // Fallback to localStorage
        setUsers(getOtherLoggedInUsers())
      }
    } catch (error) {
      console.error('Failed to load users from API:', error)
      // Fallback to localStorage
      setUsers(getOtherLoggedInUsers())
    } finally {
      setLoadingUsers(false)
    }
  }

  if (!isOpen) return null

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
  }

  const handleTransferClick = () => {
    if (selectedUser) {
      setShowConfirmation(true)
    }
  }

  const handleConfirmTransfer = () => {
    if (selectedUser) {
      onTransferComplete(selectedUser)
    }
  }

  const transferTarget = patientLetter 
    ? `Patient ${patientLetter} of ${incidentId}` 
    : `all patients of ${incidentId}`

  return (
    <div className="modal-overlay" onClick={onClose}>
      <style jsx>{`
        .transfer-modal {
          background: #fff;
          border-radius: 12px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }

        .transfer-header {
          background: #0066cc;
          color: white;
          padding: 20px 25px;
          font-size: 18px;
          font-weight: 600;
        }

        .transfer-body {
          padding: 25px;
        }

        .transfer-info {
          background: #f0f4f8;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
          font-size: 14px;
          color: #444;
        }

        .transfer-warning {
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .warning-icon {
          font-size: 20px;
        }

        .warning-text {
          font-size: 13px;
          color: #856404;
        }

        .users-list {
          max-height: 250px;
          overflow-y: auto;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
        }

        .user-item {
          display: flex;
          align-items: center;
          padding: 15px;
          border-bottom: 1px solid #e0e0e0;
          cursor: pointer;
          transition: background 0.2s;
        }

        .user-item:last-child {
          border-bottom: none;
        }

        .user-item:hover {
          background: #f5f5f5;
        }

        .user-item.selected {
          background: #e3f2fd;
          border-left: 3px solid #0066cc;
        }

        .user-radio {
          width: 20px;
          height: 20px;
          margin-right: 15px;
        }

        .user-info {
          flex: 1;
        }

        .user-callsign {
          font-weight: 600;
          font-size: 15px;
          color: #1a3a5c;
        }

        .user-vehicle {
          font-size: 13px;
          color: #666;
          margin-top: 2px;
        }

        .user-login-time {
          font-size: 12px;
          color: #999;
          margin-top: 2px;
        }

        .no-users {
          padding: 40px 20px;
          text-align: center;
          color: #666;
        }

        .no-users-icon {
          font-size: 40px;
          margin-bottom: 10px;
        }

        .transfer-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 25px;
          border-top: 1px solid #e0e0e0;
          background: #f8f9fa;
        }

        .transfer-btn {
          padding: 10px 24px;
          font-size: 14px;
          font-weight: 600;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .transfer-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .transfer-btn-cancel {
          background: #e0e0e0;
          color: #333;
        }

        .transfer-btn-cancel:hover:not(:disabled) {
          background: #d0d0d0;
        }

        .transfer-btn-confirm {
          background: #dc3545;
          color: white;
        }

        .transfer-btn-confirm:hover:not(:disabled) {
          background: #c82333;
        }

        .confirmation-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.95);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 30px;
          text-align: center;
        }

        .confirmation-icon {
          font-size: 50px;
          margin-bottom: 20px;
        }

        .confirmation-title {
          font-size: 20px;
          font-weight: 600;
          color: #dc3545;
          margin-bottom: 15px;
        }

        .confirmation-message {
          font-size: 14px;
          color: #555;
          line-height: 1.6;
          margin-bottom: 25px;
          max-width: 350px;
        }

        .confirmation-buttons {
          display: flex;
          gap: 15px;
        }
      `}</style>
      
      <div className="transfer-modal" onClick={e => e.stopPropagation()}>
        <div className="transfer-header">
          Transfer Patient
        </div>
        
        <div className="transfer-body" style={{ position: 'relative' }}>
          <div className="transfer-info">
            <strong>Transferring:</strong> {transferTarget}
          </div>
          
          <div className="transfer-warning">
            <span className="warning-icon">⚠️</span>
            <span className="warning-text">
              This action is <strong>irreversible</strong>. The patient will be transferred to another user 
              and they will become the owner. You will no longer be able to edit this patient record.
            </span>
          </div>
          
          {loadingUsers ? (
            <div className="no-users">
              <div className="no-users-icon">⏳</div>
              <p>Loading users...</p>
            </div>
          ) : users.length > 0 ? (
            <>
              <p style={{ marginBottom: '12px', fontSize: '14px', color: '#555' }}>
                Select a user to transfer to:
              </p>
              <div className="users-list">
                {users.map(user => (
                  <div 
                    key={user.discordId}
                    className={`user-item ${selectedUser?.discordId === user.discordId ? 'selected' : ''}`}
                    onClick={() => handleUserSelect(user)}
                  >
                    <input 
                      type="radio" 
                      className="user-radio"
                      checked={selectedUser?.discordId === user.discordId}
                      onChange={() => handleUserSelect(user)}
                    />
                    <div className="user-info">
                      <div className="user-callsign">{user.callsign}</div>
                      <div className="user-vehicle">{user.vehicle}</div>
                      <div className="user-login-time">
                        Logged in: {new Date(user.loginTime).toLocaleTimeString('en-GB', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : !loadingUsers && (
            <div className="no-users">
              <div className="no-users-icon">👤</div>
              <p>No other users are currently logged in.</p>
              <p style={{ fontSize: '13px', marginTop: '5px' }}>
                Ask another crew member to log in first.
              </p>
            </div>
          )}
          
          {showConfirmation && selectedUser && (
            <div className="confirmation-overlay">
              <div className="confirmation-icon">🔄</div>
              <div className="confirmation-title">Confirm Transfer</div>
              <div className="confirmation-message">
                You are about to transfer <strong>{transferTarget}</strong> to <strong>{selectedUser.callsign}</strong>.
                <br /><br />
                This cannot be undone. Are you sure?
              </div>
              <div className="confirmation-buttons">
                <button 
                  className="transfer-btn transfer-btn-cancel"
                  onClick={() => setShowConfirmation(false)}
                  disabled={isLoading}
                >
                  Go Back
                </button>
                <button 
                  className="transfer-btn transfer-btn-confirm"
                  onClick={handleConfirmTransfer}
                  disabled={isLoading}
                >
                  {isLoading ? 'Transferring...' : 'Yes, Transfer'}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {!showConfirmation && (
          <div className="transfer-footer">
            <button 
              className="transfer-btn transfer-btn-cancel"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              className="transfer-btn transfer-btn-confirm"
              onClick={handleTransferClick}
              disabled={!selectedUser || isLoading}
            >
              Transfer Patient
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
