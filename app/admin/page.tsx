"use client"

import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { getCurrentUser, User } from '../utils/userService'
import { 
  isAdmin, 
  ADMIN_DISCORD_ID,
  adminGetAllRecords, 
  adminGetAllUsers,
  adminDeleteRecord,
  adminTransferRecord,
  AdminEPRFRecord,
  User as APIUser,
  getAllEPRFData
} from '../utils/apiClient'
import { downloadEPRFPdf } from '../utils/pdfGenerator'
import ConfirmationModal from '../components/ConfirmationModal'

export const runtime = 'edge'

export default function AdminPage() {
  const router = useRouter()
  
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [records, setRecords] = useState<AdminEPRFRecord[]>([])
  const [users, setUsers] = useState<APIUser[]>([])
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'incomplete' | 'complete'>('all')
  const [authorFilter, setAuthorFilter] = useState<string>('')
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<AdminEPRFRecord | null>(null)
  const [selectedNewAuthor, setSelectedNewAuthor] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)

  const loadData = useCallback(async () => {
    if (!currentUser || !isAdmin(currentUser.discordId)) return
    
    setIsLoading(true)
    try {
      const [recordsData, usersData] = await Promise.all([
        adminGetAllRecords(
          currentUser.discordId,
          searchQuery || undefined,
          statusFilter !== 'all' ? statusFilter : undefined,
          authorFilter || undefined
        ),
        adminGetAllUsers(currentUser.discordId)
      ])
      setRecords(recordsData)
      setUsers(usersData)
    } catch (error) {
      console.error('Failed to load admin data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, searchQuery, statusFilter, authorFilter])

  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUser(user)
    
    if (!user || !isAdmin(user.discordId)) {
      setIsAuthorized(false)
      setIsLoading(false)
      return
    }
    
    setIsAuthorized(true)
    loadData()
  }, [])

  useEffect(() => {
    if (isAuthorized && currentUser) {
      loadData()
    }
  }, [searchQuery, statusFilter, authorFilter, isAuthorized, currentUser, loadData])

  const handleDelete = (record: AdminEPRFRecord) => {
    setSelectedRecord(record)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!selectedRecord || !currentUser) return
    
    setIsProcessing(true)
    try {
      await adminDeleteRecord(
        currentUser.discordId,
        selectedRecord.incident_id,
        selectedRecord.patient_letter
      )
      await loadData()
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setIsProcessing(false)
      setShowDeleteModal(false)
      setSelectedRecord(null)
    }
  }

  const handleTransfer = (record: AdminEPRFRecord) => {
    setSelectedRecord(record)
    setSelectedNewAuthor('')
    setShowTransferModal(true)
  }

  const confirmTransfer = async () => {
    if (!selectedRecord || !currentUser || !selectedNewAuthor) return
    
    const targetUser = users.find(u => u.discord_id === selectedNewAuthor)
    if (!targetUser) return
    
    setIsProcessing(true)
    try {
      await adminTransferRecord(
        currentUser.discordId,
        selectedRecord.incident_id,
        selectedRecord.patient_letter,
        selectedNewAuthor,
        targetUser.callsign
      )
      await loadData()
    } catch (error) {
      console.error('Transfer failed:', error)
    } finally {
      setIsProcessing(false)
      setShowTransferModal(false)
      setSelectedRecord(null)
      setSelectedNewAuthor('')
    }
  }

  const handleEdit = (record: AdminEPRFRecord) => {
    router.push(`/incident?id=${encodeURIComponent(record.incident_id)}&fleetId=${encodeURIComponent(record.fleet_id)}`)
  }

  const handleView = (record: AdminEPRFRecord) => {
    router.push(`/incident?id=${encodeURIComponent(record.incident_id)}&fleetId=${encodeURIComponent(record.fleet_id)}&viewOnly=true`)
  }

  const handleDownload = async (record: AdminEPRFRecord) => {
    try {
      const allData = await getAllEPRFData(record.incident_id, record.patient_letter)
      
      // Construct PDF data from database sections
      const pdfData = {
        incidentId: record.incident_id,
        patientLetter: record.patient_letter,
        incident: allData.incident || null,
        patientInfo: allData.patientInfo || allData.patient_info || null,
        primarySurvey: allData.primarySurvey || allData.primary_survey || null,
        hxComplaint: allData.hxComplaint || allData.hx_complaint || null,
        pastMedicalHistory: allData.pastMedicalHistory || allData.past_medical_history || null,
        clinicalImpression: allData.clinicalImpression || allData.clinical_impression || null,
        disposition: allData.disposition || null,
        vitals: allData.vitals || [],
        medications: allData.medications || [],
        interventions: allData.interventions || []
      }
      
      downloadEPRFPdf(pdfData)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Failed to download ePRF. Please try again.')
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setAuthorFilter('')
  }

  // Group records by incident
  const groupedRecords = records.reduce((acc, record) => {
    if (!acc[record.incident_id]) {
      acc[record.incident_id] = []
    }
    acc[record.incident_id].push(record)
    return acc
  }, {} as Record<string, AdminEPRFRecord[]>)

  if (!isAuthorized) {
    return (
      <div className="admin-unauthorized">
        <style jsx>{`
          .admin-unauthorized {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #1a3a5c;
            color: white;
            text-align: center;
            padding: 20px;
          }
          .unauthorized-icon {
            font-size: 80px;
            margin-bottom: 20px;
          }
          .unauthorized-title {
            font-size: 28px;
            margin-bottom: 10px;
          }
          .unauthorized-text {
            font-size: 16px;
            opacity: 0.8;
            margin-bottom: 30px;
          }
          .back-btn {
            padding: 12px 30px;
            background: #0066cc;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
          }
          .back-btn:hover {
            background: #0052a3;
          }
        `}</style>
        <div className="unauthorized-icon">🔒</div>
        <h1 className="unauthorized-title">Access Denied</h1>
        <p className="unauthorized-text">You don't have permission to access the admin panel.</p>
        <button className="back-btn" onClick={() => router.push('/dashboard')}>
          Return to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="admin-panel">
      <style jsx>{`
        .admin-panel {
          min-height: 100vh;
          background: #0d1b2a;
        }

        .admin-header {
          background: linear-gradient(135deg, #dc3545 0%, #a71d2a 100%);
          padding: 20px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-left h1 {
          color: white;
          font-size: 24px;
          margin: 0 0 5px 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .header-left p {
          color: rgba(255,255,255,0.8);
          font-size: 14px;
          margin: 0;
        }

        .admin-badge {
          background: rgba(0,0,0,0.3);
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .header-right {
          display: flex;
          gap: 12px;
        }

        .header-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-back {
          background: rgba(255,255,255,0.2);
          color: white;
          border: 1px solid rgba(255,255,255,0.3);
        }

        .btn-back:hover {
          background: rgba(255,255,255,0.3);
        }

        .admin-content {
          padding: 30px;
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: #1b2838;
          border-radius: 10px;
          padding: 20px;
          text-align: center;
          border: 1px solid #2d4156;
        }

        .stat-value {
          font-size: 36px;
          font-weight: 700;
          color: white;
          margin-bottom: 5px;
        }

        .stat-label {
          font-size: 14px;
          color: #8899aa;
        }

        .stat-card.total .stat-value { color: #0066cc; }
        .stat-card.incomplete .stat-value { color: #ffc107; }
        .stat-card.complete .stat-value { color: #28a745; }
        .stat-card.users .stat-value { color: #17a2b8; }

        .filter-bar {
          background: #1b2838;
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 25px;
          border: 1px solid #2d4156;
        }

        .filter-row {
          display: flex;
          gap: 15px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-input {
          flex: 1;
          min-width: 250px;
          padding: 10px 15px;
          border: 1px solid #3d5166;
          border-radius: 6px;
          font-size: 14px;
          background: #0d1b2a;
          color: white;
        }

        .search-input::placeholder {
          color: #667788;
        }

        .filter-select {
          padding: 10px 15px;
          border: 1px solid #3d5166;
          border-radius: 6px;
          font-size: 14px;
          min-width: 150px;
          background: #0d1b2a;
          color: white;
        }

        .clear-btn {
          padding: 10px 15px;
          border: 1px solid #3d5166;
          border-radius: 6px;
          background: transparent;
          color: #8899aa;
          font-size: 14px;
          cursor: pointer;
        }

        .clear-btn:hover {
          background: #2d4156;
          color: white;
        }

        .records-table {
          background: #1b2838;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #2d4156;
        }

        .table-header {
          display: grid;
          grid-template-columns: 2fr 80px 1fr 1fr 150px 200px;
          gap: 15px;
          padding: 15px 20px;
          background: #0d1b2a;
          border-bottom: 1px solid #2d4156;
          font-weight: 600;
          color: #8899aa;
          font-size: 13px;
        }

        .table-row {
          display: grid;
          grid-template-columns: 2fr 80px 1fr 1fr 150px 200px;
          gap: 15px;
          padding: 15px 20px;
          border-bottom: 1px solid #2d4156;
          align-items: center;
          color: white;
          transition: background 0.2s;
        }

        .table-row:hover {
          background: #0d1b2a;
        }

        .table-row:last-child {
          border-bottom: none;
        }

        .incident-id {
          font-weight: 600;
          color: #0099ff;
        }

        .patient-letter {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          background: #3d5166;
          border-radius: 50%;
          font-weight: 600;
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.incomplete {
          background: rgba(255, 193, 7, 0.2);
          color: #ffc107;
        }

        .status-badge.complete {
          background: rgba(40, 167, 69, 0.2);
          color: #28a745;
        }

        .author-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .author-callsign {
          font-weight: 500;
        }

        .author-discord {
          font-size: 12px;
          color: #667788;
        }

        .date-info {
          font-size: 13px;
          color: #8899aa;
        }

        .actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .action-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-view { background: #6c757d; color: white; }
        .btn-view:hover { background: #5a6268; }
        
        .btn-edit { background: #0066cc; color: white; }
        .btn-edit:hover { background: #0052a3; }
        
        .btn-download { background: #28a745; color: white; }
        .btn-download:hover { background: #218838; }
        
        .btn-transfer { background: #17a2b8; color: white; }
        .btn-transfer:hover { background: #138496; }
        
        .btn-delete { background: #dc3545; color: white; }
        .btn-delete:hover { background: #c82333; }

        .loading-state {
          text-align: center;
          padding: 60px 30px;
          color: #8899aa;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #2d4156;
          border-top-color: #0066cc;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 60px 30px;
          color: #8899aa;
        }

        .empty-icon {
          font-size: 60px;
          margin-bottom: 20px;
        }

        .transfer-modal {
          background: #1b2838;
          border-radius: 12px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          overflow: hidden;
        }

        .transfer-modal-header {
          background: #17a2b8;
          color: white;
          padding: 20px 25px;
          font-size: 18px;
          font-weight: 600;
        }

        .transfer-modal-body {
          padding: 25px;
        }

        .transfer-info {
          background: #0d1b2a;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
          color: #8899aa;
        }

        .user-select {
          width: 100%;
          padding: 12px 15px;
          border: 1px solid #3d5166;
          border-radius: 6px;
          font-size: 14px;
          background: #0d1b2a;
          color: white;
          margin-bottom: 20px;
        }

        .transfer-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 25px;
          border-top: 1px solid #2d4156;
        }

        .modal-btn {
          padding: 10px 24px;
          font-size: 14px;
          font-weight: 600;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .modal-btn-cancel {
          background: #3d5166;
          color: white;
        }

        .modal-btn-cancel:hover {
          background: #4d6176;
        }

        .modal-btn-confirm {
          background: #17a2b8;
          color: white;
        }

        .modal-btn-confirm:hover {
          background: #138496;
        }

        .modal-btn-confirm:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
      `}</style>

      <div className="admin-header">
        <div className="header-left">
          <h1>
            🛡️ Admin Panel
            <span className="admin-badge">ADMIN</span>
          </h1>
          <p>Manage all ePRF records and users</p>
        </div>
        <div className="header-right">
          <button className="header-btn btn-back" onClick={() => router.push('/dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card total">
            <div className="stat-value">{records.length}</div>
            <div className="stat-label">Total Records</div>
          </div>
          <div className="stat-card incomplete">
            <div className="stat-value">{records.filter(r => r.status === 'incomplete').length}</div>
            <div className="stat-label">Incomplete</div>
          </div>
          <div className="stat-card complete">
            <div className="stat-value">{records.filter(r => r.status === 'complete').length}</div>
            <div className="stat-label">Complete</div>
          </div>
          <div className="stat-card users">
            <div className="stat-value">{users.length}</div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <div className="filter-row">
            <input
              type="text"
              className="search-input"
              placeholder="Search by incident ID, patient letter, or callsign..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select 
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All Status</option>
              <option value="incomplete">Incomplete</option>
              <option value="complete">Complete</option>
            </select>
            <select 
              className="filter-select"
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
            >
              <option value="">All Authors</option>
              {users.map(user => (
                <option key={user.discord_id} value={user.discord_id}>
                  {user.callsign || user.discord_username || user.discord_id}
                </option>
              ))}
            </select>
            <button className="clear-btn" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>

        {/* Records Table */}
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No Records Found</h3>
            <p>No ePRF records match your current filters.</p>
          </div>
        ) : (
          <div className="records-table">
            <div className="table-header">
              <span>Incident ID</span>
              <span>Patient</span>
              <span>Status</span>
              <span>Author</span>
              <span>Created</span>
              <span>Actions</span>
            </div>
            {records.map(record => (
              <div key={`${record.incident_id}-${record.patient_letter}`} className="table-row">
                <span className="incident-id">{record.incident_id}</span>
                <span className="patient-letter">{record.patient_letter}</span>
                <span>
                  <span className={`status-badge ${record.status}`}>{record.status}</span>
                </span>
                <div className="author-info">
                  <span className="author-callsign">{record.author_callsign}</span>
                  <span className="author-discord">{record.discord_username}</span>
                </div>
                <span className="date-info">
                  {new Date(record.created_at).toLocaleDateString('en-GB')}
                </span>
                <div className="actions">
                  {record.status === 'complete' ? (
                    <>
                      <button className="action-btn btn-view" onClick={() => handleView(record)}>View</button>
                      <button className="action-btn btn-download" onClick={() => handleDownload(record)}>📥</button>
                    </>
                  ) : (
                    <button className="action-btn btn-edit" onClick={() => handleEdit(record)}>Edit</button>
                  )}
                  <button className="action-btn btn-transfer" onClick={() => handleTransfer(record)}>Transfer</button>
                  <button className="action-btn btn-delete" onClick={() => handleDelete(record)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete ePRF (Admin)"
        message={`Are you sure you want to permanently delete this ePRF?\n\nIncident: ${selectedRecord?.incident_id}\nPatient: ${selectedRecord?.patient_letter}\nStatus: ${selectedRecord?.status}\n\nThis action cannot be undone.`}
        confirmText="Delete Permanently"
        cancelText="Cancel"
        type="warning"
        isLoading={isProcessing}
      />

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="transfer-modal" onClick={e => e.stopPropagation()}>
            <div className="transfer-modal-header">
              Transfer ePRF
            </div>
            <div className="transfer-modal-body">
              <div className="transfer-info">
                <strong>Transferring:</strong> {selectedRecord?.incident_id} - Patient {selectedRecord?.patient_letter}
                <br />
                <strong>Current Author:</strong> {selectedRecord?.author_callsign}
              </div>
              <label style={{ display: 'block', marginBottom: '10px', color: '#8899aa' }}>
                Select new author:
              </label>
              <select 
                className="user-select"
                value={selectedNewAuthor}
                onChange={(e) => setSelectedNewAuthor(e.target.value)}
              >
                <option value="">-- Select User --</option>
                {users
                  .filter(u => u.discord_id !== selectedRecord?.author_discord_id)
                  .map(user => (
                    <option key={user.discord_id} value={user.discord_id}>
                      {user.callsign || user.discord_username} ({user.vehicle || 'No vehicle'})
                    </option>
                  ))}
              </select>
            </div>
            <div className="transfer-modal-footer">
              <button 
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowTransferModal(false)}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button 
                className="modal-btn modal-btn-confirm"
                onClick={confirmTransfer}
                disabled={!selectedNewAuthor || isProcessing}
              >
                {isProcessing ? 'Transferring...' : 'Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
