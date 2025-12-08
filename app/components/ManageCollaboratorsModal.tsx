'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  getCollaborators, 
  addCollaborator, 
  removeCollaborator, 
  updateCollaboratorPermission,
  transferOwnershipAPI,
  getActiveUsers,
  PermissionLevel,
  Collaborator,
  User,
  createShareLinkAPI,
  getPatientCollaborators,
  addPatientCollaborator,
  removePatientCollaborator,
  updatePatientCollaboratorPermission,
  PatientCollaborator,
  createNotificationAPI
} from '../utils/apiClient'
import { getCurrentUser } from '../utils/userService'

interface ManageCollaboratorsModalProps {
  isOpen: boolean
  onClose: () => void
  incidentId: string
  currentUserPermission: PermissionLevel
  patientLetters?: string[] // For bulk patient management
  isAdmin?: boolean
}

export default function ManageCollaboratorsModal({
  isOpen,
  onClose,
  incidentId,
  currentUserPermission,
  patientLetters = [],
  isAdmin = false
}: ManageCollaboratorsModalProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [owner, setOwner] = useState<any>(null)
  const [activeUsers, setActiveUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Add collaborator form
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedPermission, setSelectedPermission] = useState<PermissionLevel>('view')
  const [isAdding, setIsAdding] = useState(false)
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]) // For bulk patient perms
  const [expiryHours, setExpiryHours] = useState<number | null>(null)
  
  // Transfer ownership
  const [showTransferConfirm, setShowTransferConfirm] = useState(false)
  const [transferTarget, setTransferTarget] = useState<{ discordId: string, callsign: string } | null>(null)
  const [isTransferring, setIsTransferring] = useState(false)
  
  // Share link
  const [showShareLink, setShowShareLink] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [isCreatingLink, setIsCreatingLink] = useState(false)
  
  // Active tab
  const [activeTab, setActiveTab] = useState<'incident' | 'patients'>('incident')
  const [selectedPatientLetter, setSelectedPatientLetter] = useState<string | null>(null)
  const [patientCollaborators, setPatientCollaborators] = useState<PatientCollaborator[]>([])
  
  const currentUser = getCurrentUser()
  
  // Determine what the user can see/do based on their permission level
  const canAddCollaborators = currentUserPermission === 'owner' || currentUserPermission === 'manage'
  const canRemoveCollaborators = currentUserPermission === 'owner' || currentUserPermission === 'manage'
  const canTransfer = currentUserPermission === 'owner'
  const canCreateShareLink = currentUserPermission === 'owner' || currentUserPermission === 'manage'
  
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [collabData, users] = await Promise.all([
        getCollaborators(incidentId),
        getActiveUsers()
      ])
      setCollaborators(collabData.collaborators)
      setOwner(collabData.owner)
      setActiveUsers(users)
      
      // Load patient collaborators if a patient is selected
      if (selectedPatientLetter) {
        const patientData = await getPatientCollaborators(incidentId, selectedPatientLetter)
        setPatientCollaborators(patientData.collaborators)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load collaborators')
    } finally {
      setIsLoading(false)
    }
  }, [incidentId, selectedPatientLetter])
  
  useEffect(() => {
    if (isOpen) {
      loadData()
      // Poll for updates every 5 seconds
      const interval = setInterval(loadData, 5000)
      return () => clearInterval(interval)
    }
  }, [isOpen, loadData])
  
  const handleAddCollaborator = async () => {
    if (!selectedUserId || !currentUser) return
    
    setIsAdding(true)
    setError(null)
    try {
      const user = activeUsers.find(u => u.discord_id === selectedUserId)
      await addCollaborator(
        incidentId,
        selectedUserId,
        user?.callsign || '',
        selectedPermission,
        currentUser.discordId
      )
      setSuccessMessage('Collaborator added successfully')
      setShowAddForm(false)
      setSelectedUserId('')
      setSelectedPermission('view')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to add collaborator')
    } finally {
      setIsAdding(false)
    }
  }
  
  const handleRemoveCollaborator = async (userDiscordId: string) => {
    if (!currentUser) return
    
    try {
      await removeCollaborator(incidentId, userDiscordId, currentUser.discordId)
      setSuccessMessage('Collaborator removed')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to remove collaborator')
    }
  }
  
  const handleUpdatePermission = async (userDiscordId: string, newPermission: PermissionLevel) => {
    if (!currentUser) return
    
    try {
      await updateCollaboratorPermission(incidentId, userDiscordId, newPermission, currentUser.discordId)
      setSuccessMessage('Permission updated')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to update permission')
    }
  }
  
  const handleTransferOwnership = async () => {
    if (!transferTarget || !currentUser || !owner) return
    
    setIsTransferring(true)
    try {
      await transferOwnershipAPI(
        incidentId,
        owner.user_discord_id,
        owner.user_callsign,
        transferTarget.discordId,
        transferTarget.callsign,
        currentUser.discordId
      )
      setSuccessMessage('Ownership transferred. You now have view access.')
      setShowTransferConfirm(false)
      setTransferTarget(null)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to transfer ownership')
    } finally {
      setIsTransferring(false)
    }
  }
  
  const handleCreateShareLink = async () => {
    if (!currentUser) return
    
    setIsCreatingLink(true)
    try {
      const result = await createShareLinkAPI(
        incidentId,
        selectedPermission,
        currentUser.discordId,
        { patientLetter: selectedPatientLetter || undefined }
      )
      if (result) {
        setShareLink(window.location.origin + result.shareUrl)
        setShowShareLink(true)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create share link')
    } finally {
      setIsCreatingLink(false)
    }
  }
  
  const copyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink)
      setSuccessMessage('Link copied to clipboard!')
    }
  }
  
  const handleAddPatientCollaborator = async () => {
    if (!selectedUserId || !currentUser || !selectedPatientLetter) return
    
    setIsAdding(true)
    setError(null)
    try {
      const user = activeUsers.find(u => u.discord_id === selectedUserId)
      await addPatientCollaborator(
        incidentId,
        selectedPatientLetter,
        selectedUserId,
        user?.callsign || '',
        selectedPermission,
        currentUser.discordId
      )
      
      // Send notification to the added user
      await createNotificationAPI(
        selectedUserId,
        'collaborator_added',
        'Added to Patient',
        `You have been added as ${selectedPermission} to Patient ${selectedPatientLetter} in incident ${incidentId}`,
        { 
          incidentId, 
          patientLetter: selectedPatientLetter,
          fromUserDiscordId: currentUser.discordId,
          fromUserCallsign: currentUser.callsign
        }
      )
      
      setSuccessMessage('Patient collaborator added')
      setShowAddForm(false)
      setSelectedUserId('')
      setSelectedPermission('view')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to add patient collaborator')
    } finally {
      setIsAdding(false)
    }
  }
  
  const handleRemovePatientCollaborator = async (userDiscordId: string) => {
    if (!currentUser || !selectedPatientLetter) return
    
    try {
      await removePatientCollaborator(incidentId, selectedPatientLetter, userDiscordId, currentUser.discordId)
      setSuccessMessage('Patient collaborator removed')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to remove patient collaborator')
    }
  }
  
  const handleUpdatePatientPermission = async (userDiscordId: string, newPermission: PermissionLevel) => {
    if (!currentUser || !selectedPatientLetter) return
    
    try {
      await updatePatientCollaboratorPermission(incidentId, selectedPatientLetter, userDiscordId, newPermission, currentUser.discordId)
      setSuccessMessage('Permission updated')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to update permission')
    }
  }
  
  const getPermissionLabel = (level: PermissionLevel) => {
    switch (level) {
      case 'owner': return 'Owner'
      case 'manage': return 'Manage Access'
      case 'edit': return 'Edit'
      case 'view': return 'View Only'
      default: return level
    }
  }
  
  // Permission level descriptions for tooltips
  const permissionDescriptions: Record<PermissionLevel, string> = {
    'owner': 'Full control: Can edit all data, manage collaborators, transfer ownership, and delete the ePRF',
    'manage': 'Can edit all patient data and add/remove collaborators (except owner)',
    'edit': 'Can edit patient data but cannot manage collaborators',
    'view': 'Read-only access - can view but not modify any data'
  }
  
  const getPermissionColor = (level: PermissionLevel) => {
    switch (level) {
      case 'owner': return '#d4af37'
      case 'manage': return '#9b59b6'
      case 'edit': return '#27ae60'
      case 'view': return '#3498db'
      default: return '#95a5a6'
    }
  }
  
  // Filter out users who are already collaborators or the owner
  const availableUsers = activeUsers.filter(user => {
    if (owner && user.discord_id === owner.user_discord_id) return false
    if (collaborators.some(c => c.user_discord_id === user.discord_id)) return false
    if (user.discord_id === currentUser?.discordId) return false
    return true
  })
  
  // Users available for transfer (collaborators + active users, excluding current owner)
  const transferableUsers = [
    ...collaborators.map(c => ({ discord_id: c.user_discord_id, callsign: c.user_callsign })),
    ...activeUsers.filter(u => 
      u.discord_id !== owner?.user_discord_id && 
      !collaborators.some(c => c.user_discord_id === u.discord_id)
    ).map(u => ({ discord_id: u.discord_id, callsign: u.callsign }))
  ]
  
  if (!isOpen) return null
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog collab-modal" onClick={e => e.stopPropagation()}>
        <style jsx>{`
          .collab-modal {
            min-width: 550px;
            max-width: 650px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
          }
          
          .collab-body {
            padding: 20px;
            overflow-y: auto;
            flex: 1;
          }
          
          .collab-section {
            margin-bottom: 20px;
          }
          
          .collab-section-title {
            font-size: 14px;
            font-weight: bold;
            color: #2d4a5f;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 2px solid #5a7a9a;
          }
          
          .collab-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .collab-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 12px;
            background: white;
            border: 2px solid #c0d0e0;
            border-radius: 6px;
          }
          
          .collab-item.owner {
            border-color: #d4af37;
            background: linear-gradient(to right, #fffef0, white);
          }
          
          .collab-user {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .collab-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
            font-size: 14px;
          }
          
          .collab-info {
            display: flex;
            flex-direction: column;
          }
          
          .collab-name {
            font-weight: bold;
            font-size: 14px;
            color: #2d4a5f;
          }
          
          .collab-id {
            font-size: 11px;
            color: #7a8a9a;
          }
          
          .collab-actions {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .permission-badge {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            color: white;
          }
          
          .permission-select {
            padding: 4px 8px;
            font-size: 12px;
            border: 2px solid #5a7a9a;
            border-radius: 4px;
            background: white;
            cursor: pointer;
          }
          
          .remove-btn {
            padding: 4px 10px;
            font-size: 11px;
            font-weight: bold;
            background: linear-gradient(to bottom, #e74c3c, #c0392b);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          
          .remove-btn:hover {
            opacity: 0.9;
          }
          
          .add-form {
            background: #f0f5fa;
            border: 2px solid #c0d0e0;
            border-radius: 8px;
            padding: 15px;
            margin-top: 10px;
          }
          
          .add-form-row {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
          }
          
          .add-form-row:last-child {
            margin-bottom: 0;
          }
          
          .form-select {
            flex: 1;
            padding: 8px 12px;
            font-size: 13px;
            border: 2px solid #5a7a9a;
            border-radius: 4px;
            background: white;
          }
          
          .add-btn {
            padding: 8px 16px;
            font-size: 13px;
            font-weight: bold;
            background: linear-gradient(to bottom, #27ae60, #219a52);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          
          .add-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .cancel-btn {
            padding: 8px 16px;
            font-size: 13px;
            font-weight: bold;
            background: linear-gradient(to bottom, #95a5a6, #7f8c8d);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          
          .show-add-btn {
            padding: 8px 16px;
            font-size: 13px;
            font-weight: bold;
            background: linear-gradient(to bottom, #3498db, #2980b9);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
          }
          
          .transfer-section {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 2px dashed #c0d0e0;
          }
          
          .transfer-btn {
            padding: 10px 20px;
            font-size: 14px;
            font-weight: bold;
            background: linear-gradient(to bottom, #d4af37, #b8960f);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            width: 100%;
          }
          
          .transfer-confirm {
            background: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 8px;
            padding: 15px;
            margin-top: 10px;
          }
          
          .transfer-warning {
            font-size: 13px;
            color: #856404;
            margin-bottom: 10px;
          }
          
          .message-box {
            padding: 10px 15px;
            border-radius: 6px;
            margin-bottom: 15px;
            font-size: 13px;
            font-weight: bold;
          }
          
          .message-box.error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
          }
          
          .message-box.success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
          }
          
          .loading-state {
            text-align: center;
            padding: 30px;
            color: #5a7a9a;
          }
          
          .empty-state {
            text-align: center;
            padding: 20px;
            color: #7a8a9a;
            font-size: 13px;
          }
          
          .permission-legend {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
          }
          
          .legend-title {
            font-weight: bold;
            font-size: 14px;
            color: #2d4a5f;
            margin-bottom: 10px;
          }
          
          .legend-items {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .legend-item {
            display: flex;
            align-items: flex-start;
            gap: 10px;
          }
          
          .legend-badge {
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
            color: white;
            white-space: nowrap;
            min-width: 80px;
            text-align: center;
          }
          
          .legend-desc {
            font-size: 12px;
            color: #555;
            line-height: 1.4;
          }
        `}</style>
        
        <div className="modal-header">
          Manage Collaborators
        </div>
        
        <div className="collab-body">
          {error && (
            <div className="message-box error">{error}</div>
          )}
          
          {successMessage && (
            <div className="message-box success">{successMessage}</div>
          )}
          
          {isLoading ? (
            <div className="loading-state">Loading collaborators...</div>
          ) : (
            <>
              {/* Owner Section */}
              <div className="collab-section">
                <div className="collab-section-title">Owner</div>
                {owner && (
                  <div className="collab-item owner">
                    <div className="collab-user">
                      <div 
                        className="collab-avatar" 
                        style={{ background: getPermissionColor('owner') }}
                      >
                        {owner.user_callsign?.charAt(0) || 'O'}
                      </div>
                      <div className="collab-info">
                        <span className="collab-name">{owner.user_callsign || 'Owner'}</span>
                        <span className="collab-id">{owner.user_discord_id}</span>
                      </div>
                    </div>
                    <span 
                      className="permission-badge" 
                      style={{ background: getPermissionColor('owner') }}
                      title={permissionDescriptions['owner']}
                    >
                      👑 Owner
                    </span>
                  </div>
                )}
              </div>
              
              {/* Collaborators Section */}
              <div className="collab-section">
                <div className="collab-section-title">
                  Collaborators ({collaborators.length})
                </div>
                
                {collaborators.length === 0 ? (
                  <div className="empty-state">
                    No collaborators yet. Add someone to share this ePRF.
                  </div>
                ) : (
                  <div className="collab-list">
                    {collaborators.map(collab => (
                      <div key={collab.user_discord_id} className="collab-item">
                        <div className="collab-user">
                          <div 
                            className="collab-avatar" 
                            style={{ background: getPermissionColor(collab.permission_level) }}
                          >
                            {collab.user_callsign?.charAt(0) || '?'}
                          </div>
                          <div className="collab-info">
                            <span className="collab-name">
                              {collab.user_callsign || collab.discord_username || 'User'}
                            </span>
                            <span className="collab-id">{collab.user_discord_id}</span>
                          </div>
                        </div>
                        <div className="collab-actions">
                          {(currentUserPermission === 'owner' || 
                            (currentUserPermission === 'manage' && 
                             collab.permission_level !== 'manage')) ? (
                            <>
                              <select
                                className="permission-select"
                                value={collab.permission_level}
                                onChange={(e) => handleUpdatePermission(
                                  collab.user_discord_id, 
                                  e.target.value as PermissionLevel
                                )}
                              >
                                {currentUserPermission === 'owner' && (
                                  <option value="manage">Manage Access</option>
                                )}
                                <option value="edit">Edit</option>
                                <option value="view">View Only</option>
                              </select>
                              <button 
                                className="remove-btn"
                                onClick={() => handleRemoveCollaborator(collab.user_discord_id)}
                              >
                                Remove
                              </button>
                            </>
                          ) : (
                            <span 
                              className="permission-badge" 
                              style={{ background: getPermissionColor(collab.permission_level) }}
                              title={permissionDescriptions[collab.permission_level]}
                            >
                              {getPermissionLabel(collab.permission_level)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add Collaborator Form */}
                {(currentUserPermission === 'owner' || currentUserPermission === 'manage') && (
                  <>
                    {showAddForm ? (
                      <div className="add-form">
                        <div className="add-form-row">
                          <select
                            className="form-select"
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                          >
                            <option value="">Select a user...</option>
                            {availableUsers.map(user => (
                              <option key={user.discord_id} value={user.discord_id}>
                                {user.callsign || user.discord_username} ({user.discord_id})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="add-form-row">
                          <select
                            className="form-select"
                            value={selectedPermission}
                            onChange={(e) => setSelectedPermission(e.target.value as PermissionLevel)}
                          >
                            {currentUserPermission === 'owner' && (
                              <option value="manage">Manage Access</option>
                            )}
                            <option value="edit">Edit</option>
                            <option value="view">View Only</option>
                          </select>
                          <button
                            className="add-btn"
                            onClick={handleAddCollaborator}
                            disabled={!selectedUserId || isAdding}
                          >
                            {isAdding ? 'Adding...' : 'Add'}
                          </button>
                          <button
                            className="cancel-btn"
                            onClick={() => {
                              setShowAddForm(false)
                              setSelectedUserId('')
                              setSelectedPermission('view')
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="show-add-btn"
                        onClick={() => setShowAddForm(true)}
                        style={{ marginTop: '10px' }}
                      >
                        + Add Collaborator
                      </button>
                    )}
                  </>
                )}
              </div>
              
              {/* Transfer Ownership Section (Owner only) */}
              {currentUserPermission === 'owner' && (
                <div className="transfer-section">
                  <div className="collab-section-title">Transfer Ownership</div>
                  
                  {showTransferConfirm ? (
                    <div className="transfer-confirm">
                      <div className="transfer-warning">
                        ⚠️ <strong>Warning:</strong> You are about to transfer ownership to{' '}
                        <strong>{transferTarget?.callsign}</strong>. 
                        You will become a view-only collaborator and cannot undo this action.
                      </div>
                      <div className="add-form-row">
                        <select
                          className="form-select"
                          value={transferTarget?.discordId || ''}
                          onChange={(e) => {
                            const user = transferableUsers.find(u => u.discord_id === e.target.value)
                            setTransferTarget(user ? { discordId: user.discord_id, callsign: user.callsign } : null)
                          }}
                        >
                          <option value="">Select new owner...</option>
                          {transferableUsers.map(user => (
                            <option key={user.discord_id} value={user.discord_id}>
                              {user.callsign} ({user.discord_id})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="add-form-row">
                        <button
                          className="transfer-btn"
                          onClick={handleTransferOwnership}
                          disabled={!transferTarget || isTransferring}
                        >
                          {isTransferring ? 'Transferring...' : 'Confirm Transfer'}
                        </button>
                        <button
                          className="cancel-btn"
                          onClick={() => {
                            setShowTransferConfirm(false)
                            setTransferTarget(null)
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="transfer-btn"
                      onClick={() => setShowTransferConfirm(true)}
                    >
                      🔄 Transfer Ownership
                    </button>
                  )}
                </div>
              )}
            </>
          )}
          
          {/* Permission Legend */}
          <div className="permission-legend">
            <div className="legend-title">Permission Levels:</div>
            <div className="legend-items">
              <div className="legend-item">
                <span className="legend-badge" style={{ background: getPermissionColor('owner') }}>👑 Owner</span>
                <span className="legend-desc">{permissionDescriptions['owner']}</span>
              </div>
              <div className="legend-item">
                <span className="legend-badge" style={{ background: getPermissionColor('manage') }}>⚙️ Manage</span>
                <span className="legend-desc">{permissionDescriptions['manage']}</span>
              </div>
              <div className="legend-item">
                <span className="legend-badge" style={{ background: getPermissionColor('edit') }}>✏️ Edit</span>
                <span className="legend-desc">{permissionDescriptions['edit']}</span>
              </div>
              <div className="legend-item">
                <span className="legend-badge" style={{ background: getPermissionColor('view') }}>👁️ View</span>
                <span className="legend-desc">{permissionDescriptions['view']}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-actions">
          <button className="modal-btn ok" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
