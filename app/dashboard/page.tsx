"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { getCurrentUser, User } from '../utils/userService'
import { 
  getEPRFHistoryAsync,
  groupEPRFsByIncident, 
  EPRFRecord, 
  EPRFGroup,
  deleteEPRFRecordAsync,
  searchEPRFs
} from '../utils/eprfHistoryService'
import { downloadEPRFPdf, collectEPRFData } from '../utils/pdfGenerator'
import ConfirmationModal from '../components/ConfirmationModal'
import { isAdmin } from '../utils/apiClient'

export const runtime = 'edge'

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const fleetId = searchParams?.get('fleetId') || ''
  
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [eprfGroups, setEprfGroups] = useState<EPRFGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewCase, setShowNewCase] = useState(false)
  const [incidentNumber, setIncidentNumber] = useState('0000')
  const [caseNumber, setCaseNumber] = useState('001')
  const [caseDate, setCaseDate] = useState('')
  const [caseLetter, setCaseLetter] = useState('A')
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'incomplete' | 'complete'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ incidentId: string; patientLetter: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadEPRFHistory = useCallback(async (discordId: string) => {
    setIsLoading(true)
    try {
      // Try to fetch from API first
      const records = await getEPRFHistoryAsync(discordId)
      
      // Apply local filters
      let filteredRecords = records
      if (statusFilter !== 'all') {
        filteredRecords = filteredRecords.filter(r => r.status === statusFilter)
      }
      if (dateFrom) {
        const fromDate = new Date(dateFrom).getTime()
        filteredRecords = filteredRecords.filter(r => new Date(r.createdAt).getTime() >= fromDate)
      }
      if (dateTo) {
        const toDate = new Date(dateTo).getTime() + (24 * 60 * 60 * 1000)
        filteredRecords = filteredRecords.filter(r => new Date(r.createdAt).getTime() <= toDate)
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        filteredRecords = filteredRecords.filter(r => 
          r.incidentId.toLowerCase().includes(q) ||
          r.patientLetter.toLowerCase().includes(q) ||
          r.authorCallsign.toLowerCase().includes(q)
        )
      }
      
      const groups = groupEPRFsByIncident(filteredRecords)
      setEprfGroups(groups)
    } catch (error) {
      console.error('Failed to load ePRF history:', error)
      // Fallback to local cache
      const filters = {
        status: statusFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      }
      const records = searchEPRFs(discordId, searchQuery, filters)
      const groups = groupEPRFsByIncident(records)
      setEprfGroups(groups)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, dateFrom, dateTo, searchQuery])

  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUser(user)
    
    // Set current date on mount
    const today = new Date()
    const formatted = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`
    setCaseDate(formatted)
    
    // Load ePRF history
    if (user) {
      loadEPRFHistory(user.discordId)
    } else {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadEPRFHistory(currentUser.discordId)
    }
  }, [searchQuery, statusFilter, dateFrom, dateTo, currentUser, loadEPRFHistory])

  const handleLogout = () => {
    router.push('/')
  }

  const handleNewCase = () => {
    setShowNewCase(true)
  }

  const handleCaseOK = () => {
    const fullIncidentNumber = `${incidentNumber}-${caseNumber}-${caseDate}-${caseLetter}`
    router.push(`/incident?id=${encodeURIComponent(fullIncidentNumber)}&fleetId=${encodeURIComponent(fleetId)}`)
    setShowNewCase(false)
  }

  const handleCaseCancel = () => {
    setShowNewCase(false)
  }

  const incrementIncident = () => {
    const num = parseInt(incidentNumber) || 0
    setIncidentNumber(String(Math.min(9999, num + 1)).padStart(4, '0'))
  }

  const decrementIncident = () => {
    const num = parseInt(incidentNumber) || 0
    setIncidentNumber(String(Math.max(0, num - 1)).padStart(4, '0'))
  }

  const handleEdit = (record: EPRFRecord) => {
    router.push(`/incident?id=${encodeURIComponent(record.incidentId)}&fleetId=${encodeURIComponent(record.fleetId)}`)
  }

  const handleView = (record: EPRFRecord) => {
    router.push(`/incident?id=${encodeURIComponent(record.incidentId)}&fleetId=${encodeURIComponent(record.fleetId)}&viewOnly=true`)
  }

  const handleDownload = (record: EPRFRecord) => {
    const data = collectEPRFData(record.incidentId, record.patientLetter)
    downloadEPRFPdf(data)
  }

  const handleDeleteClick = (record: EPRFRecord) => {
    setDeleteTarget({ incidentId: record.incidentId, patientLetter: record.patientLetter })
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (deleteTarget && currentUser) {
      setIsDeleting(true)
      try {
        await deleteEPRFRecordAsync(deleteTarget.incidentId, deleteTarget.patientLetter, currentUser.discordId)
        await loadEPRFHistory(currentUser.discordId)
      } catch (error) {
        console.error('Failed to delete:', error)
      } finally {
        setIsDeleting(false)
        setShowDeleteModal(false)
        setDeleteTarget(null)
      }
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  // Separate incomplete and complete groups
  const incompleteGroups = eprfGroups.filter(g => !g.allComplete)
  const completeGroups = eprfGroups.filter(g => g.allComplete)

  return (
    <div className="eprf-dashboard home-dashboard">
      <style jsx>{`
        .home-dashboard {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: #f0f4f8;
        }

        .dashboard-header {
          background: linear-gradient(135deg, #1a3a5c 0%, #0d2137 100%);
          padding: 20px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-left h1 {
          color: white;
          font-size: 24px;
          margin: 0 0 5px 0;
        }

        .header-left p {
          color: rgba(255,255,255,0.7);
          font-size: 14px;
          margin: 0;
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

        .btn-new-case {
          background: #28a745;
          color: white;
        }

        .btn-new-case:hover {
          background: #218838;
        }

        .btn-admin {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border: none;
        }

        .btn-admin:hover {
          background: linear-gradient(135deg, #5558e3 0%, #7c4fe0 100%);
        }

        .btn-logout {
          background: rgba(255,255,255,0.1);
          color: white;
          border: 1px solid rgba(255,255,255,0.3);
        }

        .btn-logout:hover {
          background: rgba(255,255,255,0.2);
        }

        .dashboard-content {
          flex: 1;
          padding: 30px;
          overflow-y: auto;
        }

        .filter-bar {
          background: white;
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 25px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
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
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .filter-select {
          padding: 10px 15px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          min-width: 150px;
        }

        .filter-btn {
          padding: 10px 15px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: white;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .filter-btn:hover {
          background: #f5f5f5;
        }

        .filter-btn.active {
          background: #e3f2fd;
          border-color: #0066cc;
          color: #0066cc;
        }

        .advanced-filters {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #eee;
          display: flex;
          gap: 15px;
          align-items: center;
          flex-wrap: wrap;
        }

        .date-filter {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .date-filter label {
          font-size: 13px;
          color: #666;
        }

        .date-filter input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .clear-filters {
          color: #0066cc;
          background: none;
          border: none;
          font-size: 13px;
          cursor: pointer;
          text-decoration: underline;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a3a5c;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-title .count {
          background: #e0e0e0;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
        }

        .section-title.incomplete .count {
          background: #fff3cd;
          color: #856404;
        }

        .section-title.complete .count {
          background: #d4edda;
          color: #155724;
        }

        .eprf-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .eprf-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .eprf-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.12);
        }

        .card-header {
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-header.incomplete {
          background: linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%);
          border-bottom: 2px solid #ffc107;
        }

        .card-header.complete {
          background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
          border-bottom: 2px solid #28a745;
        }

        .card-incident-id {
          font-size: 16px;
          font-weight: 700;
          color: #1a3a5c;
        }

        .card-status {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .card-status.incomplete {
          background: #856404;
          color: white;
        }

        .card-status.complete {
          background: #28a745;
          color: white;
        }

        .card-body {
          padding: 20px;
        }

        .card-patients {
          margin-bottom: 15px;
        }

        .patient-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: #f8f9fa;
          border-radius: 6px;
          margin-bottom: 8px;
        }

        .patient-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .patient-letter {
          width: 28px;
          height: 28px;
          background: #1a3a5c;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 13px;
        }

        .patient-status {
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .patient-status.incomplete {
          background: #fff3cd;
          color: #856404;
        }

        .patient-status.complete {
          background: #d4edda;
          color: #155724;
        }

        .card-meta {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #888;
          margin-bottom: 15px;
        }

        .card-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .card-btn {
          flex: 1;
          min-width: 80px;
          padding: 10px 15px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }

        .btn-edit {
          background: #0066cc;
          color: white;
        }

        .btn-edit:hover {
          background: #0052a3;
        }

        .btn-view {
          background: #6c757d;
          color: white;
        }

        .btn-view:hover {
          background: #5a6268;
        }

        .btn-download {
          background: #28a745;
          color: white;
        }

        .btn-download:hover {
          background: #218838;
        }

        .btn-delete {
          background: #dc3545;
          color: white;
        }

        .btn-delete:hover {
          background: #c82333;
        }

        .empty-state {
          text-align: center;
          padding: 60px 30px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        }

        .empty-icon {
          font-size: 60px;
          margin-bottom: 20px;
        }

        .empty-title {
          font-size: 20px;
          font-weight: 600;
          color: #1a3a5c;
          margin-bottom: 10px;
        }

        .empty-text {
          font-size: 14px;
          color: #666;
          margin-bottom: 20px;
        }

        .empty-btn {
          padding: 12px 30px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }

        .empty-btn:hover {
          background: #218838;
        }

        .multi-patient-warning {
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 6px;
          padding: 10px 12px;
          font-size: 12px;
          color: #856404;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .loading-state {
          text-align: center;
          padding: 60px 30px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #e0e0e0;
          border-top-color: #0066cc;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-text {
          font-size: 16px;
          color: #666;
        }
          gap: 8px;
        }
      `}</style>

      <div className="dashboard-header">
        <div className="header-left">
          <h1>ePRF Dashboard</h1>
          <p>Welcome back, {currentUser?.callsign || fleetId}</p>
        </div>
        <div className="header-right">
          {currentUser && isAdmin(currentUser.discordId) && (
            <button className="header-btn btn-admin" onClick={() => router.push('/admin')}>
              ⚙️ Admin Panel
            </button>
          )}
          <button className="header-btn btn-new-case" onClick={handleNewCase}>
            + New Case
          </button>
          <button className="header-btn btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="filter-row">
            <input
              type="text"
              className="search-input"
              placeholder="Search by incident number, patient letter, or callsign..."
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
            <button 
              className={`filter-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              🔍 Filters
            </button>
          </div>
          
          {showFilters && (
            <div className="advanced-filters">
              <div className="date-filter">
                <label>From:</label>
                <input 
                  type="date" 
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="date-filter">
                <label>To:</label>
                <input 
                  type="date" 
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <button className="clear-filters" onClick={clearFilters}>
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading ePRF records...</p>
          </div>
        )}

        {/* Current/Incomplete ePRFs */}
        {!isLoading && incompleteGroups.length > 0 && (
          <>
            <h2 className="section-title incomplete">
              📝 Current ePRFs
              <span className="count">{incompleteGroups.length}</span>
            </h2>
            <div className="eprf-grid">
              {incompleteGroups.map(group => (
                <div key={group.incidentId} className="eprf-card">
                  <div className="card-header incomplete">
                    <span className="card-incident-id">{group.incidentId}</span>
                    <span className="card-status incomplete">In Progress</span>
                  </div>
                  <div className="card-body">
                    {group.patients.length > 1 && (
                      <div className="multi-patient-warning">
                        ⚠️ Multi-patient incident - all patients must be completed before submission
                      </div>
                    )}
                    <div className="card-patients">
                      {group.patients.map(patient => (
                        <div key={patient.patientLetter} className="patient-row">
                          <div className="patient-info">
                            <span className="patient-letter">{patient.patientLetter}</span>
                            <span>Patient {patient.patientLetter}</span>
                          </div>
                          <span className={`patient-status ${patient.status}`}>
                            {patient.status === 'complete' ? '✓ Complete' : 'Incomplete'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="card-meta">
                      <span>Created: {new Date(group.createdAt).toLocaleDateString('en-GB')}</span>
                      <span>Fleet: {group.fleetId}</span>
                    </div>
                    <div className="card-actions">
                      <button 
                        className="card-btn btn-edit"
                        onClick={() => handleEdit(group.patients[0])}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        className="card-btn btn-delete"
                        onClick={() => handleDeleteClick(group.patients.find(p => p.status === 'incomplete') || group.patients[0])}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Completed ePRFs */}
        {!isLoading && completeGroups.length > 0 && (
          <>
            <h2 className="section-title complete">
              ✅ Completed ePRFs
              <span className="count">{completeGroups.length}</span>
            </h2>
            <div className="eprf-grid">
              {completeGroups.map(group => (
                <div key={group.incidentId} className="eprf-card">
                  <div className="card-header complete">
                    <span className="card-incident-id">{group.incidentId}</span>
                    <span className="card-status complete">Completed</span>
                  </div>
                  <div className="card-body">
                    <div className="card-patients">
                      {group.patients.map(patient => (
                        <div key={patient.patientLetter} className="patient-row">
                          <div className="patient-info">
                            <span className="patient-letter">{patient.patientLetter}</span>
                            <span>Patient {patient.patientLetter}</span>
                          </div>
                          <span className="patient-status complete">✓ Complete</span>
                        </div>
                      ))}
                    </div>
                    <div className="card-meta">
                      <span>Submitted: {new Date(group.patients[0]?.submittedAt || group.createdAt).toLocaleDateString('en-GB')}</span>
                      <span>Fleet: {group.fleetId}</span>
                    </div>
                    <div className="card-actions">
                      <button 
                        className="card-btn btn-view"
                        onClick={() => handleView(group.patients[0])}
                      >
                        👁️ View
                      </button>
                      {group.patients.map(patient => (
                        <button 
                          key={patient.patientLetter}
                          className="card-btn btn-download"
                          onClick={() => handleDownload(patient)}
                        >
                          📥 {group.patients.length > 1 ? `Pt ${patient.patientLetter}` : 'Download'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {!isLoading && eprfGroups.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3 className="empty-title">No ePRFs Found</h3>
            <p className="empty-text">
              {searchQuery || statusFilter !== 'all' || dateFrom || dateTo
                ? 'No ePRFs match your current filters. Try adjusting your search criteria.'
                : 'You haven\'t created any ePRFs yet. Click "New Case" to get started.'}
            </p>
            {!searchQuery && statusFilter === 'all' && !dateFrom && !dateTo && (
              <button className="empty-btn" onClick={handleNewCase}>
                + Create New Case
              </button>
            )}
          </div>
        )}
      </div>

      <div className="eprf-footer">
        <div className="footer-left">
          <button className="footer-btn internet">Internet</button>
          <button className="footer-btn server">Server</button>
        </div>
        <div className="footer-center">
          <span className="fleet-label">Fleet ID:</span>
          <span className="fleet-id">{fleetId}</span>
        </div>
        <div className="footer-right">
          <span className="version">v 2.19.1</span>
        </div>
      </div>

      {/* New Case Modal */}
      {showNewCase && (
        <div className="modal-overlay" onClick={handleCaseCancel}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">Master Incident Number</div>
            <div className="modal-body">
              <div className="modal-section-label">Incident Number</div>
              <div className="incident-fields">
                <div className="incident-input-group">
                  <input
                    type="number"
                    value={incidentNumber}
                    onChange={(e) => setIncidentNumber(e.target.value.slice(0, 4).padStart(4, '0'))}
                    className="incident-input"
                    min="0"
                    max="9999"
                    style={{ width: '135px' }}
                  />
                  <div className="incident-arrows">
                    <button className="arrow-btn up" onClick={incrementIncident}>▲</button>
                    <button className="arrow-btn down" onClick={decrementIncident}>▼</button>
                  </div>
                </div>
                <span className="separator">-</span>
                <input
                  type="text"
                  value={caseNumber}
                  readOnly
                  disabled
                  className="incident-part readonly"
                  style={{ width: '75px', backgroundColor: '#c0d0e0', color: '#556575' }}
                />
                <span className="separator">-</span>
                <input
                  type="text"
                  value={caseDate}
                  readOnly
                  disabled
                  className="incident-part date readonly"
                />
                <span className="separator">-</span>
                <input
                  type="text"
                  value={caseLetter}
                  readOnly
                  disabled
                  className="incident-part letter readonly"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={handleCaseCancel}>Cancel</button>
              <button className="modal-btn ok" onClick={handleCaseOK}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete ePRF"
        message={`Are you sure you want to delete this ePRF?\n\nIncident: ${deleteTarget?.incidentId}\nPatient: ${deleteTarget?.patientLetter}\n\nThis action cannot be undone and all data will be permanently lost.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        type="warning"
        isLoading={isDeleting}
      />
    </div>
  )
}
