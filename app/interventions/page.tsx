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
import ChatWidget from '../components/ChatWidget';
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
    if (disabled) return
    const currentVal = parseFloat(value) || 0
    const newVal = max !== undefined ? Math.min(max, currentVal + step) : currentVal + step
    onChange(step < 1 ? newVal.toFixed(1) : newVal.toString())
  }
  
  const decrement = () => {
    if (disabled) return
    const currentVal = parseFloat(value) || 0
    const newVal = min !== undefined ? Math.max(min, currentVal - step) : currentVal - step
    onChange(step < 1 ? newVal.toFixed(1) : newVal.toString())
  }
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return
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

export default function InterventionsPage() {
  // ============ HOOKS AND STATE (MUST BE FIRST) ============
  const searchParams = useSearchParams()
  const router = useRouter()
  const incidentId = searchParams?.get('id') || ''
  const fleetId = searchParams?.get('fleetId') || ''


  const [currentUser, setCurrentUser] = useState<any>(null)
  const [patientLetter, setPatientLetter] = useState('A')
  const [userPermission, setUserPermission] = useState<PermissionLevel>('view')
  const [canTransfer, setCanTransfer] = useState(false)

  const [showAddPatientModal, setShowAddPatientModal] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showPatientManagementModal, setShowPatientManagementModal] = useState(false)
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [chatUnreadCount, setChatUnreadCount] = useState(0)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [incompleteSections, setIncompleteSections] = useState<string[]>([])
  const [eprfValidationErrors, setEprfValidationErrors] = useState<{[key: string]: string[]}>({})
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' })

  const [savedInterventions, setSavedInterventions] = useState<any[]>([])
  const [showInterventionViewModal, setShowInterventionViewModal] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<any>(null)

  const [showNewIntervention, setShowNewIntervention] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: boolean}>({})
  const [showAirwayModal, setShowAirwayModal] = useState(false)
  const [showRSIModal, setShowRSIModal] = useState(false)
  const [showCPRModal, setShowCPRModal] = useState(false)
  const [showDefibrillationModal, setShowDefibrillationModal] = useState(false)
  const [showIVModal, setShowIVModal] = useState(false)
  const [showIOModal, setShowIOModal] = useState(false)
  const [showPositioningModal, setShowPositioningModal] = useState(false)
  const [showSplintModal, setShowSplintModal] = useState(false)
  const [showTourniquetModal, setShowTourniquetModal] = useState(false)
  const [showOtherNotesModal, setShowOtherNotesModal] = useState(false)
  const [showDateTimePicker, setShowDateTimePicker] = useState(false)
  const [showCPRDiscontinuedPicker, setShowCPRDiscontinuedPicker] = useState(false)

  // Intervention state
  const [time, setTime] = useState('')
  const [performedBy, setPerformedBy] = useState('')

  // Airway section
  const [airway, setAirway] = useState('')
  const [ventilation, setVentilation] = useState('')
  const [peep, setPeep] = useState('')
  const [cpap, setCpap] = useState('')
  const [rsi, setRsi] = useState('')

  // Cardiac section
  const [cpr, setCpr] = useState('')
  const [cprCompressions, setCprCompressions] = useState('')
  const [cprVentilations, setCprVentilations] = useState('')
  const [cprContinuous, setCprContinuous] = useState(false)
  const [cprDiscontinued, setCprDiscontinued] = useState('')
  const [defibrillation, setDefibrillation] = useState('')
  const [cardioversion, setCardioversion] = useState('')
  const [pacing, setPacing] = useState('')
  const [valsalva, setValsalva] = useState('')

  // Invasive section
  const [ivCannulation, setIvCannulation] = useState('')
  const [ivSite, setIvSite] = useState('')
  const [ivAttempts, setIvAttempts] = useState('')
  const [ivSuccessful, setIvSuccessful] = useState('')
  const [ioAccess, setIoAccess] = useState('')
  const [ioSite, setIoSite] = useState('')
  const [ioAttempts, setIoAttempts] = useState('')
  const [ioSuccessful, setIoSuccessful] = useState('')
  const [ioNotes, setIoNotes] = useState('')
  const [chestDecompression, setChestDecompression] = useState('')
  const [stomachDecompression, setStomachDecompression] = useState('')
  const [catheterTroubleshooting, setCatheterTroubleshooting] = useState('')
  const [nerveBlock, setNerveBlock] = useState('')

  // Other section
  const [positioning, setPositioning] = useState('')
  const [positioningPosition, setPositioningPosition] = useState('')
  const [positioningLegsElevated, setPositioningLegsElevated] = useState('')
  const [positioningOther, setPositioningOther] = useState('')
  const [splintDressingTag, setSplintDressingTag] = useState('')
  const [splintSelection, setSplintSelection] = useState('')
  const [splintOther, setSplintOther] = useState('')
  const [nasalTamponade, setNasalTamponade] = useState('')
  const [tourniquet, setTourniquet] = useState('')
  const [tourniquetLocation, setTourniquetLocation] = useState('')
  const [tourniquetSuccessful, setTourniquetSuccessful] = useState('')
  const [limbReduction, setLimbReduction] = useState('')
  const [epleManoeuvre, setEpleManoeuvre] = useState('')
  const [otherInterventionNotes, setOtherInterventionNotes] = useState('')

  // Modal state
  const [airwayMethod, setAirwayMethod] = useState('')
  const [defibrillationJoules, setDefibrillationJoules] = useState('')

  // Date/time picker state
  const [pickerDay, setPickerDay] = useState(1)
  const [pickerMonth, setPickerMonth] = useState(1)
  const [pickerYear, setPickerYear] = useState(2025)
  const [pickerHour, setPickerHour] = useState(0)
  const [pickerMinute, setPickerMinute] = useState(0)

  // ============ EFFECTS ============
  useEffect(() => {
    const user = getCurrentUser()
    if (user) {
      setCurrentUser(user)
    }
    
    const checkPermissions = async () => {
      if (!incidentId) return
      
      try {
        const access = await checkEPRFAccess(incidentId, patientLetter)
        setUserPermission(access.permission || 'view')

        const transferPermission = await checkCanTransferPatient(incidentId, patientLetter, user?.discordId || '')
        setCanTransfer(transferPermission.canTransfer || false)
      } catch (error) {
        console.error('Failed to check permissions:', error)
      }
    }
    
    checkPermissions()
  }, [incidentId, patientLetter])

  // ============ CONSTANTS ============
  const airwayMethods = [
    'Manual Clear',
    'OPA',
    'Intubation',
    'Other Device',
    'Suction',
    'NPA',
    'Cricothyroidotomy',
    'Jaw Thrust',
    'LMA',
    'Laryngoscopy'
  ]

  const ventilationOptions = [
    'Manual',
    'Mechanical'
  ]

  const rsiOptions = [
    'Successful',
    'Unsuccessful'
  ]

  const splintOptions = [
    'Dressing',
    'Bandage',
    'Cardboard Splint',
    'Traction Splint',
    'KED or Similar',
    'Firm Cervical Collar',
    'Cervical Lanyard'
  ]

  // ============ HANDLER FUNCTIONS ============
  const handleLogout = () => {
    clearCurrentUser()
    router.replace('/')
  }

  const handleHome = () => {
    const params = new URLSearchParams({ fleetId })
    router.push(`/dashboard?${params}`)
  }

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
  
  const saveDraft = () => {
    if (!incidentId) return
    const draft = {
      showNewIntervention,
      time,
      performedBy,
      airway,
      ventilation,
      peep,
      cpap,
      rsi,
      cpr,
      cprCompressions,
      cprVentilations,
      cprContinuous,
      cprDiscontinued,
      defibrillation,
      defibrillationJoules,
      cardioversion,
      pacing,
      valsalva,
      ivCannulation,
      ivSite,
      ivAttempts,
      ivSuccessful,
      ioAccess,
      ioSite,
      ioAttempts,
      ioSuccessful,
      ioNotes,
      chestDecompression,
      stomachDecompression,
      catheterTroubleshooting,
      nerveBlock,
      positioning,
      positioningPosition,
      positioningLegsElevated,
      positioningOther,
      splintDressingTag,
      splintSelection,
      splintOther,
      nasalTamponade,
      tourniquet,
      tourniquetLocation,
      tourniquetSuccessful,
      limbReduction,
      epleManoeuvre,
      otherInterventionNotes,
      airwayMethod
    }
    localStorage.setItem(`interventions_draft_${incidentId}`, JSON.stringify(draft))
  }
  
  const clearDraft = () => {
    if (incidentId) {
      localStorage.removeItem(`interventions_draft_${incidentId}`)
    }
  }

  const navigateTo = (section: string) => {
    if (showNewIntervention) {
      saveDraft()
    }
    const params = new URLSearchParams({ id: incidentId, fleetId })
    if (section === 'incident') router.push(`/incident?${params}`)
    else if (section === 'patient-info') router.push(`/patient-info?${params}`)
    else if (section === 'primary-survey') router.push(`/primary-survey?${params}`)
    else if (section === 'vital-obs') router.push(`/vital-obs?${params}`)
    else if (section === 'medications') router.push(`/medications?${params}`)
    else if (section === 'hx-complaint') router.push(`/hx-complaint?${params}`)
    else if (section === 'past-medical-history') router.push(`/past-medical-history?${params}`)
    else if (section === 'clinical-impression') router.push(`/clinical-impression?${params}`)
    else if (section === 'disposition') router.push(`/disposition?${params}`)
    else if (section === 'media') router.push(`/media?${params}`)
  }

  const handlePrevious = () => {
    if (showNewIntervention) {
      saveDraft()
    }
    navigateTo('vital-obs')
  }

  const handleNext = () => {
    if (showNewIntervention) {
      saveDraft()
    }
  }

  const hasUnsavedInterventionData = () => {
    if (!showNewIntervention) return false
    const hasData = airway || ventilation || rsi || cpr || defibrillation || cardioversion ||
                    pacing || valsalva || ivCannulation || ioAccess || chestDecompression ||
                    stomachDecompression || catheterTroubleshooting || nerveBlock || positioning ||
                    splintDressingTag || nasalTamponade || tourniquet || limbReduction || 
                    epleManoeuvre || otherInterventionNotes
    const missingCompulsory = !time || !performedBy
    return hasData && missingCompulsory
  }

  const handleSubmitEPRF = () => {
    if (hasUnsavedInterventionData()) {
      const errors: {[key: string]: boolean} = {}
      if (!time) errors.time = true
      if (!performedBy) errors.performedBy = true
      setValidationErrors(errors)
      alert('You have an unsaved intervention entry. Please fill in the required fields (Time, Performed By) or discard the entry before submitting.')
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
        router.push('/dashboard')
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

  const resetInterventionForm = () => {
    setTime('')
    setPerformedBy('')
    setAirway('')
    setVentilation('')
    setPeep('')
    setCpap('')
    setRsi('')
    setCpr('')
    setCprCompressions('')
    setCprVentilations('')
    setCprContinuous(false)
    setCprDiscontinued('')
    setDefibrillation('')
    setDefibrillationJoules('')
    setCardioversion('')
    setPacing('')
    setValsalva('')
    setIvCannulation('')
    setIvSite('')
    setIvAttempts('')
    setIvSuccessful('')
    setIoAccess('')
    setIoSite('')
    setIoAttempts('')
    setIoSuccessful('')
    setIoNotes('')
    setChestDecompression('')
    setStomachDecompression('')
    setCatheterTroubleshooting('')
    setNerveBlock('')
    setPositioning('')
    setPositioningPosition('')
    setPositioningLegsElevated('')
    setPositioningOther('')
    setSplintDressingTag('')
    setSplintSelection('')
    setSplintOther('')
    setNasalTamponade('')
    setTourniquet('')
    setTourniquetLocation('')
    setTourniquetSuccessful('')
    setLimbReduction('')
    setEpleManoeuvre('')
    setOtherInterventionNotes('')
    setAirwayMethod('')
  }

  const handleNewIntervention = () => {
    resetInterventionForm()
    setShowNewIntervention(true)
  }

  const saveCurrentIntervention = () => {
    // Check compulsory fields
    const errors: {[key: string]: boolean} = {}
    if (!time) errors.time = true
    if (!performedBy) errors.performedBy = true
    
    setValidationErrors(errors)
    
    if (Object.keys(errors).length > 0) {
      return false
    }
    
    const interventionEntry = {
      time,
      performedBy,
      airway,
      ventilation,
      rsi,
      cpr,
      defibrillation,
      cardioversion,
      pacing,
      valsalva,
      ivCannulation,
      ioAccess,
      chestDecompression,
      stomachDecompression,
      catheterTroubleshooting,
      nerveBlock,
      positioning,
      splintDressingTag,
      nasalTamponade,
      tourniquet,
      limbReduction,
      epleManoeuvre,
      otherInterventionNotes
    }
    setSavedInterventions([...savedInterventions, interventionEntry])
    setValidationErrors({})
    return true
  }

  const handleSaveAndReturn = () => {
    if (saveCurrentIntervention()) {
      clearDraft()
      resetInterventionForm()
      setShowNewIntervention(false)
      // No navigation, just show the updated list
    }
  }

  const handleSaveAndEnterAnother = () => {
    if (saveCurrentIntervention()) {
      clearDraft()
      resetInterventionForm()
      setShowNewIntervention(true)
    }
  }

  const handleCancelAndDiscard = () => {
    clearDraft()
    resetInterventionForm()
    setShowNewIntervention(false)
  }

  const handleAirwayClick = () => {
    setShowAirwayModal(true)
  }

  const handleAirwaySelect = (method: string) => {
    setAirwayMethod(method)
    setAirway(method)
    setShowAirwayModal(false)
  }

  const handleRSIClick = () => {
    setShowRSIModal(true)
  }

  const handleRSISelect = (option: string) => {
    setRsi(option)
    setShowRSIModal(false)
  }

  const handleCPRClick = () => {
    setShowCPRModal(true)
  }

  const handleCPROk = () => {
    const ratio = cprContinuous ? 'Continuous' : `${cprCompressions}:${cprVentilations}`
    setCpr(ratio)
    setShowCPRModal(false)
  }

  const openCPRDiscontinuedPicker = () => {
    const now = new Date()
    setPickerDay(now.getDate())
    setPickerMonth(now.getMonth() + 1)
    setPickerYear(now.getFullYear())
    setPickerHour(now.getHours())
    setPickerMinute(now.getMinutes())
    setShowCPRDiscontinuedPicker(true)
  }

  const handleSetCPRDiscontinued = () => {
    const formatted = `${String(pickerDay).padStart(2, '0')}/${String(pickerMonth).padStart(2, '0')}/${pickerYear} ${String(pickerHour).padStart(2, '0')}:${String(pickerMinute).padStart(2, '0')}`
    setCprDiscontinued(formatted)
    setShowCPRDiscontinuedPicker(false)
  }

  const setCPRDiscontinuedNow = () => {
    const now = new Date()
    const formatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setCprDiscontinued(formatted)
  }

  const handleDefibrillationClick = () => {
    setShowDefibrillationModal(true)
  }

  const handleDefibrillationSelect = (joules: string) => {
    setDefibrillation(joules)
    setDefibrillationJoules(joules)
    setShowDefibrillationModal(false)
  }

  const handleIVClick = () => {
    setShowIVModal(true)
  }

  const handleIVOk = () => {
    const parts: string[] = []
    if (ivSite) parts.push(ivSite)
    if (ivAttempts) parts.push(`${ivAttempts} attempts`)
    if (ivSuccessful) parts.push(ivSuccessful)
    setIvCannulation(parts.join(', '))
    setShowIVModal(false)
  }

  const handleIOClick = () => {
    setShowIOModal(true)
  }

  const handleIOOk = () => {
    const parts: string[] = []
    if (ioSite) parts.push(ioSite)
    if (ioAttempts) parts.push(`${ioAttempts} attempts`)
    if (ioSuccessful) parts.push(ioSuccessful)
    setIoAccess(parts.join(', '))
    setShowIOModal(false)
  }

  const handlePositioningClick = () => {
    setShowPositioningModal(true)
  }

  const handlePositioningOk = () => {
    const parts: string[] = []
    if (positioningPosition) parts.push(positioningPosition)
    if (positioningLegsElevated) parts.push(`Legs: ${positioningLegsElevated}`)
    if (positioningOther) parts.push(positioningOther)
    setPositioning(parts.join(', '))
    setShowPositioningModal(false)
  }

  const handleSplintClick = () => {
    setShowSplintModal(true)
  }

  const handleSplintSelect = (option: string) => {
    setSplintSelection(option)
    if (option !== 'Other') {
      setSplintDressingTag(option)
      setShowSplintModal(false)
    }
  }

  const handleSplintOk = () => {
    if (splintSelection === 'Other' && splintOther) {
      setSplintDressingTag(splintOther)
    }
    setShowSplintModal(false)
  }

  const handleTourniquetClick = () => {
    setShowTourniquetModal(true)
  }

  const handleTourniquetOk = () => {
    const parts: string[] = []
    if (tourniquetLocation) parts.push(tourniquetLocation)
    if (tourniquetSuccessful) parts.push(tourniquetSuccessful)
    setTourniquet(parts.join(', '))
    setShowTourniquetModal(false)
  }

  const handleOtherNotesClick = () => {
    setShowOtherNotesModal(true)
  }

  const handleOtherNotesOk = () => {
    setShowOtherNotesModal(false)
  }

  return (
    <div className="eprf-dashboard incident-page">
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
        {/* Admin Panel button removed from interventions page */}
        <button className="nav-btn" onClick={() => { clearCurrentUser(); router.replace('/'); }}>Logout</button>
        {incidentId && patientLetter && (
          <PresenceIndicator 
            incidentId={incidentId}
            patientLetter={patientLetter}
            userDiscordId={getCurrentUser()?.discordId || ''}
            userCallsign={getCurrentUser()?.callsign || ''}
            pageName="interventions"
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
          {!showNewIntervention ? (
            <section className="incident-section">
              <h2 className="section-title">Intervention(s)</h2>
              {savedInterventions.length === 0 ? (
                <div className="no-record-message">No record found.</div>
              ) : (
                <div style={{ marginTop: '20px' }}>
                  {savedInterventions.map((intervention, index) => (
                    <div 
                      key={index} 
                      onClick={() => { setViewingRecord(intervention); setShowInterventionViewModal(true); }}
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
                          Time: {intervention.time || 'No time recorded'} | Performed by: {intervention.performedBy || 'Not specified'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#718096', fontStyle: 'italic' }}>(click to view full)</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '14px' }}>
                        {intervention.airway && <div><strong>Airway:</strong> {intervention.airway}</div>}
                        {intervention.ventilation && <div><strong>Ventilation:</strong> {intervention.ventilation}</div>}
                        {intervention.rsi && <div><strong>RSI:</strong> {intervention.rsi}</div>}
                        {intervention.cpr && <div><strong>CPR:</strong> {intervention.cpr}</div>}
                        {intervention.defibrillation && <div><strong>Defibrillation:</strong> {intervention.defibrillation}</div>}
                        {intervention.ivCannulation && <div><strong>IV Cannulation:</strong> {intervention.ivCannulation}</div>}
                        {intervention.ioAccess && <div><strong>IO Access:</strong> {intervention.ioAccess}</div>}
                        {intervention.positioning && <div><strong>Positioning:</strong> {intervention.positioning}</div>}
                        {intervention.splintDressingTag && <div><strong>Splint/Dressing/Tag:</strong> {intervention.splintDressingTag}</div>}
                        {intervention.tourniquet && <div><strong>Tourniquet:</strong> {intervention.tourniquet}</div>}
                        {intervention.otherInterventionNotes && <div style={{ gridColumn: '1 / -1' }}><strong>Other Notes:</strong> {intervention.otherInterventionNotes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="incident-section">
              <h2 className="section-title">Intervention(s)</h2>
              
              <div className="intervention-form">
                {/* Time and Performed By Row */}
                <div className="intervention-header-row">
                  <div className="intervention-field" style={{ flex: '0 0 300px' }}>
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

                  <div className="intervention-field" style={{ flex: 1 }}>
                    <label className={`field-label required ${validationErrors.performedBy ? 'validation-error-label' : ''}`}>Performed by</label>
                    <input 
                      type="text" 
                      value={performedBy}
                      onChange={(e) => setPerformedBy(e.target.value)}
                      className={`text-input ${validationErrors.performedBy ? 'validation-error' : ''}`}
                      placeholder="roblox username"
                    />
                  </div>
                </div>

                {/* Airway Section */}
                <div className="intervention-category">
                  <div className="intervention-category-label">Airway</div>
                  <div className="intervention-row">
                    <div className="intervention-field">
                      <label className="field-label">Airway</label>
                      <input 
                        type="text" 
                        value={airway}
                        className="text-input clickable-input"
                        readOnly
                        onClick={handleAirwayClick}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">Ventilation</label>
                      <select 
                        value={ventilation}
                        onChange={(e) => setVentilation(e.target.value)}
                        className="text-input"
                      >
                        <option value=""></option>
                        {ventilationOptions.map((option, index) => (
                          <option key={index} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div className="intervention-field">
                        <label className="field-label">PEEP (cmH₂O)</label>
                        <input 
                          type="text" 
                          className="text-input grayed-disabled vital-box"
                          disabled
                          readOnly
                        />
                    </div>
                    <div className="intervention-field">
                        <label className="field-label">CPAP (cmH₂O)</label>
                        <input 
                          type="text" 
                          className="text-input grayed-disabled vital-box"
                          disabled
                          readOnly
                        />
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">RSI</label>
                      <input 
                        type="text" 
                        value={rsi}
                        className="text-input clickable-input"
                        readOnly
                        onClick={handleRSIClick}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Cardiac Section */}
                <div className="intervention-category">
                  <div className="intervention-category-label">Cardiac</div>
                  <div className="intervention-row">
                    <div className="intervention-field">
                      <label className="field-label">CPR</label>
                      <input 
                        type="text" 
                        value={cpr}
                        className="text-input clickable-input"
                        readOnly
                        onClick={handleCPRClick}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div className="intervention-field">
                        <label className="field-label">Defibrillation <span style={{fontSize:'11px',opacity:0.7}}>(Joules)</span></label>
                        <input 
                          type="text" 
                          value={defibrillation}
                          className="text-input grayed-disabled vital-box"
                          disabled
                          readOnly
                        />
                    </div>
                    <div className="intervention-field">
                        <label className="field-label">Cardioversion <span style={{fontSize:'11px',opacity:0.7}}>(Joules)</span></label>
                        <input 
                          type="text" 
                          className="text-input grayed-disabled vital-box"
                          disabled
                          readOnly
                        />
                    </div>
                    <div className="intervention-field">
                        <label className="field-label">Pacing</label>
                        <input 
                          type="text" 
                          className="text-input grayed-disabled vital-box"
                          disabled
                          readOnly
                        />
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">Valsalva</label>
                      <input 
                        type="text" 
                        className="text-input grayed-disabled"
                        disabled
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                {/* Invasive Section */}
                <div className="intervention-category">
                  <div className="intervention-category-label">Invasive</div>
                  <div className="intervention-row" style={{ marginBottom: '10px' }}>
                    <div className="intervention-field">
                      <label className="field-label">IV Cannulation</label>
                      <input 
                        type="text" 
                        value={ivCannulation}
                        readOnly
                        onClick={handleIVClick}
                        className="text-input"
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">IO Access</label>
                      <input 
                        type="text" 
                        value={ioAccess}
                        readOnly
                        onClick={handleIOClick}
                          className="text-input vital-box"
                          style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div className="intervention-field">
                        <label className="field-label">Chest Decompression</label>
                        <input 
                          type="text" 
                          value={chestDecompression}
                          disabled
                          readOnly
                          className="text-input grayed-disabled vital-box"
                        />
                    </div>
                  </div>
                  <div className="intervention-row">
                    <div className="intervention-field">
                        <label className="field-label">Stomach Decompression</label>
                        <input 
                          type="text" 
                          value={stomachDecompression}
                          disabled
                          readOnly
                          className="text-input grayed-disabled vital-box"
                        />
                    </div>
                    <div className="intervention-field">
                        <label className="field-label">Catheter Troubleshooting</label>
                        <input 
                          type="text" 
                          value={catheterTroubleshooting}
                          disabled
                          readOnly
                          className="text-input grayed-disabled vital-box"
                        />
                    </div>
                    <div className="intervention-field">
                        <label className="field-label">Nerve Block</label>
                        <input 
                          type="text" 
                          value={nerveBlock}
                          disabled
                          readOnly
                          className="text-input grayed-disabled vital-box"
                        />
                    </div>
                  </div>
                </div>

                {/* Other Section */}
                <div className="intervention-category">
                  <div className="intervention-category-label">Other</div>
                  <div className="intervention-row" style={{ marginBottom: '10px' }}>
                    <div className="intervention-field">
                      <label className="field-label">Positioning</label>
                      <input 
                        type="text" 
                        value={positioning}
                        readOnly
                        onClick={handlePositioningClick}
                          className="text-input vital-box"
                          style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">Splint/Dressing/Tag</label>
                      <input 
                        type="text" 
                        value={splintDressingTag}
                        readOnly
                        onClick={handleSplintClick}
                          className="text-input vital-box"
                          style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div className="intervention-field">
                        <label className="field-label">Nasal Tamponade</label>
                        <input 
                          type="text" 
                          value={nasalTamponade}
                          disabled
                          readOnly
                          className="text-input grayed-disabled vital-box"
                        />
                    </div>
                  </div>
                  <div className="intervention-row" style={{ marginBottom: '10px' }}>
                    <div className="intervention-field">
                      <label className="field-label">Tourniquet</label>
                      <input 
                        type="text" 
                        value={tourniquet}
                        readOnly
                        onClick={handleTourniquetClick}
                          className="text-input vital-box"
                          style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div className="intervention-field">
                        <label className="field-label">Limb Reduction</label>
                        <input 
                          type="text" 
                          value={limbReduction}
                          disabled
                          readOnly
                          className="text-input grayed-disabled vital-box"
                        />
                    </div>
                    <div className="intervention-field">
                        <label className="field-label">Epley Manoeuvre</label>
                        <input 
                          type="text" 
                          value={epleManoeuvre}
                          disabled
                          readOnly
                          className="text-input grayed-disabled vital-box"
                        />
                    </div>
                  </div>
                  <div className="intervention-row">
                    <div className="intervention-field" style={{ flex: 1 }}>
                      <label className="field-label">Other Intervention/Notes</label>
                      <input 
                        type="text" 
                        value={otherInterventionNotes}
                        readOnly
                        onClick={handleOtherNotesClick}
                          className="text-input vital-box"
                          style={{ cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {!showNewIntervention ? (
        <div className="eprf-footer vitals-footer">
          <div className="footer-left">
            <button className="footer-btn large-blue" onClick={() => navigateTo('vital-obs')}>New Vitals</button>
            <button className="footer-btn large-blue" onClick={() => navigateTo('medications')}>New Meds</button>
            <button className="footer-btn large-blue" onClick={handleNewIntervention}>New Intervention</button>
          </div>
          <div className="footer-center">
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
      ) : (
        <div className="eprf-footer vitals-edit-footer">
          <div className="footer-left">
          </div>
          <div className="footer-right">
            <button className="footer-btn gray" onClick={handleCancelAndDiscard}>Cancel and discard changes</button>
            <button className="footer-btn blue" onClick={handleSaveAndEnterAnother}>Save and enter another intervention</button>
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

      {/* Airway Modal */}
      {showAirwayModal && (
        <div className="modal-overlay" onClick={() => setShowAirwayModal(false)}>
          <div className="airway-modal" onClick={(e) => e.stopPropagation()}>
            <div className="airway-header">Airway</div>
            <div className="airway-content">
              <div className="airway-method-label">Method *</div>
              <div className="airway-methods-grid">
                {airwayMethods.map((method, index) => (
                  <label key={index} className="airway-method-option">
                    <input
                      type="radio"
                      name="airwayMethod"
                      checked={airwayMethod === method}
                      onChange={() => setAirwayMethod(method)}
                    />
                    <span>{method}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="airway-footer">
              <button className="airway-footer-btn cancel" onClick={() => setShowAirwayModal(false)}>Cancel</button>
              <button className="airway-footer-btn ok" onClick={() => handleAirwaySelect(airwayMethod)}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* RSI Modal */}
      {showRSIModal && (
        <div className="modal-overlay" onClick={() => setShowRSIModal(false)}>
          <div className="rsi-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rsi-header">RSI</div>
            <div className="rsi-content">
              {rsiOptions.map((option, index) => (
                <div 
                  key={index}
                  className="rsi-option"
                  onClick={() => handleRSISelect(option)}
                >
                  {option}
                </div>
              ))}
            </div>
            <div className="rsi-footer">
              <button className="rsi-footer-btn cancel" onClick={() => setShowRSIModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* CPR Modal */}
      {showCPRModal && (
        <div className="modal-overlay" onClick={() => setShowCPRModal(false)}>
          <div className="cpr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cpr-header">CPR</div>
            <div className="cpr-content">
              <div className="cpr-ratio-section">
                <div className="cpr-ratio-label">CPR Ratio:</div>
                <div className="cpr-ratio-inputs">
                  <div className="cpr-input-group">
                    <label className="cpr-input-label">Compressions *</label>
                    <NumericInput 
                      value={cprCompressions}
                      onChange={setCprCompressions}
                      className="cpr-input green-input"
                      disabled={cprContinuous}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="cpr-ratio-divider">/</div>
                  <div className="cpr-input-group">
                    <label className="cpr-input-label">Ventilations *</label>
                    <NumericInput 
                      value={cprVentilations}
                      onChange={setCprVentilations}
                      className="cpr-input"
                      disabled={cprContinuous}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="cpr-or">OR</div>
                  <div className="cpr-continuous-group">
                    <label className="cpr-continuous-label">
                      <input 
                        type="checkbox" 
                        checked={cprContinuous}
                        onChange={(e) => setCprContinuous(e.target.checked)}
                      />
                      <span>Continuous Compressions</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="cpr-discontinued-section">
                <label className="cpr-input-label">Time CPR Discontinued</label>
                <div className="input-with-btn">
                  <input 
                    type="text" 
                    value={cprDiscontinued}
                    className="cpr-input"
                    readOnly
                    onClick={openCPRDiscontinuedPicker}
                  />
                  <button className="now-btn" onClick={setCPRDiscontinuedNow}>Now</button>
                </div>
              </div>
            </div>
            <div className="cpr-footer">
              <button className="cpr-footer-btn cancel" onClick={() => setShowCPRModal(false)}>Cancel</button>
              <button className="cpr-footer-btn ok" onClick={handleCPROk}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* CPR Discontinued Time Picker */}
      {showCPRDiscontinuedPicker && (
        <div className="modal-overlay" onClick={() => setShowCPRDiscontinuedPicker(false)}>
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
              <button className="picker-footer-btn cancel" onClick={() => setShowCPRDiscontinuedPicker(false)}>Cancel</button>
              <button className="picker-footer-btn ok" onClick={handleSetCPRDiscontinued}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Defibrillation Modal */}
      {showDefibrillationModal && (
        <div className="modal-overlay" onClick={() => setShowDefibrillationModal(false)}>
          <div className="defibrillation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="defibrillation-header">Defibrillation (Joules)</div>
            <div className="defibrillation-content">
              <div className="defibrillation-category">AED</div>
              {['25', '50', '100', '150', '200', '360'].map((joules, index) => (
                <div 
                  key={index}
                  className="defibrillation-option"
                  onClick={() => handleDefibrillationSelect(joules)}
                >
                  {joules}
                </div>
              ))}
            </div>
            <div className="defibrillation-footer">
              <button className="defibrillation-footer-btn cancel" onClick={() => setShowDefibrillationModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showIVModal && (
        <div className="modal-overlay" onClick={() => setShowIVModal(false)}>
          <div className="iv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="iv-header">IV Cannulation</div>
            <div className="iv-content">
              <div className="iv-section">
                <label className="iv-section-label">Site</label>
                <div className="iv-site-grid">
                  {['Left hand', 'Right hand', 'Left forearm', 'Right forearm', 'Left ACF', 'Right ACF', 'Left EJV', 'Right EJV'].map((site, index) => (
                    <label key={index} className="iv-radio-label">
                      <input 
                        type="radio"
                        name="ivSite"
                        value={site}
                        checked={ivSite === site}
                        onChange={(e) => setIvSite(e.target.value)}
                      />
                      <span>{site}</span>
                    </label>
                  ))}
                  <label className="iv-radio-label">
                    <input 
                      type="radio"
                      name="ivSite"
                      value="Other"
                      checked={ivSite === 'Other'}
                      onChange={(e) => setIvSite(e.target.value)}
                    />
                    <span>Other</span>
                  </label>
                </div>
              </div>
              <div className="iv-section grayed-section">
                <label className="iv-section-label">Gauge</label>
                <div className="iv-gauge-grid">
                  {['14', '16', '18', '20', '22', '24'].map((gauge, index) => (
                    <label key={index} className="iv-radio-label">
                      <input 
                        type="radio"
                        name="ivGauge"
                        disabled
                      />
                      <span>{gauge}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="iv-section">
                <label className="iv-section-label">Number of attempts</label>
                <NumericInput
                  value={ivAttempts}
                  onChange={setIvAttempts}
                  className="iv-attempts-input"
                  min={1}
                  max={10}
                />
              </div>
              <div className="iv-section">
                <label className="iv-section-label">Success</label>
                <div className="iv-success-grid">
                  <label className="iv-radio-label">
                    <input 
                      type="radio"
                      name="ivSuccess"
                      value="Successful"
                      checked={ivSuccessful === 'Successful'}
                      onChange={(e) => setIvSuccessful(e.target.value)}
                    />
                    <span>Successful</span>
                  </label>
                  <label className="iv-radio-label">
                    <input 
                      type="radio"
                      name="ivSuccess"
                      value="Unsuccessful"
                      checked={ivSuccessful === 'Unsuccessful'}
                      onChange={(e) => setIvSuccessful(e.target.value)}
                    />
                    <span>Unsuccessful</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="iv-footer">
              <button className="iv-footer-btn cancel" onClick={() => setShowIVModal(false)}>Cancel</button>
              <button className="iv-footer-btn ok" onClick={handleIVOk}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showIOModal && (
        <div className="modal-overlay" onClick={() => setShowIOModal(false)}>
          <div className="io-modal" onClick={(e) => e.stopPropagation()}>
            <div className="io-header">IO Access</div>
            <div className="io-content">
              <div className="io-section">
                <label className="io-section-label">Site</label>
                <div className="io-site-grid">
                  {['Left tibial', 'Right tibial', 'Left humeral', 'Right humeral'].map((site, index) => (
                    <label key={index} className="io-radio-label">
                      <input 
                        type="radio"
                        name="ioSite"
                        value={site}
                        checked={ioSite === site}
                        onChange={(e) => setIoSite(e.target.value)}
                      />
                      <span>{site}</span>
                    </label>
                  ))}
                  <label className="io-radio-label">
                    <input 
                      type="radio"
                      name="ioSite"
                      value="Other"
                      checked={ioSite === 'Other'}
                      onChange={(e) => setIoSite(e.target.value)}
                    />
                    <span>Other</span>
                  </label>
                </div>
              </div>
              <div className="io-section grayed-section">
                <label className="io-section-label">Gauge</label>
                <div className="io-gauge-grid">
                  {['Cook needle', 'EZIO Short', 'EZIO Adult', 'EZIO Long'].map((gauge, index) => (
                    <label key={index} className="io-radio-label">
                      <input 
                        type="radio"
                        name="ioGauge"
                        disabled
                      />
                      <span>{gauge}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="io-section">
                <label className="io-section-label">Number of attempts</label>
                <NumericInput
                  value={ioAttempts}
                  onChange={setIoAttempts}
                  className="io-attempts-input"
                  min={1}
                  max={10}
                />
              </div>
              <div className="io-section">
                <label className="io-section-label">Success</label>
                <div className="io-success-grid">
                  <label className="io-radio-label">
                    <input 
                      type="radio"
                      name="ioSuccess"
                      value="Successful"
                      checked={ioSuccessful === 'Successful'}
                      onChange={(e) => setIoSuccessful(e.target.value)}
                    />
                    <span>Successful</span>
                  </label>
                  <label className="io-radio-label">
                    <input 
                      type="radio"
                      name="ioSuccess"
                      value="Unsuccessful"
                      checked={ioSuccessful === 'Unsuccessful'}
                      onChange={(e) => setIoSuccessful(e.target.value)}
                    />
                    <span>Unsuccessful</span>
                  </label>
                </div>
              </div>
              <div className="io-section">
                <label className="io-section-label">Notes</label>
                <textarea
                  value={ioNotes}
                  onChange={(e) => setIoNotes(e.target.value)}
                  className="io-notes-input"
                  placeholder="Enter notes..."
                  rows={3}
                />
              </div>
            </div>
            <div className="io-footer">
              <button className="io-footer-btn cancel" onClick={() => setShowIOModal(false)}>Cancel</button>
              <button className="io-footer-btn ok" onClick={handleIOOk}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showPositioningModal && (
        <div className="modal-overlay" onClick={() => setShowPositioningModal(false)}>
          <div className="positioning-modal" onClick={(e) => e.stopPropagation()}>
            <div className="positioning-header">Positioning</div>
            <div className="positioning-content">
              <div className="positioning-section">
                <label className="positioning-section-label">Position<span style={{ color: 'red' }}>*</span></label>
                <div className="positioning-position-grid">
                  {['Recovery', 'Supine (lying flat)', 'Seated', 'Lateral (on side)', 'Semi-recumbent', 'Prone'].map((pos, index) => (
                    <label key={index} className="positioning-radio-label">
                      <input 
                        type="radio"
                        name="position"
                        value={pos}
                        checked={positioningPosition === pos}
                        onChange={(e) => setPositioningPosition(e.target.value)}
                      />
                      <span>{pos}</span>
                    </label>
                  ))}
                  <label className="positioning-radio-label">
                    <input 
                      type="radio"
                      name="position"
                      value="Other"
                      checked={positioningPosition === 'Other'}
                      onChange={(e) => setPositioningPosition(e.target.value)}
                    />
                    <span>Other</span>
                  </label>
                </div>
              </div>
              <div className="positioning-section">
                <label className="positioning-section-label">Legs elevated?</label>
                <div className="positioning-legs-grid">
                  <label className="positioning-radio-label">
                    <input 
                      type="radio"
                      name="legsElevated"
                      value="Yes"
                      checked={positioningLegsElevated === 'Yes'}
                      onChange={(e) => setPositioningLegsElevated(e.target.value)}
                    />
                    <span>Yes</span>
                  </label>
                  <label className="positioning-radio-label">
                    <input 
                      type="radio"
                      name="legsElevated"
                      value="No"
                      checked={positioningLegsElevated === 'No'}
                      onChange={(e) => setPositioningLegsElevated(e.target.value)}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>
              {positioningPosition === 'Other' && (
                <div className="positioning-section">
                  <label className="positioning-section-label">Other</label>
                  <input 
                    type="text"
                    value={positioningOther}
                    onChange={(e) => setPositioningOther(e.target.value)}
                    className="positioning-other-input"
                    placeholder="Enter other position..."
                  />
                </div>
              )}
            </div>
            <div className="positioning-footer">
              <button className="positioning-footer-btn cancel" onClick={() => setShowPositioningModal(false)}>Cancel</button>
              <button className="positioning-footer-btn ok" onClick={handlePositioningOk}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showSplintModal && (
        <div className="modal-overlay" onClick={() => setShowSplintModal(false)}>
          <div className="splint-modal" onClick={(e) => e.stopPropagation()}>
            <div className="splint-header">Splint/Dressing/Tag</div>
            <div className="splint-content">
              {splintOptions.map((option, index) => (
                <div 
                  key={index}
                  className={`splint-option ${splintSelection === option ? 'selected' : ''}`}
                  onClick={() => handleSplintSelect(option)}
                >
                  {option}
                </div>
              ))}
              <div 
                className={`splint-option ${splintSelection === 'Other' ? 'selected' : ''}`}
                onClick={() => handleSplintSelect('Other')}
              >
                Other
              </div>
              {splintSelection === 'Other' && (
                <div className="splint-other-section">
                  <input 
                    type="text"
                    value={splintOther}
                    onChange={(e) => setSplintOther(e.target.value)}
                    className="splint-other-input"
                    placeholder="Enter other..."
                  />
                  <button className="splint-other-ok" onClick={handleSplintOk}>OK</button>
                </div>
              )}
            </div>
            <div className="splint-footer">
              <button className="splint-footer-btn cancel" onClick={() => setShowSplintModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showTourniquetModal && (
        <div className="modal-overlay" onClick={() => setShowTourniquetModal(false)}>
          <div className="tourniquet-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tourniquet-header">Tourniquet</div>
            <div className="tourniquet-content">
              <div className="tourniquet-section">
                <label className="tourniquet-section-label">Tourniquet<span style={{ color: 'red' }}>*</span></label>
                <div className="tourniquet-location-grid">
                  <label className="tourniquet-radio-label">
                    <input 
                      type="radio"
                      name="tourniquetLocation"
                      value="Left arm"
                      checked={tourniquetLocation === 'Left arm'}
                      onChange={(e) => setTourniquetLocation(e.target.value)}
                    />
                    <span>Left arm</span>
                  </label>
                  <label className="tourniquet-radio-label">
                    <input 
                      type="radio"
                      name="tourniquetLocation"
                      value="Right arm"
                      checked={tourniquetLocation === 'Right arm'}
                      onChange={(e) => setTourniquetLocation(e.target.value)}
                    />
                    <span>Right arm</span>
                  </label>
                  <label className="tourniquet-radio-label">
                    <input 
                      type="radio"
                      name="tourniquetLocation"
                      value="Left leg"
                      checked={tourniquetLocation === 'Left leg'}
                      onChange={(e) => setTourniquetLocation(e.target.value)}
                    />
                    <span>Left leg</span>
                  </label>
                  <label className="tourniquet-radio-label">
                    <input 
                      type="radio"
                      name="tourniquetLocation"
                      value="Right leg"
                      checked={tourniquetLocation === 'Right leg'}
                      onChange={(e) => setTourniquetLocation(e.target.value)}
                    />
                    <span>Right leg</span>
                  </label>
                </div>
              </div>
              <div className="tourniquet-section">
                <label className="tourniquet-section-label">Tourniquet successful<span style={{ color: 'red' }}>*</span></label>
                <div className="tourniquet-success-grid">
                  <label className="tourniquet-radio-label">
                    <input 
                      type="radio"
                      name="tourniquetSuccessful"
                      value="Successful"
                      checked={tourniquetSuccessful === 'Successful'}
                      onChange={(e) => setTourniquetSuccessful(e.target.value)}
                    />
                    <span>Successful</span>
                  </label>
                  <label className="tourniquet-radio-label">
                    <input 
                      type="radio"
                      name="tourniquetSuccessful"
                      value="Unsuccessful"
                      checked={tourniquetSuccessful === 'Unsuccessful'}
                      onChange={(e) => setTourniquetSuccessful(e.target.value)}
                    />
                    <span>Unsuccessful</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="tourniquet-footer">
              <button className="tourniquet-footer-btn cancel" onClick={() => setShowTourniquetModal(false)}>Cancel</button>
              <button className="tourniquet-footer-btn ok" onClick={handleTourniquetOk}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showOtherNotesModal && (
        <div className="modal-overlay" onClick={() => setShowOtherNotesModal(false)}>
          <div className="vital-detail-modal notes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vital-detail-header">Other Intervention/Notes</div>
            <div className="vital-detail-content">
              <textarea
                value={otherInterventionNotes}
                onChange={(e) => setOtherInterventionNotes(e.target.value)}
                className="notes-textarea"
                placeholder="Enter notes..."
                rows={10}
              />
            </div>
            <div className="vital-detail-footer">
              <button className="footer-btn gray" onClick={() => setShowOtherNotesModal(false)}>Cancel</button>
              <button className="footer-btn blue" onClick={handleOtherNotesOk}>OK</button>
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

      {/* Intervention View Modal (read-only) */}
      {showInterventionViewModal && viewingRecord && (
        <div className="modal-overlay" onClick={() => { setShowInterventionViewModal(false); setViewingRecord(null); }}>
          <div className="vital-detail-modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: '550px', maxWidth: '750px' }}>
            <div className="vital-modal-header">Intervention Record</div>
            
            <div className="vital-modal-section">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Time</div>
                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.time || 'Not recorded'}</div>
                </div>
                {viewingRecord.performedBy && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Performed By</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.performedBy}</div>
                  </div>
                )}
                {viewingRecord.airway && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Airway</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.airway}</div>
                  </div>
                )}
                {viewingRecord.airwayMethod && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Airway Method</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.airwayMethod}</div>
                  </div>
                )}
                {viewingRecord.ventilation && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Ventilation</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.ventilation}</div>
                  </div>
                )}
                {viewingRecord.peep && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>PEEP</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.peep}</div>
                  </div>
                )}
                {viewingRecord.cpap && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>CPAP</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.cpap}</div>
                  </div>
                )}
                {viewingRecord.rsi && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>RSI</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.rsi}</div>
                  </div>
                )}
                {viewingRecord.cpr && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>CPR</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.cpr}</div>
                  </div>
                )}
                {viewingRecord.cprCompressions && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>CPR Compressions</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.cprCompressions}</div>
                  </div>
                )}
                {viewingRecord.cprVentilations && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>CPR Ventilations</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.cprVentilations}</div>
                  </div>
                )}
                {viewingRecord.cprContinuous && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>CPR Continuous</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>Yes</div>
                  </div>
                )}
                {viewingRecord.cprDiscontinued && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>CPR Discontinued</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.cprDiscontinued}</div>
                  </div>
                )}
                {viewingRecord.defibrillation && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Defibrillation</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.defibrillation}</div>
                  </div>
                )}
                {viewingRecord.cardioversion && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Cardioversion</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.cardioversion}</div>
                  </div>
                )}
                {viewingRecord.pacing && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Pacing</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.pacing}</div>
                  </div>
                )}
                {viewingRecord.valsalva && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Valsalva</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.valsalva}</div>
                  </div>
                )}
                {viewingRecord.ivCannulation && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>IV Cannulation</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.ivCannulation}</div>
                  </div>
                )}
                {viewingRecord.ivSite && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>IV Site</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.ivSite}</div>
                  </div>
                )}
                {viewingRecord.ivAttempts && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>IV Attempts</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.ivAttempts}</div>
                  </div>
                )}
                {viewingRecord.ivSuccessful && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>IV Successful</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.ivSuccessful}</div>
                  </div>
                )}
                {viewingRecord.ioAccess && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>IO Access</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.ioAccess}</div>
                  </div>
                )}
                {viewingRecord.ioSite && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>IO Site</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.ioSite}</div>
                  </div>
                )}
                {viewingRecord.ioAttempts && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>IO Attempts</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.ioAttempts}</div>
                  </div>
                )}
                {viewingRecord.ioSuccessful && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>IO Successful</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.ioSuccessful}</div>
                  </div>
                )}
                {viewingRecord.positioning && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Positioning</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.positioning}</div>
                  </div>
                )}
                {viewingRecord.splintDressingTag && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Splint/Dressing/Tag</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.splintDressingTag}</div>
                  </div>
                )}
                {viewingRecord.splintDressingTagLocation && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Splint/Dressing Location</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.splintDressingTagLocation}</div>
                  </div>
                )}
                {viewingRecord.tourniquet && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Tourniquet</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.tourniquet}</div>
                  </div>
                )}
                {viewingRecord.tourniquetLocation && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Tourniquet Location</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.tourniquetLocation}</div>
                  </div>
                )}
                {viewingRecord.tourniquetAppliedTime && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Tourniquet Applied Time</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.tourniquetAppliedTime}</div>
                  </div>
                )}
              </div>
              {viewingRecord.otherInterventionNotes && (
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Other Notes</div>
                  <div style={{ fontSize: '14px', color: '#4a5568', whiteSpace: 'pre-wrap' }}>{viewingRecord.otherInterventionNotes}</div>
                </div>
              )}
            </div>

            <div className="vital-modal-actions" style={{ justifyContent: 'center' }}>
              <button className="vital-modal-btn ok" onClick={() => { setShowInterventionViewModal(false); setViewingRecord(null); }}>Go Back</button>
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
          router.push(`/interventions?${params}`)
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
      {showChat && (
        <div className="fixed inset-0 z-40 bg-black/30 cursor-pointer" onClick={() => setShowChat(false)} />
      )}
    </div>
  )
}
