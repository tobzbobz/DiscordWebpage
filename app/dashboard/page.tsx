"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { getCurrentUser, clearCurrentUser, User } from '../utils/userService'
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
import ConnectionStatus from '../components/ConnectionStatus'
import NotificationCenter from '../components/NotificationCenter'
import BulkCollaboratorsModal from '../components/BulkCollaboratorsModal'
import { QuickFiltersState } from '../components/QuickFilters'
import SearchModal from '../components/SearchModal'
import QuickActionsFAB from '../components/QuickActionsFAB'
import KeyboardShortcuts from '../components/KeyboardShortcuts'
import { isAdmin, getSharedEPRFs, SharedEPRFRecord, PermissionLevel } from '../utils/apiClient'

export const runtime = 'edge'

// Helper to get permission display label
function getPermissionLabel(permission: PermissionLevel, accessType: 'incident' | 'patient', patientLetters?: string[]): string {
  const permLabels: Record<PermissionLevel, string> = {
    'owner': '👑 Owner',
    'manage': '⚙️ Manager',
    'edit': '✏️ Editor',
    'view': '👁️ Viewer'
  }
  const label = permLabels[permission] || permission
  if (accessType === 'patient' && patientLetters?.length) {
    return `${label} (Patient${patientLetters.length > 1 ? 's' : ''} ${patientLetters.join(', ')})`
  }
  return label
}

// Interface for grouped shared ePRFs
interface SharedEPRFGroup {
  incidentId: string
  patients: SharedEPRFRecord[]
  allComplete: boolean
  createdAt: string
  fleetId: string
  permissionLevel: PermissionLevel
  accessType: 'incident' | 'patient'
  accessiblePatients: string[] // Letters of patients user can access
}

// Group shared ePRFs by incident
function groupSharedEPRFs(records: SharedEPRFRecord[]): SharedEPRFGroup[] {
  const groupMap = new Map<string, SharedEPRFGroup>()
  
  for (const record of records) {
    const existing = groupMap.get(record.incident_id)
    if (existing) {
      // Add patient to existing group
      if (!existing.patients.find(p => p.patient_letter === record.patient_letter)) {
        existing.patients.push(record)
      }
      if (record.access_type === 'patient') {
        if (!existing.accessiblePatients.includes(record.patient_letter)) {
          existing.accessiblePatients.push(record.patient_letter)
        }
      }
      // Update to show incident-level access if any record has it
      if (record.access_type === 'incident') {
        existing.accessType = 'incident'
      }
      // Use the highest permission level
      const permOrder = ['owner', 'manage', 'edit', 'view']
      if (permOrder.indexOf(record.permission_level) < permOrder.indexOf(existing.permissionLevel)) {
        existing.permissionLevel = record.permission_level
      }
    } else {
      groupMap.set(record.incident_id, {
        incidentId: record.incident_id,
        patients: [record],
        allComplete: record.status === 'complete',
        createdAt: record.created_at,
        fleetId: record.fleet_id,
        permissionLevel: record.permission_level,
        accessType: record.access_type,
        accessiblePatients: record.access_type === 'patient' ? [record.patient_letter] : []
      })
    }
  }
  
  // Update allComplete for groups
  const groupValues = Array.from(groupMap.values())
  for (let i = 0; i < groupValues.length; i++) {
    const group = groupValues[i]
    group.allComplete = group.patients.every(p => p.status === 'complete')
    group.patients.sort((a, b) => a.patient_letter.localeCompare(b.patient_letter))
  }
  
  return groupValues.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

// Helper to get patient name from localStorage
function getPatientName(incidentId: string, patientLetter: string): string {
  try {
    // Try archived data first (with patient letter suffix)
    let data = localStorage.getItem(`patient_info_${incidentId}_${patientLetter}`)
    if (!data && patientLetter === 'A') {
      // For patient A, also check without letter suffix (current patient)
      data = localStorage.getItem(`patient_info_${incidentId}`)
    }
    if (data) {
      const parsed = JSON.parse(data)
      const lastName = parsed.surname || parsed.lastName || parsed.last_name || ''
      const chiefComplaint = parsed.chiefComplaint || parsed.chief_complaint || parsed.chiefcomplaint || ''
      if (lastName || chiefComplaint) {
        return `${lastName} | ${chiefComplaint}`.trim()
      }
    }
  } catch {
    // Ignore parse errors
  }
  return ''
}

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
  
  // Shared ePRFs
  const [sharedGroups, setSharedGroups] = useState<SharedEPRFGroup[]>([])
  
  // Bulk selection for collaborator management
  const [bulkSelectMode, setBulkSelectMode] = useState(false)
  const [selectedIncidents, setSelectedIncidents] = useState<Set<string>>(new Set())
  const [showBulkCollabModal, setShowBulkCollabModal] = useState(false)
  
  // New feature states
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [quickFilters, setQuickFilters] = useState<QuickFiltersState>({
    showMyRecords: false,
    showSharedWithMe: false,
    showIncomplete: false,
    showComplete: false,
    dateRange: 'all',
    sortBy: 'date-desc'
  })

  const toggleIncidentSelection = (incidentId: string) => {
    setSelectedIncidents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(incidentId)) {
        newSet.delete(incidentId)
      } else {
        newSet.add(incidentId)
      }
      return newSet
    })
  }

  const selectAllIncidents = () => {
    const allIds = eprfGroups.map(g => g.incidentId)
    setSelectedIncidents(new Set(allIds))
  }

  const clearSelection = () => {
    setSelectedIncidents(new Set())
  }

  const loadEPRFHistory = useCallback(async (discordId: string) => {
    setIsLoading(true)
    try {
      // Load user's own ePRFs
      const records = await getEPRFHistoryAsync(discordId)
      
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
      
      // Load shared ePRFs
      const sharedRecords = await getSharedEPRFs(discordId)
      // Filter out records that are in user's own ePRFs
      const ownIncidentIds = new Set(records.map(r => r.incidentId))
      const filteredShared = sharedRecords.filter(r => !ownIncidentIds.has(r.incident_id))
      
      // Apply same filters to shared records
      let filteredSharedRecords = filteredShared
      if (statusFilter !== 'all') {
        filteredSharedRecords = filteredSharedRecords.filter(r => r.status === statusFilter)
      }
      if (dateFrom) {
        const fromDate = new Date(dateFrom).getTime()
        filteredSharedRecords = filteredSharedRecords.filter(r => new Date(r.created_at).getTime() >= fromDate)
      }
      if (dateTo) {
        const toDate = new Date(dateTo).getTime() + (24 * 60 * 60 * 1000)
        filteredSharedRecords = filteredSharedRecords.filter(r => new Date(r.created_at).getTime() <= toDate)
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        filteredSharedRecords = filteredSharedRecords.filter(r => 
          r.incident_id.toLowerCase().includes(q) ||
          r.patient_letter.toLowerCase().includes(q) ||
          r.author_callsign.toLowerCase().includes(q)
        )
      }
      
      const sharedGrouped = groupSharedEPRFs(filteredSharedRecords)
      setSharedGroups(sharedGrouped)
    } catch (error) {
      console.error('Failed to load ePRF history:', error)
      const filters = {
        status: statusFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      }
      const records = searchEPRFs(discordId, searchQuery, filters)
      const groups = groupEPRFsByIncident(records)
      setEprfGroups(groups)
      setSharedGroups([])
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, dateFrom, dateTo, searchQuery])

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      // If not authenticated, force redirect to login and prevent back navigation
      router.replace('/');
      return;
    }
    setCurrentUser(user);
    const today = new Date();
    const formatted = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    setCaseDate(formatted);
    loadEPRFHistory(user.discordId);
  }, [router]);

  useEffect(() => {
    if (currentUser) {
      loadEPRFHistory(currentUser.discordId)
    }
  }, [searchQuery, statusFilter, dateFrom, dateTo, currentUser, loadEPRFHistory])

  const handleLogout = () => {
    clearCurrentUser()
    router.replace('/')
  }

  const handleNewCase = () => {
    setShowNewCase(true)
  }

  // Keyboard shortcut handlers
  const handleKeyboardShortcut = (action: string) => {
    switch (action) {
      case 'new':
        handleNewCase()
        break
      case 'search':
        setShowSearchModal(true)
        break
      case 'help':
        // Help modal handled by KeyboardShortcuts component
        break
    }
  }

  // Quick filter change handler
  const handleQuickFilterChange = (filters: QuickFiltersState) => {
    setQuickFilters(filters)
    // Apply filters to the search
    if (filters.showIncomplete && !filters.showComplete) {
      setStatusFilter('incomplete')
    } else if (filters.showComplete && !filters.showIncomplete) {
      setStatusFilter('complete')
    } else {
      setStatusFilter('all')
    }
    // Date range filter
    if (filters.dateRange === 'today') {
      const today = new Date().toISOString().split('T')[0]
      setDateFrom(today)
      setDateTo(today)
    } else if (filters.dateRange === 'week') {
      const today = new Date()
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 7)
      setDateFrom(weekAgo.toISOString().split('T')[0])
      setDateTo(today.toISOString().split('T')[0])
    } else if (filters.dateRange === 'month') {
      const today = new Date()
      const monthAgo = new Date(today)
      monthAgo.setMonth(today.getMonth() - 1)
      setDateFrom(monthAgo.toISOString().split('T')[0])
      setDateTo(today.toISOString().split('T')[0])
    } else {
      setDateFrom('')
      setDateTo('')
    }
  }

  // Quick actions
  const quickActions = [
    { id: 'new', icon: '➕', label: 'New Case', onClick: handleNewCase },
    { id: 'search', icon: '🔍', label: 'Search', onClick: () => setShowSearchModal(true) },
    { id: 'bulk', icon: '👥', label: 'Bulk Manage', onClick: () => setBulkSelectMode(!bulkSelectMode) }
  ]

  const handleCaseOK = () => {
    const fullIncidentNumber = `${incidentNumber}-${caseNumber}-${caseDate}-${caseLetter}`
    // Use fleetId from URL, or from current user, or default to 'default'
    const effectiveFleetId = fleetId || currentUser?.callsign || 'default'
    router.push(`/incident?id=${encodeURIComponent(fullIncidentNumber)}&fleetId=${encodeURIComponent(effectiveFleetId)}`)
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
    // Navigate to view the record (same as edit for now)
    router.push(`/incident?id=${encodeURIComponent(record.incidentId)}&fleetId=${encodeURIComponent(record.fleetId)}`)
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

  const incompleteGroups = eprfGroups.filter(g => !g.allComplete)
  const completeGroups = eprfGroups.filter(g => g.allComplete)

  return (
    <div className="eprf-dashboard">
      <style jsx>{`
        .dashboard-body {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }

        .filter-section {
          background: rgba(176, 206, 235, 0.85);
          border: 2px solid #5a7a9a;
          border-radius: 8px;
          padding: 15px 20px;
          margin-bottom: 20px;
        }

        .filter-row {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-input {
          flex: 1;
          min-width: 200px;
          padding: 8px 12px;
          border: 2px solid #5a7a9a;
          border-radius: 4px;
          font-size: 14px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .filter-select {
          padding: 8px 12px;
          border: 2px solid #5a7a9a;
          border-radius: 4px;
          font-size: 14px;
          font-family: Arial, Helvetica, sans-serif;
          background: white;
          min-width: 130px;
        }

        .filter-btn {
          padding: 8px 14px;
          border: 2px solid #5a7a9a;
          border-radius: 4px;
          background: white;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          color: #2d4a5f;
        }

        .filter-btn:hover {
          background: #e8f0f8;
        }

        .filter-btn.active {
          background: #5a7a9a;
          color: white;
        }

        /* Filters Modal Styles */
        .filters-modal {
          min-width: 360px;
          max-width: 420px;
        }

        .filter-group {
          margin-bottom: 16px;
        }

        .filter-group:last-child {
          margin-bottom: 0;
        }

        .filter-group-label {
          font-size: 14px;
          font-weight: bold;
          color: #2d4a5f;
          margin-bottom: 8px;
        }

        .filter-options {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .filter-checkbox {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 14px;
          color: #2d4a5f;
        }

        .filter-checkbox input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: #4a6d8c;
        }

        .date-range-options {
          display: flex;
          gap: 6px;
          margin-bottom: 10px;
        }

        .date-range-btn {
          flex: 1;
          padding: 6px 10px;
          border: 2px solid #5a7a9a;
          border-radius: 4px;
          background: white;
          font-size: 13px;
          font-weight: bold;
          cursor: pointer;
          color: #2d4a5f;
          transition: all 0.2s;
        }

        .date-range-btn:hover {
          background: #e8f0f8;
        }

        .date-range-btn.active {
          background: #5a7a9a;
          color: white;
        }

        .custom-date-range {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .date-input-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .date-input-group label {
          font-size: 13px;
          font-weight: bold;
          color: #2d4a5f;
        }

        .date-input-group input {
          padding: 5px 8px;
          border: 2px solid #5a7a9a;
          border-radius: 4px;
          font-size: 13px;
        }

        .sort-select {
          width: 100%;
        }

        .section-header {
          font-size: 16px;
          font-weight: bold;
          color: #1a3a5c;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: rgba(176, 206, 235, 0.6);
          border-radius: 6px;
        }

        .section-header .count {
          background: #5a7a9a;
          color: white;
          padding: 2px 10px;
          border-radius: 10px;
          font-size: 13px;
        }

        .section-header.incomplete {
          border-left: 4px solid #ffc107;
        }

        .section-header.complete {
          border-left: 4px solid #28a745;
        }

        .eprf-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 25px;
        }

        .eprf-item {
          background: rgba(176, 206, 235, 0.85);
          border: 2px solid #5a7a9a;
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .eprf-item.selected {
          border-color: #4a90d9;
          box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.3);
        }

        .bulk-checkbox {
          width: 18px;
          height: 18px;
          margin-right: 10px;
          cursor: pointer;
          accent-color: #4a90d9;
        }

        .bulk-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding: 10px 14px;
          background: rgba(176, 206, 235, 0.5);
          border-radius: 6px;
        }

        .bulk-mode-btn {
          padding: 8px 14px;
          border: 2px solid #5a7a9a;
          border-radius: 4px;
          background: white;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          color: #2d4a5f;
        }

        .bulk-mode-btn:hover {
          background: #e8f0f8;
        }

        .bulk-mode-btn.active {
          background: #5a7a9a;
          color: white;
        }

        .bulk-action-btn {
          padding: 6px 12px;
          border: 1px solid #5a7a9a;
          border-radius: 4px;
          background: white;
          font-size: 13px;
          cursor: pointer;
          color: #2d4a5f;
        }

        .bulk-action-btn:hover {
          background: #e8f0f8;
        }

        .bulk-action-btn.primary {
          background: #4a90d9;
          color: white;
          border-color: #357abd;
        }

        .bulk-action-btn.primary:hover {
          background: #357abd;
        }

        .selection-count {
          font-weight: bold;
          color: #2d4a5f;
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 4px;
        }

        .eprf-item-header {
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(to bottom, #6a8db4 0%, #5a7da4 100%);
          border-bottom: 2px solid #5a7a9a;
        }

        .eprf-item-header.incomplete {
          background: linear-gradient(to bottom, #d4a94a 0%, #c49840 100%);
        }

        .eprf-item-header.complete {
          background: linear-gradient(to bottom, #5a9d5a 0%, #4a8d4a 100%);
        }

        .eprf-incident-id {
          font-size: 16px;
          font-weight: bold;
          color: white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }

        .eprf-status-badge {
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          color: white;
          text-shadow: 0 1px 1px rgba(0,0,0,0.2);
        }

        .eprf-status-badge.incomplete {
          background: #856404;
        }

        .eprf-status-badge.complete {
          background: #155724;
        }

        .eprf-item-body {
          padding: 15px;
        }

        .multi-patient-note {
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 12px;
          color: #856404;
          margin-bottom: 12px;
          font-weight: bold;
        }

        .patient-list {
          margin-bottom: 12px;
        }

        .patient-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: white;
          border: 1px solid #5a7a9a;
          border-radius: 4px;
          margin-bottom: 6px;
        }

        .patient-item:last-child {
          margin-bottom: 0;
        }

        .patient-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .patient-badge {
          width: 26px;
          height: 26px;
          background: #1a3a5c;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 13px;
        }

        .patient-label {
          font-size: 14px;
          font-weight: bold;
          color: #2d4a5f;
        }

        .patient-status-tag {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 3px;
          font-weight: bold;
        }

        .patient-status-tag.incomplete {
          background: #fff3cd;
          color: #856404;
        }

        .patient-status-tag.complete {
          background: #d4edda;
          color: #155724;
        }

        .eprf-meta {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #5a7a9a;
          margin-bottom: 12px;
          font-weight: bold;
        }

        .eprf-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .eprf-action-btn {
          flex: 1;
          min-width: 80px;
          padding: 8px 12px;
          border: 2px solid;
          border-radius: 4px;
          font-size: 13px;
          font-weight: bold;
          cursor: pointer;
          text-shadow: 0 1px 1px rgba(0,0,0,0.2);
          transition: all 0.2s;
        }

        .btn-edit {
          background: linear-gradient(to bottom, #6d9d5a 0%, #5a8d47 100%);
          border-color: #4a7d37;
          color: white;
        }

        .btn-edit:hover {
          background: linear-gradient(to bottom, #7dad6a 0%, #6a9d57 100%);
        }

        .btn-view {
          background: linear-gradient(to bottom, #5a7a9a 0%, #4a6a8a 100%);
          border-color: #3a5a7a;
          color: white;
        }

        .btn-view:hover {
          background: linear-gradient(to bottom, #6a8aaa 0%, #5a7a9a 100%);
        }

        .btn-download {
          background: linear-gradient(to bottom, #5cb85c 0%, #449d44 100%);
          border-color: #3d8b3d;
          color: white;
        }

        .btn-download:hover {
          background: linear-gradient(to bottom, #6cc86c 0%, #54ad54 100%);
        }

        .btn-delete {
          background: linear-gradient(to bottom, #d9534f 0%, #c9302c 100%);
          border-color: #b52b27;
          color: white;
        }

        .btn-delete:hover {
          background: linear-gradient(to bottom, #e9635f 0%, #d9403c 100%);
        }

        .empty-state {
          text-align: center;
          padding: 50px 30px;
          background: rgba(176, 206, 235, 0.85);
          border: 2px solid #5a7a9a;
          border-radius: 8px;
        }

        .empty-icon {
          font-size: 50px;
          margin-bottom: 15px;
        }

        .empty-title {
          font-size: 18px;
          font-weight: bold;
          color: #1a3a5c;
          margin-bottom: 8px;
        }

        .empty-text {
          font-size: 14px;
          color: #5a7a9a;
          margin-bottom: 15px;
        }

        .empty-btn {
          padding: 10px 25px;
          background: linear-gradient(to bottom, #6d9d5a 0%, #5a8d47 100%);
          color: white;
          border: 2px solid #4a7d37;
          border-radius: 6px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          text-shadow: 0 1px 1px rgba(0,0,0,0.2);
        }

        .empty-btn:hover {
          background: linear-gradient(to bottom, #7dad6a 0%, #6a9d57 100%);
        }

        .loading-state {
          text-align: center;
          padding: 50px 30px;
          background: rgba(176, 206, 235, 0.85);
          border: 2px solid #5a7a9a;
          border-radius: 8px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #c0d0e0;
          border-top-color: #5a7a9a;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 15px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-text {
          font-size: 15px;
          color: #5a7a9a;
          font-weight: bold;
        }

        /* Shared ePRFs Section */
        .section-header.shared {
          border-left: 4px solid #6a5acd;
          background: rgba(176, 196, 235, 0.6);
        }

        .eprf-item-header.shared {
          background: linear-gradient(to bottom, #7b68ee 0%, #6a5acd 100%);
        }

        .eprf-status-badge.shared {
          background: #483d8b;
        }

        .permission-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
          color: white;
          background: rgba(0, 0, 0, 0.3);
          margin-left: 10px;
        }

        .permission-badge.owner {
          background: #d4af37;
        }

        .permission-badge.manage {
          background: #5a7a9a;
        }

        .permission-badge.edit {
          background: #4a9a6a;
        }

        .permission-badge.view {
          background: #7a6a9a;
        }

        .shared-by-info {
          font-size: 12px;
          color: #6a5acd;
          font-style: italic;
          margin-bottom: 8px;
        }

        .access-info {
          font-size: 12px;
          color: #5a6a7a;
          margin-top: 5px;
        }
      `}</style>

      <div className="eprf-nav">
        <button className="nav-btn" onClick={handleNewCase}>New Case</button>
        {currentUser && isAdmin(currentUser.discordId) && (
          <button className="nav-btn" onClick={() => router.push('/admin')}>Admin Panel</button>
        )}
        <button className="nav-btn" onClick={handleLogout}>Logout</button>
        <div className="page-counter">
          {currentUser && <NotificationCenter discordId={currentUser.discordId} callsign={currentUser.callsign} />}
          <span className="patient-letter">{currentUser?.callsign || fleetId}</span>
          <span className="page-indicator">Dashboard</span>
        </div>
      </div>

      <div className="dashboard-body">
        {/* Filter Section */}
        <div className="filter-section">
          <div className="filter-row">
            <input
              type="text"
              className="search-input"
              placeholder="Search by incident number, patient, or callsign..."
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
              Filters
            </button>
            <button 
              className="filter-btn"
              onClick={() => setShowSearchModal(true)}
              title="Advanced Search (Ctrl+K)"
            >
              Search
            </button>
          </div>
        </div>

        {/* Filters Popup Modal */}
        {showFilters && (
          <div className="modal-overlay" onClick={() => setShowFilters(false)}>
            <div className="modal-dialog filters-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">Filter Options</div>
              <div className="modal-body">
                {/* Record Type Filters */}
                <div className="filter-group">
                  <div className="filter-group-label">Record Type</div>
                  <div className="filter-options">
                    <label className="filter-checkbox">
                      <input 
                        type="checkbox"
                        checked={quickFilters.showMyRecords}
                        onChange={() => handleQuickFilterChange({
                          ...quickFilters,
                          showMyRecords: !quickFilters.showMyRecords
                        })}
                      />
                      <span>My Records</span>
                    </label>
                    <label className="filter-checkbox">
                      <input 
                        type="checkbox"
                        checked={quickFilters.showSharedWithMe}
                        onChange={() => handleQuickFilterChange({
                          ...quickFilters,
                          showSharedWithMe: !quickFilters.showSharedWithMe
                        })}
                      />
                      <span>Shared With Me</span>
                    </label>
                  </div>
                </div>

                {/* Status Filters */}
                <div className="filter-group">
                  <div className="filter-group-label">Status</div>
                  <div className="filter-options">
                    <label className="filter-checkbox">
                      <input 
                        type="checkbox"
                        checked={quickFilters.showIncomplete}
                        onChange={() => handleQuickFilterChange({
                          ...quickFilters,
                          showIncomplete: !quickFilters.showIncomplete
                        })}
                      />
                      <span>In Progress</span>
                    </label>
                    <label className="filter-checkbox">
                      <input 
                        type="checkbox"
                        checked={quickFilters.showComplete}
                        onChange={() => handleQuickFilterChange({
                          ...quickFilters,
                          showComplete: !quickFilters.showComplete
                        })}
                      />
                      <span>Complete</span>
                    </label>
                  </div>
                </div>

                {/* Date Range */}
                <div className="filter-group">
                  <div className="filter-group-label">Date Range</div>
                  <div className="date-range-options">
                    {(['today', 'week', 'month', 'all'] as const).map((range) => (
                      <button
                        key={range}
                        className={`date-range-btn ${quickFilters.dateRange === range ? 'active' : ''}`}
                        onClick={() => handleQuickFilterChange({
                          ...quickFilters,
                          dateRange: range
                        })}
                      >
                        {range === 'today' ? 'Today' : range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'All'}
                      </button>
                    ))}
                  </div>
                  <div className="custom-date-range">
                    <div className="date-input-group">
                      <label>From:</label>
                      <input 
                        type="date" 
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                    </div>
                    <div className="date-input-group">
                      <label>To:</label>
                      <input 
                        type="date" 
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Sort By */}
                <div className="filter-group">
                  <div className="filter-group-label">Sort By</div>
                  <select
                    className="filter-select sort-select"
                    value={quickFilters.sortBy || 'date-desc'}
                    onChange={(e) => handleQuickFilterChange({
                      ...quickFilters,
                      sortBy: e.target.value as QuickFiltersState['sortBy']
                    })}
                  >
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="incident-id">Incident ID</option>
                    <option value="status">Status</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button className="modal-btn cancel" onClick={clearFilters}>Clear All</button>
                <button className="modal-btn ok" onClick={() => setShowFilters(false)}>Apply</button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Selection Toolbar */}
        <div className="bulk-toolbar">
          <button 
            className={`bulk-mode-btn ${bulkSelectMode ? 'active' : ''}`}
            onClick={() => {
              setBulkSelectMode(!bulkSelectMode)
              if (bulkSelectMode) clearSelection()
            }}
          >
            {bulkSelectMode ? '✗ Cancel Selection' : '☑ Bulk Select'}
          </button>
          
          {bulkSelectMode && (
            <>
              <button className="bulk-action-btn" onClick={selectAllIncidents}>
                Select All ({eprfGroups.length})
              </button>
              <button className="bulk-action-btn" onClick={clearSelection}>
                Clear Selection
              </button>
              <span className="selection-count">
                {selectedIncidents.size} selected
              </span>
              {selectedIncidents.size > 0 && (
                <button 
                  className="bulk-action-btn primary"
                  onClick={() => setShowBulkCollabModal(true)}
                >
                  Manage Collaborators
                </button>
              )}
            </>
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
            <div className="section-header incomplete">
              📝 Current ePRFs
              <span className="count">{incompleteGroups.length}</span>
            </div>
            <div className="eprf-list">
              {incompleteGroups.map(group => (
                <div key={group.incidentId} className={`eprf-item ${selectedIncidents.has(group.incidentId) ? 'selected' : ''}`}>
                  <div className="eprf-item-header incomplete">
                    {bulkSelectMode && (
                      <input
                        type="checkbox"
                        className="bulk-checkbox"
                        checked={selectedIncidents.has(group.incidentId)}
                        onChange={() => toggleIncidentSelection(group.incidentId)}
                      />
                    )}
                    <span className="eprf-incident-id">{group.incidentId}</span>
                    <span className="eprf-status-badge incomplete">In Progress</span>
                  </div>
                  <div className="eprf-item-body">
                    {group.patients.length > 1 && (
                      <div className="multi-patient-note">
                        ⚠️ Multi-patient incident - all patients must be completed before submission
                      </div>
                    )}
                    <div className="patient-list">
                      {group.patients.map(patient => {
                        const patientName = getPatientName(patient.incidentId, patient.patientLetter)
                        return (
                          <div key={patient.patientLetter} className="patient-item">
                            <div className="patient-info">
                              <span className="patient-badge">{patient.patientLetter}</span>
                              <span className="patient-label">
                                {patientName || `Patient ${patient.patientLetter}`}
                              </span>
                            </div>
                            <span className={`patient-status-tag ${patient.status}`}>
                              {patient.status === 'complete' ? '✓ Complete' : 'Incomplete'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="eprf-meta">
                      <span>Created: {new Date(group.createdAt).toLocaleDateString('en-GB')}</span>
                      <span>Fleet: {group.fleetId}</span>
                    </div>
                    <div className="eprf-actions">
                      {group.patients.length === 1 ? (
                        <>
                          {/* Only allow edit for patient owner or current user */}
                          {(currentUser && group.patients[0].author === currentUser.discordId) && (
                            <button 
                              className="eprf-action-btn btn-edit"
                              onClick={() => handleEdit(group.patients[0])}
                            >
                              Edit
                            </button>
                          )}
                          {/* Delete for patient owner only */}
                          {(currentUser && group.patients[0].author === currentUser.discordId) && (
                            <button 
                              className="eprf-action-btn btn-delete"
                              onClick={() => handleDeleteClick(group.patients[0])}
                            >
                              Delete
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Edit/Delete for patient owner only */}
                          {group.patients.map(patient => (
                            <div key={patient.patientLetter} style={{ display: 'inline-block', marginRight: 8 }}>
                              {(currentUser && patient.author === currentUser.discordId) && (
                                <button 
                                  className="eprf-action-btn btn-edit"
                                  onClick={() => handleEdit(patient)}
                                >
                                  Edit {patient.patientLetter}
                                </button>
                              )}
                              {(currentUser && patient.author === currentUser.discordId) && (
                                <button 
                                  className="eprf-action-btn btn-delete"
                                  onClick={() => handleDeleteClick(patient)}
                                >
                                  Delete {patient.patientLetter}
                                </button>
                              )}
                            </div>
                          ))}
                        </>
                      )}
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
            <div className="section-header complete">
              ✅ Completed ePRFs
              <span className="count">{completeGroups.length}</span>
            </div>
            <div className="eprf-list">
              {completeGroups.map(group => (
                <div key={group.incidentId} className={`eprf-item ${selectedIncidents.has(group.incidentId) ? 'selected' : ''}`}>
                  <div className="eprf-item-header complete">
                    {bulkSelectMode && (
                      <input
                        type="checkbox"
                        className="bulk-checkbox"
                        checked={selectedIncidents.has(group.incidentId)}
                        onChange={() => toggleIncidentSelection(group.incidentId)}
                      />
                    )}
                    <span className="eprf-incident-id">{group.incidentId}</span>
                    <span className="eprf-status-badge complete">Completed</span>
                  </div>
                  <div className="eprf-item-body">
                    <div className="patient-list">
                      {group.patients.map(patient => {
                        const patientName = getPatientName(patient.incidentId, patient.patientLetter)
                        return (
                          <div key={patient.patientLetter} className="patient-item">
                            <div className="patient-info">
                              <span className="patient-badge">{patient.patientLetter}</span>
                              <span className="patient-label">
                                {patientName || `Patient ${patient.patientLetter}`}
                              </span>
                            </div>
                            <span className="patient-status-tag complete">✓ Complete</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="eprf-meta">
                      <span>Submitted: {new Date(group.patients[0]?.submittedAt || group.createdAt).toLocaleDateString('en-GB')}</span>
                      <span>Fleet: {group.fleetId}</span>
                    </div>
                    <div className="eprf-actions">
                      <button 
                        className="eprf-action-btn btn-view"
                        onClick={() => handleView(group.patients[0])}
                      >
                        View
                      </button>
                      {group.patients.map(patient => (
                        <button 
                          key={patient.patientLetter}
                          className="eprf-action-btn btn-download"
                          onClick={() => handleDownload(patient)}
                        >
                          {group.patients.length > 1 ? `Download ${patient.patientLetter}` : 'Download'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Shared ePRFs */}
        {!isLoading && sharedGroups.length > 0 && (
          <>
            <div className="section-header shared">
              🤝 Shared With You
              <span className="count">{sharedGroups.length}</span>
            </div>
            <div className="eprf-list">
              {sharedGroups.map(group => (
                <div key={group.incidentId} className="eprf-item">
                  <div className={`eprf-item-header shared`}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="eprf-incident-id">{group.incidentId}</span>
                      <span className={`permission-badge ${group.permissionLevel}`}>
                        {getPermissionLabel(group.permissionLevel, group.accessType, group.accessiblePatients)}
                      </span>
                    </div>
                    <span className={`eprf-status-badge ${group.allComplete ? 'complete' : 'incomplete'}`}>
                      {group.allComplete ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                  <div className="eprf-item-body">
                    <div className="shared-by-info">
                      Owned by: {group.patients[0]?.author_callsign || 'Unknown'}
                    </div>
                    <div className="patient-list">
                      {group.patients.map(patient => {
                        const patientName = getPatientName(patient.incident_id, patient.patient_letter)
                        const hasPatientAccess = group.accessType === 'incident' || 
                          group.accessiblePatients.includes(patient.patient_letter)
                        return (
                          <div 
                            key={patient.patient_letter} 
                            className="patient-item"
                            style={{ opacity: hasPatientAccess ? 1 : 0.5 }}
                          >
                            <div className="patient-info">
                              <span className="patient-badge">{patient.patient_letter}</span>
                              <span className="patient-label">
                                {patientName || `Patient ${patient.patient_letter}`}
                                {!hasPatientAccess && ' (No access)'}
                              </span>
                            </div>
                            <span className={`patient-status-tag ${patient.status}`}>
                              {patient.status === 'complete' ? '✓ Complete' : 'Incomplete'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    {group.accessType === 'patient' && (
                      <div className="access-info">
                        You have access to: Patient{group.accessiblePatients.length > 1 ? 's' : ''} {group.accessiblePatients.join(', ')}
                      </div>
                    )}
                    <div className="eprf-meta">
                      <span>Created: {new Date(group.createdAt).toLocaleDateString('en-GB')}</span>
                      <span>Fleet: {group.fleetId}</span>
                    </div>
                    <div className="eprf-actions">
                      {(group.permissionLevel === 'owner' || group.permissionLevel === 'manage' || group.permissionLevel === 'edit') ? (
                        <button 
                          className="eprf-action-btn btn-edit"
                          onClick={() => router.push(`/incident?id=${encodeURIComponent(group.incidentId)}&fleetId=${encodeURIComponent(group.fleetId)}`)}
                        >
                          Edit
                        </button>
                      ) : (
                        <button 
                          className="eprf-action-btn btn-view"
                          onClick={() => router.push(`/incident?id=${encodeURIComponent(group.incidentId)}&fleetId=${encodeURIComponent(group.fleetId)}`)}
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {!isLoading && eprfGroups.length === 0 && sharedGroups.length === 0 && (
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
        <ConnectionStatus />
        <div className="footer-center">
          <span className="fleet-label">Fleet ID:</span>
          <span className="fleet-id">{fleetId || currentUser?.callsign || '-'}</span>
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

      {/* Bulk Collaborators Modal */}
      <BulkCollaboratorsModal
        isOpen={showBulkCollabModal}
        onClose={() => setShowBulkCollabModal(false)}
        selectedIncidents={Array.from(selectedIncidents)}
        currentUserDiscordId={currentUser?.discordId || ''}
      />

      {/* Search Modal */}
      {currentUser && (
        <SearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          discordId={currentUser.discordId}
        />
      )}

      {/* Quick Actions FAB */}
      {currentUser && (
        <QuickActionsFAB 
          discordId={currentUser.discordId}
          callsign={currentUser.callsign}
          customActions={[
            { id: 'new', icon: '➕', label: 'New Case', onClick: handleNewCase },
            { id: 'search', icon: '🔍', label: 'Search', onClick: () => setShowSearchModal(true) },
            { id: 'bulk', icon: '👥', label: 'Bulk Manage', onClick: () => setBulkSelectMode(!bulkSelectMode) }
          ]}
        />
      )}

      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts 
        shortcuts={[
          { key: 'n', ctrlKey: true, action: () => handleNewCase(), description: 'New Case', category: 'Navigation' },
          { key: 'k', ctrlKey: true, action: () => setShowSearchModal(true), description: 'Open Search', category: 'Navigation' },
          { key: '?', action: () => {}, description: 'Show Help', category: 'General' }
        ]}
      />
    </div>
  )
}
