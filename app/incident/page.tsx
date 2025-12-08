"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { validateAllSections, getSectionDisplayName } from '../utils/validation'
import { handleAddPatient as addPatientService, handleSubmitEPRF as submitEPRFService, getCurrentPatientLetter } from '../utils/eprfService'
import ConfirmationModal, { ValidationErrorModal, SuccessModal } from '../components/ConfirmationModal'
import TransferModal from '../components/TransferModal'
import PatientManagementModal from '../components/PatientManagementModal'
import ManageCollaboratorsModal from '../components/ManageCollaboratorsModal'
import PresenceIndicator from '../components/PresenceIndicator'
import ConnectionStatus from '../components/ConnectionStatus'
import CursorOverlay from '../components/CursorOverlay'
import ChatWidget from '../components/ChatWidget'
import VersionHistoryModal from '../components/VersionHistoryModal'
import KeyboardShortcuts from '../components/KeyboardShortcuts'
import { saveEPRFRecord, createEPRFRecord, getEPRFRecord } from '../utils/eprfHistoryService'
import { getCurrentUser, clearCurrentUser } from '../utils/userService'
import { isAdmin, checkEPRFAccess, checkCanTransferPatient, PermissionLevel, canEdit, canManageCollaborators } from '../utils/apiClient'

export const runtime = 'edge'

const CASE_TYPES = [
  { value: 'MED', label: 'MED', desc: 'Medical' },
  { value: 'ACC', label: 'ACC', desc: 'Trauma' },
  { value: 'PTS', label: 'PTS', desc: 'Patient Transport' },
  { value: 'PVT', label: 'PVT', desc: '', disabled: true },
  { value: 'NO_EPRF', label: 'No ePRF', desc: '' },
]

const LOCATION_TYPES = [
  { label: 'Home', disabled: false },
  { label: 'Farm', disabled: false },
  { label: 'Road', disabled: false },
  { label: 'Workplace', disabled: false },
  { label: 'Educational Facility', disabled: true },
  { label: 'Footpath', disabled: false },
  { label: 'Aged Care Facility', disabled: true },
  { label: 'Healthcare Facility', disabled: false },
  { label: 'Public (Other)', disabled: false },
  { label: 'Other', disabled: false }
]

const REQUIRED_SECTIONS = {
  incident: ['caseType', 'dateTimeOfCall', 'incidentLocation', 'locationType'],
  'patient-info': ['robloxUsername', 'firstName', 'surname', 'sex', 'dob']
}

export default function IncidentPage() {
    // PDF download option state
    const [pdfOption, setPdfOption] = useState(false)
    // Chat unread count state
    const [chatUnreadCount, setChatUnreadCount] = useState(0)
  const searchParams = useSearchParams()
  const router = useRouter()
  const incidentId = searchParams?.get('id') || ''
  const fleetId = searchParams?.get('fleetId') || ''
  
  const [caseType, setCaseType] = useState('MED')
  const [exTransfer, setExTransfer] = useState(false)
  const [dateTimeOfCall, setDateTimeOfCall] = useState('')
  const [dispatchTime, setDispatchTime] = useState('')
  const [responding, setResponding] = useState('')
  const [atScene, setAtScene] = useState('')
  const [atPatient, setAtPatient] = useState('')
  const [departScene, setDepartScene] = useState('')
  const [atDestination, setAtDestination] = useState('')
  const [destination, setDestination] = useState('River City Hospital')
  const [incidentLocation, setIncidentLocation] = useState('')
  const [locationType, setLocationType] = useState('')
  const [locationTypeOther, setLocationTypeOther] = useState('')
  
  const [showDateTimePicker, setShowDateTimePicker] = useState(false)
  const [currentField, setCurrentField] = useState<string | null>(null)
  const [pickerDay, setPickerDay] = useState(3)
  const [pickerMonth, setPickerMonth] = useState(12)
  const [pickerYear, setPickerYear] = useState(2025)
  const [pickerHour, setPickerHour] = useState(18)
  const [pickerMinute, setPickerMinute] = useState(55)
  const [incompleteSections, setIncompleteSections] = useState<string[]>([])
  const [fieldErrors, setFieldErrors] = useState<string[]>([])
  const [patientLetter, setPatientLetter] = useState('A')

  // Modal states
  const [showAddPatientModal, setShowAddPatientModal] = useState(false)
  const [showPatientManagementModal, setShowPatientManagementModal] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[section: string]: string[]}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' })
  const [userPermission, setUserPermission] = useState<PermissionLevel | null>(null)
  const [canTransfer, setCanTransfer] = useState(false)
  
  // Real-time collaboration states
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ discordId: string; callsign: string } | null>(null)

  // Check user permission for this ePRF
  useEffect(() => {
    async function checkPermission() {
      const user = getCurrentUser()
      if (user) {
        setCurrentUser({ discordId: user.discordId, callsign: user.callsign })
      }
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

  // Keyboard shortcut handler
  const handleKeyboardShortcut = (action: string) => {
    switch (action) {
      case 'save':
        // Trigger save
        if (incidentId) {
          const data = {
            caseType, exTransfer, dateTimeOfCall, dispatchTime, responding, atScene,
            atPatient, departScene, atDestination, destination, incidentLocation,
            locationType, locationTypeOther
          }
          localStorage.setItem(`incident_${incidentId}`, JSON.stringify(data))
        }
        break
      case 'help':
        // Handled by KeyboardShortcuts component
        break
    }
  }

  // Load patient letter on mount
  useEffect(() => {
    if (incidentId) {
      setPatientLetter(getCurrentPatientLetter(incidentId))
      
      // Create or get ePRF record
      const user = getCurrentUser()
      if (user) {
        const existingRecord = getEPRFRecord(incidentId, getCurrentPatientLetter(incidentId))
        if (!existingRecord) {
          createEPRFRecord(incidentId, getCurrentPatientLetter(incidentId), user.discordId, user.callsign, fleetId)
        }
      }
    }
  }, [incidentId, fleetId])

  // Load saved data on mount
  useEffect(() => {
    if (incidentId) {
      const saved = localStorage.getItem(`incident_${incidentId}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed.caseType) setCaseType(parsed.caseType)
          if (parsed.exTransfer !== undefined) setExTransfer(parsed.exTransfer)
          if (parsed.dateTimeOfCall) setDateTimeOfCall(parsed.dateTimeOfCall)
          if (parsed.dispatchTime) setDispatchTime(parsed.dispatchTime)
          if (parsed.responding) setResponding(parsed.responding)
          if (parsed.atScene) setAtScene(parsed.atScene)
          if (parsed.atPatient) setAtPatient(parsed.atPatient)
          if (parsed.departScene) setDepartScene(parsed.departScene)
          if (parsed.atDestination) setAtDestination(parsed.atDestination)
          if (parsed.destination) setDestination(parsed.destination)
          if (parsed.incidentLocation) setIncidentLocation(parsed.incidentLocation)
          if (parsed.locationType) setLocationType(parsed.locationType)
          if (parsed.locationTypeOther) setLocationTypeOther(parsed.locationTypeOther)
        } catch (e) {
          console.error('Failed to load saved incident data:', e)
        }
      }
    }
  }, [incidentId])

  // Save data whenever it changes
  useEffect(() => {
    if (incidentId) {
      const data = {
        caseType,
        exTransfer,
        dateTimeOfCall,
        dispatchTime,
        responding,
        atScene,
        atPatient,
        departScene,
        atDestination,
        destination,
        incidentLocation,
        locationType,
        locationTypeOther
      }
      localStorage.setItem(`incident_${incidentId}`, JSON.stringify(data))
    }
  }, [incidentId, caseType, exTransfer, dateTimeOfCall, dispatchTime, responding, atScene, atPatient, departScene, atDestination, destination, incidentLocation, locationType, locationTypeOther])

  const handleSubmit = () => {
    // Validate all sections across the entire ePRF
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
          router.push(`/patient-info?${params}`)
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

  // Check if a field has validation error
  const hasFieldError = (field: string) => {
    return incompleteSections.includes('incident') && (
      (field === 'caseType' && !caseType) ||
      (field === 'dateTimeOfCall' && !dateTimeOfCall) ||
      (field === 'incidentLocation' && !incidentLocation) ||
      (field === 'locationType' && !locationType)
    )
  }

  const handleLogout = () => {
    // Data is auto-saved via useEffect, just clear session and navigate
    clearCurrentUser()
    router.replace('/')
  }

  const handleHome = () => {
    // Save current data is automatic via useEffect, just navigate
    const params = new URLSearchParams({ fleetId })
    router.push(`/dashboard?${params}`)
  }

  const handleAdminPanel = () => {
    const user = getCurrentUser()
    if (user && isAdmin(user.discordId)) {
      router.push('/admin')
    }
  }

  const handleTransferClick = () => {
    setShowTransferModal(true)
  }

  const handleTransferComplete = async (targetUser: any) => {
    try {
      const user = getCurrentUser()
      if (!user) return
      
      // Import the API function for patient transfer
      const { transferPatientOwnershipAPI } = await import('../utils/apiClient')
      
      // Get current patient owner info
      const record = await getEPRFRecord(incidentId, patientLetter)
      const currentOwnerDiscordId = record?.author || user.discordId
      const currentOwnerCallsign = record?.authorCallsign || user.callsign
      
      // Transfer the current patient ownership
      await transferPatientOwnershipAPI(
        incidentId,
        patientLetter,
        currentOwnerDiscordId,
        currentOwnerCallsign,
        targetUser.discordId,
        targetUser.callsign,
        user.discordId
      )
      
      setShowTransferModal(false)
      setSuccessMessage({
        title: 'Patient Transferred',
        message: `Patient ${patientLetter} has been transferred to ${targetUser.callsign}.`
      })
      setShowSuccessModal(true)
      
      // Re-check transfer permission after transfer
      const transferAllowed = await checkCanTransferPatient(incidentId, patientLetter, user.discordId)
      setCanTransfer(transferAllowed)
    } catch (error) {
      console.error('Transfer error:', error)
      setSuccessMessage({
        title: 'Transfer Failed',
        message: 'Failed to transfer patient. Please try again.'
      })
      setShowSuccessModal(true)
    }
  }

  const navigateTo = (section: string) => {
    const params = new URLSearchParams({ id: incidentId, fleetId })
    if (section === 'incident') router.push(`/incident?${params}`)
    else if (section === 'patient-info') router.push(`/patient-info?${params}`)
    else if (section === 'primary-survey') router.push(`/primary-survey?${params}`)
    else if (section === 'vital-obs') router.push(`/vital-obs?${params}`)
    else if (section === 'hx-complaint') router.push(`/hx-complaint?${params}`)
    else if (section === 'past-medical-history') router.push(`/past-medical-history?${params}`)
    else if (section === 'clinical-impression') router.push(`/clinical-impression?${params}`)
    else if (section === 'disposition') router.push(`/disposition?${params}`)
    else if (section === 'media') router.push(`/media?${params}`)
  }

  const setNow = (field: string) => {
    const now = new Date()
    const formatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    
    switch(field) {
      case 'dateTimeOfCall': setDateTimeOfCall(formatted); break
      case 'dispatchTime': setDispatchTime(formatted); break
      case 'responding': setResponding(formatted); break
      case 'atScene': setAtScene(formatted); break
      case 'atPatient': setAtPatient(formatted); break
      case 'departScene': setDepartScene(formatted); break
      case 'atDestination': setAtDestination(formatted); break
    }
  }

  const openDateTimePicker = (field: string) => {
    setCurrentField(field)
    const now = new Date()
    setPickerDay(now.getDate())
    setPickerMonth(now.getMonth() + 1)
    setPickerYear(now.getFullYear())
    setPickerHour(now.getHours())
    setPickerMinute(now.getMinutes())
    setShowDateTimePicker(true)
  }

  const handleSetDateTime = () => {
    if (currentField) {
      const formatted = `${String(pickerDay).padStart(2, '0')}/${String(pickerMonth).padStart(2, '0')}/${pickerYear} ${String(pickerHour).padStart(2, '0')}:${String(pickerMinute).padStart(2, '0')}`
      switch(currentField) {
        case 'dateTimeOfCall': setDateTimeOfCall(formatted); break
        case 'dispatchTime': setDispatchTime(formatted); break
        case 'responding': setResponding(formatted); break
        case 'atScene': setAtScene(formatted); break
        case 'atPatient': setAtPatient(formatted); break
        case 'departScene': setDepartScene(formatted); break
        case 'atDestination': setAtDestination(formatted); break
      }
    }
    setShowDateTimePicker(false)
  }

  return (
    <div className="eprf-dashboard incident-page">
      <div className="eprf-nav">
        <button className="nav-btn" onClick={handleHome}>Home</button>
        <button className="nav-btn" onClick={() => setShowPatientManagementModal(true)}>Manage Patients</button>
        {canManageCollaborators(userPermission) && (
          <button className="nav-btn" onClick={() => setShowCollaboratorsModal(true)}>Manage Collaborators</button>
        )}
        <button className="nav-btn" onClick={() => setShowVersionHistory(true)} title="Version History">History</button>
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
        <button className="nav-btn" onClick={handleAdminPanel}>Admin Panel</button>
        <button className="nav-btn" onClick={handleLogout}>Logout</button>
        {incidentId && patientLetter && (
          <PresenceIndicator 
            incidentId={incidentId}
            patientLetter={patientLetter}
            userDiscordId={getCurrentUser()?.discordId || ''}
            userCallsign={getCurrentUser()?.callsign || ''}
            pageName="incident"
          />
        )}
        <div className="page-counter">
          <span className="patient-letter">{patientLetter}</span>
          <span className="page-indicator">1 of 1</span>
        </div>
      </div>

      <div className="incident-layout">
        <aside className="sidebar">
          <button className={`sidebar-btn active${incompleteSections.includes('incident') ? ' incomplete' : ''}`}>Incident Information</button>
          <button className={`sidebar-btn${incompleteSections.includes('patient-info') ? ' incomplete' : ''}`} onClick={() => navigateTo('patient-info')}>Patient Information</button>
          <button className={`sidebar-btn${incompleteSections.includes('primary-survey') ? ' incomplete' : ''}`} onClick={() => navigateTo('primary-survey')}>Primary Survey</button>
          <button className={`sidebar-btn${incompleteSections.includes('vital-obs') ? ' incomplete' : ''}`} onClick={() => navigateTo('vital-obs')}>Vital Obs / Treat</button>
          <button className={`sidebar-btn${incompleteSections.includes('hx-complaint') ? ' incomplete' : ''}`} onClick={() => navigateTo('hx-complaint')}>Hx Complaint</button>
          <button className={`sidebar-btn${incompleteSections.includes('past-medical-history') ? ' incomplete' : ''}`} onClick={() => navigateTo('past-medical-history')}>Past Medical History</button>
          <button className={`sidebar-btn${incompleteSections.includes('clinical-impression') ? ' incomplete' : ''}`} onClick={() => navigateTo('clinical-impression')}>Clinical Impression</button>
          <button className={`sidebar-btn${incompleteSections.includes('disposition') ? ' incomplete' : ''}`} onClick={() => navigateTo('disposition')}>Disposition</button>
          <button className="sidebar-btn" onClick={() => navigateTo('media')}>Media</button>
        </aside>

        <main className="incident-content">
          <section className="incident-section">
            <h2 className="section-title">Incident Information</h2>
            
            <div className="form-row">
              <div className="form-field master-incident">
                <label className="field-label">Master Incident Number</label>
                <input type="text" value={incidentId} readOnly disabled className="text-input readonly master" />
              </div>
              
              <div className="form-field case-types">
                <label className={`field-label required ${hasFieldError('caseType') ? 'validation-error-label' : ''}`}>Case Type</label>
                <div className={`case-type-grid ${hasFieldError('caseType') ? 'validation-error-radio' : ''}`}>
                  {CASE_TYPES.map(ct => (
                    <label key={ct.value} className={`case-type-option ${ct.disabled ? 'disabled' : ''}`}>
                      <input 
                        type="radio" 
                        name="caseType" 
                        value={ct.value}
                        checked={caseType === ct.value}
                        onChange={(e) => setCaseType(e.target.value)}
                        disabled={ct.disabled}
                      />
                      <span className="radio-label">
                        <span>{ct.label}</span>
                        {ct.desc && <span className="radio-desc">{ct.desc}</span>}
                      </span>
                    </label>
                  ))}
                </div>
                <div style={{ marginTop: '10px' }}>
                  <label className="case-type-option disabled">
                    <input 
                      type="checkbox" 
                      checked={exTransfer}
                      onChange={(e) => setExTransfer(e.target.checked)}
                      disabled
                    />
                    <span className="radio-label">Ex-Transfer/Event</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="form-row times-row">
              <div className="form-field">
                <label className={`field-label required ${hasFieldError('dateTimeOfCall') ? 'validation-error-label' : ''}`}>Date/Time of Call</label>
                <div className="input-with-btn">
                  <input 
                    type="text" 
                    value={dateTimeOfCall} 
                    onChange={(e) => setDateTimeOfCall(e.target.value)}
                    onClick={() => openDateTimePicker('dateTimeOfCall')}
                    className={`text-input ${hasFieldError('dateTimeOfCall') ? 'validation-error' : ''}`}
                    readOnly
                  />
                  <button className="now-btn" onClick={() => setNow('dateTimeOfCall')}>Now</button>
                </div>
              </div>
              
              <div className="form-field">
                <label className="field-label">Dispatch Time</label>
                <div className="input-with-btn">
                  <input type="text" value={dispatchTime} onChange={(e) => setDispatchTime(e.target.value)} onClick={() => openDateTimePicker('dispatchTime')} className="text-input" readOnly />
                  <button className="now-btn" onClick={() => setNow('dispatchTime')}>Now</button>
                </div>
              </div>
              
              <div className="form-field">
                <label className="field-label">Responding</label>
                <div className="input-with-btn">
                  <input type="text" value={responding} onChange={(e) => setResponding(e.target.value)} onClick={() => openDateTimePicker('responding')} className="text-input" readOnly />
                  <button className="now-btn" onClick={() => setNow('responding')}>Now</button>
                </div>
              </div>
              
              <div className="form-field">
                <label className="field-label">At Scene</label>
                <div className="input-with-btn">
                  <input type="text" value={atScene} onChange={(e) => setAtScene(e.target.value)} onClick={() => openDateTimePicker('atScene')} className="text-input" readOnly />
                  <button className="now-btn" onClick={() => setNow('atScene')}>Now</button>
                </div>
              </div>
            </div>

            <div className="form-row times-row">
              <div className="form-field">
                <label className="field-label">At Patient</label>
                <div className="input-with-btn">
                  <input type="text" value={atPatient} onChange={(e) => setAtPatient(e.target.value)} onClick={() => openDateTimePicker('atPatient')} className="text-input" readOnly />
                  <button className="now-btn" onClick={() => setNow('atPatient')}>Now</button>
                </div>
              </div>
              
              <div className="form-field">
                <label className="field-label">Depart Scene</label>
                <div className="input-with-btn">
                  <input type="text" value={departScene} onChange={(e) => setDepartScene(e.target.value)} onClick={() => openDateTimePicker('departScene')} className="text-input" readOnly />
                  <button className="now-btn" onClick={() => setNow('departScene')}>Now</button>
                </div>
              </div>
              
              <div className="form-field">
                <label className="field-label">At Destination</label>
                <div className="input-with-btn">
                  <input type="text" value={atDestination} onChange={(e) => setAtDestination(e.target.value)} onClick={() => openDateTimePicker('atDestination')} className="text-input" readOnly />
                  <button className="now-btn" onClick={() => setNow('atDestination')}>Now</button>
                </div>
              </div>
              
              <div className="form-field">
                <label className="field-label">Destination</label>
                <input type="text" value={destination} readOnly disabled className="text-input readonly preset" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field full-width">
                <label className={`field-label required ${hasFieldError('incidentLocation') ? 'validation-error-label' : ''}`}>Incident Location</label>
                <input type="text" value={incidentLocation} onChange={(e) => setIncidentLocation(e.target.value)} className={`text-input ${hasFieldError('incidentLocation') ? 'validation-error' : ''}`} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field full-width">
                <label className={`field-label required ${hasFieldError('locationType') ? 'validation-error-label' : ''}`}>Location Type</label>
                <div className={`location-type-grid ${hasFieldError('locationType') ? 'validation-error-radio' : ''}`}>
                  {LOCATION_TYPES.map(lt => (
                    <label key={lt.label} className={`location-type-option${lt.disabled ? ' disabled' : ''}`}>
                      <input 
                        type="radio" 
                        name="locationType" 
                        value={lt.label}
                        checked={locationType === lt.label}
                        onChange={(e) => setLocationType(e.target.value)}
                        disabled={lt.disabled}
                      />
                      <span className="radio-label">{lt.label}</span>
                    </label>
                  ))}
                </div>
                {locationType === 'Other' && (
                  <input
                    type="text"
                    className="text-input"
                    style={{ marginTop: '10px' }}
                    placeholder="Please specify..."
                    value={locationTypeOther}
                    onChange={(e) => setLocationTypeOther(e.target.value)}
                  />
                )}
              </div>
            </div>
          </section>
        </main>
      </div>

      <div className="eprf-footer incident-footer">
        <ConnectionStatus />
        <div className="footer-left">
          <button className="footer-btn green" onClick={handleAddPatientClick}>Add Patient</button>
          <button 
            className={`footer-btn green ${!canTransfer ? 'disabled' : ''}`} 
            onClick={handleTransferClick}
            disabled={!canTransfer}
            title={!canTransfer ? 'Only the incident owner or patient owner can transfer' : ''}
          >
            Transfer Patient
          </button>
          <button className="footer-btn green" onClick={handleSubmit}>Submit ePRF</button>
        </div>
        <div className="footer-right">
          <button className="footer-btn orange disabled" disabled>{"< Previous"}</button>
          <button className="footer-btn orange" onClick={() => navigateTo('patient-info')}>{"Next >"}</button>
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
        message={`Are you sure you want to submit this ePRF?\n\nThis will:\n• Generate a PDF report for Patient ${patientLetter}\n• Save the record to the database`}
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
          setPatientLetter(letter)
          // Reload page to get new patient data
          const params = new URLSearchParams({ id: incidentId, fleetId })
          router.push(`/incident?${params}`)
        }}
        onPatientAdded={(newLetter, previousLetter) => {
          setPatientLetter(newLetter)
          setSuccessMessage({
            title: 'Patient Added Successfully!',
            message: `Patient ${previousLetter} has been saved.\n\nYou are now working on Patient ${newLetter}.\n\nThe form has been cleared for the new patient.`
          })
          setShowSuccessModal(true)
          setTimeout(() => {
            const params = new URLSearchParams({ id: incidentId, fleetId })
            router.push(`/patient-info?${params}`)
          }, 2000)
        }}
      />

      <ManageCollaboratorsModal
        isOpen={showCollaboratorsModal}
        onClose={() => setShowCollaboratorsModal(false)}
        incidentId={incidentId}
        currentUserPermission={userPermission || 'view'}
      />

      {showDateTimePicker && (
        <div className="modal-overlay" onClick={() => setShowDateTimePicker(false)}>
          <div className="datetime-picker" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">Date/Time of Call</div>
            <div className="picker-display">
              Wed, December {String(pickerDay).padStart(2, '0')}, {pickerYear} {String(pickerHour).padStart(2, '0')}:{String(pickerMinute).padStart(2, '0')}
            </div>
            <div className="picker-controls">
              <div className="picker-column">
                <button className="picker-btn" onClick={() => setPickerDay(Math.min(31, pickerDay + 1))}>+</button>
                <div className="picker-value highlight">{String(pickerDay).padStart(2, '0')}</div>
                <button className="picker-btn" onClick={() => setPickerDay(Math.max(1, pickerDay - 1))}>-</button>
              </div>
              <div className="picker-column">
                <button className="picker-btn" onClick={() => setPickerMonth(pickerMonth === 12 ? 1 : pickerMonth + 1)}>+</button>
                <div className="picker-value">{String(pickerMonth).padStart(2, '0')}</div>
                <button className="picker-btn" onClick={() => setPickerMonth(pickerMonth === 1 ? 12 : pickerMonth - 1)}>-</button>
              </div>
              <div className="picker-column">
                <button className="picker-btn" onClick={() => setPickerYear(pickerYear + 1)}>+</button>
                <div className="picker-value">{pickerYear}</div>
                <button className="picker-btn" onClick={() => setPickerYear(Math.max(2000, pickerYear - 1))}>-</button>
              </div>
              <div className="picker-column">
                <button className="picker-btn" onClick={() => setPickerHour((pickerHour + 1) % 24)}>+</button>
                <div className="picker-value">{String(pickerHour).padStart(2, '0')}</div>
                <button className="picker-btn" onClick={() => setPickerHour(pickerHour === 0 ? 23 : pickerHour - 1)}>-</button>
              </div>
              <div className="picker-column">
                <button className="picker-btn" onClick={() => setPickerMinute((pickerMinute + 1) % 60)}>+</button>
                <div className="picker-value">{String(pickerMinute).padStart(2, '0')}</div>
                <button className="picker-btn" onClick={() => setPickerMinute(pickerMinute === 0 ? 59 : pickerMinute - 1)}>-</button>
              </div>
            </div>
            <div className="picker-actions">
              <button className="picker-action-btn cancel" onClick={() => setShowDateTimePicker(false)}>Clear</button>
              <button className="picker-action-btn ok" onClick={handleSetDateTime}>Set</button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Collaboration Components */}
      {currentUser && (
        <>
          {/* Cursor Overlay for collaborative editing */}
          <CursorOverlay
            incidentId={incidentId}
            discordId={currentUser.discordId}
            callsign={currentUser.callsign}
            patientLetter={patientLetter}
          />

          {/* Chat Widget */}
          <ChatWidget
            incidentId={incidentId}
            discordId={currentUser.discordId}
            callsign={currentUser.callsign}
            patientLetter={patientLetter}
            onUnreadChange={setChatUnreadCount}
            isOpen={showChat}
          />

          {/* Version History Modal */}
          {showVersionHistory && (
            <VersionHistoryModal
              discordId={currentUser.discordId}
              callsign={currentUser.callsign}
              incidentId={incidentId}
              patientLetter={patientLetter}
              isOwner={userPermission === 'owner'}
              isPatientOwner={userPermission === 'owner' || userPermission === 'manage'}
              onClose={() => setShowVersionHistory(false)}
            />
          )}
        </>
      )}

      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts 
        shortcuts={[
          { key: 's', ctrlKey: true, action: () => handleKeyboardShortcut('save'), description: 'Save', category: 'Actions' },
          { key: '?', action: () => {}, description: 'Show Help', category: 'General' }
        ]}
      />
    </div>
  )
}
