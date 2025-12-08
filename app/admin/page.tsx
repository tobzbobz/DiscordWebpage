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
  getAllEPRFData,
  // Admin collaboration imports
  adminGetCollabStats,
  adminGetPresence,
  adminGetActivityLogs,
  adminGetAccessRequests,
  adminGetShareLinks,
  adminGetSectionLocks,
  adminGetExpiredAccess,
  adminForceDisconnect,
  adminForceUnlock,
  adminApproveAccess,
  adminDenyAccess,
  adminRevokeShareLink,
  adminAddCollaborator,
  adminRemoveCollaborator,
  adminSendNotification,
  adminCleanupExpired,
  adminCleanupOldLogs,
  adminRestoreCollaborator,
  AdminCollabStats,
  AdminPresence,
  AdminActivityLog,
  AdminAccessRequest,
  AdminShareLink,
  AdminSectionLock,
  PermissionLevel,
  Collaborator,
  // Moderation imports
  getKicks,
  getBroadcasts,
  getAnnouncementsList,
  getUserActivity,
  getUserStats,
  exportAuditLogs,
  getAccessList,
  getModerationSettings,
  kickUser,
  unkickUser,
  banUser,
  unbanUser,
  toggleHardBan,
  addToAccessList,
  removeFromAccessList,
  updateModerationSetting,
  createBroadcast,
  toggleBroadcast,
  deleteBroadcast,
  createAnnouncement,
  toggleAnnouncement,
  deleteAnnouncement,
  getActiveBroadcast,
  getSystemStatus,
  UserKick,
  Broadcast,
  Announcement,
  AccessListEntry,
  SystemSettings,
  UserStats
} from '../utils/apiClient'
import { downloadEPRFPdf } from '../utils/pdfGenerator'
import ConfirmationModal from '../components/ConfirmationModal'

export const runtime = 'edge'

type AdminTab = 'records' | 'presence' | 'activity' | 'access-requests' | 'share-links' | 'locks' | 'expired' | 'notifications' | 'users' | 'moderation' | 'access-lists' | 'system' | 'broadcasts'

// Check if user is owner (only you)
const isOwner = (discordId: string) => discordId === ADMIN_DISCORD_ID

export default function AdminPage() {
  const router = useRouter()
  
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [records, setRecords] = useState<AdminEPRFRecord[]>([])
  const [users, setUsers] = useState<APIUser[]>([])
  
  // Tab state
  const [activeTab, setActiveTab] = useState<AdminTab>('records')
  
  // Collaboration data states
  const [collabStats, setCollabStats] = useState<AdminCollabStats | null>(null)
  const [presence, setPresence] = useState<AdminPresence[]>([])
  const [activityLogs, setActivityLogs] = useState<AdminActivityLog[]>([])
  const [activityTotal, setActivityTotal] = useState(0)
  const [accessRequests, setAccessRequests] = useState<AdminAccessRequest[]>([])
  const [shareLinks, setShareLinks] = useState<AdminShareLink[]>([])
  const [sectionLocks, setSectionLocks] = useState<AdminSectionLock[]>([])
  const [expiredAccess, setExpiredAccess] = useState<Collaborator[]>([])
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'incomplete' | 'complete'>('all')
  const [authorFilter, setAuthorFilter] = useState<string>('')
  const [activityPage, setActivityPage] = useState(0)
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [showAddCollaboratorModal, setShowAddCollaboratorModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<AdminEPRFRecord | null>(null)
  const [selectedNewAuthor, setSelectedNewAuthor] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Notification form
  const [notificationTitle, setNotificationTitle] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')
  const [notificationTarget, setNotificationTarget] = useState('')
  
  // Add collaborator form
  const [addCollabIncident, setAddCollabIncident] = useState('')
  const [addCollabUser, setAddCollabUser] = useState('')
  const [addCollabPermission, setAddCollabPermission] = useState<PermissionLevel>('view')

  // Moderation states
  const [blacklist, setBlacklist] = useState<AccessListEntry[]>([])
  const [whitelist, setWhitelist] = useState<AccessListEntry[]>([])
  const [adminList, setAdminList] = useState<AccessListEntry[]>([])
  const [kickedUsers, setKickedUsers] = useState<UserKick[]>([])
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null)
  
  // Moderation form states
  const [kickTargetId, setKickTargetId] = useState('')
  const [kickDuration, setKickDuration] = useState<number>(60)
  const [kickReason, setKickReason] = useState('')
  const [kickHard, setKickHard] = useState(false)
  const [listTargetId, setListTargetId] = useState('')
  const [listNotes, setListNotes] = useState('')
  const [listHardMode, setListHardMode] = useState(false)
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastDuration, setBroadcastDuration] = useState<number>(60)
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementMessage, setAnnouncementMessage] = useState('')
  
  // Owner check
  const OWNER_ID = '695765253612953651'
  const isOwner = currentUser?.discordId === OWNER_ID

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
      
      // Load collaboration stats
      try {
        const stats = await adminGetCollabStats(currentUser.discordId)
        setCollabStats(stats)
      } catch (e) {
        console.error('Failed to load collab stats:', e)
      }
    } catch (error) {
      console.error('Failed to load admin data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, searchQuery, statusFilter, authorFilter])

  // Load tab-specific collaboration data
  const loadTabData = useCallback(async (tab: AdminTab) => {
    if (!currentUser || !isAdmin(currentUser.discordId)) return
    
    try {
      switch (tab) {
        case 'presence':
          const presenceData = await adminGetPresence(currentUser.discordId)
          setPresence(presenceData)
          break
        case 'activity':
          const activityData = await adminGetActivityLogs(currentUser.discordId, { limit: 50, offset: activityPage * 50 })
          setActivityLogs(activityData.activity || [])
          setActivityTotal(activityData.total || 0)
          break
        case 'access-requests':
          const requestsData = await adminGetAccessRequests(currentUser.discordId)
          setAccessRequests(requestsData)
          break
        case 'share-links':
          const linksData = await adminGetShareLinks(currentUser.discordId)
          setShareLinks(linksData)
          break
        case 'locks':
          const locksData = await adminGetSectionLocks(currentUser.discordId)
          setSectionLocks(locksData)
          break
        case 'expired':
          const expiredData = await adminGetExpiredAccess(currentUser.discordId)
          setExpiredAccess(expiredData)
          break
        case 'moderation':
          const kickedData = await getKicks(currentUser.discordId)
          setKickedUsers(kickedData)
          break
        case 'access-lists':
          if (isOwner) {
            const [blData, wlData, alData] = await Promise.all([
              getAccessList(currentUser.discordId, 'blacklist'),
              getAccessList(currentUser.discordId, 'whitelist'),
              getAccessList(currentUser.discordId, 'admin-list')
            ])
            setBlacklist(blData)
            setWhitelist(wlData)
            setAdminList(alData)
          }
          break
        case 'broadcasts':
          const broadcastsData = await getBroadcasts(currentUser.discordId)
          setBroadcasts(broadcastsData)
          break
        case 'system':
          const settings = await getSystemStatus()
          setSystemSettings(settings)
          break
      }
    } catch (error) {
      console.error(`Failed to load ${tab} data:`, error)
    }
  }, [currentUser, activityPage, isOwner])

  // Load tab data when tab changes
  useEffect(() => {
    if (isAuthorized && currentUser && activeTab !== 'records') {
      loadTabData(activeTab)
    }
  }, [activeTab, isAuthorized, currentUser, loadTabData])

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

  // === Collaboration Admin Actions ===
  const handleForceDisconnect = async (targetDiscordId: string, incidentId?: string) => {
    if (!currentUser) return
    try {
      await adminForceDisconnect(currentUser.discordId, currentUser.callsign || 'Admin', targetDiscordId, incidentId)
      await loadTabData('presence')
    } catch (e) {
      console.error('Force disconnect failed:', e)
    }
  }

  const handleForceUnlock = async (incidentId: string, patientLetter: string, section?: string) => {
    if (!currentUser) return
    try {
      await adminForceUnlock(currentUser.discordId, currentUser.callsign || 'Admin', incidentId, patientLetter, section)
      await loadTabData('locks')
    } catch (e) {
      console.error('Force unlock failed:', e)
    }
  }

  const handleApproveAccess = async (requestId: number) => {
    if (!currentUser) return
    try {
      await adminApproveAccess(currentUser.discordId, currentUser.callsign || 'Admin', requestId, 'edit')
      await loadTabData('access-requests')
    } catch (e) {
      console.error('Approve access failed:', e)
    }
  }

  const handleDenyAccess = async (requestId: number) => {
    if (!currentUser) return
    try {
      await adminDenyAccess(currentUser.discordId, currentUser.callsign || 'Admin', requestId, 'Denied by admin')
      await loadTabData('access-requests')
    } catch (e) {
      console.error('Deny access failed:', e)
    }
  }

  const handleRevokeShareLink = async (linkId: number) => {
    if (!currentUser) return
    try {
      await adminRevokeShareLink(currentUser.discordId, currentUser.callsign || 'Admin', linkId)
      await loadTabData('share-links')
    } catch (e) {
      console.error('Revoke link failed:', e)
    }
  }

  const handleSendNotification = async () => {
    if (!currentUser || !notificationMessage) return
    setIsProcessing(true)
    try {
      await adminSendNotification(
        currentUser.discordId,
        currentUser.callsign || 'Admin',
        notificationTitle || 'Admin Notification',
        notificationMessage,
        notificationTarget || undefined
      )
      setShowNotificationModal(false)
      setNotificationTitle('')
      setNotificationMessage('')
      setNotificationTarget('')
    } catch (e) {
      console.error('Send notification failed:', e)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCleanupExpired = async () => {
    if (!currentUser) return
    setIsProcessing(true)
    try {
      await adminCleanupExpired(currentUser.discordId, currentUser.callsign || 'Admin')
      await loadTabData('expired')
      const stats = await adminGetCollabStats(currentUser.discordId)
      setCollabStats(stats)
    } catch (e) {
      console.error('Cleanup failed:', e)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCleanupOldLogs = async (days: number) => {
    if (!currentUser) return
    setIsProcessing(true)
    try {
      await adminCleanupOldLogs(currentUser.discordId, currentUser.callsign || 'Admin')
      await loadTabData('activity')
    } catch (e) {
      console.error('Log cleanup failed:', e)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRestoreAccess = async (incidentId: string, targetDiscordId: string) => {
    if (!currentUser) return
    try {
      // Add 7 more days of access
      const newExpiry = new Date()
      newExpiry.setDate(newExpiry.getDate() + 7)
      await adminRestoreCollaborator(currentUser.discordId, currentUser.callsign || 'Admin', incidentId, targetDiscordId, newExpiry.toISOString())
      await loadTabData('expired')
    } catch (e) {
      console.error('Restore access failed:', e)
    }
  }

  const handleAddCollaborator = async () => {
    if (!currentUser || !addCollabIncident || !addCollabUser) return
    setIsProcessing(true)
    try {
      const targetUser = users.find(u => u.discord_id === addCollabUser)
      await adminAddCollaborator(
        currentUser.discordId,
        currentUser.callsign || 'Admin',
        addCollabIncident,
        addCollabUser,
        targetUser?.callsign || 'Unknown',
        addCollabPermission
      )
      setShowAddCollaboratorModal(false)
      setAddCollabIncident('')
      setAddCollabUser('')
      setAddCollabPermission('view')
    } catch (e) {
      console.error('Add collaborator failed:', e)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveCollaborator = async (incidentId: string, targetDiscordId: string) => {
    if (!currentUser) return
    try {
      await adminRemoveCollaborator(currentUser.discordId, currentUser.callsign || 'Admin', incidentId, targetDiscordId)
      // Refresh current data
      await loadData()
    } catch (e) {
      console.error('Remove collaborator failed:', e)
    }
  }

  // === Moderation Handlers ===
  const handleKickUser = async () => {
    if (!currentUser || !kickTargetId) return
    setIsProcessing(true)
    try {
      const targetUser = users.find(u => u.discord_id === kickTargetId)
      await kickUser(
        currentUser.discordId,
        currentUser.callsign || 'Admin',
        kickTargetId,
        targetUser?.callsign || 'Unknown',
        kickReason || 'No reason provided',
        kickDuration
      )
      await loadTabData('moderation')
      setKickTargetId('')
      setKickDuration(60)
      setKickReason('')
      setKickHard(false)
    } catch (e) {
      console.error('Kick user failed:', e)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClearKick = async (discordId: string) => {
    if (!currentUser) return
    try {
      await unkickUser(currentUser.discordId, discordId)
      await loadTabData('moderation')
    } catch (e) {
      console.error('Clear kick failed:', e)
    }
  }

  const handleAddToList = async (listType: 'blacklist' | 'whitelist' | 'admin') => {
    if (!currentUser || !listTargetId) return
    setIsProcessing(true)
    try {
      const targetUser = users.find(u => u.discord_id === listTargetId)
      await addToAccessList(
        currentUser.discordId,
        currentUser.callsign || 'Admin',
        listType,
        listTargetId,
        targetUser?.callsign || 'Unknown',
        listNotes || undefined,
        listHardMode
      )
      await loadTabData('access-lists')
      setListTargetId('')
      setListNotes('')
      setListHardMode(false)
    } catch (e) {
      console.error(`Add to ${listType} failed:`, e)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveFromList = async (listType: 'blacklist' | 'whitelist' | 'admin', discordId: string) => {
    if (!currentUser) return
    try {
      await removeFromAccessList(currentUser.discordId, listType, discordId)
      await loadTabData('access-lists')
    } catch (e) {
      console.error(`Remove from ${listType} failed:`, e)
    }
  }

  const handleCreateBroadcast = async () => {
    if (!currentUser || !broadcastMessage) return
    setIsProcessing(true)
    try {
      // Calculate expiry time
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + broadcastDuration)
      await createBroadcast(
        currentUser.discordId,
        currentUser.callsign || 'Admin',
        broadcastMessage,
        expiresAt.toISOString()
      )
      await loadTabData('broadcasts')
      setBroadcastMessage('')
      setBroadcastDuration(60)
    } catch (e) {
      console.error('Create broadcast failed:', e)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEndBroadcast = async (broadcastId: number) => {
    if (!currentUser) return
    try {
      await toggleBroadcast(currentUser.discordId, broadcastId, false)
      await loadTabData('broadcasts')
    } catch (e) {
      console.error('End broadcast failed:', e)
    }
  }

  const handleCreateAnnouncement = async () => {
    if (!currentUser || !announcementMessage) return
    setIsProcessing(true)
    try {
      await createAnnouncement(
        currentUser.discordId,
        currentUser.callsign || 'Admin',
        announcementTitle || 'System Announcement',
        announcementMessage
      )
      setAnnouncementTitle('')
      setAnnouncementMessage('')
    } catch (e) {
      console.error('Create announcement failed:', e)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUpdateSettings = async (key: string, value: string) => {
    if (!currentUser) return
    try {
      await updateModerationSetting(currentUser.discordId, key, value)
      await loadTabData('system')
    } catch (e) {
      console.error('Update settings failed:', e)
    }
  }

  const handleBanUser = async (discordId: string) => {
    if (!currentUser) return
    setIsProcessing(true)
    try {
      const targetUser = users.find(u => u.discord_id === discordId)
      await banUser(currentUser.discordId, currentUser.callsign || 'Admin', discordId, targetUser?.callsign || 'Unknown', 'Banned by admin', listHardMode)
      await loadTabData('access-lists')
    } catch (e) {
      console.error('Ban user failed:', e)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExportAuditLogs = async () => {
    if (!currentUser) return
    setIsProcessing(true)
    try {
      const csv = await exportAuditLogs(currentUser.discordId, undefined, undefined, 'csv')
      
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export audit logs failed:', e)
    } finally {
      setIsProcessing(false)
    }
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

        .tab-nav {
          display: flex;
          gap: 8px;
          margin-bottom: 25px;
          flex-wrap: wrap;
          background: #1b2838;
          padding: 10px;
          border-radius: 10px;
          border: 1px solid #2d4156;
        }

        .tab-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          background: transparent;
          color: #8899aa;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tab-btn:hover {
          background: #2d4156;
          color: white;
        }

        .tab-btn.active {
          background: #0066cc;
          color: white;
        }

        .tab-badge {
          background: rgba(255,255,255,0.2);
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 12px;
        }

        .tab-divider {
          width: 2px;
          height: 24px;
          background: #2d4156;
          margin: 0 8px;
        }

        .tab-content {
          background: #1b2838;
          border-radius: 10px;
          padding: 20px;
          border: 1px solid #2d4156;
        }

        .collab-table {
          width: 100%;
          border-collapse: collapse;
        }

        .collab-table th,
        .collab-table td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #2d4156;
        }

        .collab-table th {
          background: #0d1b2a;
          color: #8899aa;
          font-weight: 600;
          font-size: 13px;
        }

        .collab-table tr:hover td {
          background: #0d1b2a;
        }

        .collab-table td {
          color: white;
          font-size: 14px;
        }

        .collab-action-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          margin-right: 6px;
        }

        .btn-approve { background: #28a745; color: white; }
        .btn-deny { background: #dc3545; color: white; }
        .btn-revoke { background: #ffc107; color: #000; }
        .btn-unlock { background: #17a2b8; color: white; }
        .btn-disconnect { background: #6c757d; color: white; }
        .btn-restore { background: #0066cc; color: white; }

        .permission-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .permission-badge.view { background: rgba(23, 162, 184, 0.2); color: #17a2b8; }
        .permission-badge.edit { background: rgba(0, 102, 204, 0.2); color: #0099ff; }
        .permission-badge.admin { background: rgba(220, 53, 69, 0.2); color: #dc3545; }
        .permission-badge.owner { background: rgba(255, 193, 7, 0.2); color: #ffc107; }

        .status-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot.online { background: #28a745; }
        .status-dot.away { background: #ffc107; }
        .status-dot.offline { background: #6c757d; }

        .collab-stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .collab-stat-card {
          background: #0d1b2a;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
        }

        .collab-stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #0099ff;
        }

        .collab-stat-label {
          font-size: 12px;
          color: #8899aa;
          margin-top: 5px;
        }

        .action-toolbar {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .toolbar-btn {
          padding: 10px 20px;
          border: 1px solid #3d5166;
          border-radius: 6px;
          background: #0d1b2a;
          color: white;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toolbar-btn:hover {
          background: #2d4156;
        }

        .toolbar-btn.primary {
          background: #0066cc;
          border-color: #0066cc;
        }

        .toolbar-btn.danger {
          background: #dc3545;
          border-color: #dc3545;
        }

        .empty-tab {
          text-align: center;
          padding: 40px;
          color: #8899aa;
        }

        .empty-tab-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }

        .pagination {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 20px;
        }

        .page-btn {
          padding: 8px 16px;
          border: 1px solid #3d5166;
          border-radius: 4px;
          background: transparent;
          color: white;
          cursor: pointer;
        }

        .page-btn:hover {
          background: #2d4156;
        }

        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .log-entry {
          padding: 12px 15px;
          border-bottom: 1px solid #2d4156;
          display: flex;
          gap: 15px;
          align-items: flex-start;
        }

        .log-time {
          color: #667788;
          font-size: 12px;
          white-space: nowrap;
        }

        .log-user {
          color: #0099ff;
          font-weight: 500;
          min-width: 120px;
        }

        .log-action {
          color: white;
          flex: 1;
        }

        .log-admin {
          color: #dc3545;
          font-weight: 600;
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
          {collabStats && (
            <>
              <div className="stat-card" style={{ '--stat-color': '#17a2b8' } as any}>
                <div className="stat-value" style={{ color: '#17a2b8' }}>{collabStats.activeUsers || 0}</div>
                <div className="stat-label">Online Now</div>
              </div>
              <div className="stat-card" style={{ '--stat-color': '#6f42c1' } as any}>
                <div className="stat-value" style={{ color: '#6f42c1' }}>{collabStats.totalCollaborators || 0}</div>
                <div className="stat-label">Collaborators</div>
              </div>
            </>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="tab-nav">
          <button 
            className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
            onClick={() => setActiveTab('records')}
          >
            📋 Records
          </button>
          <button 
            className={`tab-btn ${activeTab === 'presence' ? 'active' : ''}`}
            onClick={() => setActiveTab('presence')}
          >
            👥 Live Users
            {collabStats && collabStats.activeUsers > 0 && (
              <span className="tab-badge">{collabStats.activeUsers}</span>
            )}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            📜 Activity Log
          </button>
          <button 
            className={`tab-btn ${activeTab === 'access-requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('access-requests')}
          >
            🔔 Access Requests
            {accessRequests.length > 0 && (
              <span className="tab-badge">{accessRequests.length}</span>
            )}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'share-links' ? 'active' : ''}`}
            onClick={() => setActiveTab('share-links')}
          >
            🔗 Share Links
          </button>
          <button 
            className={`tab-btn ${activeTab === 'locks' ? 'active' : ''}`}
            onClick={() => setActiveTab('locks')}
          >
            🔒 Section Locks
            {sectionLocks.length > 0 && (
              <span className="tab-badge">{sectionLocks.length}</span>
            )}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'expired' ? 'active' : ''}`}
            onClick={() => setActiveTab('expired')}
          >
            ⏰ Expired Access
          </button>
          <button 
            className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            📢 Notifications
          </button>
          <div className="tab-divider" />
          <button 
            className={`tab-btn ${activeTab === 'moderation' ? 'active' : ''}`}
            onClick={() => setActiveTab('moderation')}
          >
            🚫 Kicks
            {kickedUsers.length > 0 && (
              <span className="tab-badge">{kickedUsers.length}</span>
            )}
          </button>
          {isOwner && (
            <button 
              className={`tab-btn ${activeTab === 'access-lists' ? 'active' : ''}`}
              onClick={() => setActiveTab('access-lists')}
            >
              📋 Access Lists
            </button>
          )}
          <button 
            className={`tab-btn ${activeTab === 'broadcasts' ? 'active' : ''}`}
            onClick={() => setActiveTab('broadcasts')}
          >
            📻 Broadcasts
          </button>
          <button 
            className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            ⚙️ System
          </button>
        </div>

        {/* Records Tab */}
        {activeTab === 'records' && (
          <>
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
          </>
        )}

        {/* Presence Tab - Live Users */}
        {activeTab === 'presence' && (
          <div className="tab-content">
            <div className="action-toolbar">
              <button className="toolbar-btn" onClick={() => loadTabData('presence')}>
                🔄 Refresh
              </button>
            </div>
            {presence.length === 0 ? (
              <div className="empty-tab">
                <div className="empty-tab-icon">👤</div>
                <h3>No Active Users</h3>
                <p>No users are currently viewing ePRFs.</p>
              </div>
            ) : (
              <table className="collab-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Incident ID</th>
                    <th>Section</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {presence.map((p, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="status-indicator">
                          <span className={`status-dot ${Date.now() - new Date(p.last_seen).getTime() < 60000 ? 'online' : 'away'}`}></span>
                          {p.user_callsign}
                        </div>
                      </td>
                      <td>{p.incident_id}</td>
                      <td>{p.page_name || 'Unknown'}</td>
                      <td>{new Date(p.last_seen).toLocaleTimeString()}</td>
                      <td>
                        <button 
                          className="collab-action-btn btn-disconnect"
                          onClick={() => handleForceDisconnect(p.user_discord_id, p.incident_id)}
                        >
                          Disconnect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Activity Log Tab */}
        {activeTab === 'activity' && (
          <div className="tab-content">
            <div className="action-toolbar">
              <button className="toolbar-btn" onClick={() => loadTabData('activity')}>
                🔄 Refresh
              </button>
              <button 
                className="toolbar-btn danger" 
                onClick={() => handleCleanupOldLogs(90)}
                disabled={isProcessing}
              >
                🗑️ Cleanup Old Logs (90+ days)
              </button>
            </div>
            {activityLogs.length === 0 ? (
              <div className="empty-tab">
                <div className="empty-tab-icon">📜</div>
                <h3>No Activity Logs</h3>
                <p>No collaboration activity has been recorded yet.</p>
              </div>
            ) : (
              <>
                <div style={{ background: '#0d1b2a', borderRadius: '8px', overflow: 'hidden' }}>
                  {activityLogs.map((log, idx) => (
                    <div key={idx} className="log-entry">
                      <span className="log-time">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                      <span className={`log-user ${(log.user_callsign || '').startsWith('ADMIN:') ? 'log-admin' : ''}`}>
                        {log.user_callsign || 'System'}
                      </span>
                      <span className="log-action">
                        <strong>{log.action_type}</strong> on {log.incident_id}
                        {log.description && <span style={{ color: '#667788' }}> - {log.description}</span>}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pagination">
                  <button 
                    className="page-btn"
                    onClick={() => setActivityPage(p => Math.max(0, p - 1))}
                    disabled={activityPage === 0}
                  >
                    ← Previous
                  </button>
                  <span style={{ color: '#8899aa', padding: '8px 16px' }}>
                    Page {activityPage + 1} of {Math.ceil(activityTotal / 50)}
                  </span>
                  <button 
                    className="page-btn"
                    onClick={() => setActivityPage(p => p + 1)}
                    disabled={(activityPage + 1) * 50 >= activityTotal}
                  >
                    Next →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Access Requests Tab */}
        {activeTab === 'access-requests' && (
          <div className="tab-content">
            <div className="action-toolbar">
              <button className="toolbar-btn" onClick={() => loadTabData('access-requests')}>
                🔄 Refresh
              </button>
            </div>
            {accessRequests.length === 0 ? (
              <div className="empty-tab">
                <div className="empty-tab-icon">🔔</div>
                <h3>No Pending Requests</h3>
                <p>All access requests have been processed.</p>
              </div>
            ) : (
              <table className="collab-table">
                <thead>
                  <tr>
                    <th>Requester</th>
                    <th>Incident ID</th>
                    <th>Requested</th>
                    <th>Message</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accessRequests.map((req) => (
                    <tr key={req.id}>
                      <td>{req.requester_callsign || req.requester_discord_id}</td>
                      <td>{req.incident_id}</td>
                      <td>{new Date(req.created_at).toLocaleDateString()}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {req.message || '-'}
                      </td>
                      <td>
                        <button 
                          className="collab-action-btn btn-approve"
                          onClick={() => handleApproveAccess(req.id)}
                        >
                          Approve
                        </button>
                        <button 
                          className="collab-action-btn btn-deny"
                          onClick={() => handleDenyAccess(req.id)}
                        >
                          Deny
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Share Links Tab */}
        {activeTab === 'share-links' && (
          <div className="tab-content">
            <div className="action-toolbar">
              <button className="toolbar-btn" onClick={() => loadTabData('share-links')}>
                🔄 Refresh
              </button>
            </div>
            {shareLinks.length === 0 ? (
              <div className="empty-tab">
                <div className="empty-tab-icon">🔗</div>
                <h3>No Active Share Links</h3>
                <p>No share links have been created yet.</p>
              </div>
            ) : (
              <table className="collab-table">
                <thead>
                  <tr>
                    <th>Incident ID</th>
                    <th>Created By</th>
                    <th>Permission</th>
                    <th>Uses</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shareLinks.map((link) => (
                    <tr key={link.id}>
                      <td>{link.incident_id}</td>
                      <td>{link.created_by_discord_id || 'Unknown'}</td>
                      <td>
                        <span className={`permission-badge ${link.permission_level}`}>
                          {link.permission_level}
                        </span>
                      </td>
                      <td>{link.uses_count || 0} / {link.max_uses || '∞'}</td>
                      <td>
                        {link.expires_at 
                          ? new Date(link.expires_at).toLocaleDateString() 
                          : 'Never'}
                      </td>
                      <td>
                        <button 
                          className="collab-action-btn btn-revoke"
                          onClick={() => handleRevokeShareLink(link.id)}
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Section Locks Tab */}
        {activeTab === 'locks' && (
          <div className="tab-content">
            <div className="action-toolbar">
              <button className="toolbar-btn" onClick={() => loadTabData('locks')}>
                🔄 Refresh
              </button>
            </div>
            {sectionLocks.length === 0 ? (
              <div className="empty-tab">
                <div className="empty-tab-icon">🔓</div>
                <h3>No Active Locks</h3>
                <p>No sections are currently being edited.</p>
              </div>
            ) : (
              <table className="collab-table">
                <thead>
                  <tr>
                    <th>Incident ID</th>
                    <th>Section</th>
                    <th>Locked By</th>
                    <th>Since</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionLocks.map((lock) => (
                    <tr key={lock.id}>
                      <td>{lock.incident_id}</td>
                      <td>{lock.section}</td>
                      <td>{lock.locked_by_callsign || lock.locked_by_discord_id}</td>
                      <td>{new Date(lock.locked_at).toLocaleTimeString()}</td>
                      <td>
                        <button 
                          className="collab-action-btn btn-unlock"
                          onClick={() => handleForceUnlock(
                            lock.incident_id,
                            lock.patient_letter || 'A',
                            lock.section
                          )}
                        >
                          Force Unlock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Expired Access Tab */}
        {activeTab === 'expired' && (
          <div className="tab-content">
            <div className="action-toolbar">
              <button className="toolbar-btn" onClick={() => loadTabData('expired')}>
                🔄 Refresh
              </button>
              <button 
                className="toolbar-btn danger" 
                onClick={handleCleanupExpired}
                disabled={isProcessing}
              >
                🗑️ Cleanup Expired (7+ days)
              </button>
            </div>
            {expiredAccess.length === 0 ? (
              <div className="empty-tab">
                <div className="empty-tab-icon">✅</div>
                <h3>No Expired Access</h3>
                <p>All collaborator access is current.</p>
              </div>
            ) : (
              <table className="collab-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Incident ID</th>
                    <th>Permission</th>
                    <th>Expired</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expiredAccess.map((collab, idx) => (
                    <tr key={idx}>
                      <td>{collab.user_callsign || collab.user_discord_id}</td>
                      <td>{collab.incident_id}</td>
                      <td>
                        <span className={`permission-badge ${collab.permission_level}`}>
                          {collab.permission_level}
                        </span>
                      </td>
                      <td>{collab.expires_at ? new Date(collab.expires_at).toLocaleDateString() : '-'}</td>
                      <td>
                        <button 
                          className="collab-action-btn btn-restore"
                          onClick={() => handleRestoreAccess(collab.incident_id, collab.user_discord_id)}
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="tab-content">
            <h3 style={{ color: 'white', marginBottom: '20px' }}>📢 Send Notification</h3>
            <div style={{ maxWidth: '500px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', color: '#8899aa', marginBottom: '5px' }}>Target User (optional - leave blank for all)</label>
                <select 
                  className="filter-select" 
                  style={{ width: '100%' }}
                  value={notificationTarget}
                  onChange={(e) => setNotificationTarget(e.target.value)}
                >
                  <option value="">All Users</option>
                  {users.map(user => (
                    <option key={user.discord_id} value={user.discord_id}>
                      {user.callsign || user.discord_username}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', color: '#8899aa', marginBottom: '5px' }}>Title</label>
                <input 
                  type="text"
                  className="search-input"
                  style={{ width: '100%' }}
                  placeholder="Notification title..."
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', color: '#8899aa', marginBottom: '5px' }}>Message</label>
                <textarea 
                  className="search-input"
                  style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
                  placeholder="Notification message..."
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                />
              </div>
              <button 
                className="toolbar-btn primary"
                onClick={handleSendNotification}
                disabled={!notificationMessage || isProcessing}
              >
                {isProcessing ? 'Sending...' : '📤 Send Notification'}
              </button>
            </div>
          </div>
        )}

        {/* Moderation/Kicks Tab */}
        {activeTab === 'moderation' && (
          <div className="tab-content">
            <h3 style={{ color: 'white', marginBottom: '20px' }}>🚫 Kick Management</h3>
            
            {/* Kick User Form */}
            <div style={{ background: '#0d1b2a', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <h4 style={{ color: '#8899aa', marginBottom: '15px' }}>Kick a User</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', color: '#8899aa', marginBottom: '5px' }}>User</label>
                  <select 
                    className="filter-select" 
                    style={{ width: '100%' }}
                    value={kickTargetId}
                    onChange={(e) => setKickTargetId(e.target.value)}
                  >
                    <option value="">Select user...</option>
                    {users.map(user => (
                      <option key={user.discord_id} value={user.discord_id}>
                        {user.callsign || user.discord_username}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#8899aa', marginBottom: '5px' }}>Duration (minutes)</label>
                  <input 
                    type="number"
                    className="search-input"
                    style={{ width: '100%' }}
                    value={kickDuration}
                    onChange={(e) => setKickDuration(parseInt(e.target.value) || 60)}
                    min={1}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#8899aa', marginBottom: '5px' }}>Reason</label>
                  <input 
                    type="text"
                    className="search-input"
                    style={{ width: '100%' }}
                    placeholder="Reason for kick..."
                    value={kickReason}
                    onChange={(e) => setKickReason(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff6b6b', cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={kickHard}
                    onChange={(e) => setKickHard(e.target.checked)}
                  />
                  Hard Kick (blocks ALL access, not just editing)
                </label>
                <button 
                  className="toolbar-btn"
                  style={{ background: '#dc3545' }}
                  onClick={handleKickUser}
                  disabled={!kickTargetId || isProcessing}
                >
                  {isProcessing ? 'Kicking...' : '🚫 Kick User'}
                </button>
              </div>
            </div>

            {/* Currently Kicked Users */}
            <h4 style={{ color: '#8899aa', marginBottom: '15px' }}>Currently Kicked Users ({kickedUsers.length})</h4>
            {kickedUsers.length === 0 ? (
              <p style={{ color: '#667788' }}>No users currently kicked.</p>
            ) : (
              <table className="collab-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Reason</th>
                    <th>Kicked By</th>
                    <th>Expires</th>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {kickedUsers.map(kick => (
                    <tr key={kick.user_discord_id}>
                      <td>{kick.user_callsign || kick.user_discord_id}</td>
                      <td>{kick.reason || 'No reason'}</td>
                      <td>{kick.kicked_by_callsign}</td>
                      <td>{kick.expires_at ? new Date(kick.expires_at).toLocaleString() : 'Permanent'}</td>
                      <td>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '4px',
                          background: kick.is_active ? '#28a745' : '#6c757d',
                          color: 'white',
                          fontSize: '12px'
                        }}>
                          {kick.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="action-btn edit"
                          onClick={() => handleClearKick(kick.user_discord_id)}
                        >
                          ✓ Clear
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Access Lists Tab (Owner Only) */}
        {activeTab === 'access-lists' && isOwner && (
          <div className="tab-content">
            <h3 style={{ color: 'white', marginBottom: '20px' }}>📋 Access Lists (Owner Only)</h3>
            
            {/* Add to List Form */}
            <div style={{ background: '#0d1b2a', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <h4 style={{ color: '#8899aa', marginBottom: '15px' }}>Add User to List</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', color: '#8899aa', marginBottom: '5px' }}>User</label>
                  <select 
                    className="filter-select" 
                    style={{ width: '100%' }}
                    value={listTargetId}
                    onChange={(e) => setListTargetId(e.target.value)}
                  >
                    <option value="">Select user...</option>
                    {users.map(user => (
                      <option key={user.discord_id} value={user.discord_id}>
                        {user.callsign || user.discord_username}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#8899aa', marginBottom: '5px' }}>Notes</label>
                  <input 
                    type="text"
                    className="search-input"
                    style={{ width: '100%' }}
                    placeholder="Notes..."
                    value={listNotes}
                    onChange={(e) => setListNotes(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff6b6b', cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={listHardMode}
                    onChange={(e) => setListHardMode(e.target.checked)}
                  />
                  Hard Mode (complete block)
                </label>
                <button 
                  className="toolbar-btn"
                  style={{ background: '#dc3545' }}
                  onClick={() => handleAddToList('blacklist')}
                  disabled={!listTargetId || isProcessing}
                >
                  Add to Blacklist
                </button>
                <button 
                  className="toolbar-btn"
                  style={{ background: '#28a745' }}
                  onClick={() => handleAddToList('whitelist')}
                  disabled={!listTargetId || isProcessing}
                >
                  Add to Whitelist
                </button>
                <button 
                  className="toolbar-btn"
                  style={{ background: '#0066cc' }}
                  onClick={() => handleAddToList('admin')}
                  disabled={!listTargetId || isProcessing}
                >
                  Add to Admins
                </button>
              </div>
            </div>

            {/* Lists Display */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {/* Blacklist */}
              <div style={{ background: '#0d1b2a', padding: '15px', borderRadius: '8px', border: '1px solid #dc3545' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h4 style={{ color: '#dc3545', margin: 0 }}>🚫 Blacklist ({blacklist.length})</h4>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8899aa', fontSize: '12px' }}>
                    <input 
                      type="checkbox"
                      checked={systemSettings?.blacklist_enabled === true}
                      onChange={(e) => handleUpdateSettings('blacklist_enabled', e.target.checked ? 'true' : 'false')}
                    />
                    Enabled
                  </label>
                </div>
                {blacklist.length === 0 ? (
                  <p style={{ color: '#667788', fontSize: '14px' }}>No users blacklisted.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {blacklist.map(entry => (
                      <li key={entry.user_discord_id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '8px',
                        borderBottom: '1px solid #2d4156'
                      }}>
                        <div>
                          <span style={{ color: 'white' }}>{entry.user_callsign || entry.user_discord_id}</span>
                          {entry.is_hard_ban && <span style={{ marginLeft: '8px', color: '#dc3545', fontSize: '10px' }}>HARD</span>}
                          {entry.reason && <div style={{ fontSize: '12px', color: '#667788' }}>{entry.reason}</div>}
                        </div>
                        <button 
                          className="action-btn delete"
                          onClick={() => handleRemoveFromList('blacklist', entry.user_discord_id)}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Whitelist */}
              <div style={{ background: '#0d1b2a', padding: '15px', borderRadius: '8px', border: '1px solid #28a745' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h4 style={{ color: '#28a745', margin: 0 }}>✓ Whitelist ({whitelist.length})</h4>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8899aa', fontSize: '12px' }}>
                    <input 
                      type="checkbox"
                      checked={systemSettings?.whitelist_enabled === true}
                      onChange={(e) => handleUpdateSettings('whitelist_enabled', e.target.checked ? 'true' : 'false')}
                    />
                    Enabled
                  </label>
                </div>
                {whitelist.length === 0 ? (
                  <p style={{ color: '#667788', fontSize: '14px' }}>No users whitelisted.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {whitelist.map(entry => (
                      <li key={entry.user_discord_id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '8px',
                        borderBottom: '1px solid #2d4156'
                      }}>
                        <div>
                          <span style={{ color: 'white' }}>{entry.user_callsign || entry.user_discord_id}</span>
                          {entry.reason && <div style={{ fontSize: '12px', color: '#667788' }}>{entry.reason}</div>}
                        </div>
                        <button 
                          className="action-btn delete"
                          onClick={() => handleRemoveFromList('whitelist', entry.user_discord_id)}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Admin List */}
              <div style={{ background: '#0d1b2a', padding: '15px', borderRadius: '8px', border: '1px solid #0066cc' }}>
                <h4 style={{ color: '#0066cc', marginBottom: '15px' }}>👑 Admin List ({adminList.length})</h4>
                {adminList.length === 0 ? (
                  <p style={{ color: '#667788', fontSize: '14px' }}>No additional admins.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {adminList.map(entry => (
                      <li key={entry.user_discord_id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '8px',
                        borderBottom: '1px solid #2d4156'
                      }}>
                        <div>
                          <span style={{ color: 'white' }}>{entry.user_callsign || entry.user_discord_id}</span>
                          {entry.reason && <div style={{ fontSize: '12px', color: '#667788' }}>{entry.reason}</div>}
                        </div>
                        <button 
                          className="action-btn delete"
                          onClick={() => handleRemoveFromList('admin', entry.user_discord_id)}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Broadcasts Tab */}
        {activeTab === 'broadcasts' && (
          <div className="tab-content">
            <h3 style={{ color: 'white', marginBottom: '20px' }}>📻 Broadcasts & Announcements</h3>
            
            {/* Create Broadcast */}
            <div style={{ background: '#0d1b2a', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <h4 style={{ color: '#ffc107', marginBottom: '15px' }}>📻 Create Broadcast (Scrolling Banner)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '15px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', color: '#8899aa', marginBottom: '5px' }}>Message</label>
                  <input 
                    type="text"
                    className="search-input"
                    style={{ width: '100%' }}
                    placeholder="Broadcast message..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#8899aa', marginBottom: '5px' }}>Duration (min)</label>
                  <input 
                    type="number"
                    className="search-input"
                    style={{ width: '100px' }}
                    value={broadcastDuration}
                    onChange={(e) => setBroadcastDuration(parseInt(e.target.value) || 60)}
                    min={1}
                  />
                </div>
                <button 
                  className="toolbar-btn"
                  style={{ background: '#ffc107', color: 'black' }}
                  onClick={handleCreateBroadcast}
                  disabled={!broadcastMessage || isProcessing}
                >
                  {isProcessing ? 'Creating...' : '📻 Start Broadcast'}
                </button>
              </div>
            </div>

            {/* Active Broadcasts */}
            {broadcasts.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#8899aa', marginBottom: '15px' }}>Active Broadcasts</h4>
                {broadcasts.map(broadcast => (
                  <div key={broadcast.id} style={{ 
                    background: 'linear-gradient(90deg, #dc3545, #ff6b6b)',
                    padding: '15px',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ color: 'white', fontWeight: 'bold' }}>{broadcast.message}</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                        Ends: {broadcast.expires_at ? new Date(broadcast.expires_at).toLocaleString() : 'No expiry'}
                      </div>
                    </div>
                    <button 
                      className="toolbar-btn"
                      style={{ background: 'rgba(0,0,0,0.3)' }}
                      onClick={() => handleEndBroadcast(broadcast.id)}
                    >
                      End Broadcast
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Create Announcement */}
            <div style={{ background: '#0d1b2a', padding: '20px', borderRadius: '8px' }}>
              <h4 style={{ color: '#17a2b8', marginBottom: '15px' }}>📢 Create Announcement (Popup)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '15px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', color: '#8899aa', marginBottom: '5px' }}>Title</label>
                  <input 
                    type="text"
                    className="search-input"
                    style={{ width: '200px' }}
                    placeholder="Announcement title..."
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#8899aa', marginBottom: '5px' }}>Message</label>
                  <input 
                    type="text"
                    className="search-input"
                    style={{ width: '100%' }}
                    placeholder="Announcement message..."
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value)}
                  />
                </div>
                <button 
                  className="toolbar-btn primary"
                  onClick={handleCreateAnnouncement}
                  disabled={!announcementMessage || isProcessing}
                >
                  {isProcessing ? 'Creating...' : '📢 Send Announcement'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="tab-content">
            <h3 style={{ color: 'white', marginBottom: '20px' }}>⚙️ System Settings</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {/* Maintenance Mode */}
              <div style={{ background: '#0d1b2a', padding: '20px', borderRadius: '8px', border: '1px solid #ffc107' }}>
                <h4 style={{ color: '#ffc107', marginBottom: '15px' }}>🔧 Maintenance Mode</h4>
                <p style={{ color: '#8899aa', fontSize: '14px', marginBottom: '15px' }}>
                  When enabled, only admins can access the site. Regular users see a maintenance message.
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={systemSettings?.maintenance_mode === true}
                    onChange={(e) => handleUpdateSettings('maintenance_mode', e.target.checked ? 'true' : 'false')}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <span style={{ color: 'white', fontSize: '16px' }}>Enable Maintenance Mode</span>
                </label>
              </div>

              {/* Serious Maintenance (Owner Only) */}
              {isOwner && (
                <div style={{ background: '#0d1b2a', padding: '20px', borderRadius: '8px', border: '1px solid #dc3545' }}>
                  <h4 style={{ color: '#dc3545', marginBottom: '15px' }}>🚨 Serious Maintenance (Owner Only)</h4>
                  <p style={{ color: '#8899aa', fontSize: '14px', marginBottom: '15px' }}>
                    Complete lockdown. Only the owner can access the site. Use for critical maintenance.
                  </p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox"
                      checked={systemSettings?.serious_maintenance_mode === true}
                      onChange={(e) => handleUpdateSettings('serious_maintenance_mode', e.target.checked ? 'true' : 'false')}
                      style={{ width: '20px', height: '20px' }}
                    />
                    <span style={{ color: '#dc3545', fontSize: '16px', fontWeight: 'bold' }}>Enable Serious Maintenance</span>
                  </label>
                </div>
              )}

              {/* Audit Export */}
              <div style={{ background: '#0d1b2a', padding: '20px', borderRadius: '8px', border: '1px solid #17a2b8' }}>
                <h4 style={{ color: '#17a2b8', marginBottom: '15px' }}>📊 Audit & Statistics</h4>
                <p style={{ color: '#8899aa', fontSize: '14px', marginBottom: '15px' }}>
                  Export activity logs and view system statistics.
                </p>
                <button 
                  className="toolbar-btn"
                  style={{ background: '#17a2b8' }}
                  onClick={handleExportAuditLogs}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Exporting...' : '📥 Export Audit Logs (CSV)'}
                </button>
              </div>

              {/* Quick Stats */}
              <div style={{ background: '#0d1b2a', padding: '20px', borderRadius: '8px', border: '1px solid #28a745' }}>
                <h4 style={{ color: '#28a745', marginBottom: '15px' }}>📈 Quick Stats</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ textAlign: 'center', padding: '10px', background: '#1b2838', borderRadius: '6px' }}>
                    <div style={{ fontSize: '24px', color: 'white', fontWeight: 'bold' }}>{users.length}</div>
                    <div style={{ fontSize: '12px', color: '#8899aa' }}>Total Users</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px', background: '#1b2838', borderRadius: '6px' }}>
                    <div style={{ fontSize: '24px', color: 'white', fontWeight: 'bold' }}>{records.length}</div>
                    <div style={{ fontSize: '12px', color: '#8899aa' }}>Total Records</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px', background: '#1b2838', borderRadius: '6px' }}>
                    <div style={{ fontSize: '24px', color: 'white', fontWeight: 'bold' }}>{kickedUsers.length}</div>
                    <div style={{ fontSize: '12px', color: '#8899aa' }}>Kicked Users</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px', background: '#1b2838', borderRadius: '6px' }}>
                    <div style={{ fontSize: '24px', color: 'white', fontWeight: 'bold' }}>{collabStats?.activeUsers || 0}</div>
                    <div style={{ fontSize: '12px', color: '#8899aa' }}>Active Now</div>
                  </div>
                </div>
              </div>
            </div>
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
              Transfer Patient
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
