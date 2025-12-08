"use client"

import { useState, useEffect } from 'react'
import { 
  addCollaborator, 
  removeCollaborator, 
  updateCollaboratorPermission,
  PermissionLevel 
} from '../utils/apiClient'

interface BulkCollaboratorsModalProps {
  isOpen: boolean
  onClose: () => void
  selectedIncidents: string[]
  currentUserDiscordId: string
}

interface BulkCollaborator {
  discordId: string
  callsign: string
  permission: PermissionLevel
  expiresAt?: string
}

export default function BulkCollaboratorsModal({
  isOpen,
  onClose,
  selectedIncidents,
  currentUserDiscordId
}: BulkCollaboratorsModalProps) {
  const [newCollaboratorId, setNewCollaboratorId] = useState('')
  const [newCollaboratorCallsign, setNewCollaboratorCallsign] = useState('')
  const [newPermission, setNewPermission] = useState<PermissionLevel>('view')
  const [expiresAt, setExpiresAt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [results, setResults] = useState<{ incidentId: string; success: boolean; error?: string }[]>([])

  // Permission level info for tooltips
  const permissionInfo: Record<PermissionLevel, string> = {
    'owner': 'Full control: can edit, manage collaborators, and transfer ownership',
    'manage': 'Can edit all fields and manage collaborators',
    'edit': 'Can edit patient data but cannot manage collaborators',
    'view': 'Read-only access to view the ePRF'
  }

  const handleAddToBulk = async () => {
    if (!newCollaboratorId.trim() || !newCollaboratorCallsign.trim()) {
      setError('Please enter both Discord ID and Callsign')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)
    setResults([])

    const bulkResults: { incidentId: string; success: boolean; error?: string }[] = []

    for (const incidentId of selectedIncidents) {
      try {
        await addCollaborator(
          incidentId,
          newCollaboratorId.trim(),
          newCollaboratorCallsign.trim(),
          newPermission,
          currentUserDiscordId
        )
        bulkResults.push({ incidentId, success: true })
      } catch (err) {
        bulkResults.push({ 
          incidentId, 
          success: false, 
          error: err instanceof Error ? err.message : 'Failed to add collaborator' 
        })
      }
    }

    setResults(bulkResults)
    const successCount = bulkResults.filter(r => r.success).length
    const failCount = bulkResults.filter(r => !r.success).length

    if (failCount === 0) {
      setSuccess(`Successfully added collaborator to ${successCount} ePRF(s)`)
      // Clear form
      setNewCollaboratorId('')
      setNewCollaboratorCallsign('')
      setNewPermission('view')
      setExpiresAt('')
    } else if (successCount === 0) {
      setError(`Failed to add collaborator to all ${failCount} ePRF(s)`)
    } else {
      setSuccess(`Added to ${successCount} ePRF(s), failed for ${failCount}`)
    }

    setIsSubmitting(false)
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bulk-collab-modal" onClick={e => e.stopPropagation()}>
        <h2>Bulk Manage Collaborators</h2>
        <p className="modal-description">
          Add a collaborator to {selectedIncidents.length} selected ePRF(s) at once.
        </p>

        <div className="selected-incidents">
          <h4>Selected ePRFs:</h4>
          <div className="incident-chips">
            {selectedIncidents.map(id => (
              <span key={id} className="incident-chip">{id}</span>
            ))}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {results.length > 0 && (
          <div className="results-list">
            {results.map(r => (
              <div key={r.incidentId} className={`result-item ${r.success ? 'success' : 'error'}`}>
                <span>{r.incidentId}</span>
                <span>{r.success ? '✓ Added' : `✗ ${r.error}`}</span>
              </div>
            ))}
          </div>
        )}

        <div className="add-collaborator-section">
          <h4>Add Collaborator to All Selected</h4>
          
          <div className="form-group">
            <label>Discord ID *</label>
            <input
              type="text"
              value={newCollaboratorId}
              onChange={(e) => setNewCollaboratorId(e.target.value)}
              placeholder="Enter Discord ID"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label>Callsign *</label>
            <input
              type="text"
              value={newCollaboratorCallsign}
              onChange={(e) => setNewCollaboratorCallsign(e.target.value)}
              placeholder="Enter Callsign"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label>Permission Level</label>
            <div className="permission-select-wrapper">
              <select
                value={newPermission}
                onChange={(e) => setNewPermission(e.target.value as PermissionLevel)}
                disabled={isSubmitting}
              >
                <option value="view">👁️ View Only</option>
                <option value="edit">✏️ Edit</option>
                <option value="manage">⚙️ Manage</option>
                <option value="owner">👑 Owner</option>
              </select>
              <span className="permission-tooltip" title={permissionInfo[newPermission]}>ℹ️</span>
            </div>
            <small className="permission-hint">{permissionInfo[newPermission]}</small>
          </div>

          <div className="form-group">
            <label>Access Expires (optional)</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={isSubmitting}
              min={new Date().toISOString().slice(0, 16)}
            />
            <small className="expiry-hint">Leave empty for permanent access</small>
          </div>

          <button
            className="btn-add-bulk"
            onClick={handleAddToBulk}
            disabled={isSubmitting || !newCollaboratorId.trim() || !newCollaboratorCallsign.trim()}
          >
            {isSubmitting ? 'Adding...' : `Add to ${selectedIncidents.length} ePRF(s)`}
          </button>
        </div>

        <div className="modal-actions">
          <button className="btn-close" onClick={onClose}>
            Close
          </button>
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal-content {
            background: white;
            border-radius: 8px;
            padding: 24px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          }

          h2 {
            margin: 0 0 8px 0;
            color: #2d4a5f;
          }

          .modal-description {
            color: #666;
            margin-bottom: 16px;
          }

          .selected-incidents {
            background: #f0f5fa;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 16px;
          }

          .selected-incidents h4 {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: #5a7a9a;
          }

          .incident-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }

          .incident-chip {
            background: #5a7a9a;
            color: white;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
          }

          .error-message {
            background: #ffebee;
            color: #c62828;
            padding: 10px 14px;
            border-radius: 4px;
            margin-bottom: 12px;
          }

          .success-message {
            background: #e8f5e9;
            color: #2e7d32;
            padding: 10px 14px;
            border-radius: 4px;
            margin-bottom: 12px;
          }

          .results-list {
            max-height: 120px;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 16px;
          }

          .result-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            border-bottom: 1px solid #eee;
            font-size: 13px;
          }

          .result-item:last-child {
            border-bottom: none;
          }

          .result-item.success {
            background: #f1f8e9;
          }

          .result-item.error {
            background: #ffebee;
          }

          .add-collaborator-section {
            background: #f0f5fa;
            padding: 16px;
            border-radius: 6px;
            margin-bottom: 16px;
          }

          .add-collaborator-section h4 {
            margin: 0 0 12px 0;
            color: #2d4a5f;
          }

          .form-group {
            margin-bottom: 12px;
          }

          .form-group label {
            display: block;
            font-weight: bold;
            margin-bottom: 4px;
            color: #444;
            font-size: 13px;
          }

          .form-group input,
          .form-group select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 14px;
          }

          .permission-select-wrapper {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .permission-select-wrapper select {
            flex: 1;
          }

          .permission-tooltip {
            cursor: help;
            font-size: 16px;
          }

          .permission-hint,
          .expiry-hint {
            display: block;
            margin-top: 4px;
            font-size: 12px;
            color: #666;
            font-style: italic;
          }

          .btn-add-bulk {
            width: 100%;
            padding: 12px;
            background: #4a90d9;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            margin-top: 8px;
          }

          .btn-add-bulk:hover:not(:disabled) {
            background: #357abd;
          }

          .btn-add-bulk:disabled {
            background: #ccc;
            cursor: not-allowed;
          }

          .modal-actions {
            display: flex;
            justify-content: flex-end;
          }

          .btn-close {
            padding: 10px 24px;
            background: #5a7a9a;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
          }

          .btn-close:hover {
            background: #4a6a8a;
          }
        `}</style>
      </div>
    </div>
  )
}
