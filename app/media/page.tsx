"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { validateAllSections, getSectionDisplayName } from '../utils/validation'
import { handleAddPatient as addPatientService, handleSubmitEPRF as submitEPRFService, getCurrentPatientLetter } from '../utils/eprfService'
import ConfirmationModal, { ValidationErrorModal, SuccessModal } from '../components/ConfirmationModal'
import TransferModal from '../components/TransferModal'
import PatientManagementModal from '../components/PatientManagementModal'
import ManageCollaboratorsModal from '../components/ManageCollaboratorsModal'
import ConnectionStatus from '../components/ConnectionStatus'
import PresenceIndicator from '../components/PresenceIndicator'
import { getCurrentUser, clearCurrentUser } from '../utils/userService'
import ChatWidget from '../components/ChatWidget'
import { isAdmin, checkEPRFAccess, checkCanTransferPatient, PermissionLevel, canManageCollaborators } from '../utils/apiClient'

export const runtime = 'edge'

interface MediaItem {
  id: string
  type: 'image' | 'audio' | 'video'
  name: string
  dataUrl: string
  timestamp: string
}

export default function MediaPage() {
        // Navigation handler for sidebar
        const navigateTo = (section: string) => {
          router.push(`/${section}?id=${incidentId}&fleetId=${fleetId}`)
        }

        // Discard selected media
        const handleDiscard = () => {
          if (selectedMedia) {
            setMediaItems(prev => prev.filter(item => item.id !== selectedMedia))
            setSelectedMedia(null)
            setRenamingId(null)
          }
        }

        // Select media item
        const handleSelectMedia = (id: string) => {
          setSelectedMedia(id)
          setRenamingId(null)
        }

        // Start renaming media item
        const handleRenameStart = (item: MediaItem) => {
          setRenamingId(item.id)
          setRenameValue(item.name)
        }

        // Transfer patient handler
        const handleTransferClick = () => {
          setShowTransferModal(true)
        }

        // Transfer complete handler
        const handleTransferComplete = () => {
          setShowTransferModal(false)
          setSuccessMessage({ title: 'Transfer Complete', message: 'Patient record transferred successfully.' })
          setShowSuccessModal(true)
        }
      // ...existing code...
        // PDF download option state
        const [pdfOption, setPdfOption] = useState(false)
      const [showChat, setShowChat] = useState(false);
      const [chatUnreadCount, setChatUnreadCount] = useState(0);
      const [currentUser, setCurrentUser] = useState<{ discordId: string; callsign: string } | null>(null);

      useEffect(() => {
        const user = getCurrentUser();
        if (user) {
          setCurrentUser({ discordId: user.discordId, callsign: user.callsign });
        }
      }, []);
    // Rename state
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState<string>('');
  const searchParams = useSearchParams()
  const router = useRouter()
  const incidentId = searchParams?.get('id') || ''
  const fleetId = searchParams?.get('fleetId') || ''

  const [incompleteSections, setIncompleteSections] = useState<string[]>([])
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [patientLetter, setPatientLetter] = useState('A')

  // Modal states
  const [showAddPatientModal, setShowAddPatientModal] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showPatientManagementModal, setShowPatientManagementModal] = useState(false)
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false)
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[section: string]: string[]}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' })
  const [userPermission, setUserPermission] = useState<PermissionLevel | null>(null)
  const [canTransfer, setCanTransfer] = useState(false)

  // Check user permission for this ePRF
  useEffect(() => {
    async function checkPermission() {
      const user = getCurrentUser()
      if (incidentId && user) {
        const access = await checkEPRFAccess(incidentId, user.discordId)
        setUserPermission(access.permission)
        
        // Check if user can transfer the current patient
        const transferAllowed = await checkCanTransferPatient(incidentId, patientLetter, user.discordId)
        setCanTransfer(transferAllowed)
      }
    }
    checkPermission()
  }, [incidentId, patientLetter])

  // Bulk select state
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const handleBulkSelectStart = (id: string) => {
    setBulkSelectMode(true);
    setBulkSelectedIds([id]);
    setSelectedMedia(null);
    setRenamingId(null);
  };
  const handleBulkSelectToggle = (id: string) => {
    setBulkSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  useEffect(() => {
    if (bulkSelectMode && bulkSelectedIds.length === 0) {
      setBulkSelectMode(false);
    }
  }, [bulkSelectedIds, bulkSelectMode]);
  const handleBulkDiscard = () => {
    setMediaItems(prev => prev.filter(item => !bulkSelectedIds.includes(item.id)));
    setBulkSelectedIds([]);
    setBulkSelectMode(false);
  };
  const handleMediaItemMouseDown = (id: string) => {
    if (!bulkSelectMode) {
      longPressTimer.current = setTimeout(() => handleBulkSelectStart(id), 500);
    }
  };
  const handleMediaItemMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const handleMediaItemMouseLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Load patient letter on mount
  useEffect(() => {
    if (incidentId) {
      setPatientLetter(getCurrentPatientLetter(incidentId))
    }
  }, [incidentId])

  // Load saved data on mount
  useEffect(() => {
    if (incidentId) {
      const saved = localStorage.getItem(`media_${incidentId}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setMediaItems(parsed)

  const handlePrevious = () => {
    navigateTo('disposition')
  }

  const handleNext = () => {
    // Do nothing - this is the last page
  }

  const handleSubmitEPRF = () => {
    const result = validateAllSections(incidentId)
    setIncompleteSections(result.incompleteSections)
    
    if (result.isValid) {
      setShowSubmitModal(true)
    } else {
      setValidationErrors(result.fieldErrors)
      setShowValidationErrorModal(true)
    }
  }

  const confirmSubmitEPRF = async () => {
    setIsSubmitting(true)
    try {
      const result = await submitEPRFService(incidentId, fleetId, pdfOption)
      if (result.success) {
        setShowSubmitModal(false)
        router.push('/dashboard')
      } else if (result.validationResult) {
        setShowSubmitModal(false)
        setValidationErrors(result.validationResult.fieldErrors)
        setIncompleteSections(result.validationResult.incompleteSections)
        setShowValidationErrorModal(true)
      }
    } catch (error) {
      console.error('Submit error:', error)
      alert('An error occurred while submitting. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddPatientClick = () => {
    setShowAddPatientModal(true)
  }

  const confirmAddPatient = async () => {
    setIsSubmitting(true)
    try {
      const result = await addPatientService(incidentId)
      
      if (result.success) {
        setShowAddPatientModal(false)
        setPatientLetter(result.newLetter)
        setSuccessMessage({
          title: 'Patient Added Successfully!',
          message: `Patient ${patientLetter} has been saved.\n\nYou are now working on Patient ${result.newLetter}.\n\nThe form has been cleared for the new patient.`
        })
        setShowSuccessModal(true)
        
        setTimeout(() => {
          const params = new URLSearchParams({ id: incidentId, fleetId })
          router.push(`/incident?${params}`)
        }, 2000)
      } else {
        alert(result.error || 'Failed to add patient')
      }
    } catch (error) {
      console.error('Add patient error:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUploadMedia = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        let type: 'image' | 'audio' | 'video' = 'image'
        if (file.type.startsWith('audio/')) type = 'audio'
        else if (file.type.startsWith('video/')) type = 'video'

        const newMedia: MediaItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type,
          name: file.name,
          dataUrl,
          timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        }
        setMediaItems(prev => [...prev, newMedia])
      }
      reader.readAsDataURL(file)
    })

    // Reset input
    e.target.value = ''
  }

  const handleRecordAudio = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data)
        }

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          const reader = new FileReader()
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string
            const newMedia: MediaItem = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              type: 'audio',
              name: `Audio Memo ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
              dataUrl,
              timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            }
            setMediaItems(prev => [...prev, newMedia])
          }
          reader.readAsDataURL(audioBlob)

          // Stop all tracks
          stream.getTracks().forEach(track => track.stop())
        }

        mediaRecorder.start()
        setIsSubmitting(true)
        // ...existing code...

  // Rename confirm (on blur or Enter)
  const handleRenameConfirm = () => {
    if (renamingId && renameValue.trim()) {
      setMediaItems(prev => prev.map(item => item.id === renamingId ? { ...item, name: renameValue.trim() } : item));
      setRenamingId(null);
    }
  };

  // Keyboard handler for rename input
  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRenameConfirm();
    } else if (e.key === 'Escape') {
      setRenamingId(null);
    }
  };
  const getSelectedMediaItem = () => {
    return mediaItems.find(item => item.id === selectedMedia)
  }

  return (
    <div className="eprf-dashboard incident-page">
      <style jsx>{`
        .media-section {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .media-toolbar {
          display: flex;
          gap: 0;
          background: #d0d4d8;
          width: fit-content;
          border: 1px solid #999;
        }

        .toolbar-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 15px 25px;
          background: #e8eaec;
          border: none;
          border-right: 1px solid #999;
          cursor: pointer;
          min-width: 100px;
          font-size: 13px;
          color: #333;
        }

        .toolbar-btn:last-child {
          border-right: none;
        }

        .toolbar-btn:hover {
          background: #d8dade;
        }

        .toolbar-btn.recording {
          background: #ffcccc;
        }

        .toolbar-icon {
          font-size: 24px;
        }

        .media-container {
          display: flex;
          gap: 15px;
          flex: 1;
        }

        .media-list {
          width: 320px;
          min-height: 400px;
          background: #a8b8c8;
          border: 2px solid #7a9cc0;
          border-radius: 3px;
          padding: 10px;
          overflow-y: auto;
        }

        .media-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: #d0dae4;
          border: 1px solid #7a9cc0;
          border-radius: 3px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .media-item:hover {
          background: #c0cad4;
        }

        .media-item.selected {
          background: #5080b0;
          color: white;
        }

        .media-item-icon {
          font-size: 20px;
        }

        .media-item-info {
          flex: 1;
          overflow: hidden;
        }

        .media-item-name {
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .media-item-time {
          font-size: 11px;
          opacity: 0.8;
        }

        .media-preview {
          flex: 1;
          min-height: 400px;
          background: #a8b8c8;
          border: 2px solid #7a9cc0;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .preview-content {
          max-width: 100%;
          max-height: 100%;
        }

        .preview-content img {
          max-width: 100%;
          max-height: 350px;
          object-fit: contain;
        }

        .preview-content audio {
          width: 100%;
          min-width: 300px;
        }

        .preview-content video {
          max-width: 100%;
          max-height: 350px;
        }

        .no-selection {
          color: #666;
          font-size: 14px;
        }

        .hidden-input {
          display: none;
        }
      `}</style>

      <div className="eprf-nav">
        <button className="nav-btn" onClick={() => router.push('/dashboard')}>Home</button>
        <button className="nav-btn" onClick={() => setShowPatientManagementModal(true)}>Manage Patients</button>
        <button className="nav-btn" onClick={() => setShowValidationErrorModal(true)}>History</button>
        <button className="nav-btn chat-btn" onClick={() => setShowChat(!showChat)} title="Chat" style={{ position: 'relative' }}>
          Chat
          {chatUnreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: 2,
              left: 2,
              width: 12,
              height: 12,
              background: 'red',
              borderRadius: '50%',
              display: 'inline-block',
              border: '2px solid white',
              zIndex: 2
            }}></span>
          )}
        </button>
        {canManageCollaborators(userPermission) && (
          <button className="nav-btn" onClick={() => setShowCollaboratorsModal(true)}>Manage Collaborators</button>
        )}
        <button className="nav-btn" onClick={() => router.push('/admin')}>Admin Panel</button>
        <button className="nav-btn" onClick={() => { clearCurrentUser(); router.replace('/'); }}>Logout</button>
        {incidentId && patientLetter && (
          <PresenceIndicator 
            incidentId={incidentId}
            patientLetter={patientLetter}
            userDiscordId={getCurrentUser()?.discordId || ''}
            userCallsign={getCurrentUser()?.callsign || ''}
            pageName="media"
          />
        )}
        <div className="page-counter">
          <span className="patient-letter">{patientLetter}</span>
          <span className="page-indicator">1 of 1</span>
        </div>
      </div>

      <div className="incident-layout">
        <aside className="sidebar">
          <button className={`sidebar-btn${incompleteSections.includes('incident') ? ' incomplete' : ''}`} onClick={() => navigateTo('incident')}>Incident Information</button>
          <button className={`sidebar-btn${incompleteSections.includes('patient-info') ? ' incomplete' : ''}`} onClick={() => navigateTo('patient-info')}>Patient Information</button>
          <button className={`sidebar-btn${incompleteSections.includes('primary-survey') ? ' incomplete' : ''}`} onClick={() => navigateTo('primary-survey')}>Primary Survey</button>
          <button className={`sidebar-btn${incompleteSections.includes('vital-obs') ? ' incomplete' : ''}`} onClick={() => navigateTo('vital-obs')}>Vital Obs / Treat</button>
          <button className={`sidebar-btn${incompleteSections.includes('hx-complaint') ? ' incomplete' : ''}`} onClick={() => navigateTo('hx-complaint')}>Hx Complaint</button>
          <button className={`sidebar-btn${incompleteSections.includes('past-medical-history') ? ' incomplete' : ''}`} onClick={() => navigateTo('past-medical-history')}>Past Medical History</button>
          <button className={`sidebar-btn${incompleteSections.includes('clinical-impression') ? ' incomplete' : ''}`} onClick={() => navigateTo('clinical-impression')}>Clinical Impression</button>
          <button className={`sidebar-btn${incompleteSections.includes('disposition') ? ' incomplete' : ''}`} onClick={() => navigateTo('disposition')}>Disposition</button>
          <button className="sidebar-btn active">Media</button>
        </aside>

        <main className="incident-content">
          <section className="incident-section media-section">
            {/* Toolbar */}
            <div className="media-toolbar">
              <button className="toolbar-btn" onClick={handleUploadMedia}>
                <span className="toolbar-icon">📁</span>
                Upload Media
              </button>
              <button 
                className={`toolbar-btn ${isRecording ? 'recording' : ''}`} 
                onClick={handleRecordAudio}
              >
                <span className="toolbar-icon">🎤</span>
                {isRecording ? 'Stop Recording' : 'Record Audio'}
              </button>
              <button 
                className="toolbar-btn" 
                onClick={handleDiscard}
                disabled={!selectedMedia}
              >
                <span className="toolbar-icon">🗑️</span>
                Discard
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden-input"
              accept="image/*,audio/*,video/*"
              multiple
              onChange={handleFileChange}
            />

            {/* Media container */}
            <div className="media-container">
              {/* Media list */}
              <div className="media-list">
                {mediaItems.map(item => (
                  <div
                    key={item.id}
                    className={`media-item ${selectedMedia === item.id ? 'selected' : ''}`}
                    onClick={() => handleSelectMedia(item.id)}
                    onDoubleClick={() => (item.type === 'image' || item.type === 'audio') ? handleRenameStart(item) : undefined}
                  >
                    <span className="media-item-icon">
                      {item.type === 'image' ? (
                        <img
                          src={item.dataUrl}
                          alt={item.name}
                          className="media-thumb"
                          style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, border: '1px solid #ccc', background: '#fff' }}
                        />
                      ) : item.type === 'audio' ? '🎵' : '🎬'}
                    </span>
                    <div className="media-item-info">
                      <div className="media-item-name">
                        {renamingId === item.id ? (
                          <input
                            type="text"
                            value={renameValue}
                            autoFocus
                            onChange={e => setRenameValue(e.target.value)}
                            onBlur={handleRenameConfirm}
                            onKeyDown={handleRenameKeyDown}
                            style={{ fontSize: 13, fontWeight: 500, width: '90%', border: '1px solid #7a9cc0', borderRadius: 3, padding: '2px 6px' }}
                          />
                        ) : item.name}
                      </div>
                      <div className="media-item-time">{item.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview area */}
              <div className="media-preview">
                {selectedMedia && getSelectedMediaItem() ? (
                  <div className="preview-content">
                    {getSelectedMediaItem()?.type === 'image' && (
                      <img src={getSelectedMediaItem()?.dataUrl} alt={getSelectedMediaItem()?.name} />
                    )}
                    {getSelectedMediaItem()?.type === 'audio' && (
                      <audio controls src={getSelectedMediaItem()?.dataUrl} />
                    )}
                    {getSelectedMediaItem()?.type === 'video' && (
                      <video controls src={getSelectedMediaItem()?.dataUrl} />
                    )}
                  </div>
                ) : (
                  <span className="no-selection">Select media to preview</span>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>

      <div className="eprf-footer incident-footer">
        <ConnectionStatus />
        <div className="footer-left">
          <button className="footer-btn orange" onClick={handleAddPatientClick}>Add Patient</button>
          <button 
            className={`footer-btn green ${!canTransfer ? 'disabled' : ''}`} 
            onClick={handleTransferClick}
            disabled={!canTransfer}
            title={!canTransfer ? 'Only the incident owner or patient owner can transfer' : ''}
          >
            Transfer Patient
          </button>
          <button className="footer-btn green" onClick={handleSubmitEPRF}>Submit ePRF</button>
        </div>
        <div className="footer-right">
          <button className="footer-btn orange" onClick={handlePrevious}>{"< Previous"}</button>
          <button className="footer-btn orange" onClick={handleNext}>{"Next >"}</button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showAddPatientModal}
        onClose={() => setShowAddPatientModal(false)}
        onConfirm={confirmAddPatient}
        title="Add New Patient"
        message={`Are you sure you want to add a new patient?\n\nThis will:\n• Save the current Patient ${patientLetter} data\n• Create a new patient record (Patient ${String.fromCharCode(patientLetter.charCodeAt(0) + 1)})\n• Clear the form for the new patient`}
        confirmText="Yes, Add Patient"
        cancelText="Cancel"
        type="info"
        isLoading={isSubmitting}
      />

      <ConfirmationModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={confirmSubmitEPRF}
        title="Submit ePRF"
        message={`Are you sure you want to submit this ePRF?\n\nThis will:\n• Generate a PDF report for Patient ${patientLetter}\n• Save the record to the database\n• Download the PDF to your device`}
        confirmText="Yes, Submit ePRF"
        cancelText="Cancel"
        type="success"
        isLoading={isSubmitting}
      />

      <ValidationErrorModal
        isOpen={showValidationErrorModal}
        onClose={() => setShowValidationErrorModal(false)}
        errors={validationErrors}
        getSectionDisplayName={getSectionDisplayName}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successMessage.title}
        message={successMessage.message}
      />

      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onTransferComplete={handleTransferComplete}
        incidentId={incidentId}
        patientLetter={patientLetter}
      />

      <PatientManagementModal
        isOpen={showPatientManagementModal}
        onClose={() => setShowPatientManagementModal(false)}
        incidentId={incidentId}
        fleetId={fleetId}
        onPatientSwitch={(letter) => {
          setPatientLetter(letter);
          localStorage.setItem(`patient_letter_${incidentId}`, letter);
          const params = new URLSearchParams({ id: incidentId, fleetId });
          router.push(`/media?${params}`);
        }}
        onPatientAdded={(newLetter, previousLetter) => {
          setPatientLetter(newLetter);
          localStorage.setItem(`patient_letter_${incidentId}`, newLetter);
          setSuccessMessage({
            title: 'Patient Added Successfully!',
            message: `Patient ${previousLetter} has been saved.\n\nYou are now working on Patient ${newLetter}.\n\nThe form has been cleared for the new patient.`
          });
          setShowSuccessModal(true);
          setTimeout(() => {
            const params = new URLSearchParams({ id: incidentId, fleetId });
            router.push(`/incident?${params}`);
          }, 2000);
        }}
      />

      <ManageCollaboratorsModal
        isOpen={showCollaboratorsModal}
        onClose={() => setShowCollaboratorsModal(false)}
        incidentId={incidentId}
        currentUserPermission={userPermission || 'view'}
      />
      {/* Chat Widget */}
      {currentUser && (
        <ChatWidget
          incidentId={incidentId}
          discordId={currentUser.discordId}
          callsign={currentUser.callsign}
          patientLetter={patientLetter}
          onUnreadChange={setChatUnreadCount}
          isOpen={showChat}
        />
      )}
    </div>
  );
};
