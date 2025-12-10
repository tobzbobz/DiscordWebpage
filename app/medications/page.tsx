import ChatStrip from '../components/ChatStrip';
"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { validateAllSections, getSectionDisplayName } from '../utils/validation'
import { handleAddPatient as addPatientService, handleSubmitEPRF as submitEPRFService, getCurrentPatientLetter } from '../utils/eprfService'
import ConfirmationModal, { ValidationErrorModal, SuccessModal } from '../components/ConfirmationModal'
import TransferModal from '../components/TransferModal'
import PatientManagementModal from '../components/PatientManagementModal'
import ManageCollaboratorsModal from '../components/ManageCollaboratorsModal'
import PresenceIndicator from '../components/PresenceIndicator'
import { getCurrentUser, clearCurrentUser } from '../utils/userService'
import { checkEPRFAccess, checkCanTransferPatient, PermissionLevel, canManageCollaborators } from '../utils/apiClient'

export const runtime = 'edge'

// NumericInput component with +/- arrows and keyboard support
interface NumericInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
  step?: number
  min?: number
  max?: number
  placeholder?: string
  style?: React.CSSProperties
  disabled?: boolean
}

function NumericInput({ value, onChange, className = '', step = 1, min, max, placeholder, style, disabled }: NumericInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  
  const increment = () => {
    const currentVal = parseFloat(value) || 0
    const newVal = max !== undefined ? Math.min(max, currentVal + step) : currentVal + step
    onChange(step < 1 ? newVal.toFixed(1) : newVal.toString())
  }
  
  const decrement = () => {
    const currentVal = parseFloat(value) || 0
    const newVal = min !== undefined ? Math.max(min, currentVal - step) : currentVal - step
    onChange(step < 1 ? newVal.toFixed(1) : newVal.toString())
  }
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      increment()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      decrement()
    }
  }
  
  return (
    <div className="numeric-input-wrapper" style={style}>
      <input
        ref={inputRef}
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className={className}
        placeholder={placeholder}
        disabled={disabled}
        step={step}
        min={min}
        max={max}
      />
      {!disabled && (
        <div className="numeric-arrows">
          <button type="button" className="numeric-arrow-btn up" onClick={increment} tabIndex={-1}>▲</button>
          <button type="button" className="numeric-arrow-btn down" onClick={decrement} tabIndex={-1}>▼</button>
        </div>
      )}
    </div>
  )
}

export default function MedicationsPage() {
    // ...existing code...
    const [showChat, setShowChat] = useState(false);
    const [chatUnreadCount, setChatUnreadCount] = useState(0);
    const [currentUser, setCurrentUser] = useState<{ discordId: string; callsign: string } | null>(null);

    useEffect(() => {
      const user = getCurrentUser();
      if (user) {
        setCurrentUser({ discordId: user.discordId, callsign: user.callsign });
      }
    }, []);
  const searchParams = useSearchParams()
  const router = useRouter()
  const incidentId = searchParams?.get('id') || ''
  const fleetId = searchParams?.get('fleetId') || ''
  
  const [incompleteSections, setIncompleteSections] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`medications_incompleteSections_${incidentId}`)
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [patientLetter, setPatientLetter] = useState('A')

  // Modal states for Add Patient and Submit ePRF

  // Persist incompleteSections to localStorage whenever it changes
  useEffect(() => {
    if (incidentId) {
      localStorage.setItem(`medications_incompleteSections_${incidentId}`,
        JSON.stringify(incompleteSections))
    }
  }, [incompleteSections, incidentId])
  const [showAddPatientModal, setShowAddPatientModal] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showPatientManagementModal, setShowPatientManagementModal] = useState(false)
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false)
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [eprfValidationErrors, setEprfValidationErrors] = useState<{[section: string]: string[]}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' })
  const [userPermission, setUserPermission] = useState<PermissionLevel | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [canTransfer, setCanTransfer] = useState(false)

  // Check user permission for this ePRF
  useEffect(() => {
    async function checkPermission() {
      const user = getCurrentUser()
      if (incidentId && user) {
        const access = await checkEPRFAccess(incidentId, user.discordId)
        setUserPermission(access.permission)
        // Owner is incident owner or patient owner
        const isIncidentOwner = access.permission === 'owner'
        // Check if user is patient owner (author)
        let isPatientOwner = false
        try {
          const allRecords = await import('../utils/eprfHistoryService').then(m => m.getAllEPRFRecords())
          const patientRecord = allRecords.find(r => r.incidentId === incidentId && r.patientLetter === patientLetter)
          if (patientRecord && patientRecord.author === user.discordId) {
            isPatientOwner = true
          }
        } catch {}
        setIsOwner(isIncidentOwner || isPatientOwner)
        // Only allow transfer for owner or patient owner
        setCanTransfer(isIncidentOwner || isPatientOwner)
      }
    }
    checkPermission()
  }, [incidentId, patientLetter])

  // Load patient letter on mount
  useEffect(() => {
    if (incidentId) {
      setPatientLetter(getCurrentPatientLetter(incidentId))
    }
  }, [incidentId])
  
  // Saved medications array - initialize from localStorage
  const [savedMedications, setSavedMedications] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`meds_${incidentId}`)
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  
  // Persist medications to localStorage whenever they change
  useEffect(() => {
    if (incidentId) {
      localStorage.setItem(`meds_${incidentId}`, JSON.stringify(savedMedications))
    }
  }, [savedMedications, incidentId])
  
  // Draft state for persistence
  const [medDraft, setMedDraft] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`meds_draft_${incidentId}`)
      return saved ? JSON.parse(saved) : null
    }
    return null
  })
  
  // Load draft on mount if exists
  useEffect(() => {
    if (medDraft && incidentId) {
      setTime(medDraft.time || '')
      setAdministeredBy(medDraft.administeredBy || '')
      setMedication(medDraft.medication || '')
      setDose(medDraft.dose || '')
      setUnit(medDraft.unit || '')
      setRoute(medDraft.route || '')
      setNotes(medDraft.notes || '')
      setNotPossible(medDraft.notPossible || '')
      setDrawnUpNotUsed(medDraft.drawnUpNotUsed || false)
      setBrokenAmpoule(medDraft.brokenAmpoule || false)
      setDiscarded(medDraft.discarded || false)
      setNotesValue(medDraft.notesValue || '')
      setNotPossibleReason(medDraft.notPossibleReason || '')
      if (medDraft.showNewMedication) {
        setShowNewMedication(true)
      }
    }
  }, [])
  
  const [showNewMedication, setShowNewMedication] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showMedicationDropdown, setShowMedicationDropdown] = useState(false)
  const [showRouteModal, setShowRouteModal] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [showNotPossibleModal, setShowNotPossibleModal] = useState(false)
  const [showDateTimePicker, setShowDateTimePicker] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: boolean}>({})
  
  // View modal state (read-only view of submitted records)
  const [showMedViewModal, setShowMedViewModal] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<any>(null)
  
  // Medication state
  const [time, setTime] = useState('')
  const [administeredBy, setAdministeredBy] = useState('')
  const [medication, setMedication] = useState('')
  const [dose, setDose] = useState('')
  const [unit, setUnit] = useState('')
  const [route, setRoute] = useState('')
  const [notes, setNotes] = useState('')
  const [notPossible, setNotPossible] = useState('')
  const [drawnUpNotUsed, setDrawnUpNotUsed] = useState(false)
  const [brokenAmpoule, setBrokenAmpoule] = useState(false)
  const [discarded, setDiscarded] = useState(false)
  
  // Modal state
  const [notesValue, setNotesValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [notPossibleReason, setNotPossibleReason] = useState('')
  
  // Date/time picker state
  const [pickerDay, setPickerDay] = useState(1)
  const [pickerMonth, setPickerMonth] = useState(1)
  const [pickerYear, setPickerYear] = useState(2025)
  const [pickerHour, setPickerHour] = useState(0)
  const [pickerMinute, setPickerMinute] = useState(0)
  
  // Medication list
  const medications = [
    { name: 'Adenosine', code: 'CPG EAS 14.2' },
    { name: 'Adrenaline', code: 'CPG EAS 14.3' },
    { name: 'Amiodarone', code: 'CPG EAS 14.4' },
    { name: 'Aspirin', code: 'CPG EAS 14.6' },
    { name: 'Atropine', code: 'CPG EAS 14.7' },
    { name: 'Calcium Chloride', code: 'CPG EAS 14.8' },
    { name: 'Cefazolin', code: 'CPG EAS 14.49' },
    { name: 'Ceftriaxone', code: 'CPG EAS 14.9' },
    { name: 'Clopidogrel', code: 'CPG EAS 14.10' },
    { name: 'Droperidol', code: 'CPG EAS 14.11' },
    { name: 'Enoxaparin', code: 'CPG EAS 14.12' },
    { name: 'Fentanyl', code: 'CPG EAS 14.13' },
    { name: 'Glucagon', code: 'CPG EAS 14.15' },
    { name: 'Glucose Gel', code: 'CPG EAS 14.16' },
    { name: 'GTN (Glyceryl Trinitrate) IV', code: 'CPG EAS 14.50' },
    { name: 'GTN (Glyceryl Trinitrate) Spray', code: 'CPG EAS 14.17' },
    { name: 'Heparin', code: 'CPG EAS 14.19' },
    { name: 'Hydrocortisone', code: 'CPG EAS 14.20' },
    { name: 'Ibuprofen', code: 'CPG EAS 14.21' },
    { name: 'Ipratropium', code: 'CPG EAS 14.22' },
    { name: 'Ketamine', code: 'CPG EAS 14.23' },
    { name: 'Labetalol', code: 'CPG EAS 14.24' },
    { name: 'Levetiracetam', code: 'CPG EAS 14.51' },
    { name: 'Lignocaine 1%', code: 'CPG EAS 14.25' },
    { name: 'Loratadine', code: 'CPG EAS 14.26' },
    { name: 'Magnesium Sulphate', code: 'CPG EAS 14.27' },
    { name: 'Metaraminol', code: 'CPG EAS 14.28' },
    { name: 'Methoxyflurane', code: 'CPG EAS 14.29' },
    { name: 'Metoprolol Tartrate', code: 'CPG EAS 14.52' },
    { name: 'Midazolam', code: 'CPG EAS 14.31' },
    { name: 'Morphine', code: 'CPG EAS 14.32' },
    { name: 'Naloxone', code: 'CPG EAS 14.33' },
    { name: 'Olanzapine', code: 'CPG EAS 14.34' },
    { name: 'Ondansetron', code: 'CPG EAS 14.35' },
    { name: 'Oxytocin', code: 'CPG EAS 14.36' },
    { name: 'Paracetamol', code: 'CPG EAS 14.37' },
    { name: 'Prednisone and Prednisolone', code: 'CPG EAS 14.38' },
    { name: 'Rocuronium', code: 'CPG EAS 14.40' },
    { name: 'Ropivacaine 0.75%', code: 'CPG EAS 14.41' },
    { name: 'Salbutamol', code: 'CPG EAS 14.42' },
    { name: 'Sodium Bicarbonate 8.4%', code: 'CPG EAS 14.43' },
    { name: 'Suxamethonium', code: 'CPG EAS 14.44' },
    { name: 'Tenecteplase', code: 'CPG EAS 14.45' },
    { name: 'Ticagrelor', code: 'CPG EAS 14.53' },
    { name: 'Tramadol', code: 'CPG EAS 14.46' },
    { name: 'Tranexamic Acid', code: 'CPG EAS 14.47' }
  ]
  
  const routes = [
    'Per oral',
    'Nasal prongs',
    'Nebuliser mask',
    'Sublingual',
    'Inhaled',
    'Intravenous',
    'Intramuscular'
  ]

  const handleLogout = () => {
    clearCurrentUser()
    router.replace('/')
  }

  const handleHome = () => {
    const params = new URLSearchParams({ fleetId })
    router.push(`/dashboard?${params}`)
  }

  // Admin Panel removed from medications page

  const handleTransferClick = () => {
    setShowTransferModal(true)
  }

  const handleTransferComplete = (targetUser: any) => {
    const { transferAllPatients } = require('../utils/eprfHistoryService')
    transferAllPatients(incidentId, targetUser.discordId, targetUser.callsign)
    
    setShowTransferModal(false)
    setSuccessMessage({
      title: 'ePRF Transferred',
      message: `The ePRF has been transferred to ${targetUser.callsign}. You will be redirected to the dashboard.`
    })
    setShowSuccessModal(true)
    setTimeout(() => {
      handleHome()
    }, 2000)
  }
  
  // Save current medication draft to localStorage
  const saveDraft = () => {
    if (!incidentId) return
    const draft = {
      showNewMedication,
      time,
      administeredBy,
      medication,
      dose,
      unit,
      route,
      notes,
      notPossible,
      drawnUpNotUsed,
      brokenAmpoule,
      discarded,
      notesValue,
      notPossibleReason
    }
    localStorage.setItem(`meds_draft_${incidentId}`, JSON.stringify(draft))
  }
  
  // Clear draft from localStorage
  const clearDraft = () => {
    if (incidentId) {
      localStorage.removeItem(`meds_draft_${incidentId}`)
    }
  }

  const navigateTo = (section: string) => {
    // Save draft before navigating away
    if (showNewMedication) {
      saveDraft()
    }
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

  const handlePrevious = () => {
    // Save draft before navigating
    if (showNewMedication) {
      saveDraft()
    }
    navigateTo('vital-obs')
  }

  const handleNext = () => {
    // Save draft before navigating
    if (showNewMedication) {
      saveDraft()
    }
    // Navigate to next section when created
  }

  // Check if there's an unsaved medication entry with data but missing compulsory fields
  const hasUnsavedMedicationData = () => {
    if (!showNewMedication) return false
    // Check if any field has data
    const hasData = time || administeredBy || medication || dose || unit || route || 
                    notes || notPossible || drawnUpNotUsed || brokenAmpoule || discarded || notesValue
    // Compulsory fields: time, administeredBy, medication, dose, unit, route
    const missingCompulsory = !time || !administeredBy || !medication || !dose || !unit || !route
    return hasData && missingCompulsory
  }

  const handleSubmitEPRF = () => {
    // Check for unsaved medication with missing compulsory fields
    if (hasUnsavedMedicationData()) {
      const errors: {[key: string]: boolean} = {}
      if (!time) errors.time = true
      if (!administeredBy) errors.administeredBy = true
      if (!medication) errors.medication = true
      if (!dose) errors.dose = true
      if (!unit) errors.unit = true
      if (!route) errors.route = true
      setValidationErrors(errors)
      alert('You have an unsaved medication entry. Please fill in all required fields (Time, Administered By, Medication, Dose, Unit, Route) or discard the entry before submitting.')
      return
    }
    
    const result = validateAllSections(incidentId)
    setIncompleteSections(result.incompleteSections)
    
    if (result.isValid) {
      setShowSubmitModal(true)
    } else {
      setEprfValidationErrors(result.fieldErrors)
      setShowValidationErrorModal(true)
    }
  }

  const confirmSubmitEPRF = async () => {
    setIsSubmitting(true)
    try {
      const result = await submitEPRFService(incidentId, fleetId)
      
      if (result.success) {
        setShowSubmitModal(false)
        setSuccessMessage({
          title: 'ePRF Submitted Successfully!',
          message: `The ePRF for Patient ${patientLetter} has been submitted.\n\nA PDF copy has been downloaded to your device and the record has been saved.`
        })
        setShowSuccessModal(true)
      } else if (result.validationResult) {
        setShowSubmitModal(false)
        setEprfValidationErrors(result.validationResult.fieldErrors)
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

  const openDateTimePicker = () => {
    const now = new Date()
    setPickerDay(now.getDate())
    setPickerMonth(now.getMonth() + 1)
    setPickerYear(now.getFullYear())
    setPickerHour(now.getHours())
    setPickerMinute(now.getMinutes())
    setShowDateTimePicker(true)
  }

  const handleSetDateTime = () => {
    const formatted = `${String(pickerDay).padStart(2, '0')}/${String(pickerMonth).padStart(2, '0')}/${pickerYear} ${String(pickerHour).padStart(2, '0')}:${String(pickerMinute).padStart(2, '0')}`
    setTime(formatted)
    setShowDateTimePicker(false)
  }

  const setNow = () => {
    const now = new Date()
    const formatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setTime(formatted)
  }

  const resetMedicationForm = () => {
    setTime('')
    setAdministeredBy('')
    setDose('')
    setUnit('')
    setRoute('')
    setNotes('')
    setNotPossible('')
    setDrawnUpNotUsed(false)
    setBrokenAmpoule(false)
    setDiscarded(false)
    setNotesValue('')
    setNotPossibleReason('')
  }

  const handleNewMedication = () => {
    resetMedicationForm()
    setShowNewMedication(true)
    // Immediately open the medication search modal
    setShowSearchModal(true)
  }

  const saveCurrentMedication = () => {
    // Check compulsory fields
    const errors: {[key: string]: boolean} = {}
    if (!time) errors.time = true
    if (!administeredBy) errors.administeredBy = true
    if (!medication) errors.medication = true
    if (!dose) errors.dose = true
    if (!unit) errors.unit = true
    if (!route) errors.route = true
    
    setValidationErrors(errors)
    
    if (Object.keys(errors).length > 0) {
      return false
    }
    
    const medEntry = {
      time,
      administeredBy,
      medication,
      dose,
      unit,
      route,
      notes,
      drawnUpNotUsed,
      brokenAmpoule,
      discarded,
      notPossible
    }
    setSavedMedications([...savedMedications, medEntry])
    setValidationErrors({})
    return true
  }

  const handleSaveAndReturn = () => {
    if (saveCurrentMedication()) {
      clearDraft()
      setShowNewMedication(false)
    }
  }

  const handleSaveAndEnterSame = () => {
    if (saveCurrentMedication()) {
      clearDraft()
      // Reset all except medication
      setTime('')
      setAdministeredBy('')
      setDose('')
      setUnit('')
      setRoute('')
      setNotes('')
      setNotPossible('')
      setDrawnUpNotUsed(false)
      setBrokenAmpoule(false)
      setDiscarded(false)
      setNotesValue('')
      setNotPossibleReason('')
    }
  }

  const handleSaveAndEnterDifferent = () => {
    if (saveCurrentMedication()) {
      clearDraft()
      // Reset everything including medication
      resetMedicationForm()
      setMedication('')
    }
  }

  const handleCancelAndDiscard = () => {
    clearDraft()
    resetMedicationForm()
    setMedication('')
    setShowNewMedication(false)
  }

  const handleSearchClick = () => {
    setSearchQuery(medication)
    setShowMedicationDropdown(true)
  }

  const handleListClick = () => {
    setSearchQuery('')
    setShowSearchModal(true)
    setShowMedicationDropdown(false)
  }

  const handleMedicationSelect = (medName: string) => {
    setMedication(medName)
    setShowSearchModal(false)
    setShowMedicationDropdown(false)
    setSearchQuery('')
  }

  const handleRouteClick = () => {
    setShowRouteModal(true)
  }

  const handleRouteSelect = (routeOption: string) => {
    setRoute(routeOption)
    setShowRouteModal(false)
  }

  const handleNotesClick = () => {
    setShowNotesModal(true)
  }

  const handleNotesOk = () => {
    setNotes(notesValue)
    setShowNotesModal(false)
  }

  const handleNotPossibleClick = () => {
    setShowNotPossibleModal(true)
  }

  const handleNotPossibleSelect = (reason: string) => {
    setNotPossibleReason(reason)
    setNotPossible(reason)
    setShowNotPossibleModal(false)
  }

  const filteredMedications = medications.filter(med =>
    med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    med.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="eprf-dashboard incident-page">
      <div className="eprf-nav">
        <button className="nav-btn" onClick={handleHome}>Home</button>
        <button className="nav-btn" onClick={() => setShowPatientManagementModal(true)}>Manage Patients</button>
        {/* Remove or implement setShowVersionHistory if needed */}
        <button className="nav-btn" title="Version History" disabled>History</button>
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
        {/* Admin Panel button removed from medications page */}
        <button className="nav-btn" onClick={handleLogout}>Logout</button>
        <button className="nav-btn" onClick={handleLogout}>Logout</button>
        {incidentId && patientLetter && (
          <PresenceIndicator 
            incidentId={incidentId}
            patientLetter={patientLetter}
            userDiscordId={getCurrentUser()?.discordId || ''}
            userCallsign={getCurrentUser()?.callsign || ''}
            pageName="medications"
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
          <button className="sidebar-btn" onClick={() => navigateTo('media')}>Media</button>
        </aside>

        <main className="incident-content">
          {!showNewMedication ? (
            <section className="incident-section">
              <h2 className="section-title">Medication</h2>
              {savedMedications.length === 0 ? (
                <div className="no-record-message">No record found.</div>
              ) : (
                <div style={{ marginTop: '20px' }}>
                  {savedMedications.map((med, index) => (
                    <div 
                      key={index} 
                      onClick={() => { setViewingRecord(med); setShowMedViewModal(true); }}
                      style={{
                        backgroundColor: '#d8e8f8',
                        padding: '15px',
                        marginBottom: '10px',
                        borderRadius: '4px',
                        border: '1px solid #a8c5e0',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold', color: '#2c5282' }}>
                          {med.time || 'No time recorded'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#718096', fontStyle: 'italic' }}>(click to view full)</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '14px' }}>
                        {med.medication && <div><strong>Med:</strong> {med.medication}</div>}
                        {med.dose && <div><strong>Dose:</strong> {med.dose} {med.unit}</div>}
                        {med.route && <div><strong>Route:</strong> {med.route}</div>}
                        {med.administeredBy && <div><strong>By:</strong> {med.administeredBy}</div>}
                        {med.notes && <div style={{ gridColumn: '1 / -1' }}><strong>Notes:</strong> {med.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="incident-section">
              <h2 className="section-title">Medication</h2>
              
              <div className="medication-form">
                <div className="medication-row">
                  <div className="medication-field" style={{ flex: '0 0 300px' }}>
                    <label className={`field-label required ${validationErrors.time ? 'validation-error-label' : ''}`}>Time</label>
                    <div className="input-with-btn">
                      <input 
                        type="text" 
                        value={time} 
                        onChange={(e) => setTime(e.target.value)}
                        onClick={openDateTimePicker}
                        className={`text-input ${validationErrors.time ? 'validation-error' : ''}`}
                        readOnly
                      />
                      <button className="now-btn" onClick={setNow}>Now</button>
                    </div>
                  </div>

                  <div className="medication-field" style={{ flex: 1 }}>
                    <label className={`field-label required ${validationErrors.administeredBy ? 'validation-error-label' : ''}`}>Administered by</label>
                    <input 
                      type="text" 
                      value={administeredBy}
                      onChange={(e) => setAdministeredBy(e.target.value)}
                      className={`text-input ${validationErrors.administeredBy ? 'validation-error' : ''}`}
                      placeholder="roblox username"
                    />
                  </div>
                </div>

                <div className="medication-row">
                  <div className="medication-field" style={{ flex: 1, position: 'relative' }}>
                    <label className={`field-label required ${validationErrors.medication ? 'validation-error-label' : ''}`}>Medication</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        type="text" 
                        value={medication}
                        onChange={(e) => {
                          setMedication(e.target.value)
                          setShowMedicationDropdown(false)
                        }}
                        onClick={() => setShowMedicationDropdown(false)}
                          className={`text-input vital-box ${validationErrors.medication ? 'validation-error' : ''}`}
                          style={{ flex: 1 }}
                      />
                      <button className="search-btn" onClick={handleSearchClick}>Search</button>
                      <button className="search-btn" onClick={handleListClick}>List</button>
                    </div>
                    {showMedicationDropdown && filteredMedications.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 100,
                        maxHeight: '300px',
                        overflowY: 'auto',
                        background: '#6a8aac',
                        border: '1px solid #3a5a7c',
                        zIndex: 100,
                        marginTop: '2px'
                      }}>
                        {filteredMedications.slice(0, 20).map((med, index) => (
                          <div
                            key={index}
                            onClick={() => handleMedicationSelect(med.name)}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              color: 'white',
                              fontSize: '14px',
                              borderBottom: '1px solid #5a7a9c',
                              backgroundColor: index % 2 === 0 ? '#7a9abc' : '#6a8aac'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#8aaacc'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#7a9abc' : '#6a8aac'}
                          >
                            <div>{med.name}</div>
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>{med.code}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="medication-row">
                  <div className="medication-field" style={{ flex: '0 0 80px' }}>
                    <label className="field-label">
                      <input type="checkbox" checked={false} disabled style={{ marginRight: '8px' }} />
                      PRN
                    </label>
                  </div>

                  <div className="medication-field" style={{ flex: '0 0 200px' }}>
                    <label className={`field-label required ${validationErrors.dose ? 'validation-error-label' : ''}`}>Dose</label>
                    <NumericInput 
                      value={dose}
                      onChange={setDose}
                      className={`text-input ${validationErrors.dose ? 'validation-error' : ''}`}
                      step={0.1}
                      min={0}
                    />
                  </div>

                  <div className="medication-field" style={{ flex: '0 0 200px' }}>
                    <label className={`field-label required ${validationErrors.unit ? 'validation-error-label' : ''}`}>Unit</label>
                    <input 
                      type="text" 
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                        className={`text-input vital-box ${validationErrors.unit ? 'validation-error' : ''}`}
                    />
                  </div>

                  <div className="medication-field" style={{ flex: 1 }}>
                    <label className={`field-label required ${validationErrors.route ? 'validation-error-label' : ''}`}>Route</label>
                    <input 
                      type="text" 
                      value={route}
                      className={`text-input clickable-input ${validationErrors.route ? 'validation-error' : ''}`}
                      readOnly
                      onClick={handleRouteClick}
                        style={{ cursor: 'pointer' }}
                    />
                  </div>
                </div>

                <div className="medication-row">
                  <div className="medication-field" style={{ flex: 1 }}>
                    <label className="field-label">Notes</label>
                    <input 
                      type="text" 
                      value={notes}
                        className="text-input vital-box clickable-input"
                      readOnly
                      onClick={handleNotesClick}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>

                  <div className="medication-field" style={{ flex: 1 }}>
                    <label className="field-label">Reason for ATP Violation</label>
                    <input 
                      type="text" 
                      className="text-input grayed-disabled"
                      disabled
                      readOnly
                    />
                  </div>
                </div>

                <div className="medication-row">
                  <div className="medication-field">
                    <label className="field-label">
                      <input 
                        type="checkbox" 
                        checked={drawnUpNotUsed}
                        onChange={(e) => setDrawnUpNotUsed(e.target.checked)}
                        style={{ marginRight: '8px' }}
                      />
                      Drawn up not used
                    </label>
                  </div>

                  <div className="medication-field">
                    <label className="field-label">
                      <input 
                        type="checkbox" 
                        checked={brokenAmpoule}
                        onChange={(e) => setBrokenAmpoule(e.target.checked)}
                        style={{ marginRight: '8px' }}
                      />
                      Broken ampoule
                    </label>
                  </div>

                  <div className="medication-field">
                    <label className="field-label">
                      <input 
                        type="checkbox" 
                        checked={discarded}
                        onChange={(e) => setDiscarded(e.target.checked)}
                        style={{ marginRight: '8px' }}
                      />
                      Discarded
                    </label>
                  </div>
                </div>

                <div className="medication-row">
                  <div className="medication-field" style={{ flex: 1 }}>
                    <label className="field-label">Not possible</label>
                    <input 
                      type="text" 
                      value={notPossibleReason}
                        className="text-input vital-box clickable-input"
                      readOnly
                      onClick={handleNotPossibleClick}
                      style={{ cursor: 'pointer' }}
                      placeholder="Select reason"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {!showNewMedication ? (
        <div className="eprf-footer vitals-footer">
          <div className="footer-left">
            <button className="footer-btn large-blue" onClick={() => navigateTo('vital-obs')}>New Vitals</button>
            <button className="footer-btn large-blue" onClick={handleNewMedication}>New Meds</button>
            <button className="footer-btn large-blue" onClick={() => {
              const params = new URLSearchParams({ id: incidentId, fleetId })
              router.push(`/interventions?${params}`)
            }}>New Intervention</button>
          </div>
          <div className="footer-center">
            <button 
              className={`footer-btn green ${!canTransfer ? 'disabled' : ''}`} 
              onClick={canTransfer ? handleTransferClick : undefined}
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
      ) : (
        <div className="eprf-footer vitals-edit-footer">
          <div className="footer-left">
            <button className="footer-btn blue">Competency Tool</button>
          </div>
          <div className="footer-right">
            <button className="footer-btn gray" onClick={handleCancelAndDiscard}>Cancel and discard changes</button>
            <button className="footer-btn blue" onClick={handleSaveAndEnterSame}>Save and enter the same medicine again</button>
            <button className="footer-btn blue" onClick={handleSaveAndEnterDifferent}>Save and enter a different medicine</button>
            <button className="footer-btn blue" onClick={handleSaveAndReturn}>Save and return to Vital Obs/Treat</button>
          </div>
        </div>
      )}

      {/* Date/Time Picker Modal */}
      {showDateTimePicker && (
        <div className="modal-overlay" onClick={() => setShowDateTimePicker(false)}>
          <div className="datetime-picker" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">Set Time</div>
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
                <button className="picker-btn" onClick={() => setPickerYear(pickerYear - 1)}>-</button>
              </div>
              <div className="picker-column">
                <button className="picker-btn" onClick={() => setPickerHour((pickerHour + 1) % 24)}>+</button>
                <div className="picker-value highlight">{String(pickerHour).padStart(2, '0')}</div>
                <button className="picker-btn" onClick={() => setPickerHour((pickerHour - 1 + 24) % 24)}>-</button>
              </div>
              <div className="picker-column">
                <button className="picker-btn" onClick={() => setPickerMinute((pickerMinute + 1) % 60)}>+</button>
                <div className="picker-value highlight">{String(pickerMinute).padStart(2, '0')}</div>
                <button className="picker-btn" onClick={() => setPickerMinute((pickerMinute - 1 + 60) % 60)}>-</button>
              </div>
            </div>
            <div className="picker-footer">
              <button className="picker-footer-btn cancel" onClick={() => setShowDateTimePicker(false)}>Cancel</button>
              <button className="picker-footer-btn ok" onClick={handleSetDateTime}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Medication Search/List Modal */}
      {showSearchModal && (
        <div className="modal-overlay" onClick={() => setShowSearchModal(false)}>
          <div className="medication-search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="medication-search-header">Search Medication</div>
            
            <div className="medication-search-input-section">
              <label className="medication-search-label">Medication *</label>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="medication-search-input"
                placeholder="Type to search..."
                autoFocus
              />
              <div className="medication-search-buttons">
                <button className="medication-search-btn reset" onClick={() => setSearchQuery('')}>Reset...</button>
                <button className="medication-search-btn search">Search</button>
              </div>
            </div>

            <div className="medication-list-header">Medication *</div>
            <div className="medication-list-container">
              {filteredMedications.map((med, index) => (
                <div 
                  key={index}
                  className="medication-list-item"
                  onClick={() => handleMedicationSelect(med.name)}
                >
                  <div className="medication-name">{med.name}</div>
                  <div className="medication-code">{med.code}</div>
                </div>
              ))}
            </div>

            <div className="medication-search-footer">
              <button className="medication-search-footer-btn cancel" onClick={() => setShowSearchModal(false)}>Cancel</button>
              <button className="medication-search-footer-btn ok" onClick={() => setShowSearchModal(false)}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Route Selection Modal */}
      {showRouteModal && (
        <div className="modal-overlay" onClick={() => setShowRouteModal(false)}>
          <div className="route-modal" onClick={(e) => e.stopPropagation()}>
            <div className="route-header">Route</div>
            <div className="route-list">
              {routes.map((routeOption, index) => (
                <div 
                  key={index}
                  className="route-item"
                  onClick={() => handleRouteSelect(routeOption)}
                >
                  {routeOption}
                </div>
              ))}
            </div>
            <div className="route-footer">
              <button className="route-footer-btn cancel" onClick={() => setShowRouteModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="modal-overlay" onClick={() => setShowNotesModal(false)}>
          <div className="vital-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vital-modal-header">Notes</div>
            
            <div className="vital-modal-section">
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Enter notes..."
                style={{
                  width: '100%',
                  minHeight: '200px',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div className="vital-modal-actions">
              <button className="vital-modal-btn secondary">Competency Tool</button>
              <button className="vital-modal-btn cancel" onClick={() => setShowNotesModal(false)}>Cancel</button>
              <button className="vital-modal-btn ok" onClick={handleNotesOk}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Not Possible Modal */}
      {showNotPossibleModal && (
        <div className="modal-overlay" onClick={() => setShowNotPossibleModal(false)}>
          <div className="not-possible-modal" onClick={(e) => e.stopPropagation()}>
            <div className="not-possible-header">Not possible</div>
            
            <div className="not-possible-options">
              <button 
                className={`not-possible-option ${notPossibleReason === 'Patient does not understand' ? 'selected' : ''}`}
                onClick={() => handleNotPossibleSelect('Patient does not understand')}
              >
                Patient does not understand
              </button>
              <button 
                className={`not-possible-option ${notPossibleReason === 'Patient refused' ? 'selected' : ''}`}
                onClick={() => handleNotPossibleSelect('Patient refused')}
              >
                Patient refused
              </button>
              <button 
                className={`not-possible-option ${notPossibleReason === 'Patient unconscious' ? 'selected' : ''}`}
                onClick={() => handleNotPossibleSelect('Patient unconscious')}
              >
                Patient unconscious
              </button>
              <button 
                className={`not-possible-option ${notPossibleReason === 'Not indicated' ? 'selected' : ''}`}
                onClick={() => handleNotPossibleSelect('Not indicated')}
              >
                Not indicated
              </button>
              <button 
                className={`not-possible-option ${notPossibleReason === 'Contraindicated' ? 'selected' : ''}`}
                onClick={() => handleNotPossibleSelect('Contraindicated')}
              >
                Contraindicated
              </button>
              <button 
                className={`not-possible-option ${notPossibleReason === 'Equipment failure' ? 'selected' : ''}`}
                onClick={() => handleNotPossibleSelect('Equipment failure')}
              >
                Equipment failure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Patient Confirmation Modal */}
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

      {/* Submit ePRF Confirmation Modal */}
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

      {/* Validation Error Modal */}
      <ValidationErrorModal
        isOpen={showValidationErrorModal}
        onClose={() => setShowValidationErrorModal(false)}
        errors={eprfValidationErrors}
        getSectionDisplayName={getSectionDisplayName}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successMessage.title}
        message={successMessage.message}
      />

      {/* Medication View Modal (read-only, consistent style) */}
      {showMedViewModal && viewingRecord && (
        <div className="modal-overlay" onClick={() => { setShowMedViewModal(false); setViewingRecord(null); }}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%', overflowY: 'auto', maxHeight: '80vh' }}>
            <div className="modal-header">Medication Record</div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div><strong>Time:</strong> {viewingRecord.time || 'Not recorded'}</div>
                {viewingRecord.medication && <div><strong>Medication:</strong> {viewingRecord.medication}</div>}
                {viewingRecord.dose && <div><strong>Dose:</strong> {viewingRecord.dose} {viewingRecord.unit || ''}</div>}
                {viewingRecord.route && <div><strong>Route:</strong> {viewingRecord.route}</div>}
                {viewingRecord.administeredBy && <div><strong>Administered By:</strong> {viewingRecord.administeredBy}</div>}
                {viewingRecord.notPossible && <div><strong>Not Possible:</strong> {viewingRecord.notPossible}</div>}
                {viewingRecord.notPossibleReason && <div><strong>Reason:</strong> {viewingRecord.notPossibleReason}</div>}
                {viewingRecord.drawnUpNotUsed && <div><strong>Drawn Up Not Used:</strong> Yes</div>}
                {viewingRecord.brokenAmpoule && <div><strong>Broken Ampoule:</strong> Yes</div>}
                {viewingRecord.discarded && <div><strong>Discarded:</strong> Yes</div>}
              </div>
              {viewingRecord.notes && (
                <div style={{ marginTop: '15px' }}>
                  <strong>Notes:</strong>
                  <div style={{ whiteSpace: 'pre-wrap', background: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc', padding: '10px', marginTop: '4px' }}>{viewingRecord.notes}</div>
                </div>
              )}
            </div>
            <div className="modal-actions" style={{ textAlign: 'center', marginTop: '18px' }}>
              <button className="modal-btn ok" onClick={() => { setShowMedViewModal(false); setViewingRecord(null); }}>Go Back</button>
            </div>
          </div>
        </div>
      )}

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
          const params = new URLSearchParams({ id: incidentId, fleetId })
          router.push(`/medications?${params}`)
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
    </div>
  )
}
