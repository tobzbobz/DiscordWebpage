"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef, KeyboardEvent } from 'react'
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
import ChatStrip from '../components/ChatStrip';
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
    const currentValue = parseFloat(value) || 0
    const newValue = currentValue + step
    if (max === undefined || newValue <= max) {
      onChange(newValue.toString())
    }
  }

  const decrement = () => {
    const currentValue = parseFloat(value) || 0
    const newValue = currentValue - step
    if (min === undefined || newValue >= min) {
      onChange(newValue.toString())
    }
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
        onChange={e => onChange(e.target.value)}
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
  );
}


export default function VitalObsPage() {
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
  
  const [incompleteSections, setIncompleteSections] = useState<string[]>([])
  const [patientLetter, setPatientLetter] = useState('A')

  // Modal states
  const [showAddPatientModal, setShowAddPatientModal] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showPatientManagementModal, setShowPatientManagementModal] = useState(false)
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false)
  const [validationErrorsModal, setValidationErrorsModal] = useState<{[section: string]: string[]}>({})
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
  
  // Saved vitals array - initialize from localStorage
  const [savedVitals, setSavedVitals] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`vitals_${incidentId}`)
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  
  // Saved medications array - initialize from localStorage
  const [medAtpViolation, setMedAtpViolation] = useState('')
  const [savedMeds, setSavedMeds] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`meds_${incidentId}`)
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  
  // Saved interventions array - initialize from localStorage
  const [savedInterventions, setSavedInterventions] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`interventions_${incidentId}`)
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  
  // Saved competency entries array - initialize from localStorage
  const [savedCompetency, setSavedCompetency] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`competency_${incidentId}`)
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  
  // Competency tool modal state
  const [showCompetencyModal, setShowCompetencyModal] = useState(false)
  // Track last section before opening Competency Tool
  const [lastSection, setLastSection] = useState<string | null>(null)
  const [pdfOption, setPdfOption] = useState(true)
  const [competencyTime, setCompetencyTime] = useState('')
  const [competencyUnderstandInfo, setCompetencyUnderstandInfo] = useState<'yes' | 'no' | ''>('')
  const [competencyUnderstandConsequences, setCompetencyUnderstandConsequences] = useState<'yes' | 'no' | ''>('')
  const [competencyRememberInfo, setCompetencyRememberInfo] = useState<'yes' | 'no' | ''>('')
  const [competencySelfHarm, setCompetencySelfHarm] = useState<'yes' | 'no' | ''>('')
  const [showCompetencyDateTimePicker, setShowCompetencyDateTimePicker] = useState(false)
  const [competencyPickerDay, setCompetencyPickerDay] = useState(3)
  const [competencyPickerMonth, setCompetencyPickerMonth] = useState(12)
  const [competencyPickerYear, setCompetencyPickerYear] = useState(2025)
  const [competencyPickerHour, setCompetencyPickerHour] = useState(18)
  const [competencyPickerMinute, setCompetencyPickerMinute] = useState(55)
  const [competencyValidationErrors, setCompetencyValidationErrors] = useState<{[key: string]: boolean}>({})
  
  // Notes view modal state
  const [showNotesViewModal, setShowNotesViewModal] = useState(false)
  const [viewingNotes, setViewingNotes] = useState('')
  
  // Medication entry modal state
  const [showMedEntryModal, setShowMedEntryModal] = useState(false)
  const [showMedSearchModal, setShowMedSearchModal] = useState(false)
  const [showMedRouteModal, setShowMedRouteModal] = useState(false)
  const [showMedNotesModal, setShowMedNotesModal] = useState(false)
  const [showMedNotPossibleModal, setShowMedNotPossibleModal] = useState(false)
  const [showMedDateTimePicker, setShowMedDateTimePicker] = useState(false)
  const [medTime, setMedTime] = useState('')
  const [medAdministeredBy, setMedAdministeredBy] = useState('')
  const [medMedication, setMedMedication] = useState('')
  const [medDose, setMedDose] = useState('')
  const [medUnit, setMedUnit] = useState('')
  const [medRoute, setMedRoute] = useState('')
  const [medNotes, setMedNotes] = useState('')
  const [medNotesTemp, setMedNotesTemp] = useState('')
  const [medPrn, setMedPrn] = useState(false)
  const [medDrawnUpNotUsed, setMedDrawnUpNotUsed] = useState(false)
  const [medBrokenAmpoule, setMedBrokenAmpoule] = useState(false)
  const [medDiscarded, setMedDiscarded] = useState(false)
  const [medNotPossible, setMedNotPossible] = useState(false)
  const [medNotPossibleReason, setMedNotPossibleReason] = useState('')
  const [medSearchQuery, setMedSearchQuery] = useState('')
  const [medValidationErrors, setMedValidationErrors] = useState<{[key: string]: boolean}>({})
  const [medPickerDay, setMedPickerDay] = useState(1)
  const [medPickerMonth, setMedPickerMonth] = useState(1)
  const [medPickerYear, setMedPickerYear] = useState(2025)
  const [medPickerHour, setMedPickerHour] = useState(12)
  const [medPickerMinute, setMedPickerMinute] = useState(0)
  
  // Intervention entry modal state
  const [showInterventionEntryModal, setShowInterventionEntryModal] = useState(false)
  const [showInterventionDateTimePicker, setShowInterventionDateTimePicker] = useState(false)
  const [intTime, setIntTime] = useState('')
  const [intPerformedBy, setIntPerformedBy] = useState('')
  const [intAirway, setIntAirway] = useState('')
  const [intVentilation, setIntVentilation] = useState('')
  const [intPeep, setIntPeep] = useState('')
  const [intCpap, setIntCpap] = useState('')
  const [intRsi, setIntRsi] = useState('')
  const [intCpr, setIntCpr] = useState('')
  const [intDefibrillation, setIntDefibrillation] = useState('')
  const [intCardioversion, setIntCardioversion] = useState('')
  const [intPacing, setIntPacing] = useState('')
  const [intValsalva, setIntValsalva] = useState('')
  const [intIvCannulation, setIntIvCannulation] = useState('')
  const [intIoAccess, setIntIoAccess] = useState('')
  const [intChestDecompression, setIntChestDecompression] = useState('')
  const [intStomachDecompression, setIntStomachDecompression] = useState('')
  const [intCatheterTroubleshooting, setIntCatheterTroubleshooting] = useState('')
  const [intNerveBlock, setIntNerveBlock] = useState('')
  const [intPositioning, setIntPositioning] = useState('')
  const [intSplintDressingTag, setIntSplintDressingTag] = useState('')
  const [intNasalTamponade, setIntNasalTamponade] = useState('')
  const [intTourniquet, setIntTourniquet] = useState('')
  const [intLimbReduction, setIntLimbReduction] = useState('')
  const [intEpleyManoeuvre, setIntEpleyManoeuvre] = useState('')
  const [intOtherNotes, setIntOtherNotes] = useState('')
  const [intValidationErrors, setIntValidationErrors] = useState<{[key: string]: boolean}>({})
  const [intPickerDay, setIntPickerDay] = useState(1)
  const [intPickerMonth, setIntPickerMonth] = useState(1)
  const [intPickerYear, setIntPickerYear] = useState(2025)
  const [intPickerHour, setIntPickerHour] = useState(12)
  const [intPickerMinute, setIntPickerMinute] = useState(0)
  
  // Medication and intervention selection options
  const medicationsList = [
    { name: 'Adrenaline', code: 'ADR' },
    { name: 'Amiodarone', code: 'AMI' },
    { name: 'Aspirin', code: 'ASP' },
    { name: 'Atropine', code: 'ATR' },
    { name: 'Dextrose 10%', code: 'DEX' },
    { name: 'Diazepam', code: 'DIA' },
    { name: 'Entonox', code: 'ENT' },
    { name: 'Fentanyl', code: 'FEN' },
    { name: 'Glucagon', code: 'GLU' },
    { name: 'GTN Spray', code: 'GTN' },
    { name: 'Hydrocortisone', code: 'HYD' },
    { name: 'Ibuprofen', code: 'IBU' },
    { name: 'Ipratropium', code: 'IPR' },
    { name: 'Ketamine', code: 'KET' },
    { name: 'Lidocaine', code: 'LID' },
    { name: 'Metoclopramide', code: 'MET' },
    { name: 'Midazolam', code: 'MID' },
    { name: 'Morphine', code: 'MOR' },
    { name: 'Naloxone', code: 'NAL' },
    { name: 'Ondansetron', code: 'OND' },
    { name: 'Oxygen', code: 'O2' },
    { name: 'Paracetamol', code: 'PAR' },
    { name: 'Salbutamol', code: 'SAL' },
    { name: 'Sodium Chloride 0.9%', code: 'NaCl' },
    { name: 'Tranexamic Acid', code: 'TXA' }
  ]
  
  const routesList = ['IV', 'IM', 'IO', 'SC', 'PO', 'SL', 'INH', 'NEB', 'TOP', 'PR', 'IN', 'ETT']
  
  const airwayOptions = ['OPA', 'NPA', 'iGel', 'LMA', 'ETT', 'Suction', 'Head Tilt Chin Lift', 'Jaw Thrust']
  const ventilationOptions = ['BVM', 'Oxygen Mask', 'Nasal Cannula', 'Non-Rebreather', 'CPAP', 'BiPAP']

  // Record view modals state (read-only view of submitted records)
  const [showVitalViewModal, setShowVitalViewModal] = useState(false)
  const [showMedViewModal, setShowMedViewModal] = useState(false)
  const [showInterventionViewModal, setShowInterventionViewModal] = useState(false)
  const [showCompetencyViewModal, setShowCompetencyViewModal] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<any>(null)
  
  // Load patient letter on mount
  useEffect(() => {
    if (incidentId) {
      setPatientLetter(getCurrentPatientLetter(incidentId))
    }
  }, [incidentId])

  // Reload all data from localStorage when page is visited (to pick up changes from other pages)
  useEffect(() => {
    if (incidentId) {
      const savedVitalsData = localStorage.getItem(`vitals_${incidentId}`)
      if (savedVitalsData) {
        setSavedVitals(JSON.parse(savedVitalsData))
      }
      
      const savedMedsData = localStorage.getItem(`meds_${incidentId}`)
      if (savedMedsData) {
        setSavedMeds(JSON.parse(savedMedsData))
      }
      
      const savedInterventionsData = localStorage.getItem(`interventions_${incidentId}`)
      if (savedInterventionsData) {
        setSavedInterventions(JSON.parse(savedInterventionsData))
      }
      
      const savedCompetencyData = localStorage.getItem(`competency_${incidentId}`)
      if (savedCompetencyData) {
        setSavedCompetency(JSON.parse(savedCompetencyData))
      }
    }
  }, [incidentId])

  // Persist vitals to localStorage whenever they change
  useEffect(() => {
    if (incidentId) {
      localStorage.setItem(`vitals_${incidentId}`, JSON.stringify(savedVitals))
    }
  }, [savedVitals, incidentId])
  
  // Persist meds to localStorage whenever they change
  useEffect(() => {
    if (incidentId) {
      localStorage.setItem(`meds_${incidentId}`, JSON.stringify(savedMeds))
    }
  }, [savedMeds, incidentId])
  
  // Persist interventions to localStorage whenever they change
  useEffect(() => {
    if (incidentId) {
      localStorage.setItem(`interventions_${incidentId}`, JSON.stringify(savedInterventions))
    }
  }, [savedInterventions, incidentId])
  
  // Persist competency entries to localStorage whenever they change
  useEffect(() => {
    if (incidentId) {
      localStorage.setItem(`competency_${incidentId}`, JSON.stringify(savedCompetency))
    }
  }, [savedCompetency, incidentId])
  
  // Current vitals draft state for persistence
  const [vitalsDraft, setVitalsDraft] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`vitals_draft_${incidentId}`)
      return saved ? JSON.parse(saved) : null
    }
    return null
  })
  
  // Load draft on mount if exists
  useEffect(() => {
    if (vitalsDraft && incidentId) {
      setTime(vitalsDraft.time || '')
      setGcs(vitalsDraft.gcs || '')
      setHeartRate(vitalsDraft.heartRate || '')
      setHeartRateBpm(vitalsDraft.heartRateBpm || '')
      setRespiratoryRate(vitalsDraft.respiratoryRate || '')
      setBloodPressure(vitalsDraft.bloodPressure || '')
      setSpo2(vitalsDraft.spo2 || '')
      setEcg(vitalsDraft.ecg || '')
      setBloodGlucose(vitalsDraft.bloodGlucose || '')
      setCapRefill(vitalsDraft.capRefill || '')
      setTemperature(vitalsDraft.temperature || '')
      setPainScore(vitalsDraft.painScore || '')
      setPupils(vitalsDraft.pupils || '')
      setEtco2(vitalsDraft.etco2 || '')
      setSkin(vitalsDraft.skin || '')
      setPefr(vitalsDraft.pefr || '')
      setNotes(vitalsDraft.notes || '')
      setNotesValue(vitalsDraft.notesValue || '')
      setGcsEye(vitalsDraft.gcsEye || '')
      setGcsVerbal(vitalsDraft.gcsVerbal || '')
      setGcsMotor(vitalsDraft.gcsMotor || '')
      setHrLocation(vitalsDraft.hrLocation || '')
      setHrStrength(vitalsDraft.hrStrength || '')
      setHrRegularity(vitalsDraft.hrRegularity || '')
      setHrNotes(vitalsDraft.hrNotes || '')
      setRrPerMinute(vitalsDraft.rrPerMinute || '')
      setRrWordsPerBreath(vitalsDraft.rrWordsPerBreath || '')
      setSystolic(vitalsDraft.systolic || '')
      setDiastolic(vitalsDraft.diastolic || '')
      setBpMethod(vitalsDraft.bpMethod || '')
      setBpPosition(vitalsDraft.bpPosition || '')
      setSpO2Value(vitalsDraft.spO2Value || '')
      setSpO2Conditions(vitalsDraft.spO2Conditions || '')
      setEcgType(vitalsDraft.ecgType || '')
      setEcgCompleted(vitalsDraft.ecgCompleted || '')
      setEcgCompletedOther(vitalsDraft.ecgCompletedOther || '')
      setBglValue(vitalsDraft.bglValue || '')
      setCapRefillValue(vitalsDraft.capRefillValue || '')
      setTempValue(vitalsDraft.tempValue || '')
      setPainScoreValue(vitalsDraft.painScoreValue || '')
      setPupilSizeLeft(vitalsDraft.pupilSizeLeft || '')
      setPupilSizeRight(vitalsDraft.pupilSizeRight || '')
      setPupilReactsLeft(vitalsDraft.pupilReactsLeft || '')
      setPupilReactsRight(vitalsDraft.pupilReactsRight || '')
      setSkinColor(vitalsDraft.skinColor || '')
      // If draft exists, open the form
      if (vitalsDraft.showNewVitals) {
        setShowNewVitals(true)
      }
    }
  }, [])
  
  // Combine all records into one list sorted by recency
  const getAllRecords = () => {
    const vitalsWithType = savedVitals.map(v => ({ ...v, recordType: 'vital' }))
    const medsWithType = savedMeds.map(m => ({ ...m, recordType: 'medication' }))
    const interventionsWithType = savedInterventions.map(i => ({ ...i, recordType: 'intervention' }))
    const competencyWithType = savedCompetency.map(c => ({ ...c, recordType: 'competency' }))
    
    const allRecords = [...vitalsWithType, ...medsWithType, ...interventionsWithType, ...competencyWithType]
    
    // Sort by time (most recent first)
    return allRecords.sort((a, b) => {
      const timeA = a.time || a.timestamp || ''
      const timeB = b.time || b.timestamp || ''
      // Parse DD/MM/YYYY HH:MM format
      const parseTime = (t: string) => {
        if (!t) return 0
        const parts = t.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/)
        if (parts) {
          return new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]), parseInt(parts[4]), parseInt(parts[5])).getTime()
        }
        return 0
      }
      return parseTime(timeB) - parseTime(timeA)
    })
  }
  
  const [showNewVitals, setShowNewVitals] = useState(false)
  const [showGCSModal, setShowGCSModal] = useState(false)
  const [showHRModal, setShowHRModal] = useState(false)
  const [showRRModal, setShowRRModal] = useState(false)
  const [showRRNotPossibleModal, setShowRRNotPossibleModal] = useState(false)
  const [showDateTimePicker, setShowDateTimePicker] = useState(false)
  
  // Validation state
  const [validationErrors, setValidationErrors] = useState<{[key: string]: boolean}>({})
  
  // Vital signs state
  const [time, setTime] = useState('')
  const [gcs, setGcs] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [respiratoryRate, setRespiratoryRate] = useState('')
  const [bloodPressure, setBloodPressure] = useState('')
  const [spo2, setSpo2] = useState('')
  const [ecg, setEcg] = useState('')
  const [bloodGlucose, setBloodGlucose] = useState('')
  const [capRefill, setCapRefill] = useState('')
  const [temperature, setTemperature] = useState('')
  const [painScore, setPainScore] = useState('')
  const [pupils, setPupils] = useState('')
  const [etco2, setEtco2] = useState('')
  const [skin, setSkin] = useState('')
  const [pefr, setPefr] = useState('')
  const [notes, setNotes] = useState('')
  
  // GCS state
  const [gcsEye, setGcsEye] = useState('')
  const [gcsVerbal, setGcsVerbal] = useState('')
  const [gcsMotor, setGcsMotor] = useState('')
  
  // Heart Rate state
  const [heartRateBpm, setHeartRateBpm] = useState('')
  const [hrLocation, setHrLocation] = useState('')
  const [hrStrength, setHrStrength] = useState('')
  const [hrRegularity, setHrRegularity] = useState('')
  const [hrNotes, setHrNotes] = useState('')
  
  // Respiratory Rate state
  const [rrPerMinute, setRrPerMinute] = useState('')
  const [rrWordsPerBreath, setRrWordsPerBreath] = useState('')
  const [rrTripodPosition, setRrTripodPosition] = useState('')
  const [rrNotPossible, setRrNotPossible] = useState('')
  const [rrNotPossibleReason, setRrNotPossibleReason] = useState('')
  
  // BP and SpO2 state
  const [showBPSpO2Modal, setShowBPSpO2Modal] = useState(false)
  const [showBPNotPossibleModal, setShowBPNotPossibleModal] = useState(false)
  const [showSpO2NotPossibleModal, setShowSpO2NotPossibleModal] = useState(false)
  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [bpMethod, setBpMethod] = useState('')
  const [bpPosition, setBpPosition] = useState('')
  const [bpNotPossible, setBpNotPossible] = useState('')
  const [bpNotPossibleReason, setBpNotPossibleReason] = useState('')
  const [spO2Value, setSpO2Value] = useState('')
  const [spO2Conditions, setSpO2Conditions] = useState('')
  const [spO2NotPossible, setSpO2NotPossible] = useState('')
  const [spO2NotPossibleReason, setSpO2NotPossibleReason] = useState('')
  
  // ECG state
  const [showECGModal, setShowECGModal] = useState(false)
  const [showECGNotPossibleModal, setShowECGNotPossibleModal] = useState(false)
  const [ecgCompleted, setEcgCompleted] = useState('')
  const [ecgCompletedOther, setEcgCompletedOther] = useState('')
  const [ecgType, setEcgType] = useState('')
  const [ecgNotPossible, setEcgNotPossible] = useState('')
  const [ecgNotPossibleReason, setEcgNotPossibleReason] = useState('')
  
  // BGL, Cap Refill, Temp state
  const [showBGLModal, setShowBGLModal] = useState(false)
  const [showBGLNotPossibleModal, setShowBGLNotPossibleModal] = useState(false)
  const [bglValue, setBglValue] = useState('')
  const [bglNotPossible, setBglNotPossible] = useState('')
  const [bglNotPossibleReason, setBglNotPossibleReason] = useState('')
  const [capRefillValue, setCapRefillValue] = useState('')
  const [capRefillNotPossible, setCapRefillNotPossible] = useState('')
  const [capRefillNotPossibleReason, setCapRefillNotPossibleReason] = useState('')
  const [showCapRefillNotPossibleModal, setShowCapRefillNotPossibleModal] = useState(false)
  const [tempValue, setTempValue] = useState('')
  const [tempNotPossible, setTempNotPossible] = useState('')
  const [tempNotPossibleReason, setTempNotPossibleReason] = useState('')
  const [showTempNotPossibleModal, setShowTempNotPossibleModal] = useState(false)
  
  // Pain Score state
  const [showPainScoreModal, setShowPainScoreModal] = useState(false)
  const [painScoreValue, setPainScoreValue] = useState('')
  const [painScoreNotPossible, setPainScoreNotPossible] = useState('')
  const [painScoreNotPossibleReason, setPainScoreNotPossibleReason] = useState('')
  const [showPainScoreNotPossibleModal, setShowPainScoreNotPossibleModal] = useState(false)
  
  // Pupils state
  const [showPupilsModal, setShowPupilsModal] = useState(false)
  const [pupilSizeLeft, setPupilSizeLeft] = useState('')
  const [pupilSizeRight, setPupilSizeRight] = useState('')
  const [pupilReactsLeft, setPupilReactsLeft] = useState('')
  const [pupilReactsRight, setPupilReactsRight] = useState('')
  
  // ETCO2 and Skin state
  const [showETCO2SkinModal, setShowETCO2SkinModal] = useState(false)
  const [skinColor, setSkinColor] = useState('')
  const [skinNotPossible, setSkinNotPossible] = useState('')
  const [skinNotPossibleReason, setSkinNotPossibleReason] = useState('')
  const [showSkinNotPossibleModal, setShowSkinNotPossibleModal] = useState(false)
  
  // Notes state
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  
  // Temporary state for cancel functionality
  const [tempGcsEye, setTempGcsEye] = useState('')
  const [tempGcsVerbal, setTempGcsVerbal] = useState('')
  const [tempGcsMotor, setTempGcsMotor] = useState('')
  const [tempHeartRateBpm, setTempHeartRateBpm] = useState('')
  const [tempHrLocation, setTempHrLocation] = useState('')
  const [tempHrStrength, setTempHrStrength] = useState('')
  const [tempHrRegularity, setTempHrRegularity] = useState('')
  const [tempHrNotes, setTempHrNotes] = useState('')
  const [tempRrPerMinute, setTempRrPerMinute] = useState('')
  const [tempRrWordsPerBreath, setTempRrWordsPerBreath] = useState('')
  const [tempSystolic, setTempSystolic] = useState('')
  const [tempDiastolic, setTempDiastolic] = useState('')
  const [tempSpO2Value, setTempSpO2Value] = useState('')
  const [tempEcgType, setTempEcgType] = useState('')
  const [tempEcgCompleted, setTempEcgCompleted] = useState('')
  const [tempBglValue, setTempBglValue] = useState('')
  const [tempCapRefillValue, setTempCapRefillValue] = useState('')
  const [tempTempValue, setTempTempValue] = useState('')
  const [tempPainScoreValue, setTempPainScoreValue] = useState('')
  const [tempPupilSizeLeft, setTempPupilSizeLeft] = useState('')
  const [tempPupilSizeRight, setTempPupilSizeRight] = useState('')
  const [tempPupilReactsLeft, setTempPupilReactsLeft] = useState('')
  const [tempPupilReactsRight, setTempPupilReactsRight] = useState('')
  const [tempSkinColor, setTempSkinColor] = useState('')
  const [tempNotesValue, setTempNotesValue] = useState('')
  
  // Date/time picker state
  const [pickerDay, setPickerDay] = useState(3)
  const [pickerMonth, setPickerMonth] = useState(12)
  const [pickerYear, setPickerYear] = useState(2025)
  const [pickerHour, setPickerHour] = useState(18)
  const [pickerMinute, setPickerMinute] = useState(55)

  const handleLogout = () => {
    clearCurrentUser()
    router.replace('/')
  }

  const handleHome = () => {
    setIncompleteSections([])
    const params = new URLSearchParams({ fleetId })
    router.push(`/dashboard?${params}`)
  }

  // Admin Panel removed from vital-obs page

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
  
  // Save current vitals draft to localStorage
  const saveDraft = () => {
    if (!incidentId) return
    const draft = {
      showNewVitals,
      time,
      gcs,
      heartRate,
      heartRateBpm,
      respiratoryRate,
      bloodPressure,
      spo2,
      ecg,
      bloodGlucose,
      capRefill,
      temperature,
      painScore,
      pupils,
      etco2,
      skin,
      pefr,
      notes,
      notesValue,
      gcsEye,
      gcsVerbal,
      gcsMotor,
      hrLocation,
      hrStrength,
      hrRegularity,
      hrNotes,
      rrPerMinute,
      rrWordsPerBreath,
      systolic,
      diastolic,
      bpMethod,
      bpPosition,
      spO2Value,
      spO2Conditions,
      ecgType,
      ecgCompleted,
      ecgCompletedOther,
      bglValue,
      capRefillValue,
      tempValue,
      painScoreValue,
      pupilSizeLeft,
      pupilSizeRight,
      pupilReactsLeft,
      pupilReactsRight,
      skinColor
    }
    localStorage.setItem(`vitals_draft_${incidentId}`, JSON.stringify(draft))
  }
  
  // Clear draft from localStorage
  const clearDraft = () => {
    if (incidentId) {
      localStorage.removeItem(`vitals_draft_${incidentId}`)
    }
  }

  const navigateTo = (section: string) => {
    // Save draft before navigating away
    if (showNewVitals) {
      saveDraft()
    }
    const params = new URLSearchParams({ id: incidentId, fleetId })
    // Only clear validation errors if navigating to home, dashboard, or admin
    if (section === 'home' || section === 'dashboard' || section === 'admin') {
      setIncompleteSections([])
    }
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
    if (showNewVitals) {
      saveDraft()
    }
    navigateTo('primary-survey')
  }

  const handleNext = () => {
    // Save draft before navigating
    if (showNewVitals) {
      saveDraft()
    }
    navigateTo('hx-complaint')
  }

  // Check if there's an unsaved vital entry with data but missing compulsory fields
  const hasUnsavedVitalData = () => {
    if (!showNewVitals) return false
    // Check if any optional field has data
    const hasData = gcs || heartRate || respiratoryRate || bloodPressure || spo2 || 
                    ecg || bloodGlucose || capRefill || temperature || painScore || 
                    pupils || etco2 || skin || pefr || notes || notesValue
    // If has data but no time, there's an incomplete entry
    return hasData && !time
  }

  const handleSubmitEPRF = () => {
    // Check for unsaved vital with missing compulsory field
    if (hasUnsavedVitalData()) {
      setValidationErrors({ time: true })
      alert('You have an unsaved vital entry. Please enter the required Time field or discard the entry before submitting.')
      return
    }
    
    const result = validateAllSections(incidentId)
    setIncompleteSections(result.incompleteSections)
    
    if (result.isValid) {
      setShowSubmitModal(true)
    } else {
      setValidationErrorsModal(result.fieldErrors)
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
        setValidationErrorsModal(result.validationResult.fieldErrors)
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
  
  const handleNewMeds = () => {
    // Reset medication form and open the medication search modal
    setMedTime('')
    setMedAdministeredBy('')
    setMedMedication('')
    setMedDose('')
    setMedUnit('')
    setMedRoute('')
    setMedNotes('')
    setMedPrn(false)
    setMedAtpViolation('')
    setMedDrawnUpNotUsed(false)
    setMedBrokenAmpoule(false)
    setMedDiscarded(false)
    setMedNotPossible(false)
    setMedNotPossibleReason('')
    setMedSearchQuery('')
    setMedValidationErrors({})
    setShowMedSearchModal(true)
  }
  
  const handleNewIntervention = () => {
    // Reset intervention form and open the intervention entry modal
    setIntTime('')
    setIntPerformedBy('')
    setIntAirway('')
    setIntVentilation('')
    setIntPeep('')
    setIntCpap('')
    setIntRsi('')
    setIntCpr('')
    setIntDefibrillation('')
    setIntCardioversion('')
    setIntPacing('')
    setIntValsalva('')
    setIntIvCannulation('')
    setIntIoAccess('')
    setIntChestDecompression('')
    setIntStomachDecompression('')
    setIntCatheterTroubleshooting('')
    setIntNerveBlock('')
    setIntPositioning('')
    setIntSplintDressingTag('')
    setIntNasalTamponade('')
    setIntTourniquet('')
    setIntLimbReduction('')
    setIntEpleyManoeuvre('')
    setIntOtherNotes('')
    setIntValidationErrors({})
    setShowInterventionEntryModal(true)
  }
  
  // Medication entry helpers
  const openMedDateTimePicker = () => {
    const now = new Date()
    setMedPickerDay(now.getDate())
    setMedPickerMonth(now.getMonth() + 1)
    setMedPickerYear(now.getFullYear())
    setMedPickerHour(now.getHours())
    setMedPickerMinute(now.getMinutes())
    setShowMedDateTimePicker(true)
  }
  
  const handleSetMedDateTime = () => {
    const formatted = `${String(medPickerDay).padStart(2, '0')}/${String(medPickerMonth).padStart(2, '0')}/${medPickerYear} ${String(medPickerHour).padStart(2, '0')}:${String(medPickerMinute).padStart(2, '0')}`
    setMedTime(formatted)
    setMedValidationErrors({...medValidationErrors, time: false})
    setShowMedDateTimePicker(false)
  }
  
  const setMedNow = () => {
    const now = new Date()
    const formatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setMedTime(formatted)
    setMedValidationErrors({...medValidationErrors, time: false})
  }
  
  const handleMedicationSelect = (medName: string) => {
    setMedMedication(medName)
    setShowMedSearchModal(false)
    setShowMedEntryModal(true)
  }
  
  const handleMedRouteSelect = (routeOption: string) => {
    setMedRoute(routeOption)
    setShowMedRouteModal(false)
  }
  
  const saveMedication = () => {
    const errors: {[key: string]: boolean} = {}
    if (!medTime) errors.time = true
    if (!medAdministeredBy) errors.administeredBy = true
    if (!medMedication) errors.medication = true
    if (!medDose) errors.dose = true
    if (!medUnit) errors.unit = true
    if (!medRoute) errors.route = true
    
    setMedValidationErrors(errors)
    
    if (Object.keys(errors).length > 0) {
      return false
    }
    
    const medEntry = {
      time: medTime,
      administeredBy: medAdministeredBy,
      medication: medMedication,
      dose: medDose,
      unit: medUnit,
      route: medRoute,
      notes: medNotes,
      prn: medPrn,
      atpViolation: medAtpViolation,
      drawnUpNotUsed: medDrawnUpNotUsed,
      brokenAmpoule: medBrokenAmpoule,
      discarded: medDiscarded,
      notPossible: medNotPossibleReason
    }
    setSavedMeds([...savedMeds, medEntry])
    return true
  }
  
  const resetMedForm = () => {
    setMedTime('')
    setMedAdministeredBy('')
    setMedMedication('')
    setMedDose('')
    setMedUnit('')
    setMedRoute('')
    setMedNotes('')
    setMedNotesTemp('')
    setMedPrn(false)
    setMedAtpViolation('')
    setMedDrawnUpNotUsed(false)
    setMedBrokenAmpoule(false)
    setMedDiscarded(false)
    setMedNotPossible(false)
    setMedNotPossibleReason('')
    setMedValidationErrors({})
  }
  
  const handleMedSaveAndReturn = () => {
    if (saveMedication()) {
      setShowMedEntryModal(false)
    }
  }
  
  const handleMedSaveAndEnterSame = () => {
    if (saveMedication()) {
      // Reset form but keep same medication selected
      const currentMed = medMedication
      resetMedForm()
      setMedMedication(currentMed)
    }
  }
  
  const handleMedSaveAndEnterDifferent = () => {
    if (saveMedication()) {
      // Reset form and go back to medication search
      resetMedForm()
      setShowMedEntryModal(false)
      setShowMedSearchModal(true)
    }
  }
  
  const handleMedSaveAndEnterAnother = () => {
    if (saveMedication()) {
      // Reset form but keep modal open
      resetMedForm()
      setShowMedEntryModal(false)
      setShowMedSearchModal(true)
    }
  }
  
  // Intervention entry helpers
  const openIntDateTimePicker = () => {
    const now = new Date()
    setIntPickerDay(now.getDate())
    setIntPickerMonth(now.getMonth() + 1)
    setIntPickerYear(now.getFullYear())
    setIntPickerHour(now.getHours())
    setIntPickerMinute(now.getMinutes())
    setShowInterventionDateTimePicker(true)
  }
  
  const handleSetIntDateTime = () => {
    const formatted = `${String(intPickerDay).padStart(2, '0')}/${String(intPickerMonth).padStart(2, '0')}/${intPickerYear} ${String(intPickerHour).padStart(2, '0')}:${String(intPickerMinute).padStart(2, '0')}`
    setIntTime(formatted)
    setIntValidationErrors({...intValidationErrors, time: false})
    setShowInterventionDateTimePicker(false)
  }
  
  const setIntNow = () => {
    const now = new Date()
    const formatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setIntTime(formatted)
    setIntValidationErrors({...intValidationErrors, time: false})
  }
  
  const saveIntervention = () => {
    const errors: {[key: string]: boolean} = {}
    if (!intTime) errors.time = true
    if (!intPerformedBy) errors.performedBy = true
    
    setIntValidationErrors(errors)
    
    if (Object.keys(errors).length > 0) {
      return false
    }
    
    const intEntry = {
      time: intTime,
      performedBy: intPerformedBy,
      airway: intAirway,
      ventilation: intVentilation,
      peep: intPeep,
      cpap: intCpap,
      rsi: intRsi,
      cpr: intCpr,
      defibrillation: intDefibrillation,
      cardioversion: intCardioversion,
      pacing: intPacing,
      valsalva: intValsalva,
      ivCannulation: intIvCannulation,
      ioAccess: intIoAccess,
      chestDecompression: intChestDecompression,
      stomachDecompression: intStomachDecompression,
      catheterTroubleshooting: intCatheterTroubleshooting,
      nerveBlock: intNerveBlock,
      positioning: intPositioning,
      splintDressingTag: intSplintDressingTag,
      nasalTamponade: intNasalTamponade,
      tourniquet: intTourniquet,
      limbReduction: intLimbReduction,
      epleyManoeuvre: intEpleyManoeuvre,
      otherInterventionNotes: intOtherNotes
    }
    setSavedInterventions([...savedInterventions, intEntry])
    return true
  }
  
  const resetInterventionForm = () => {
    setIntTime('')
    setIntPerformedBy('')
    setIntAirway('')
    setIntVentilation('')
    setIntPeep('')
    setIntCpap('')
    setIntRsi('')
    setIntCpr('')
    setIntDefibrillation('')
    setIntCardioversion('')
    setIntPacing('')
    setIntValsalva('')
    setIntIvCannulation('')
    setIntIoAccess('')
    setIntChestDecompression('')
    setIntStomachDecompression('')
    setIntCatheterTroubleshooting('')
    setIntNerveBlock('')
    setIntPositioning('')
    setIntSplintDressingTag('')
    setIntNasalTamponade('')
    setIntTourniquet('')
    setIntLimbReduction('')
    setIntEpleyManoeuvre('')
    setIntOtherNotes('')
    setIntValidationErrors({})
  }
  
  const handleIntSaveAndReturn = () => {
    if (saveIntervention()) {
      setShowInterventionEntryModal(false)
    }
  }
  
  const handleIntSaveAndEnterAnother = () => {
    if (saveIntervention()) {
      // Reset form but keep modal open
      resetInterventionForm()
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
    setValidationErrors({...validationErrors, time: false})
    setShowDateTimePicker(false)
  }

  const setNow = () => {
    const now = new Date()
    const formatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setTime(formatted)
    setValidationErrors({...validationErrors, time: false})
  }

  const openGCSModal = () => {
    // Store current state for cancel
    setTempGcsEye(gcsEye)
    setTempGcsVerbal(gcsVerbal)
    setTempGcsMotor(gcsMotor)
    setShowGCSModal(true)
  }

  const handleGCSOk = () => {
    const eyeScore = gcsEye ? parseInt(gcsEye) : 0
    const verbalScore = gcsVerbal ? parseInt(gcsVerbal) : 0
    const motorScore = gcsMotor ? parseInt(gcsMotor) : 0
    const total = eyeScore + verbalScore + motorScore
    setGcs(total > 0 ? total.toString() : '')
    setShowGCSModal(false)
  }

  const handleGCSCancel = () => {
    // Restore previous state
    setGcsEye(tempGcsEye)
    setGcsVerbal(tempGcsVerbal)
    setGcsMotor(tempGcsMotor)
    setShowGCSModal(false)
  }

  const handleGCSOkAndNext = () => {
    const eyeScore = gcsEye ? parseInt(gcsEye) : 0
    const verbalScore = gcsVerbal ? parseInt(gcsVerbal) : 0
    const motorScore = gcsMotor ? parseInt(gcsMotor) : 0
    const total = eyeScore + verbalScore + motorScore
    setGcs(total > 0 ? total.toString() : '')
    setShowGCSModal(false)
    // Store for HR modal cancel
    setTempHrLocation(hrLocation)
    setTempHrStrength(hrStrength)
    setTempHrRegularity(hrRegularity)
    setTempHrNotes(hrNotes)
    setShowHRModal(true)
  }

  const getGCSTotal = () => {
    const eyeScore = gcsEye ? parseInt(gcsEye) : 0
    const verbalScore = gcsVerbal ? parseInt(gcsVerbal) : 0
    const motorScore = gcsMotor ? parseInt(gcsMotor) : 0
    return eyeScore + verbalScore + motorScore
  }

  const openHRModal = () => {
    // Store current state for cancel
    setTempHeartRateBpm(heartRateBpm)
    setTempHrLocation(hrLocation)
    setTempHrStrength(hrStrength)
    setTempHrRegularity(hrRegularity)
    setTempHrNotes(hrNotes)
    setShowHRModal(true)
  }

  const handleHROk = () => {
    // Format: [HR]bpm
    setHeartRate(heartRateBpm ? `${heartRateBpm}bpm` : '')
    setShowHRModal(false)
  }

  const handleHRCancel = () => {
    // Restore previous state
    setHeartRateBpm(tempHeartRateBpm)
    setHrLocation(tempHrLocation)
    setHrStrength(tempHrStrength)
    setHrRegularity(tempHrRegularity)
    setHrNotes(tempHrNotes)
    setShowHRModal(false)
  }

  const handleHROkAndNext = () => {
    // Format: [HR]bpm
    setHeartRate(heartRateBpm ? `${heartRateBpm}bpm` : '')
    setShowHRModal(false)
    // Store for RR modal cancel
    setTempRrPerMinute(rrPerMinute)
    setTempRrWordsPerBreath(rrWordsPerBreath)
    setShowRRModal(true)
  }

  const openRRModal = () => {
    setTempRrPerMinute(rrPerMinute)
    setTempRrWordsPerBreath(rrWordsPerBreath)
    setShowRRModal(true)
  }

  const handleRROk = () => {
    // Format: [RRPM] | [WPM]
    const rrDisplay = rrPerMinute && rrWordsPerBreath ? `${rrPerMinute} | ${rrWordsPerBreath}` : rrPerMinute || ''
    setRespiratoryRate(rrDisplay)
    setShowRRModal(false)
  }

  const handleRRCancel = () => {
    setRrPerMinute(tempRrPerMinute)
    setRrWordsPerBreath(tempRrWordsPerBreath)
    setShowRRModal(false)
  }

  const handleRROkAndNext = () => {
    // Format: [RRPM] | [WPM]
    const rrDisplay = rrPerMinute && rrWordsPerBreath ? `${rrPerMinute} | ${rrWordsPerBreath}` : rrPerMinute || ''
    setRespiratoryRate(rrDisplay)
    setShowRRModal(false)
    // Store for BP modal cancel
    setTempSystolic(systolic)
    setTempDiastolic(diastolic)
    setTempSpO2Value(spO2Value)
    setShowBPSpO2Modal(true)
  }

  const handleRRNotPossibleClick = () => {
    setShowRRModal(false)
    setShowRRNotPossibleModal(true)
  }

  const handleRRNotPossibleOk = () => {
    setRrNotPossible(rrNotPossibleReason)
    setShowRRNotPossibleModal(false)
    setShowRRModal(true)
  }

  const openBPSpO2Modal = () => {
    setTempSystolic(systolic)
    setTempDiastolic(diastolic)
    setTempSpO2Value(spO2Value)
    setShowBPSpO2Modal(true)
  }

  const handleBPSpO2Ok = () => {
    // BP format: [Systolic]/[diastolic]
    const bpValue = systolic && diastolic ? `${systolic}/${diastolic}` : ''
    setBloodPressure(bpValue)
    // SpO2 format: [SPO2]%
    setSpo2(spO2Value ? `${spO2Value}%` : '')
    setShowBPSpO2Modal(false)
  }

  const handleBPSpO2Cancel = () => {
    setSystolic(tempSystolic)
    setDiastolic(tempDiastolic)
    setSpO2Value(tempSpO2Value)
    setShowBPSpO2Modal(false)
  }

  const handleBPSpO2OkAndNext = () => {
    // BP format: [Systolic]/[diastolic]
    const bpValue = systolic && diastolic ? `${systolic}/${diastolic}` : ''
    setBloodPressure(bpValue)
    // SpO2 format: [SPO2]%
    setSpo2(spO2Value ? `${spO2Value}%` : '')
    setShowBPSpO2Modal(false)
    // Store for ECG modal cancel
    setTempEcgType(ecgType)
    setShowECGModal(true)
  }

  const handleBPNotPossibleClick = () => {
    setShowBPSpO2Modal(false)
    setShowBPNotPossibleModal(true)
  }

  const handleBPNotPossibleOk = () => {
    setBpNotPossible(bpNotPossibleReason)
    setShowBPNotPossibleModal(false)
    setShowBPSpO2Modal(true)
  }

  const handleSpO2NotPossibleClick = () => {
    setShowBPSpO2Modal(false)
    setShowSpO2NotPossibleModal(true)
  }

  const handleSpO2NotPossibleOk = () => {
    setSpO2NotPossible(spO2NotPossibleReason)
    setShowSpO2NotPossibleModal(false)
    setShowBPSpO2Modal(true)
  }

  const openECGModal = () => {
    setTempEcgType(ecgType)
    setTempEcgCompleted(ecgCompleted)
    setShowECGModal(true)
  }

  const handleECGOk = () => {
    // Format: [type] | [ECG completed]
    const ecgDisplay = ecgType && ecgCompleted ? `${ecgType} | ${ecgCompleted}` : ecgType || ''
    setEcg(ecgDisplay)
    setShowECGModal(false)
  }

  const handleECGCancel = () => {
    setEcgType(tempEcgType)
    setEcgCompleted(tempEcgCompleted)
    setShowECGModal(false)
  }

  const handleECGOkAndNext = () => {
    // Format: [type] | [ECG completed]
    const ecgDisplay = ecgType && ecgCompleted ? `${ecgType} | ${ecgCompleted}` : ecgType || ''
    setEcg(ecgDisplay)
    setShowECGModal(false)
    // Store for BGL modal cancel
    setTempBglValue(bglValue)
    setTempCapRefillValue(capRefillValue)
    setTempTempValue(tempValue)
    setShowBGLModal(true)
  }

  const handleECGNotPossibleClick = () => {
    setShowECGModal(false)
    setShowECGNotPossibleModal(true)
  }

  const handleECGNotPossibleOk = () => {
    setEcgNotPossible(ecgNotPossibleReason)
    setShowECGNotPossibleModal(false)
    setShowECGModal(true)
  }

  const openBGLModal = () => {
    setTempBglValue(bglValue)
    setTempCapRefillValue(capRefillValue)
    setTempTempValue(tempValue)
    setShowBGLModal(true)
  }

  const handleBGLOk = () => {
    // BGL format: [BGL]mmol/L
    setBloodGlucose(bglValue ? `${bglValue}mmol/L` : '')
    // Cap Refill format: [CRT]s
    setCapRefill(capRefillValue ? `${capRefillValue}s` : '')
    // Temp format: [Temp]°C
    setTemperature(tempValue ? `${tempValue}°C` : '')
    setShowBGLModal(false)
  }

  const handleBGLCancel = () => {
    setBglValue(tempBglValue)
    setCapRefillValue(tempCapRefillValue)
    setTempValue(tempTempValue)
    setShowBGLModal(false)
  }

  const handleBGLOkAndNext = () => {
    // BGL format: [BGL]mmol/L
    setBloodGlucose(bglValue ? `${bglValue}mmol/L` : '')
    // Cap Refill format: [CRT]s
    setCapRefill(capRefillValue ? `${capRefillValue}s` : '')
    // Temp format: [Temp]°C
    setTemperature(tempValue ? `${tempValue}°C` : '')
    setShowBGLModal(false)
    // Store for Pain Score modal cancel
    setTempPainScoreValue(painScoreValue)
    setShowPainScoreModal(true)
  }
  
  const handleBGLNotPossibleClick = () => {
    setShowBGLNotPossibleModal(true)
  }

  const handleCapRefillNotPossibleClick = () => {
    setShowCapRefillNotPossibleModal(true)
  }

  const handleTempNotPossibleClick = () => {
    setShowTempNotPossibleModal(true)
  }

  const openPainScoreModal = () => {
    setTempPainScoreValue(painScoreValue)
    setShowPainScoreModal(true)
  }

  const handlePainScoreOk = () => {
    setPainScore(painScoreValue)
    setShowPainScoreModal(false)
  }

  const handlePainScoreCancel = () => {
    setPainScoreValue(tempPainScoreValue)
    setShowPainScoreModal(false)
  }

  const handlePainScoreOkAndNext = () => {
    setPainScore(painScoreValue)
    setShowPainScoreModal(false)
    // Store for Pupils modal cancel
    setTempPupilSizeLeft(pupilSizeLeft)
    setTempPupilSizeRight(pupilSizeRight)
    setTempPupilReactsLeft(pupilReactsLeft)
    setTempPupilReactsRight(pupilReactsRight)
    setShowPupilsModal(true)
  }
  
  const handlePainScoreNotPossibleClick = () => {
    setShowPainScoreNotPossibleModal(true)
  }

  const handlePainScoreNotPossibleOk = (reason: string) => {
    setPainScoreNotPossibleReason(reason)
    setPainScoreNotPossible('true')
    setShowPainScoreNotPossibleModal(false)
  }
  
  const openPupilsModal = () => {
    setTempPupilSizeLeft(pupilSizeLeft)
    setTempPupilSizeRight(pupilSizeRight)
    setTempPupilReactsLeft(pupilReactsLeft)
    setTempPupilReactsRight(pupilReactsRight)
    setShowPupilsModal(true)
  }

  const handlePupilsOk = () => {
    setPupils(`L:${pupilSizeLeft} R:${pupilSizeRight}`)
    setShowPupilsModal(false)
  }

  const handlePupilsCancel = () => {
    setPupilSizeLeft(tempPupilSizeLeft)
    setPupilSizeRight(tempPupilSizeRight)
    setPupilReactsLeft(tempPupilReactsLeft)
    setPupilReactsRight(tempPupilReactsRight)
    setShowPupilsModal(false)
  }

  const handlePupilsOkAndNext = () => {
    setPupils(`L:${pupilSizeLeft} R:${pupilSizeRight}`)
    setShowPupilsModal(false)
    // Store for Skin modal cancel
    setTempSkinColor(skinColor)
    setShowETCO2SkinModal(true)
  }
  
  const openETCO2SkinModal = () => {
    setTempSkinColor(skinColor)
    setShowETCO2SkinModal(true)
  }

  const handleETCO2SkinOk = () => {
    setSkin(skinColor)
    setShowETCO2SkinModal(false)
  }

  const handleETCO2SkinCancel = () => {
    setSkinColor(tempSkinColor)
    setShowETCO2SkinModal(false)
  }
  
  const handleSkinNotPossibleClick = () => {
    setShowSkinNotPossibleModal(true)
  }

  const handleSkinNotPossibleOk = (reason: string) => {
    setSkinNotPossibleReason(reason)
    setSkinNotPossible('true')
    setShowSkinNotPossibleModal(false)
  }
  
  const openNotesModal = () => {
    setTempNotesValue(notesValue)
    setShowNotesModal(true)
  }

  const handleNotesOk = () => {
    // Notes shows "Filled" if there's content
    setNotes(notesValue ? 'Filled' : '')
    setShowNotesModal(false)
  }

  const handleNotesCancel = () => {
    setNotesValue(tempNotesValue)
    setShowNotesModal(false)
  }

  const resetVitalsForm = () => {
    setTime('')
    setGcs('')
    setHeartRate('')
    setHeartRateBpm('')
    setRespiratoryRate('')
    setBloodPressure('')
    setSpo2('')
    setEcg('')
    setBloodGlucose('')
    setCapRefill('')
    setTemperature('')
    setPainScore('')
    setPupils('')
    setEtco2('')
    setSkin('')
    setPefr('')
    setNotes('')
    // Reset all modal states
    setGcsEye('')
    setGcsVerbal('')
    setGcsMotor('')
    setHrLocation('')
    setHrStrength('')
    setHrRegularity('')
    setHrNotes('')
    setRrPerMinute('')
    setRrWordsPerBreath('')
    setSystolic('')
    setDiastolic('')
    setBpMethod('')
    setBpPosition('')
    setSpO2Value('')
    setSpO2Conditions('')
    setEcgType('')
    setEcgCompleted('')
    setEcgCompletedOther('')
    setBglValue('')
    setCapRefillValue('')
    setTempValue('')
    setPainScoreValue('')
    setPupilSizeLeft('')
    setPupilSizeRight('')
    setPupilReactsLeft('')
    setPupilReactsRight('')
    setSkinColor('')
    setNotesValue('')
  }

  const handleNewVitals = () => {
    resetVitalsForm()
    setShowNewVitals(true)
  }

  const saveCurrentVitals = () => {
    // Check compulsory field (Time)
    const errors: {[key: string]: boolean} = {}
    if (!time) {
      errors.time = true
    }
    
    setValidationErrors(errors)
    
    if (Object.keys(errors).length > 0) {
      return false
    }
    
    const vitalEntry = {
      time,
      gcs,
      heartRate,
      respiratoryRate,
      bloodPressure,
      spo2,
      ecg,
      bloodGlucose,
      capRefill,
      temperature,
      painScore,
      pupils,
      etco2,
      skin,
      pefr,
      notes,
      notesContent: notesValue  // Store actual notes content
    }
    setSavedVitals([...savedVitals, vitalEntry])
    setValidationErrors({})
    return true
  }

  const handleSaveAndReturn = () => {
    if (saveCurrentVitals()) {
      clearDraft() // Clear draft after successful save
      setShowNewVitals(false)
    }
  }

  const handleSaveAndEnterAnother = () => {
    if (saveCurrentVitals()) {
      clearDraft() // Clear draft after successful save
      resetVitalsForm()
    }
  }

  const handleCancelAndDiscard = () => {
    clearDraft() // Clear draft when discarding
    resetVitalsForm()
    setShowNewVitals(false)
  }

  return (
    <div className="eprf-dashboard incident-page">
      <div className="eprf-nav">
        <button className="nav-btn" onClick={handleHome}>Home</button>
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
        <button className="nav-btn" onClick={() => setShowPatientManagementModal(true)}>Manage Patients</button>
        {canManageCollaborators(userPermission) && (
          <button className="nav-btn" onClick={() => setShowCollaboratorsModal(true)}>Manage Collaborators</button>
        )}
        <button className="nav-btn" onClick={handleLogout}>Logout</button>
        {incidentId && patientLetter && (
          <PresenceIndicator 
            incidentId={incidentId}
            patientLetter={patientLetter}
            userDiscordId={getCurrentUser()?.discordId || ''}
            userCallsign={getCurrentUser()?.callsign || ''}
            pageName="vital-obs"
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
          <button className={`sidebar-btn active${incompleteSections.includes('vital-obs') ? ' incomplete' : ''}`} onClick={() => navigateTo('vital-obs')}>Vital Obs / Treat</button>
          <button className={`sidebar-btn${incompleteSections.includes('hx-complaint') ? ' incomplete' : ''}`} onClick={() => navigateTo('hx-complaint')}>Hx Complaint</button>
          <button className={`sidebar-btn${incompleteSections.includes('past-medical-history') ? ' incomplete' : ''}`} onClick={() => navigateTo('past-medical-history')}>Past Medical History</button>
          <button className={`sidebar-btn${incompleteSections.includes('clinical-impression') ? ' incomplete' : ''}`} onClick={() => navigateTo('clinical-impression')}>Clinical Impression</button>
          <button className={`sidebar-btn${incompleteSections.includes('disposition') ? ' incomplete' : ''}`} onClick={() => navigateTo('disposition')}>Disposition</button>
          <button className="sidebar-btn" onClick={() => navigateTo('media')}>Media</button>
        </aside>

        <main className="incident-content">
          {!showNewVitals ? (
            <section className="incident-section">
              <h2 className="section-title">Vital Obs / Treat</h2>
              {getAllRecords().length === 0 ? (
                <div className="no-record-message">No record found.</div>
              ) : (
                <div style={{ marginTop: '20px' }}>
                  {getAllRecords().map((record, index) => (
                    <div 
                      key={index} 
                      onClick={() => {
                        setViewingRecord(record)
                        if (record.recordType === 'vital') setShowVitalViewModal(true)
                        else if (record.recordType === 'medication') setShowMedViewModal(true)
                        else if (record.recordType === 'intervention') setShowInterventionViewModal(true)
                        else if (record.recordType === 'competency') setShowCompetencyViewModal(true)
                      }}
                      style={{
                        backgroundColor: record.recordType === 'vital' ? '#e8f4f8' : record.recordType === 'medication' ? '#f0e8f8' : record.recordType === 'competency' ? '#f8f0e8' : '#e8f8e8',
                        padding: '15px',
                        marginBottom: '10px',
                        borderRadius: '4px',
                        border: record.recordType === 'vital' ? '1px solid #a8c5e0' : record.recordType === 'medication' ? '1px solid #c5a8e0' : record.recordType === 'competency' ? '1px solid #e0c5a8' : '1px solid #a8e0a8',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ 
                            fontWeight: 'bold', 
                            fontSize: '14px',
                            textTransform: 'uppercase',
                            backgroundColor: record.recordType === 'vital' ? '#3182ce' : record.recordType === 'medication' ? '#805ad5' : record.recordType === 'competency' ? '#d69e2e' : '#38a169',
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}>
                            {record.recordType === 'vital' ? 'VITALS' : record.recordType === 'medication' ? 'MEDICATION' : record.recordType === 'competency' ? 'COMPETENCY' : 'INTERVENTION'}
                          </span>
                          <span style={{ fontSize: '11px', color: '#718096', fontStyle: 'italic' }}>(click to view full)</span>
                        </div>
                        <span style={{ fontWeight: 'bold', color: '#4a5568' }}>
                          {record.time || record.timestamp || 'No time recorded'}
                        </span>
                      </div>
                      
                      {/* Horizontal scrollable box display */}
                      <div style={{ 
                        overflowX: 'auto', 
                        whiteSpace: 'nowrap',
                        paddingBottom: '10px'
                      }}>
                        <div style={{ display: 'inline-flex', gap: '10px' }}>
                          {record.recordType === 'vital' && (
                            <>
                              {record.gcs && (
                                <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '80px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>GCS</div>
                                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{record.gcs}</div>
                                </div>
                              )}
                              {record.heartRate && (
                                <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '80px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>Heart Rate</div>
                                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{record.heartRate}</div>
                                </div>
                              )}
                              {record.respiratoryRate && (
                                <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '80px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>Resp Rate</div>
                                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{record.respiratoryRate}</div>
                                </div>
                              )}
                              {record.bloodPressure && (
                                <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '80px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>Blood Pressure</div>
                                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{record.bloodPressure}</div>
                                </div>
                              )}
                              {record.spo2 && (
                                <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '80px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>SpO2</div>
                                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{record.spo2}</div>
                                </div>
                              )}
                              {record.ecg && (
                                <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '80px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>ECG</div>
                                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{record.ecg}</div>
                                </div>
                              )}
                              {record.bloodGlucose && (
                                <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '80px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>Blood Glucose</div>
                                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{record.bloodGlucose}</div>
                                </div>
                              )}
                              {record.capRefill && (
                                <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '80px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>Cap Refill</div>
                                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{record.capRefill}</div>
                                </div>
                              )}
                              {record.temperature && (
                                <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '80px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>Temp</div>
                                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{record.temperature}</div>
                                </div>
                              )}
                              {record.painScore && (
                                <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '80px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>Pain Score</div>
                                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{record.painScore}</div>
                                </div>
                              )}
                              {record.pupils && (
                                <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '80px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>Pupils</div>
                                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{record.pupils}</div>
                                </div>
                              )}
                              {record.skin && (
                                <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '80px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>Skin</div>
                                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{record.skin}</div>
                                </div>
                              )}
                              {record.notes === 'Filled' && record.notesContent && (
                                <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '80px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>Notes</div>
                                  <div style={{ fontSize: '14px', color: '#4a5568' }}>Filled</div>
                                </div>
                              )}
                            </>
                          )}
                          
                          {record.recordType === 'medication' && (
                            <>
                              {record.medication && (
                                <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '100px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>Medication</div>
                                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{record.medication}</div>
                                </div>
                              )}
                              {record.dose && (
                                <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '80px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>Dose</div>
                                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{record.dose}</div>
                                </div>
                              )}
                              {record.route && (
                                <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '80px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>Route</div>
                                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{record.route}</div>
                                </div>
                              )}
                            </>
                          )}
                          
                          {record.recordType === 'intervention' && (
                            <>
                              {record.intervention && (
                                <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '100px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>Intervention</div>
                                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{record.intervention}</div>
                                </div>
                              )}
                              {record.details && (
                                <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '80px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>Details</div>
                                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{record.details}</div>
                                </div>
                              )}
                            </>
                          )}
                          
                          {record.recordType === 'competency' && (
                            <>
                              <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '120px', textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>Understand Info?</div>
                                <div style={{ fontSize: '14px', color: record.understandInfo === 'yes' ? '#38a169' : '#e53e3e' }}>{record.understandInfo === 'yes' ? 'Yes' : 'No'}</div>
                              </div>
                              <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '120px', textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>Understand Consequences?</div>
                                <div style={{ fontSize: '14px', color: record.understandConsequences === 'yes' ? '#38a169' : '#e53e3e' }}>{record.understandConsequences === 'yes' ? 'Yes' : 'No'}</div>
                              </div>
                              <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '120px', textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>Remember Info?</div>
                                <div style={{ fontSize: '14px', color: record.rememberInfo === 'yes' ? '#38a169' : '#e53e3e' }}>{record.rememberInfo === 'yes' ? 'Yes' : 'No'}</div>
                              </div>
                              <div style={{ display: 'inline-block', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 12px', minWidth: '100px', textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>Self Harm?</div>
                                <div style={{ fontSize: '14px', color: record.selfHarm === 'yes' ? '#e53e3e' : '#38a169' }}>{record.selfHarm === 'yes' ? 'Yes' : 'No'}</div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="vitals-action-buttons">
                <button className="vitals-action-btn blue" onClick={handleNewVitals}>New Vitals</button>
                <button className="vitals-action-btn blue" onClick={handleNewMeds}>New Meds</button>
                <button className="vitals-action-btn blue" onClick={handleNewIntervention}>New Intervention</button>
                <button className="vitals-action-btn blue" onClick={() => {
                  // Track last section before opening Competency Tool
                  if (showNewVitals) setLastSection('vital-obs')
                  else if (showMedEntryModal || showMedSearchModal) setLastSection('medications')
                  else if (showInterventionEntryModal) setLastSection('interventions')
                  else setLastSection('vital-obs')
                  setShowCompetencyModal(true)
                }}>Competency Tool</button>
                // Competency Tool cancel logic
                const handleCompetencyCancel = () => {
                  setShowCompetencyModal(false)
                  // Return to last section
                  if (lastSection === 'vital-obs') {
                    setShowNewVitals(true)
                  } else if (lastSection === 'medications') {
                    setShowMedEntryModal(true)
                  } else if (lastSection === 'interventions') {
                    setShowInterventionEntryModal(true)
                  } else {
                    // Default: stay on vitals
                    setShowNewVitals(false)
                  }
                }
              </div>
            </section>
          ) : (
            <section className="incident-section">
              <h2 className="section-title">Vital Observation(s)</h2>
              
              <div className="vitals-grid">
                <div className="vital-field">
                  <label className={`field-label required ${validationErrors.time ? 'error' : ''}`}>Time</label>
                  <div className="input-with-btn">
                    <input 
                      type="text" 
                      value={time} 
                      onChange={(e) => { setTime(e.target.value); setValidationErrors({...validationErrors, time: false}); }}
                      onClick={openDateTimePicker}
                      className={`text-input ${validationErrors.time ? 'input-error' : ''}`}
                      readOnly
                    />
                    <button className="now-btn" onClick={setNow}>Now</button>
                  </div>
                </div>

                <div className="vital-field">
                  <label className="field-label">GCS</label>
                  <input 
                    type="text" 
                    value={gcs}
                    className="text-input clickable-input"
                    readOnly
                    onClick={openGCSModal}
                  />
                </div>

                <div className="vital-field">
                  <label className="field-label">Heart Rate (/min)</label>
                  <input 
                    type="text" 
                    value={heartRate}
                    className="text-input clickable-input"
                    readOnly
                    onClick={openHRModal}
                  />
                </div>

                <div className="vital-field">
                  <label className="field-label">Respiratory Rate (/min)</label>
                  <input 
                    type="text" 
                    value={respiratoryRate}
                    className="text-input clickable-input"
                    readOnly
                    onClick={openRRModal}
                  />
                </div>

                <div className="vital-field">
                  <label className="field-label">Blood Pressure (mmHg)</label>
                  <input 
                    type="text" 
                    value={bloodPressure}
                    className="text-input clickable-input"
                    readOnly
                    onClick={openBPSpO2Modal}
                  />
                </div>

                <div className="vital-field">
                  <label className="field-label">SpO<sub>2</sub> (%)</label>
                  <input 
                    type="text" 
                    value={spo2}
                    className="text-input clickable-input"
                    readOnly
                    onClick={openBPSpO2Modal}
                  />
                </div>

                <div className="vital-field">
                  <label className="field-label">ECG</label>
                  <input 
                    type="text" 
                    value={ecg}
                    className="text-input clickable-input"
                    readOnly
                    onClick={openECGModal}
                  />
                </div>

                <div className="vital-field">
                  <label className="field-label">Blood Glucose (mmol/L)</label>
                    <input 
                      type="text" 
                      value={bloodGlucose}
                      className="text-input vital-box"
                      style={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', boxShadow: 'none', padding: '8px 12px', minWidth: '80px', textAlign: 'center' }}
                      readOnly
                      onClick={openBGLModal}
                    />
                </div>

                <div className="vital-field">
                  <label className="field-label">Cap Refill (sec)</label>
                    <input 
                      type="text" 
                      value={capRefill}
                      className="text-input vital-box"
                      style={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', boxShadow: 'none', padding: '8px 12px', minWidth: '80px', textAlign: 'center' }}
                      readOnly
                      onClick={openBGLModal}
                    />
                </div>

                <div className="vital-field">
                  <label className="field-label">Temperature (°C)</label>
                    <input 
                      type="text" 
                      value={temperature}
                      className="text-input vital-box"
                      style={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', boxShadow: 'none', padding: '8px 12px', minWidth: '80px', textAlign: 'center' }}
                      readOnly
                      onClick={openBGLModal}
                    />
                </div>

                <div className="vital-field">
                  <label className="field-label">Pain Score</label>
                  <input 
                    type="text" 
                    value={painScore}
                    className="text-input clickable-input"
                    readOnly
                    onClick={openPainScoreModal}
                  />
                </div>

                <div className="vital-field">
                  <label className="field-label">Pupils</label>
                  <input 
                    type="text" 
                    value={pupils}
                    className="text-input clickable-input"
                    readOnly
                    onClick={openPupilsModal}
                  />
                </div>

                <div className="vital-field">
                  <label className="field-label">ETCO<sub>2</sub></label>
                  <input 
                    type="text" 
                    value={etco2}
                    className="text-input grayed-disabled"
                    disabled
                    readOnly
                  />
                </div>

                <div className="vital-field">
                  <label className="field-label">Skin</label>
                  <input 
                    type="text" 
                    value={skin}
                    className="text-input clickable-input"
                    readOnly
                    onClick={openETCO2SkinModal}
                  />
                </div>

                <div className="vital-field">
                  <label className="field-label">PEFR (L/min)</label>
                  <input 
                    type="text" 
                    value={pefr}
                    className="text-input grayed-disabled"
                    disabled
                    readOnly
                  />
                </div>

                <div className="vital-field">
                  <label className="field-label">Notes</label>
                  <input 
                    type="text" 
                    value={notes}
                    className="text-input clickable-input"
                    readOnly
                    onClick={openNotesModal}
                  />
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {!showNewVitals ? (
        <div className="eprf-footer vitals-footer">
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
            <button className="footer-btn green" onClick={handleSubmitEPRF}>Submit ePRF</button>
          </div>
          <div className="footer-center">
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
          </div>
          <div className="footer-right">
            <button className="footer-btn gray" onClick={handleCancelAndDiscard}>Cancel and discard changes</button>
            <button className="footer-btn blue" onClick={handleSaveAndEnterAnother}>Save and enter another set of observations</button>
            <button className="footer-btn blue" onClick={handleSaveAndReturn}>Save and return to Vital Obs/Treat</button>
          </div>
          {/* Chat Widget for new vitals/meds/interventions views */}
          {currentUser && showChat && (
            <ChatStrip
              incidentId={incidentId}
              discordId={currentUser.discordId}
              callsign={currentUser.callsign}
              patientLetter={patientLetter}
              collaborators={collaborators}
            />
          )}
          {showChat && (
            <div className="fixed inset-0 z-40 bg-black/30 cursor-pointer" onClick={() => setShowChat(false)} />
          )}
        </div>
      )}

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
                <button className="picker-btn" onClick={() => setPickerYear(Math.max(1900, pickerYear - 1))}>-</button>
              </div>
              <div className="picker-column">
                <button className="picker-btn" onClick={() => setPickerHour(pickerHour === 23 ? 0 : pickerHour + 1)}>+</button>
                <div className="picker-value highlight">{String(pickerHour).padStart(2, '0')}</div>
                <button className="picker-btn" onClick={() => setPickerHour(pickerHour === 0 ? 23 : pickerHour - 1)}>-</button>
              </div>
              <div className="picker-column">
                <button className="picker-btn" onClick={() => setPickerMinute(pickerMinute === 59 ? 0 : pickerMinute + 1)}>+</button>
                <div className="picker-value highlight">{String(pickerMinute).padStart(2, '0')}</div>
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

      {showGCSModal && (
        <div className="modal-overlay" onClick={handleGCSCancel}>
          <div className="gcs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gcs-header">GCS</div>
            
            <div className="gcs-section">
              <label className="gcs-section-label required">Eye</label>
              <div className="gcs-options">
                <label className="gcs-option">
                  <input 
                    type="radio" 
                    name="gcsEye" 
                    value="4"
                    checked={gcsEye === '4'}
                    onChange={(e) => setGcsEye(e.target.value)}
                  />
                  Spontaneous (4)
                </label>
                <label className="gcs-option">
                  <input 
                    type="radio" 
                    name="gcsEye" 
                    value="3"
                    checked={gcsEye === '3'}
                    onChange={(e) => setGcsEye(e.target.value)}
                  />
                  To Speech (3)
                </label>
                <label className="gcs-option">
                  <input 
                    type="radio" 
                    name="gcsEye" 
                    value="2"
                    checked={gcsEye === '2'}
                    onChange={(e) => setGcsEye(e.target.value)}
                  />
                  To Pain (2)
                </label>
                <label className="gcs-option">
                  <input 
                    type="radio" 
                    name="gcsEye" 
                    value="1"
                    checked={gcsEye === '1'}
                    onChange={(e) => setGcsEye(e.target.value)}
                  />
                  Nil (1)
                </label>
              </div>
            </div>

            <div className="gcs-section">
              <label className="gcs-section-label required">Verbal</label>
              <div className="gcs-options">
                <label className="gcs-option">
                  <input 
                    type="radio" 
                    name="gcsVerbal" 
                    value="5"
                    checked={gcsVerbal === '5'}
                    onChange={(e) => setGcsVerbal(e.target.value)}
                  />
                  Orientated (5)
                </label>
                <label className="gcs-option">
                  <input 
                    type="radio" 
                    name="gcsVerbal" 
                    value="4"
                    checked={gcsVerbal === '4'}
                    onChange={(e) => setGcsVerbal(e.target.value)}
                  />
                  Confused (4)
                </label>
                <label className="gcs-option">
                  <input 
                    type="radio" 
                    name="gcsVerbal" 
                    value="3"
                    checked={gcsVerbal === '3'}
                    onChange={(e) => setGcsVerbal(e.target.value)}
                  />
                  Very confused (3)
                </label>
                <label className="gcs-option">
                  <input 
                    type="radio" 
                    name="gcsVerbal" 
                    value="2"
                    checked={gcsVerbal === '2'}
                    onChange={(e) => setGcsVerbal(e.target.value)}
                  />
                  Moans groans (2)
                </label>
                <label className="gcs-option">
                  <input 
                    type="radio" 
                    name="gcsVerbal" 
                    value="1"
                    checked={gcsVerbal === '1'}
                    onChange={(e) => setGcsVerbal(e.target.value)}
                  />
                  Nil (1)
                </label>
              </div>
            </div>

            <div className="gcs-section">
              <label className="gcs-section-label required">Motor</label>
              <div className="gcs-options">
                <label className="gcs-option">
                  <input 
                    type="radio" 
                    name="gcsMotor" 
                    value="6"
                    checked={gcsMotor === '6'}
                    onChange={(e) => setGcsMotor(e.target.value)}
                  />
                  Obeys (6)
                </label>
                <label className="gcs-option">
                  <input 
                    type="radio" 
                    name="gcsMotor" 
                    value="5"
                    checked={gcsMotor === '5'}
                    onChange={(e) => setGcsMotor(e.target.value)}
                  />
                  Localises (5)
                </label>
                <label className="gcs-option">
                  <input 
                    type="radio" 
                    name="gcsMotor" 
                    value="4"
                    checked={gcsMotor === '4'}
                    onChange={(e) => setGcsMotor(e.target.value)}
                  />
                  Withdraws (4)
                </label>
                <label className="gcs-option">
                  <input 
                    type="radio" 
                    name="gcsMotor" 
                    value="3"
                    checked={gcsMotor === '3'}
                    onChange={(e) => setGcsMotor(e.target.value)}
                  />
                  Flexes (3)
                </label>
                <label className="gcs-option">
                  <input 
                    type="radio" 
                    name="gcsMotor" 
                    value="2"
                    checked={gcsMotor === '2'}
                    onChange={(e) => setGcsMotor(e.target.value)}
                  />
                  Extends (2)
                </label>
                <label className="gcs-option">
                  <input 
                    type="radio" 
                    name="gcsMotor" 
                    value="1"
                    checked={gcsMotor === '1'}
                    onChange={(e) => setGcsMotor(e.target.value)}
                  />
                  Nil (1)
                </label>
              </div>
            </div>

            <div className="gcs-total-display">
              <div className="gcs-total-box">15</div>
              <div className="gcs-total-separator">{getGCSTotal() || 'nn'}</div>
              <div className="gcs-total-box">3</div>
            </div>

            <div className="gcs-actions">
              <button className="gcs-action-btn cancel" onClick={handleGCSCancel}>Cancel</button>
              <button className="gcs-action-btn ok" onClick={handleGCSOk}>OK</button>
              <button className="gcs-action-btn next" onClick={handleGCSOkAndNext}>Heart Rate &gt;</button>
            </div>
          </div>
        </div>
      )}

      {showHRModal && (
        <div className="modal-overlay" onClick={handleHRCancel}>
          <div className="vital-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vital-modal-header">Heart Rate (/min)</div>
            
            <div className="vital-modal-section">
              <label className="vital-modal-label required">Heart Rate</label>
              <NumericInput 
                value={heartRateBpm}
                onChange={setHeartRateBpm}
                className="text-input"
                min={0}
                max={300}
              />
            </div>

            <div className="vital-modal-section">
              <label className="vital-modal-label required">Location</label>
              <div className="vital-modal-options">
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="hrLocation" 
                    value="Radial"
                    checked={hrLocation === 'Radial'}
                    onChange={(e) => setHrLocation(e.target.value)}
                  />
                  <div>
                    <div>Radial</div>
                    <div className="option-subtext">Wrist</div>
                  </div>
                </label>
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="hrLocation" 
                    value="Carotid"
                    checked={hrLocation === 'Carotid'}
                    onChange={(e) => setHrLocation(e.target.value)}
                  />
                  <div>
                    <div>Carotid</div>
                    <div className="option-subtext">Neck</div>
                  </div>
                </label>
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="hrLocation" 
                    value="Femoral"
                    checked={hrLocation === 'Femoral'}
                    onChange={(e) => setHrLocation(e.target.value)}
                  />
                  <div>
                    <div>Femoral</div>
                    <div className="option-subtext">Femur</div>
                  </div>
                </label>
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="hrLocation" 
                    value="Brachial"
                    checked={hrLocation === 'Brachial'}
                    onChange={(e) => setHrLocation(e.target.value)}
                  />
                  <div>
                    <div>Brachial</div>
                    <div className="option-subtext">Elbow</div>
                  </div>
                </label>
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="hrLocation" 
                    value="Pedal"
                    checked={hrLocation === 'Pedal'}
                    onChange={(e) => setHrLocation(e.target.value)}
                  />
                  <div>
                    <div>Pedal</div>
                    <div className="option-subtext">Foot</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="vital-modal-section">
              <label className="vital-modal-label">Strength</label>
              <div className="vital-modal-options-row">
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="hrStrength" 
                    value="Normal"
                    checked={hrStrength === 'Normal'}
                    onChange={(e) => setHrStrength(e.target.value)}
                  />
                  Normal
                </label>
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="hrStrength" 
                    value="Strong"
                    checked={hrStrength === 'Strong'}
                    onChange={(e) => setHrStrength(e.target.value)}
                  />
                  Strong
                </label>
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="hrStrength" 
                    value="Weak"
                    checked={hrStrength === 'Weak'}
                    onChange={(e) => setHrStrength(e.target.value)}
                  />
                  Weak
                </label>
              </div>
            </div>

            <div className="vital-modal-section">
              <label className="vital-modal-label">Regularity</label>
              <div className="vital-modal-options-row">
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="hrRegularity" 
                    value="Regular"
                    checked={hrRegularity === 'Regular'}
                    onChange={(e) => setHrRegularity(e.target.value)}
                  />
                  Regular
                </label>
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="hrRegularity" 
                    value="Irregular"
                    checked={hrRegularity === 'Irregular'}
                    onChange={(e) => setHrRegularity(e.target.value)}
                  />
                  Irregular
                </label>
              </div>
            </div>

            <div className="vital-modal-section">
              <label className="vital-modal-label">Notes</label>
              <input 
                type="text" 
                value={hrNotes}
                onChange={(e) => setHrNotes(e.target.value)}
                className="text-input vital-notes-input"
              />
            </div>

            <div className="vital-modal-actions">
              <button className="vital-modal-btn secondary" onClick={() => setShowGCSModal(true)}>&lt; GCS</button>
              <button className="vital-modal-btn secondary">Competency Tool</button>
              <button className="vital-modal-btn cancel" onClick={handleHRCancel}>Cancel</button>
              <button className="vital-modal-btn ok" onClick={handleHROk}>OK</button>
              <button className="vital-modal-btn next" onClick={handleHROkAndNext}>Resp Rate &gt;</button>
            </div>
          </div>
        </div>
      )}

      {showRRModal && (
        <div className="modal-overlay" onClick={handleRRCancel}>
          <div className="vital-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vital-modal-header">Respiratory Rate (/min)</div>
            
            <div className="vital-modal-row">
              <div className="vital-modal-section" style={{ flex: 1 }}>
                <label className="vital-modal-label required">Respiratory rate per minute</label>
                <NumericInput 
                  value={rrPerMinute}
                  onChange={setRrPerMinute}
                  className="text-input"
                  min={0}
                  max={60}
                />
              </div>

              <div className="vital-modal-section" style={{ flex: 1 }}>
                <label className="vital-modal-label">Words per breath</label>
                <NumericInput 
                  value={rrWordsPerBreath}
                  onChange={setRrWordsPerBreath}
                  className="text-input"
                  min={0}
                  max={20}
                />
              </div>
            </div>

            <div className="vital-modal-section grayed-section">
              <label className="vital-modal-label">Sounds</label>
              <div className="vital-modal-checkboxes">
                <label className="vital-modal-checkbox grayed-disabled">
                  <input type="checkbox" disabled />
                  Normal
                </label>
                <label className="vital-modal-checkbox grayed-disabled">
                  <input type="checkbox" disabled />
                  Left wheeze
                </label>
                <label className="vital-modal-checkbox grayed-disabled">
                  <input type="checkbox" disabled />
                  Right wheeze
                </label>
                <label className="vital-modal-checkbox grayed-disabled">
                  <input type="checkbox" disabled />
                  Grunting
                </label>
                <label className="vital-modal-checkbox grayed-disabled">
                  <input type="checkbox" disabled />
                  Left rales
                </label>
                <label className="vital-modal-checkbox grayed-disabled">
                  <input type="checkbox" disabled />
                  Right rales
                </label>
                <label className="vital-modal-checkbox grayed-disabled">
                  <input type="checkbox" disabled />
                  Stridor
                </label>
                <label className="vital-modal-checkbox grayed-disabled">
                  <input type="checkbox" disabled />
                  Left crackles
                </label>
                <label className="vital-modal-checkbox grayed-disabled">
                  <input type="checkbox" disabled />
                  Right crackles
                </label>
                <label className="vital-modal-checkbox grayed-disabled">
                  <input type="checkbox" disabled />
                  Snoring
                </label>
                <label className="vital-modal-checkbox grayed-disabled">
                  <input type="checkbox" disabled />
                  Left diminished
                </label>
                <label className="vital-modal-checkbox grayed-disabled">
                  <input type="checkbox" disabled />
                  Right diminished
                </label>
                <label className="vital-modal-checkbox grayed-disabled">
                  <input type="checkbox" disabled />
                  Left absent
                </label>
                <label className="vital-modal-checkbox grayed-disabled">
                  <input type="checkbox" disabled />
                  Right absent
                </label>
              </div>
            </div>

            <div className="vital-modal-row">
              <div className="vital-modal-section grayed-section">
                <label className="vital-modal-label">Tripod position</label>
                <div className="vital-modal-options-row">
                  <label className="vital-modal-option grayed-disabled">
                    <input type="radio" name="rrTripod" disabled />
                    Yes
                  </label>
                  <label className="vital-modal-option grayed-disabled">
                    <input type="radio" name="rrTripod" disabled />
                    No
                  </label>
                </div>
              </div>

              <div className="vital-modal-section grayed-section">
                <label className="vital-modal-label">Retractions</label>
                <div className="vital-modal-options-row">
                  <label className="vital-modal-option grayed-disabled">
                    <input type="radio" name="rrRetractions" disabled />
                    Yes
                  </label>
                  <label className="vital-modal-option grayed-disabled">
                    <input type="radio" name="rrRetractions" disabled />
                    No
                  </label>
                </div>
              </div>

              <div className="vital-modal-section grayed-section">
                <label className="vital-modal-label">Nasal flaring</label>
                <div className="vital-modal-options-row">
                  <label className="vital-modal-option grayed-disabled">
                    <input type="radio" name="rrNasalFlaring" disabled />
                    Yes
                  </label>
                  <label className="vital-modal-option grayed-disabled">
                    <input type="radio" name="rrNasalFlaring" disabled />
                    No
                  </label>
                </div>
              </div>
            </div>

            <div className="vital-modal-section">
              <label className="vital-modal-label">Not possible</label>
              <input 
                type="text" 
                value={rrNotPossible}
                className="text-input vital-notes-input clickable-input"
                readOnly
                onClick={handleRRNotPossibleClick}
              />
            </div>

            <div className="vital-modal-actions">
              <button className="vital-modal-btn secondary" onClick={() => { setShowRRModal(false); setShowHRModal(true); }}>&lt; Heart Rate</button>
              <button className="vital-modal-btn secondary">Competency Tool</button>
              <button className="vital-modal-btn cancel" onClick={handleRRCancel}>Cancel</button>
              <button className="vital-modal-btn ok" onClick={handleRROk}>OK</button>
              <button className="vital-modal-btn next" onClick={handleRROkAndNext}>BP+SpO2 &gt;</button>
            </div>
          </div>
        </div>
      )}

      {showRRNotPossibleModal && (
        <div className="modal-overlay" onClick={() => setShowRRNotPossibleModal(false)}>
          <div className="not-possible-modal" onClick={(e) => e.stopPropagation()}>
            <div className="not-possible-header">Not possible</div>
            
            <div className="not-possible-options">
              <button 
                className={`not-possible-option ${rrNotPossibleReason === 'Patient does not understand' ? 'selected' : ''}`}
                onClick={() => setRrNotPossibleReason('Patient does not understand')}
              >
                Patient does not understand
              </button>
              <button 
                className={`not-possible-option ${rrNotPossibleReason === 'Patient refused' ? 'selected' : ''}`}
                onClick={() => setRrNotPossibleReason('Patient refused')}
              >
                Patient refused
              </button>
              <button 
                className={`not-possible-option ${rrNotPossibleReason === 'Patient unconscious' ? 'selected' : ''}`}
                onClick={() => setRrNotPossibleReason('Patient unconscious')}
              >
                Patient unconscious
              </button>
              <button 
                className={`not-possible-option ${rrNotPossibleReason === 'Not indicated' ? 'selected' : ''}`}
                onClick={() => setRrNotPossibleReason('Not indicated')}
              >
                Not indicated
              </button>
              <button 
                className={`not-possible-option ${rrNotPossibleReason === 'Contraindicated' ? 'selected' : ''}`}
                onClick={() => setRrNotPossibleReason('Contraindicated')}
              >
                Contraindicated
              </button>
              <button 
                className={`not-possible-option ${rrNotPossibleReason === 'Equipment failure' ? 'selected' : ''}`}
                onClick={() => setRrNotPossibleReason('Equipment failure')}
              >
                Equipment failure
              </button>
            </div>

            <div className="not-possible-actions">
              <button className="not-possible-btn ok" onClick={handleRRNotPossibleOk}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showBPSpO2Modal && (
        <div className="modal-overlay" onClick={handleBPSpO2Cancel}>
          <div className="vital-detail-modal bp-spo2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vital-modal-header">Blood Pressure (mmHg)</div>
            
            <div className="vital-modal-row">
              <div className="vital-modal-section" style={{ flex: 1 }}>
                <label className="vital-modal-label required">Systolic</label>
                <NumericInput 
                  value={systolic}
                  onChange={setSystolic}
                  className="text-input"
                  min={0}
                  max={300}
                />
              </div>

              <div className="vital-modal-section" style={{ flex: 1 }}>
                <label className="vital-modal-label required">Diastolic</label>
                <NumericInput 
                  value={diastolic}
                  onChange={setDiastolic}
                  className="text-input"
                  min={0}
                  max={200}
                />
              </div>
            </div>

            <div className="vital-modal-section">
              <label className="vital-modal-label required">Method</label>
              <div className="vital-modal-options-row">
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="bpMethod" 
                    value="Monitor"
                    checked={bpMethod === 'Monitor'}
                    onChange={(e) => setBpMethod(e.target.value)}
                  />
                  Monitor
                </label>
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="bpMethod" 
                    value="Manual"
                    checked={bpMethod === 'Manual'}
                    onChange={(e) => setBpMethod(e.target.value)}
                  />
                  Manual
                </label>
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="bpMethod" 
                    value="Palpated"
                    checked={bpMethod === 'Palpated'}
                    onChange={(e) => setBpMethod(e.target.value)}
                  />
                  Palpated
                </label>
              </div>
            </div>

            <div className="vital-modal-section">
              <label className="vital-modal-label required">Position</label>
              <div className="vital-modal-options-row">
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="bpPosition" 
                    value="Sitting"
                    checked={bpPosition === 'Sitting'}
                    onChange={(e) => setBpPosition(e.target.value)}
                  />
                  Sitting
                </label>
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="bpPosition" 
                    value="Standing"
                    checked={bpPosition === 'Standing'}
                    onChange={(e) => setBpPosition(e.target.value)}
                  />
                  Standing
                </label>
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="bpPosition" 
                    value="Semi-recumbent"
                    checked={bpPosition === 'Semi-recumbent'}
                    onChange={(e) => setBpPosition(e.target.value)}
                  />
                  Semi-recumbent
                </label>
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="bpPosition" 
                    value="Supine"
                    checked={bpPosition === 'Supine'}
                    onChange={(e) => setBpPosition(e.target.value)}
                  />
                  Supine
                </label>
              </div>
            </div>

            <div className="vital-modal-section">
              <label className="vital-modal-label">Not possible</label>
              <input 
                type="text" 
                value={bpNotPossible}
                className="text-input vital-notes-input clickable-input"
                readOnly
                onClick={() => { setShowBPSpO2Modal(false); setShowBPNotPossibleModal(true); }}
              />
            </div>

            <div className="vital-modal-divider"></div>

            <div className="vital-modal-header">SpO<sub>2</sub>(%)</div>

            <div className="vital-modal-section">
              <label className="vital-modal-label required">SpO<sub>2</sub></label>
              <NumericInput 
                value={spO2Value}
                onChange={setSpO2Value}
                className="text-input"
                style={{ maxWidth: '200px' }}
                min={0}
                max={100}
              />
            </div>

            <div className="vital-modal-section">
              <label className="vital-modal-label required">SpO<sub>2</sub> Measurement Conditions</label>
              <div className="vital-modal-options-row">
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="spO2Conditions" 
                    value="On air"
                    checked={spO2Conditions === 'On air'}
                    onChange={(e) => setSpO2Conditions(e.target.value)}
                  />
                  On air
                </label>
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="spO2Conditions" 
                    value="On medical air"
                    checked={spO2Conditions === 'On medical air'}
                    onChange={(e) => setSpO2Conditions(e.target.value)}
                  />
                  On medical air
                </label>
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="spO2Conditions" 
                    value="On oxygen"
                    checked={spO2Conditions === 'On oxygen'}
                    onChange={(e) => setSpO2Conditions(e.target.value)}
                  />
                  On oxygen
                </label>
              </div>
            </div>

            <div className="vital-modal-section">
              <label className="vital-modal-label">Not possible</label>
              <input 
                type="text" 
                value={spO2NotPossible}
                className="text-input vital-notes-input clickable-input"
                readOnly
                onClick={() => { setShowBPSpO2Modal(false); setShowSpO2NotPossibleModal(true); }}
              />
            </div>

            <div className="vital-modal-actions">
              <button className="vital-modal-btn secondary" onClick={() => { setShowBPSpO2Modal(false); setShowRRModal(true); }}>&lt; Resp Rate</button>
              <button className="vital-modal-btn secondary">Competency Tool</button>
              <button className="vital-modal-btn cancel" onClick={handleBPSpO2Cancel}>Cancel</button>
              <button className="vital-modal-btn ok" onClick={handleBPSpO2Ok}>OK</button>
              <button className="vital-modal-btn next" onClick={handleBPSpO2OkAndNext}>ECG &gt;</button>
            </div>
          </div>
        </div>
      )}

      {showBPNotPossibleModal && (
        <div className="modal-overlay" onClick={() => setShowBPNotPossibleModal(false)}>
          <div className="not-possible-modal" onClick={(e) => e.stopPropagation()}>
            <div className="not-possible-header">Not possible</div>
            
            <div className="not-possible-options">
              <button 
                className={`not-possible-option ${bpNotPossibleReason === 'Patient does not understand' ? 'selected' : ''}`}
                onClick={() => setBpNotPossibleReason('Patient does not understand')}
              >
                Patient does not understand
              </button>
              <button 
                className={`not-possible-option ${bpNotPossibleReason === 'Patient refused' ? 'selected' : ''}`}
                onClick={() => setBpNotPossibleReason('Patient refused')}
              >
                Patient refused
              </button>
              <button 
                className={`not-possible-option ${bpNotPossibleReason === 'Patient unconscious' ? 'selected' : ''}`}
                onClick={() => setBpNotPossibleReason('Patient unconscious')}
              >
                Patient unconscious
              </button>
              <button 
                className={`not-possible-option ${bpNotPossibleReason === 'Not indicated' ? 'selected' : ''}`}
                onClick={() => setBpNotPossibleReason('Not indicated')}
              >
                Not indicated
              </button>
              <button 
                className={`not-possible-option ${bpNotPossibleReason === 'Contraindicated' ? 'selected' : ''}`}
                onClick={() => setBpNotPossibleReason('Contraindicated')}
              >
                Contraindicated
              </button>
              <button 
                className={`not-possible-option ${bpNotPossibleReason === 'Equipment failure' ? 'selected' : ''}`}
                onClick={() => setBpNotPossibleReason('Equipment failure')}
              >
                Equipment failure
              </button>
            </div>

            <div className="not-possible-actions">
              <button className="not-possible-btn ok" onClick={() => { setBpNotPossible(bpNotPossibleReason); setShowBPNotPossibleModal(false); setShowBPSpO2Modal(true); }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showSpO2NotPossibleModal && (
        <div className="modal-overlay" onClick={() => setShowSpO2NotPossibleModal(false)}>
          <div className="not-possible-modal" onClick={(e) => e.stopPropagation()}>
            <div className="not-possible-header">Not possible</div>
            
            <div className="not-possible-options">
              <button 
                className={`not-possible-option ${spO2NotPossibleReason === 'Patient does not understand' ? 'selected' : ''}`}
                onClick={() => setSpO2NotPossibleReason('Patient does not understand')}
              >
                Patient does not understand
              </button>
              <button 
                className={`not-possible-option ${spO2NotPossibleReason === 'Patient refused' ? 'selected' : ''}`}
                onClick={() => setSpO2NotPossibleReason('Patient refused')}
              >
                Patient refused
              </button>
              <button 
                className={`not-possible-option ${spO2NotPossibleReason === 'Patient unconscious' ? 'selected' : ''}`}
                onClick={() => setSpO2NotPossibleReason('Patient unconscious')}
              >
                Patient unconscious
              </button>
              <button 
                className={`not-possible-option ${spO2NotPossibleReason === 'Not indicated' ? 'selected' : ''}`}
                onClick={() => setSpO2NotPossibleReason('Not indicated')}
              >
                Not indicated
              </button>
              <button 
                className={`not-possible-option ${spO2NotPossibleReason === 'Contraindicated' ? 'selected' : ''}`}
                onClick={() => setSpO2NotPossibleReason('Contraindicated')}
              >
                Contraindicated
              </button>
              <button 
                className={`not-possible-option ${spO2NotPossibleReason === 'Equipment failure' ? 'selected' : ''}`}
                onClick={() => setSpO2NotPossibleReason('Equipment failure')}
              >
                Equipment failure
              </button>
            </div>

            <div className="not-possible-actions">
              <button className="not-possible-btn ok" onClick={() => { setSpO2NotPossible(spO2NotPossibleReason); setShowSpO2NotPossibleModal(false); setShowBPSpO2Modal(true); }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showECGModal && (
        <div className="modal-overlay" onClick={handleECGCancel}>
          <div className="vital-detail-modal ecg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vital-modal-header">ECG</div>
            
            <div className="vital-modal-section">
              <label className="vital-modal-label required">Type</label>
              <div className="vital-modal-options-row">
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="ecgType" 
                    value="3 lead"
                    checked={ecgType === '3 lead'}
                    onChange={(e) => setEcgType(e.target.value)}
                  />
                  3 lead
                </label>
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="ecgType" 
                    value="12 lead"
                    checked={ecgType === '12 lead'}
                    onChange={(e) => setEcgType(e.target.value)}
                  />
                  12 lead
                </label>
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="ecgType" 
                    value="Pads"
                    checked={ecgType === 'Pads'}
                    onChange={(e) => setEcgType(e.target.value)}
                  />
                  Pads
                </label>
              </div>
            </div>

            <div className="vital-modal-section">
              <label className="vital-modal-label">ECG completed</label>
              <div className="vital-modal-options-row">
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="ecgCompleted" 
                    value="Done"
                    checked={ecgCompleted === 'Done'}
                    onChange={(e) => setEcgCompleted(e.target.value)}
                  />
                  Done
                </label>
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="ecgCompleted" 
                    value="Not done"
                    checked={ecgCompleted === 'Not done'}
                    onChange={(e) => setEcgCompleted(e.target.value)}
                  />
                  Not done
                </label>
                <label className="vital-modal-option">
                  <input 
                    type="radio" 
                    name="ecgCompleted" 
                    value="Other"
                    checked={ecgCompleted === 'Other'}
                    onChange={(e) => setEcgCompleted(e.target.value)}
                  />
                  Other
                </label>
              </div>
              {ecgCompleted === 'Other' && (
                <input 
                  type="text" 
                  value={ecgCompletedOther}
                  onChange={(e) => setEcgCompletedOther(e.target.value)}
                  className="text-input"
                  style={{ marginTop: '10px' }}
                  placeholder="Please specify..."
                />
              )}
            </div>

            <div className="vital-modal-section grayed-section">
              <label className="vital-modal-label">Monitor case ID</label>
              <input 
                type="text" 
                className="text-input"
                disabled
              />
            </div>

            <div className="vital-modal-row">
              <div className="vital-modal-section grayed-section" style={{ flex: 1 }}>
                <label className="vital-modal-label">Time transmitted</label>
                <input 
                  type="text" 
                  className="text-input"
                  disabled
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '8px' }}>
                <button className="now-btn grayed-disabled" disabled>Now</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '8px' }}>
                <label className="vital-modal-checkbox grayed-disabled">
                  <input type="checkbox" disabled />
                  Unable to transmit
                </label>
              </div>
            </div>

            <div className="vital-modal-section grayed-section">
              <label className="vital-modal-label required">Interpretation</label>
              <div className="vital-modal-interpretation-grid">
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  Sinus rhythm
                </label>
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  Sinus bradycardia
                </label>
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  Sinus tachycardia
                </label>
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  Supraventricular tachycardia (SVT)
                </label>
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  Atrial fibrillation
                </label>
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  Atrial flutter
                </label>
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  Junctional
                </label>
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  Ventricular fibrillation (VF)
                </label>
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  Ventricular tachycardia (VT)
                </label>
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  1st degree heart block
                </label>
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  2nd degree heart block; Mobitz type 1
                </label>
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  2nd degree heart block; Mobitz type 2
                </label>
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  Complete heart block
                </label>
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  Left bundle branch block (LBBB)
                </label>
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  Right bundle branch block (RBBB)
                </label>
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  Premature ventricular contractions (PVC)
                </label>
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  Premature atrial contractions (PAC)
                </label>
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  Premature junctional contractions (PJC)
                </label>
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  Asystole
                </label>
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  Unknown
                </label>
                <label className="vital-modal-option grayed-disabled">
                  <input type="radio" name="ecgInterpretation" disabled />
                  Other
                </label>
              </div>
            </div>

            <div className="vital-modal-section grayed-section">
              <label className="vital-modal-label">Other interpretation</label>
              <input 
                type="text" 
                className="text-input vital-notes-input"
                disabled
              />
            </div>

            <div className="vital-modal-section grayed-section">
              <label className="vital-modal-label">STEMI</label>
              <div className="vital-modal-checkboxes">
                <label className="vital-modal-checkbox grayed-disabled">
                  <input type="checkbox" disabled />
                  Anterior
                </label>
                <label className="vital-modal-checkbox grayed-disabled">
                  <input type="checkbox" disabled />
                  Inferior
                </label>
                <label className="vital-modal-checkbox grayed-disabled">
                  <input type="checkbox" disabled />
                  Lateral
                </label>
                <label className="vital-modal-checkbox grayed-disabled">
                  <input type="checkbox" disabled />
                  Posterior
                </label>
                <label className="vital-modal-checkbox grayed-disabled">
                  <input type="checkbox" disabled />
                  Septal
                </label>
              </div>
            </div>

            <div className="vital-modal-section">
              <label className="vital-modal-label">Not possible</label>
              <input 
                type="text" 
                value={ecgNotPossible}
                className="text-input vital-notes-input clickable-input"
                readOnly
                onClick={() => { setShowECGModal(false); setShowECGNotPossibleModal(true); }}
              />
            </div>

            <div className="vital-modal-actions">
              <button className="vital-modal-btn secondary" onClick={() => { setShowECGModal(false); setShowBPSpO2Modal(true); }}>&lt; BP+SpO2</button>
              <button className="vital-modal-btn secondary">Competency Tool</button>
              <button className="vital-modal-btn cancel" onClick={handleECGCancel}>Cancel</button>
              <button className="vital-modal-btn ok" onClick={handleECGOk}>OK</button>
              <button className="vital-modal-btn next" onClick={handleECGOkAndNext}>BGL+CR+Temp &gt;</button>
            </div>
          </div>
        </div>
      )}

      {showECGNotPossibleModal && (
        <div className="modal-overlay" onClick={() => setShowECGNotPossibleModal(false)}>
          <div className="not-possible-modal" onClick={(e) => e.stopPropagation()}>
            <div className="not-possible-header">Not possible</div>
            
            <div className="not-possible-options">
              <button 
                className={`not-possible-option ${ecgNotPossibleReason === 'Patient does not understand' ? 'selected' : ''}`}
                onClick={() => setEcgNotPossibleReason('Patient does not understand')}
              >
                Patient does not understand
              </button>
              <button 
                className={`not-possible-option ${ecgNotPossibleReason === 'Patient refused' ? 'selected' : ''}`}
                onClick={() => setEcgNotPossibleReason('Patient refused')}
              >
                Patient refused
              </button>
              <button 
                className={`not-possible-option ${ecgNotPossibleReason === 'Patient unconscious' ? 'selected' : ''}`}
                onClick={() => setEcgNotPossibleReason('Patient unconscious')}
              >
                Patient unconscious
              </button>
              <button 
                className={`not-possible-option ${ecgNotPossibleReason === 'Not indicated' ? 'selected' : ''}`}
                onClick={() => setEcgNotPossibleReason('Not indicated')}
              >
                Not indicated
              </button>
              <button 
                className={`not-possible-option ${ecgNotPossibleReason === 'Contraindicated' ? 'selected' : ''}`}
                onClick={() => setEcgNotPossibleReason('Contraindicated')}
              >
                Contraindicated
              </button>
              <button 
                className={`not-possible-option ${ecgNotPossibleReason === 'Equipment failure' ? 'selected' : ''}`}
                onClick={() => setEcgNotPossibleReason('Equipment failure')}
              >
                Equipment failure
              </button>
            </div>

            <div className="not-possible-actions">
              <button className="not-possible-btn ok" onClick={() => { setEcgNotPossible(ecgNotPossibleReason); setShowECGNotPossibleModal(false); setShowECGModal(true); }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* BGL + Cap Refill + Temperature Modal */}
      {showBGLModal && (
        <div className="modal-overlay" onClick={handleBGLCancel}>
          <div className="vital-detail-modal bp-spo2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vital-modal-header">Blood Glucose + Cap Refill + Temperature</div>
            
            <div className="vital-modal-section">
              <h3 className="vital-modal-section-title">Blood Glucose</h3>
              <div className="vital-modal-field-row">
                <label className="vital-modal-label">BGL (mmol/L)</label>
                <NumericInput 
                  className="vital-modal-input styled-input"
                  value={bglValue}
                  onChange={setBglValue}
                  placeholder="Enter value"
                  step={0.1}
                  min={0}
                  max={50}
                />
              </div>
              <div className="vital-modal-field-row">
                <label className="vital-modal-label">Not possible</label>
                <input 
                  type="text" 
                  className="vital-modal-input styled-input clickable"
                  value={bglNotPossibleReason}
                  readOnly
                  onClick={handleBGLNotPossibleClick}
                  placeholder="Select reason..."
                />
              </div>
            </div>

            <div className="vital-modal-divider"></div>

            <div className="vital-modal-section">
              <h3 className="vital-modal-section-title">Capillary Refill</h3>
              <div className="vital-modal-field-row">
                <label className="vital-modal-label">Time (seconds)</label>
                <NumericInput 
                  className="vital-modal-input styled-input"
                  value={capRefillValue}
                  onChange={setCapRefillValue}
                  placeholder="Enter value"
                  step={0.1}
                  min={0}
                  max={10}
                />
              </div>
              <div className="vital-modal-field-row">
                <label className="vital-modal-label">Not possible</label>
                <input 
                  type="text" 
                  className="vital-modal-input styled-input clickable"
                  value={capRefillNotPossibleReason}
                  readOnly
                  onClick={handleCapRefillNotPossibleClick}
                  placeholder="Select reason..."
                />
              </div>
            </div>

            <div className="vital-modal-divider"></div>

            <div className="vital-modal-section">
              <h3 className="vital-modal-section-title">Temperature</h3>
              <div className="vital-modal-field-row">
                <label className="vital-modal-label">Temp (°C)</label>
                <NumericInput 
                  className="vital-modal-input styled-input"
                  value={tempValue}
                  onChange={setTempValue}
                  placeholder="Enter value"
                  step={0.1}
                  min={30}
                  max={45}
                />
              </div>
              <div className="vital-modal-field-row">
                <label className="vital-modal-label">Not possible</label>
                <input 
                  type="text" 
                  className="vital-modal-input styled-input clickable"
                  value={tempNotPossibleReason}
                  readOnly
                  onClick={handleTempNotPossibleClick}
                  placeholder="Select reason..."
                />
              </div>
            </div>

            <div className="vital-modal-actions">
              <button className="vital-modal-btn secondary" onClick={() => { setShowBGLModal(false); setShowECGModal(true); }}>{'< ECG'}</button>
              <button className="vital-modal-btn secondary">Competency Tool</button>
              <button className="vital-modal-btn cancel" onClick={handleBGLCancel}>Cancel</button>
              <button className="vital-modal-btn ok" onClick={handleBGLOk}>OK</button>
              <button className="vital-modal-btn next" onClick={handleBGLOkAndNext}>Pain Score {'>'}</button>
            </div>
          </div>
        </div>
      )}

      {/* BGL Not Possible Modal */}
      {showBGLNotPossibleModal && (
        <div className="modal-overlay" onClick={() => setShowBGLNotPossibleModal(false)}>
          <div className="not-possible-modal" onClick={(e) => e.stopPropagation()}>
            <div className="not-possible-header">BGL not possible</div>
            
            <div className="not-possible-options">
              <button 
                className={`not-possible-option ${bglNotPossibleReason === 'Patient does not understand' ? 'selected' : ''}`}
                onClick={() => setBglNotPossibleReason('Patient does not understand')}
              >
                Patient does not understand
              </button>
              <button 
                className={`not-possible-option ${bglNotPossibleReason === 'Patient refused' ? 'selected' : ''}`}
                onClick={() => setBglNotPossibleReason('Patient refused')}
              >
                Patient refused
              </button>
              <button 
                className={`not-possible-option ${bglNotPossibleReason === 'Patient unconscious' ? 'selected' : ''}`}
                onClick={() => setBglNotPossibleReason('Patient unconscious')}
              >
                Patient unconscious
              </button>
              <button 
                className={`not-possible-option ${bglNotPossibleReason === 'Not indicated' ? 'selected' : ''}`}
                onClick={() => setBglNotPossibleReason('Not indicated')}
              >
                Not indicated
              </button>
              <button 
                className={`not-possible-option ${bglNotPossibleReason === 'Contraindicated' ? 'selected' : ''}`}
                onClick={() => setBglNotPossibleReason('Contraindicated')}
              >
                Contraindicated
              </button>
              <button 
                className={`not-possible-option ${bglNotPossibleReason === 'Equipment failure' ? 'selected' : ''}`}
                onClick={() => setBglNotPossibleReason('Equipment failure')}
              >
                Equipment failure
              </button>
            </div>

            <div className="not-possible-actions">
              <button className="not-possible-btn ok" onClick={() => { setBglNotPossible(bglNotPossibleReason); setShowBGLNotPossibleModal(false); setShowBGLModal(true); }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Cap Refill Not Possible Modal */}
      {showCapRefillNotPossibleModal && (
        <div className="modal-overlay" onClick={() => setShowCapRefillNotPossibleModal(false)}>
          <div className="not-possible-modal" onClick={(e) => e.stopPropagation()}>
            <div className="not-possible-header">Cap Refill not possible</div>
            
            <div className="not-possible-options">
              <button 
                className={`not-possible-option ${capRefillNotPossibleReason === 'Patient does not understand' ? 'selected' : ''}`}
                onClick={() => setCapRefillNotPossibleReason('Patient does not understand')}
              >
                Patient does not understand
              </button>
              <button 
                className={`not-possible-option ${capRefillNotPossibleReason === 'Patient refused' ? 'selected' : ''}`}
                onClick={() => setCapRefillNotPossibleReason('Patient refused')}
              >
                Patient refused
              </button>
              <button 
                className={`not-possible-option ${capRefillNotPossibleReason === 'Patient unconscious' ? 'selected' : ''}`}
                onClick={() => setCapRefillNotPossibleReason('Patient unconscious')}
              >
                Patient unconscious
              </button>
              <button 
                className={`not-possible-option ${capRefillNotPossibleReason === 'Not indicated' ? 'selected' : ''}`}
                onClick={() => setCapRefillNotPossibleReason('Not indicated')}
              >
                Not indicated
              </button>
              <button 
                className={`not-possible-option ${capRefillNotPossibleReason === 'Contraindicated' ? 'selected' : ''}`}
                onClick={() => setCapRefillNotPossibleReason('Contraindicated')}
              >
                Contraindicated
              </button>
              <button 
                className={`not-possible-option ${capRefillNotPossibleReason === 'Equipment failure' ? 'selected' : ''}`}
                onClick={() => setCapRefillNotPossibleReason('Equipment failure')}
              >
                Equipment failure
              </button>
            </div>

            <div className="not-possible-actions">
              <button className="not-possible-btn ok" onClick={() => { setCapRefillNotPossible(capRefillNotPossibleReason); setShowCapRefillNotPossibleModal(false); setShowBGLModal(true); }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Temperature Not Possible Modal */}
      {showTempNotPossibleModal && (
        <div className="modal-overlay" onClick={() => setShowTempNotPossibleModal(false)}>
          <div className="not-possible-modal" onClick={(e) => e.stopPropagation()}>
            <div className="not-possible-header">Temperature not possible</div>
            
            <div className="not-possible-options">
              <button 
                className={`not-possible-option ${tempNotPossibleReason === 'Patient does not understand' ? 'selected' : ''}`}
                onClick={() => setTempNotPossibleReason('Patient does not understand')}
              >
                Patient does not understand
              </button>
              <button 
                className={`not-possible-option ${tempNotPossibleReason === 'Patient refused' ? 'selected' : ''}`}
                onClick={() => setTempNotPossibleReason('Patient refused')}
              >
                Patient refused
              </button>
              <button 
                className={`not-possible-option ${tempNotPossibleReason === 'Patient unconscious' ? 'selected' : ''}`}
                onClick={() => setTempNotPossibleReason('Patient unconscious')}
              >
                Patient unconscious
              </button>
              <button 
                className={`not-possible-option ${tempNotPossibleReason === 'Not indicated' ? 'selected' : ''}`}
                onClick={() => setTempNotPossibleReason('Not indicated')}
              >
                Not indicated
              </button>
              <button 
                className={`not-possible-option ${tempNotPossibleReason === 'Contraindicated' ? 'selected' : ''}`}
                onClick={() => setTempNotPossibleReason('Contraindicated')}
              >
                Contraindicated
              </button>
              <button 
                className={`not-possible-option ${tempNotPossibleReason === 'Equipment failure' ? 'selected' : ''}`}
                onClick={() => setTempNotPossibleReason('Equipment failure')}
              >
                Equipment failure
              </button>
            </div>

            <div className="not-possible-actions">
              <button className="not-possible-btn ok" onClick={() => { setTempNotPossible(tempNotPossibleReason); setShowTempNotPossibleModal(false); setShowBGLModal(true); }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Pain Score Modal */}
      {showPainScoreModal && (
        <div className="modal-overlay" onClick={handlePainScoreCancel}>
          <div className="vital-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vital-modal-header">Pain Score</div>
            
            <div className="vital-modal-section">
              <div className="vital-modal-row" style={{ justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <div 
                    key={score}
                    onClick={() => setPainScoreValue(score.toString())}
                    style={{
                      cursor: 'pointer',
                      textAlign: 'center',
                      padding: '10px',
                      border: painScoreValue === score.toString() ? '3px solid #4a90e2' : '2px solid #ccc',
                      borderRadius: '8px',
                      backgroundColor: painScoreValue === score.toString() ? '#e6f2ff' : '#fff',
                      minWidth: '70px'
                    }}
                  >
                    <div style={{ fontSize: '32px' }}>
                      {score === 0 ? '😊' : score <= 2 ? '🙂' : score <= 4 ? '😐' : score <= 6 ? '😟' : score <= 8 ? '😢' : '😭'}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '5px' }}>{score}</div>
                  </div>
                ))}
              </div>

              <div className="vital-modal-row" style={{ marginTop: '20px' }}>
                <label className="vital-modal-label">Not possible</label>
                <input 
                  type="text" 
                  className="vital-modal-input vital-box"
                  value={painScoreNotPossibleReason}
                  readOnly
                  onClick={handlePainScoreNotPossibleClick}
                  placeholder="Select reason"
                  style={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', boxShadow: 'none', padding: '8px 12px', minWidth: '80px', textAlign: 'center', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div className="vital-modal-actions">
              <button className="vital-modal-btn secondary" onClick={() => { setShowPainScoreModal(false); setShowBGLModal(true); }}>{'< BGL+CR+Temp'}</button>
              <button className="vital-modal-btn secondary">Competency Tool</button>
              <button className="vital-modal-btn cancel" onClick={handlePainScoreCancel}>Cancel</button>
              <button className="vital-modal-btn ok" onClick={handlePainScoreOk}>OK</button>
              <button className="vital-modal-btn next" onClick={handlePainScoreOkAndNext}>Pupils {'>'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Pain Score Not Possible Modal */}
      {showPainScoreNotPossibleModal && (
        <div className="modal-overlay" onClick={() => setShowPainScoreNotPossibleModal(false)}>
          <div className="not-possible-modal" onClick={(e) => e.stopPropagation()}>
            <div className="not-possible-header">Pain Score not possible</div>
            
            <div className="not-possible-options">
              <button 
                className={`not-possible-option ${painScoreNotPossibleReason === 'Patient does not understand' ? 'selected' : ''}`}
                onClick={() => setPainScoreNotPossibleReason('Patient does not understand')}
              >
                Patient does not understand
              </button>
              <button 
                className={`not-possible-option ${painScoreNotPossibleReason === 'Patient refused' ? 'selected' : ''}`}
                onClick={() => setPainScoreNotPossibleReason('Patient refused')}
              >
                Patient refused
              </button>
              <button 
                className={`not-possible-option ${painScoreNotPossibleReason === 'Patient unconscious' ? 'selected' : ''}`}
                onClick={() => setPainScoreNotPossibleReason('Patient unconscious')}
              >
                Patient unconscious
              </button>
              <button 
                className={`not-possible-option ${painScoreNotPossibleReason === 'Not indicated' ? 'selected' : ''}`}
                onClick={() => setPainScoreNotPossibleReason('Not indicated')}
              >
                Not indicated
              </button>
              <button 
                className={`not-possible-option ${painScoreNotPossibleReason === 'Contraindicated' ? 'selected' : ''}`}
                onClick={() => setPainScoreNotPossibleReason('Contraindicated')}
              >
                Contraindicated
              </button>
              <button 
                className={`not-possible-option ${painScoreNotPossibleReason === 'Equipment failure' ? 'selected' : ''}`}
                onClick={() => setPainScoreNotPossibleReason('Equipment failure')}
              >
                Equipment failure
              </button>
            </div>

            <div className="not-possible-actions">
              <button className="not-possible-btn ok" onClick={() => { setPainScoreNotPossible(painScoreNotPossibleReason); setShowPainScoreNotPossibleModal(false); setShowPainScoreModal(true); }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Pupils Modal */}
      {showPupilsModal && (
        <div className="modal-overlay" onClick={handlePupilsCancel}>
          <div className="vital-detail-modal pupils-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vital-modal-header">Pupils</div>
            
            <div className="vital-modal-section">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                {/* Left Eye */}
                <div>
                  <h3 style={{ marginBottom: '15px', color: '#2c5282', textAlign: 'center' }}>Left Eye</h3>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '12px', color: '#333' }}>Size (mm)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '6px' }}>
                      {[9, 8, 7, 6, 5].map((size) => (
                        <div
                          key={size}
                          onClick={() => setPupilSizeLeft(size.toString())}
                          className="pupil-size-option"
                          style={{
                            cursor: 'pointer',
                            padding: '8px 4px',
                            border: pupilSizeLeft === size.toString() ? '3px solid #4a90e2' : '2px solid #ccc',
                            borderRadius: '8px',
                            backgroundColor: pupilSizeLeft === size.toString() ? '#e6f2ff' : '#fff',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, #4a7c59 0%, #6b9b4f 40%, #8fb573 70%, #a8c896 100%)',
                            border: '2px solid #333',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <div style={{
                              width: `${size * 3}px`,
                              height: `${size * 3}px`,
                              borderRadius: '50%',
                              background: '#000'
                            }}></div>
                          </div>
                          <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#333' }}>{size}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                      {[4, 3, 2, 1, 0].map((size) => (
                        <div
                          key={size}
                          onClick={() => setPupilSizeLeft(size.toString())}
                          className="pupil-size-option"
                          style={{
                            cursor: 'pointer',
                            padding: '8px 4px',
                            border: pupilSizeLeft === size.toString() ? '3px solid #4a90e2' : '2px solid #ccc',
                            borderRadius: '8px',
                            backgroundColor: pupilSizeLeft === size.toString() ? '#e6f2ff' : '#fff',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, #4a7c59 0%, #6b9b4f 40%, #8fb573 70%, #a8c896 100%)',
                            border: '2px solid #333',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {size > 0 && (
                              <div style={{
                                width: `${size * 3}px`,
                                height: `${size * 3}px`,
                                borderRadius: '50%',
                                background: '#000'
                              }}></div>
                            )}
                          </div>
                          <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#333' }}>{size}</span>
                        </div>
                      ))}
                    </div>
                    <div 
                      onClick={() => setPupilSizeLeft('Prosthetic')}
                      style={{
                        cursor: 'pointer',
                        padding: '10px',
                        marginTop: '6px',
                        border: pupilSizeLeft === 'Prosthetic' ? '3px solid #4a90e2' : '2px solid #ccc',
                        borderRadius: '8px',
                        backgroundColor: pupilSizeLeft === 'Prosthetic' ? '#e6f2ff' : '#fff',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        color: '#333'
                      }}
                    >
                      Prosthetic
                    </div>
                  </div>
                  <div>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#333' }}>Reacts to light</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {['Yes', 'No'].map((react) => (
                        <div
                          key={react}
                          onClick={() => setPupilReactsLeft(react)}
                          style={{
                            cursor: 'pointer',
                            padding: '12px',
                            border: pupilReactsLeft === react ? '3px solid #4a90e2' : '2px solid #ccc',
                            borderRadius: '8px',
                            backgroundColor: pupilReactsLeft === react ? '#e6f2ff' : '#fff',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            color: '#333'
                          }}
                        >
                          {react}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Eye */}
                <div>
                  <h3 style={{ marginBottom: '15px', color: '#2c5282', textAlign: 'center' }}>Right Eye</h3>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '12px', color: '#333' }}>Size (mm)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '6px' }}>
                      {[9, 8, 7, 6, 5].map((size) => (
                        <div
                          key={size}
                          onClick={() => setPupilSizeRight(size.toString())}
                          className="pupil-size-option"
                          style={{
                            cursor: 'pointer',
                            padding: '8px 4px',
                            border: pupilSizeRight === size.toString() ? '3px solid #4a90e2' : '2px solid #ccc',
                            borderRadius: '8px',
                            backgroundColor: pupilSizeRight === size.toString() ? '#e6f2ff' : '#fff',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, #4a7c59 0%, #6b9b4f 40%, #8fb573 70%, #a8c896 100%)',
                            border: '2px solid #333',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <div style={{
                              width: `${size * 3}px`,
                              height: `${size * 3}px`,
                              borderRadius: '50%',
                              background: '#000'
                            }}></div>
                          </div>
                          <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#333' }}>{size}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                      {[4, 3, 2, 1, 0].map((size) => (
                        <div
                          key={size}
                          onClick={() => setPupilSizeRight(size.toString())}
                          className="pupil-size-option"
                          style={{
                            cursor: 'pointer',
                            padding: '8px 4px',
                            border: pupilSizeRight === size.toString() ? '3px solid #4a90e2' : '2px solid #ccc',
                            borderRadius: '8px',
                            backgroundColor: pupilSizeRight === size.toString() ? '#e6f2ff' : '#fff',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, #4a7c59 0%, #6b9b4f 40%, #8fb573 70%, #a8c896 100%)',
                            border: '2px solid #333',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {size > 0 && (
                              <div style={{
                                width: `${size * 3}px`,
                                height: `${size * 3}px`,
                                borderRadius: '50%',
                                background: '#000'
                              }}></div>
                            )}
                          </div>
                          <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#333' }}>{size}</span>
                        </div>
                      ))}
                    </div>
                    <div 
                      onClick={() => setPupilSizeRight('Prosthetic')}
                      style={{
                        cursor: 'pointer',
                        padding: '10px',
                        marginTop: '6px',
                        border: pupilSizeRight === 'Prosthetic' ? '3px solid #4a90e2' : '2px solid #ccc',
                        borderRadius: '8px',
                        backgroundColor: pupilSizeRight === 'Prosthetic' ? '#e6f2ff' : '#fff',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        color: '#333'
                      }}
                    >
                      Prosthetic
                    </div>
                  </div>
                  <div>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#333' }}>Reacts to light</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {['Yes', 'No'].map((react) => (
                        <div
                          key={react}
                          onClick={() => setPupilReactsRight(react)}
                          style={{
                            cursor: 'pointer',
                            padding: '12px',
                            border: pupilReactsRight === react ? '3px solid #4a90e2' : '2px solid #ccc',
                            borderRadius: '8px',
                            backgroundColor: pupilReactsRight === react ? '#e6f2ff' : '#fff',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            color: '#333'
                          }}
                        >
                          {react}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="vital-modal-actions">
              <button className="vital-modal-btn secondary" onClick={() => { setShowPupilsModal(false); setShowPainScoreModal(true); }}>{'< Pain'}</button>
              <button className="vital-modal-btn secondary">Competency Tool</button>
              <button className="vital-modal-btn cancel" onClick={handlePupilsCancel}>Cancel</button>
              <button className="vital-modal-btn ok" onClick={handlePupilsOk}>OK</button>
              <button className="vital-modal-btn next" onClick={handlePupilsOkAndNext}>ETCO2+Skin {'>'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ETCO2 + Skin Modal */}
      {showETCO2SkinModal && (
        <div className="modal-overlay" onClick={handleETCO2SkinCancel}>
          <div className="vital-detail-modal bp-spo2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vital-modal-header">ETCO2 + Skin</div>
            
            <div className="vital-modal-section grayed-section">
              <div className="vital-modal-row">
                <label className="vital-modal-label">ETCO2 (mmHg)</label>
                <input 
                  type="number" 
                  className="vital-modal-input"
                  disabled
                  placeholder="Not available"
                />
              </div>
            </div>

            <div className="vital-modal-divider"></div>

            <div className="vital-modal-section">
              <div className="vital-modal-row">
                <label className="vital-modal-label">Skin Colour</label>
                <div className="vital-modal-checkboxes" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {['Normal', 'Pallor', 'Diaphoretic', 'Flushed', 'Cyanosed', 'Mottled'].map((color) => (
                    <label key={color} className="vital-modal-checkbox">
                      <input
                        type="radio"
                        name="skinColor"
                        checked={skinColor === color}
                        onChange={() => setSkinColor(color)}
                      />
                      <span>{color}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="vital-modal-row" style={{ marginTop: '15px' }}>
                <label className="vital-modal-label">Not possible</label>
                <input 
                  type="text" 
                  className="vital-modal-input vital-box"
                  value={skinNotPossibleReason}
                  readOnly
                  onClick={handleSkinNotPossibleClick}
                  placeholder="Select reason"
                  style={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', boxShadow: 'none', padding: '8px 12px', minWidth: '80px', textAlign: 'center', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div className="vital-modal-actions">
              <button className="vital-modal-btn secondary" onClick={() => { setShowETCO2SkinModal(false); setShowPupilsModal(true); }}>{'< Pupils'}</button>
              <button className="vital-modal-btn secondary">Competency Tool</button>
              <button className="vital-modal-btn cancel" onClick={handleETCO2SkinCancel}>Cancel</button>
              <button className="vital-modal-btn ok" onClick={handleETCO2SkinOk}>OK</button>
              <button className="vital-modal-btn next" onClick={() => { setShowETCO2SkinModal(false); setShowNotesModal(true); }}>Notes {'>'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Skin Not Possible Modal */}
      {showSkinNotPossibleModal && (
        <div className="modal-overlay" onClick={() => setShowSkinNotPossibleModal(false)}>
          <div className="not-possible-modal" onClick={(e) => e.stopPropagation()}>
            <div className="not-possible-header">Skin not possible</div>
            
            <div className="not-possible-options">
              <button 
                className={`not-possible-option ${skinNotPossibleReason === 'Patient does not understand' ? 'selected' : ''}`}
                onClick={() => setSkinNotPossibleReason('Patient does not understand')}
              >
                Patient does not understand
              </button>
              <button 
                className={`not-possible-option ${skinNotPossibleReason === 'Patient refused' ? 'selected' : ''}`}
                onClick={() => setSkinNotPossibleReason('Patient refused')}
              >
                Patient refused
              </button>
              <button 
                className={`not-possible-option ${skinNotPossibleReason === 'Patient unconscious' ? 'selected' : ''}`}
                onClick={() => setSkinNotPossibleReason('Patient unconscious')}
              >
                Patient unconscious
              </button>
              <button 
                className={`not-possible-option ${skinNotPossibleReason === 'Not indicated' ? 'selected' : ''}`}
                onClick={() => setSkinNotPossibleReason('Not indicated')}
              >
                Not indicated
              </button>
              <button 
                className={`not-possible-option ${skinNotPossibleReason === 'Contraindicated' ? 'selected' : ''}`}
                onClick={() => setSkinNotPossibleReason('Contraindicated')}
              >
                Contraindicated
              </button>
              <button 
                className={`not-possible-option ${skinNotPossibleReason === 'Equipment failure' ? 'selected' : ''}`}
                onClick={() => setSkinNotPossibleReason('Equipment failure')}
              >
                Equipment failure
              </button>
            </div>

            <div className="not-possible-actions">
              <button className="not-possible-btn ok" onClick={() => { setSkinNotPossible(skinNotPossibleReason); setShowSkinNotPossibleModal(false); setShowETCO2SkinModal(true); }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="modal-overlay" onClick={handleNotesCancel}>
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
              <button className="vital-modal-btn secondary" onClick={() => { setShowNotesModal(false); setShowETCO2SkinModal(true); }}>{'< ETCO2+Skin'}</button>
              <button className="vital-modal-btn secondary">Competency Tool</button>
              <button className="vital-modal-btn cancel" onClick={handleNotesCancel}>Cancel</button>
              <button className="vital-modal-btn ok" onClick={handleNotesOk}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Notes View Modal (read-only) */}
      {showNotesViewModal && (
        <div className="modal-overlay" onClick={() => setShowNotesViewModal(false)}>
          <div className="vital-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vital-modal-header">Notes</div>
            
            <div className="vital-modal-section">
              <div style={{
                width: '100%',
                minHeight: '200px',
                padding: '12px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: '#f7f7f7',
                whiteSpace: 'pre-wrap',
                color: '#4a5568'
              }}>
                {viewingNotes || 'No notes recorded'}
              </div>
            </div>

            <div className="vital-modal-actions" style={{ justifyContent: 'center' }}>
              <button className="vital-modal-btn ok" onClick={() => setShowNotesViewModal(false)}>Go Back</button>
            </div>
          </div>
        </div>
      )}

      {/* Vitals View Modal (read-only) */}
      {showVitalViewModal && viewingRecord && (
        <div className="modal-overlay" onClick={() => { setShowVitalViewModal(false); setViewingRecord(null); }}>
          <div className="vital-detail-modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: '500px', maxWidth: '700px' }}>
            <div className="vital-modal-header">Vitals Record</div>
            <div className="vital-modal-section">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Time</div>
                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.time || 'Not recorded'}</div>
                </div>
                {viewingRecord.gcs && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>GCS</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.gcs}</div>
                    {viewingRecord.gcsEye && <div style={{ fontSize: '12px', color: '#4a5568' }}>Eye: {viewingRecord.gcsEye}</div>}
                    {viewingRecord.gcsVerbal && <div style={{ fontSize: '12px', color: '#4a5568' }}>Verbal: {viewingRecord.gcsVerbal}</div>}
                    {viewingRecord.gcsMotor && <div style={{ fontSize: '12px', color: '#4a5568' }}>Motor: {viewingRecord.gcsMotor}</div>}
                  </div>
                )}
                {viewingRecord.heartRate && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Heart Rate</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.heartRate}</div>
                    {viewingRecord.hrLocation && <div style={{ fontSize: '12px', color: '#4a5568' }}>Location: {viewingRecord.hrLocation}</div>}
                    {viewingRecord.hrStrength && <div style={{ fontSize: '12px', color: '#4a5568' }}>Strength: {viewingRecord.hrStrength}</div>}
                    {viewingRecord.hrRegularity && <div style={{ fontSize: '12px', color: '#4a5568' }}>Regularity: {viewingRecord.hrRegularity}</div>}
                    {viewingRecord.hrNotes && <div style={{ fontSize: '12px', color: '#4a5568' }}>Notes: {viewingRecord.hrNotes}</div>}
                  </div>
                )}
                {viewingRecord.respiratoryRate && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Respiratory Rate</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.respiratoryRate}</div>
                  </div>
                )}
                {viewingRecord.bloodPressure && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Blood Pressure</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.bloodPressure}</div>
                    {viewingRecord.bpMethod && <div style={{ fontSize: '12px', color: '#4a5568' }}>Method: {viewingRecord.bpMethod}</div>}
                    {viewingRecord.bpPosition && <div style={{ fontSize: '12px', color: '#4a5568' }}>Position: {viewingRecord.bpPosition}</div>}
                  </div>
                )}
                {viewingRecord.spo2 && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>SpO2</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.spo2}</div>
                    {viewingRecord.spO2Conditions && <div style={{ fontSize: '12px', color: '#4a5568' }}>Conditions: {viewingRecord.spO2Conditions}</div>}
                  </div>
                )}
                {viewingRecord.ecg && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>ECG</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.ecg}</div>
                  </div>
                )}
                {viewingRecord.bloodGlucose && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Blood Glucose</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.bloodGlucose}</div>
                  </div>
                )}
                {viewingRecord.capRefill && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Cap Refill</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.capRefill}</div>
                  </div>
                )}
                {viewingRecord.temperature && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Temperature</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.temperature}</div>
                  </div>
                )}
                {viewingRecord.painScore && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Pain Score</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.painScore}</div>
                    {viewingRecord.painScoreValue && <div style={{ fontSize: '12px', color: '#4a5568' }}>Value: {viewingRecord.painScoreValue}</div>}
                  </div>
                )}
                {viewingRecord.pupils && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Pupils</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.pupils}</div>
                    {viewingRecord.pupilSizeLeft && <div style={{ fontSize: '12px', color: '#4a5568' }}>Left Size: {viewingRecord.pupilSizeLeft}</div>}
                    {viewingRecord.pupilSizeRight && <div style={{ fontSize: '12px', color: '#4a5568' }}>Right Size: {viewingRecord.pupilSizeRight}</div>}
                    {viewingRecord.pupilReactsLeft && <div style={{ fontSize: '12px', color: '#4a5568' }}>Left Reacts: {viewingRecord.pupilReactsLeft}</div>}
                    {viewingRecord.pupilReactsRight && <div style={{ fontSize: '12px', color: '#4a5568' }}>Right Reacts: {viewingRecord.pupilReactsRight}</div>}
                  </div>
                )}
                {viewingRecord.etco2 && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>ETCO2</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.etco2}</div>
                  </div>
                )}
                {viewingRecord.skin && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Skin</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.skin}</div>
                    {viewingRecord.skinColor && <div style={{ fontSize: '12px', color: '#4a5568' }}>Colour: {viewingRecord.skinColor}</div>}
                  </div>
                )}
                {viewingRecord.pefr && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>PEFR</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.pefr}</div>
                  </div>
                )}
              </div>
              {viewingRecord.notesContent && (
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Notes</div>
                  <div style={{ fontSize: '14px', color: '#4a5568', whiteSpace: 'pre-wrap' }}>{viewingRecord.notesContent}</div>
                </div>
              )}
            </div>
            <div className="vital-modal-actions" style={{ justifyContent: 'center' }}>
              <button className="vital-modal-btn ok" onClick={() => { setShowVitalViewModal(false); setViewingRecord(null); }}>Go Back</button>
            </div>
          </div>
        </div>
      )}

      {/* Medication View Modal (read-only) */}
      {showMedViewModal && viewingRecord && (
        <div className="modal-overlay" onClick={() => { setShowMedViewModal(false); setViewingRecord(null); }}>
          <div className="vital-detail-modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: '500px', maxWidth: '700px' }}>
            <div className="vital-modal-header">Medication Record</div>
            
            <div className="vital-modal-section">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Time</div>
                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.time || viewingRecord.timestamp || 'Not recorded'}</div>
                </div>
                {(viewingRecord.administeredBy || viewingRecord.givenBy) && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Administered By</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.administeredBy || viewingRecord.givenBy}</div>
                  </div>
                )}
                {viewingRecord.medication && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc', gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Medication</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.medication}</div>
                  </div>
                )}
                {viewingRecord.prn && (
                  <div style={{ padding: '10px', backgroundColor: '#e6f7e6', borderRadius: '4px', border: '1px solid #9ae6b4' }}>
                    <div style={{ fontSize: '11px', color: '#276749', fontWeight: 'bold', marginBottom: '4px' }}>PRN</div>
                    <div style={{ fontSize: '14px', color: '#276749' }}>Yes</div>
                  </div>
                )}
                {viewingRecord.dose && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Dose</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.dose} {viewingRecord.unit || ''}</div>
                  </div>
                )}
                {viewingRecord.route && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Route</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.route}</div>
                  </div>
                )}
              </div>
              {viewingRecord.notes && (
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Notes</div>
                  <div style={{ fontSize: '14px', color: '#4a5568', whiteSpace: 'pre-wrap' }}>{viewingRecord.notes}</div>
                </div>
              )}
              {/* Status flags */}
              {(viewingRecord.drawnUpNotUsed || viewingRecord.brokenAmpoule || viewingRecord.discarded || viewingRecord.notPossible || viewingRecord.notPossibleReason) && (
                <div style={{ marginTop: '15px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {viewingRecord.drawnUpNotUsed && (
                    <span style={{ padding: '5px 10px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>Drawn up not used</span>
                  )}
                  {viewingRecord.brokenAmpoule && (
                    <span style={{ padding: '5px 10px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>Broken ampoule</span>
                  )}
                  {viewingRecord.discarded && (
                    <span style={{ padding: '5px 10px', backgroundColor: '#fecaca', color: '#dc2626', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>Discarded</span>
                  )}
                  {(viewingRecord.notPossible || viewingRecord.notPossibleReason) && (
                    <span style={{ padding: '5px 10px', backgroundColor: '#e5e7eb', color: '#374151', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>Not possible: {viewingRecord.notPossibleReason || viewingRecord.notPossible}</span>
                  )}
                </div>
              )}
            </div>

            <div className="vital-modal-actions" style={{ justifyContent: 'center' }}>
              <button className="vital-modal-btn ok" onClick={() => { setShowMedViewModal(false); setViewingRecord(null); }}>Go Back</button>
            </div>
          </div>
        </div>
      )}

      {/* Intervention View Modal (read-only) */}
      {showInterventionViewModal && viewingRecord && (
        <div className="modal-overlay" onClick={() => { setShowInterventionViewModal(false); setViewingRecord(null); }}>
          <div className="vital-detail-modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: '600px', maxWidth: '800px', maxHeight: '85vh', overflow: 'auto' }}>
            <div className="vital-modal-header">Intervention Record</div>
            
            <div className="vital-modal-section">
              {/* Time and Performed By */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Time</div>
                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.time || viewingRecord.timestamp || 'Not recorded'}</div>
                </div>
                {viewingRecord.performedBy && (
                  <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Performed By</div>
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.performedBy}</div>
                  </div>
                )}
              </div>

              {/* Airway Section */}
              {(viewingRecord.airway || viewingRecord.ventilation || viewingRecord.peep || viewingRecord.cpap || viewingRecord.rsi) && (
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontWeight: 'bold', color: '#2c5282', marginBottom: '10px', borderBottom: '2px solid #4a90e2', paddingBottom: '5px' }}>Airway</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                    {viewingRecord.airway && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>Airway</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.airway}</div>
                      </div>
                    )}
                    {viewingRecord.ventilation && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>Ventilation</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.ventilation}</div>
                      </div>
                    )}
                    {viewingRecord.peep && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>PEEP</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.peep}</div>
                      </div>
                    )}
                    {viewingRecord.cpap && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>CPAP</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.cpap}</div>
                      </div>
                    )}
                    {viewingRecord.rsi && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>RSI</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.rsi}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Cardiac Section */}
              {(viewingRecord.cpr || viewingRecord.defibrillation || viewingRecord.cardioversion || viewingRecord.pacing || viewingRecord.valsalva) && (
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontWeight: 'bold', color: '#2c5282', marginBottom: '10px', borderBottom: '2px solid #4a90e2', paddingBottom: '5px' }}>Cardiac</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                    {viewingRecord.cpr && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>CPR</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.cpr}</div>
                      </div>
                    )}
                    {viewingRecord.defibrillation && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>Defibrillation</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.defibrillation}J</div>
                      </div>
                    )}
                    {viewingRecord.cardioversion && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>Cardioversion</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.cardioversion}J</div>
                      </div>
                    )}
                    {viewingRecord.pacing && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>Pacing</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.pacing}</div>
                      </div>
                    )}
                    {viewingRecord.valsalva && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>Valsalva</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.valsalva}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Invasive Section */}
              {(viewingRecord.ivCannulation || viewingRecord.ioAccess || viewingRecord.chestDecompression || viewingRecord.stomachDecompression || viewingRecord.catheterTroubleshooting || viewingRecord.nerveBlock) && (
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontWeight: 'bold', color: '#2c5282', marginBottom: '10px', borderBottom: '2px solid #4a90e2', paddingBottom: '5px' }}>Invasive</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {viewingRecord.ivCannulation && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>IV Cannulation</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.ivCannulation}</div>
                      </div>
                    )}
                    {viewingRecord.ioAccess && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>IO Access</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.ioAccess}</div>
                      </div>
                    )}
                    {viewingRecord.chestDecompression && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>Chest Decompression</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.chestDecompression}</div>
                      </div>
                    )}
                    {viewingRecord.stomachDecompression && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>Stomach Decompression</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.stomachDecompression}</div>
                      </div>
                    )}
                    {viewingRecord.catheterTroubleshooting && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>Catheter Troubleshooting</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.catheterTroubleshooting}</div>
                      </div>
                    )}
                    {viewingRecord.nerveBlock && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>Nerve Block</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.nerveBlock}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Other Section */}
              {(viewingRecord.positioning || viewingRecord.splintDressingTag || viewingRecord.nasalTamponade || viewingRecord.tourniquet || viewingRecord.limbReduction || viewingRecord.epleyManoeuvre || viewingRecord.otherInterventionNotes) && (
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontWeight: 'bold', color: '#2c5282', marginBottom: '10px', borderBottom: '2px solid #4a90e2', paddingBottom: '5px' }}>Other</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {viewingRecord.positioning && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>Positioning</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.positioning}</div>
                      </div>
                    )}
                    {viewingRecord.splintDressingTag && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>Splint/Dressing/Tag</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.splintDressingTag}</div>
                      </div>
                    )}
                    {viewingRecord.nasalTamponade && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>Nasal Tamponade</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.nasalTamponade}</div>
                      </div>
                    )}
                    {viewingRecord.tourniquet && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>Tourniquet</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.tourniquet}</div>
                      </div>
                    )}
                    {viewingRecord.limbReduction && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>Limb Reduction</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.limbReduction}</div>
                      </div>
                    )}
                    {viewingRecord.epleyManoeuvre && (
                      <div style={{ padding: '8px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold' }}>Epley Manoeuvre</div>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{viewingRecord.epleyManoeuvre}</div>
                      </div>
                    )}
                  </div>
                  {viewingRecord.otherInterventionNotes && (
                    <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                      <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Other Notes</div>
                      <div style={{ fontSize: '13px', color: '#4a5568', whiteSpace: 'pre-wrap' }}>{viewingRecord.otherInterventionNotes}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="vital-modal-actions" style={{ justifyContent: 'center' }}>
              <button className="vital-modal-btn ok" onClick={() => { setShowInterventionViewModal(false); setViewingRecord(null); }}>Go Back</button>
            </div>
          </div>
        </div>
      )}

      {/* Competency View Modal (read-only) */}
      {showCompetencyViewModal && viewingRecord && (
        <div className="modal-overlay" onClick={() => { setShowCompetencyViewModal(false); setViewingRecord(null); }}>
          <div className="vital-detail-modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: '450px', maxWidth: '600px' }}>
            <div className="vital-modal-header">Competency Record</div>
            
            <div className="vital-modal-section">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Time</div>
                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{viewingRecord.time || viewingRecord.timestamp || 'Not recorded'}</div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Understand Info?</div>
                  <div style={{ fontSize: '14px', color: viewingRecord.understandInfo === 'yes' ? '#38a169' : '#e53e3e' }}>{viewingRecord.understandInfo === 'yes' ? 'Yes' : 'No'}</div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Understand Consequences?</div>
                  <div style={{ fontSize: '14px', color: viewingRecord.understandConsequences === 'yes' ? '#38a169' : '#e53e3e' }}>{viewingRecord.understandConsequences === 'yes' ? 'Yes' : 'No'}</div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Remember Info?</div>
                  <div style={{ fontSize: '14px', color: viewingRecord.rememberInfo === 'yes' ? '#38a169' : '#e53e3e' }}>{viewingRecord.rememberInfo === 'yes' ? 'Yes' : 'No'}</div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Self Harm?</div>
                  <div style={{ fontSize: '14px', color: viewingRecord.selfHarm === 'yes' ? '#e53e3e' : '#38a169' }}>{viewingRecord.selfHarm === 'yes' ? 'Yes' : 'No'}</div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#f7f7f7', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>Assessed Competent?</div>
                  <div style={{ fontSize: '14px', color: viewingRecord.isCompetent === 'yes' ? '#38a169' : '#e53e3e' }}>{viewingRecord.isCompetent === 'yes' ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>

            <div className="vital-modal-actions" style={{ justifyContent: 'center' }}>
              <button className="vital-modal-btn ok" onClick={() => { setShowCompetencyViewModal(false); setViewingRecord(null); }}>Go Back</button>
            </div>
          </div>
        </div>
      )}

      {/* Medication Search Modal */}
      {showMedSearchModal && (
        <div className="modal-overlay" onClick={() => setShowMedSearchModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: '#b8cce4',
            borderRadius: '5px',
            width: '95%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(to bottom, #c63031, #a52829)',
              color: 'white',
              padding: '8px 15px',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              Search Medication
            </div>
            
            {/* Search Input Section */}
            <div style={{ padding: '15px', borderBottom: '1px solid #7a9cc0' }}>
              <label style={{ display: 'block', fontWeight: 'bold', color: '#1a3a5c', marginBottom: '6px' }}>
                Medication<span style={{ color: '#cc0000' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  value={medSearchQuery}
                  onChange={(e) => setMedSearchQuery(e.target.value)}
                  placeholder="Type to search..."
                  style={{
                    flex: 1,
                    padding: '10px 15px',
                    fontSize: '14px',
                    border: '1px solid #7a9cc0',
                    borderRadius: '3px'
                  }}
                  autoFocus
                />
                <button 
                  onClick={() => setMedSearchQuery('')}
                  style={{ 
                    padding: '10px 20px', 
                    background: 'linear-gradient(to bottom, #888, #666)', 
                    color: 'white', 
                    border: '1px solid #555', 
                    borderRadius: '3px', 
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >Reset...</button>
                <button 
                  style={{ 
                    padding: '10px 20px', 
                    background: 'linear-gradient(to bottom, #4a7eba, #3a6ea8)', 
                    color: 'white', 
                    border: '1px solid #2a5a94', 
                    borderRadius: '3px', 
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >Search</button>
              </div>
            </div>

            {/* Medication List */}
            <div style={{ padding: '10px 15px', backgroundColor: '#a8bcd4', fontWeight: 'bold', color: '#1a3a5c' }}>
              Medication<span style={{ color: '#cc0000' }}>*</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
              {medicationsList
                .filter(med => med.name.toLowerCase().includes(medSearchQuery.toLowerCase()))
                .map((med, index) => (
                  <div 
                    key={index}
                    onClick={() => handleMedicationSelect(med.name)}
                    style={{
                      padding: '10px 15px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #7a9cc0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: index % 2 === 0 ? '#c8d8e8' : '#b8cce4',
                      color: '#1a3a5c'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#a8bcd4')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#c8d8e8' : '#b8cce4')}
                  >
                    <span style={{ fontWeight: 'bold' }}>{med.name}</span>
                    <span style={{ fontSize: '12px', opacity: 0.8 }}>{med.code}</span>
                  </div>
                ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '10px 15px', borderTop: '1px solid #7a9cc0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setShowMedSearchModal(false)}
                style={{ 
                  padding: '8px 20px', 
                  background: 'linear-gradient(to bottom, #888, #666)', 
                  color: 'white', 
                  border: '1px solid #555', 
                  borderRadius: '3px', 
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >Cancel</button>
              <button 
                onClick={() => setShowMedSearchModal(false)}
                style={{ 
                  padding: '8px 20px', 
                  background: 'linear-gradient(to bottom, #4a7eba, #3a6ea8)', 
                  color: 'white', 
                  border: '1px solid #2a5a94', 
                  borderRadius: '3px', 
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Medication Entry Modal */}
      {showMedEntryModal && (
        <div className="modal-overlay" onClick={() => setShowMedEntryModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: '#b8cce4',
            borderRadius: '5px',
            width: '95%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(to bottom, #c63031, #a52829)',
              color: 'white',
              padding: '8px 15px',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              Add Medication: {medMedication}
            </div>

            {/* Form Content */}
            <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
              {/* Row 1: Time and Administered By */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#1a3a5c', marginBottom: '6px' }}>
                    Time<span style={{ color: '#cc0000' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      value={medTime}
                      onClick={openMedDateTimePicker}
                      readOnly
                      style={{ 
                        flex: 1, 
                        padding: '10px 15px', 
                        border: medValidationErrors.time ? '2px solid #cc0000' : '1px solid #7a9cc0', 
                        borderRadius: '3px', 
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    />
                    <button onClick={setMedNow} style={{ 
                      padding: '10px 20px', 
                      background: 'linear-gradient(to bottom, #4a7eba, #3a6ea8)', 
                      color: 'white', 
                      border: '1px solid #2a5a94', 
                      borderRadius: '3px', 
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}>Now</button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#1a3a5c', marginBottom: '6px' }}>
                    Administered by<span style={{ color: '#cc0000' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    value={medAdministeredBy}
                    onChange={(e) => setMedAdministeredBy(e.target.value)}
                    placeholder="Roblox username"
                    style={{ 
                      width: '100%', 
                      padding: '10px 15px', 
                      border: medValidationErrors.administeredBy ? '2px solid #cc0000' : '1px solid #7a9cc0', 
                      borderRadius: '3px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Medication (full width with buttons) */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', color: '#1a3a5c', marginBottom: '6px' }}>
                  Medication<span style={{ color: '#cc0000' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={medMedication}
                    readOnly
                    style={{ 
                      flex: 1, 
                      padding: '10px 15px', 
                      border: '1px solid #7a9cc0', 
                      borderRadius: '3px', 
                      backgroundColor: '#f5f5f5',
                      fontSize: '14px'
                    }}
                  />
                  <button 
                    onClick={() => {
                      setShowMedEntryModal(false)
                      setShowMedSearchModal(true)
                    }}
                    style={{ 
                      padding: '10px 20px', 
                      background: 'linear-gradient(to bottom, #4a7eba, #3a6ea8)', 
                      color: 'white', 
                      border: '1px solid #2a5a94', 
                      borderRadius: '3px', 
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >Search</button>
                  <button 
                    onClick={() => {
                      setShowMedEntryModal(false)
                      setShowMedSearchModal(true)
                    }}
                    style={{ 
                      padding: '10px 20px', 
                      background: 'linear-gradient(to bottom, #4a7eba, #3a6ea8)', 
                      color: 'white', 
                      border: '1px solid #2a5a94', 
                      borderRadius: '3px', 
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >List</button>
                </div>
              </div>

              {/* Row 3: PRN checkbox, Dose, Unit, Route */}
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: '15px', marginBottom: '15px', alignItems: 'end' }}>
                <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={medPrn}
                      onChange={(e) => setMedPrn(e.target.checked)}
                      style={{ width: '18px', height: '18px', marginRight: '8px' }}
                    />
                    <span style={{ fontWeight: 'bold', color: '#1a3a5c' }}>PRN</span>
                  </label>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#1a3a5c', marginBottom: '6px' }}>
                    Dose<span style={{ color: '#cc0000' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    value={medDose}
                    onChange={(e) => setMedDose(e.target.value)}
                    placeholder="e.g. 10"
                    style={{ 
                      width: '100%', 
                      padding: '10px 15px', 
                      border: medValidationErrors.dose ? '2px solid #cc0000' : '1px solid #7a9cc0', 
                      borderRadius: '3px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#1a3a5c', marginBottom: '6px' }}>
                    Unit<span style={{ color: '#cc0000' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    value={medUnit}
                    onChange={(e) => setMedUnit(e.target.value)}
                    placeholder="e.g. mg, ml"
                    style={{ 
                      width: '100%', 
                      padding: '10px 15px', 
                      border: medValidationErrors.unit ? '2px solid #cc0000' : '1px solid #7a9cc0', 
                      borderRadius: '3px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#1a3a5c', marginBottom: '6px' }}>
                    Route<span style={{ color: '#cc0000' }}>*</span>
                  </label>
                  <input 
                    type="text"
                    value={medRoute}
                    readOnly
                    onClick={() => setShowMedRouteModal(true)}
                    placeholder="Click to select..."
                    style={{ 
                      width: '100%', 
                      padding: '10px 15px', 
                      border: medValidationErrors.route ? '2px solid #cc0000' : '1px solid #7a9cc0', 
                      borderRadius: '3px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      backgroundColor: '#fff'
                    }}
                  />
                </div>
              </div>

              {/* Row 4: Notes and Reason for ATP Violation */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#1a3a5c', marginBottom: '6px' }}>
                    Notes
                  </label>
                  <input 
                    type="text"
                    value={medNotes}
                    readOnly
                    onClick={() => {
                      setMedNotesTemp(medNotes)
                      setShowMedNotesModal(true)
                    }}
                    placeholder="Click to add notes..."
                    style={{ 
                      width: '100%', 
                      padding: '10px 15px', 
                      border: '1px solid #7a9cc0', 
                      borderRadius: '3px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      backgroundColor: '#fff'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#999', marginBottom: '6px' }}>
                    Reason for ATP Violation
                  </label>
                  <input 
                    type="text"
                    value={medAtpViolation}
                    readOnly
                    disabled
                    placeholder=""
                    style={{ 
                      width: '100%', 
                      padding: '10px 15px', 
                      border: '1px solid #ccc', 
                      borderRadius: '3px',
                      fontSize: '14px',
                      backgroundColor: '#e8e8e8',
                      color: '#999'
                    }}
                  />
                </div>
              </div>

              {/* Row 5: Checkboxes */}
              <div style={{ display: 'flex', gap: '30px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={medDrawnUpNotUsed}
                    onChange={(e) => setMedDrawnUpNotUsed(e.target.checked)}
                    style={{ width: '18px', height: '18px', marginRight: '8px' }}
                  />
                  <span style={{ color: '#1a3a5c' }}>Drawn up not used</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={medBrokenAmpoule}
                    onChange={(e) => setMedBrokenAmpoule(e.target.checked)}
                    style={{ width: '18px', height: '18px', marginRight: '8px' }}
                  />
                  <span style={{ color: '#1a3a5c' }}>Broken ampoule</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={medDiscarded}
                    onChange={(e) => setMedDiscarded(e.target.checked)}
                    style={{ width: '18px', height: '18px', marginRight: '8px' }}
                  />
                  <span style={{ color: '#1a3a5c' }}>Discarded</span>
                </label>
              </div>

              {/* Row 6: Not possible */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', color: '#1a3a5c', marginBottom: '6px' }}>
                  Not possible
                </label>
                <input 
                  type="text" 
                  value={medNotPossibleReason}
                  readOnly
                  onClick={() => setShowMedNotPossibleModal(true)}
                  placeholder="Click to select reason..."
                  style={{ 
                    width: '100%', 
                    padding: '10px 15px', 
                    border: '1px solid #7a9cc0', 
                    borderRadius: '3px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    backgroundColor: '#fff'
                  }}
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{ 
              padding: '15px 20px', 
              borderTop: '1px solid #7a9cc0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#a8bcd4'
            }}>
              <button 
                onClick={() => {
                  setShowMedEntryModal(false)
                  setShowCompetencyModal(true)
                }}
                style={{ 
                  padding: '10px 20px', 
                  background: 'linear-gradient(to bottom, #4a7eba, #3a6ea8)', 
                  color: 'white', 
                  border: '1px solid #2a5a94', 
                  borderRadius: '3px', 
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >Competency Tool</button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => {
                    resetMedForm()
                    setShowMedEntryModal(false)
                  }}
                  style={{ 
                    padding: '10px 20px', 
                    background: 'linear-gradient(to bottom, #888, #666)', 
                    color: 'white', 
                    border: '1px solid #555', 
                    borderRadius: '3px', 
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >Cancel and discard</button>
                <button 
                  onClick={handleMedSaveAndEnterSame}
                  style={{ 
                    padding: '10px 20px', 
                    background: 'linear-gradient(to bottom, #4a7eba, #3a6ea8)', 
                    color: 'white', 
                    border: '1px solid #2a5a94', 
                    borderRadius: '3px', 
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >Save and enter same</button>
                <button 
                  onClick={handleMedSaveAndEnterDifferent}
                  style={{ 
                    padding: '10px 20px', 
                    background: 'linear-gradient(to bottom, #4a7eba, #3a6ea8)', 
                    color: 'white', 
                    border: '1px solid #2a5a94', 
                    borderRadius: '3px', 
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >Save and enter different</button>
                <button 
                  onClick={handleMedSaveAndReturn}
                  style={{ 
                    padding: '10px 20px', 
                    background: 'linear-gradient(to bottom, #5a8eca, #4a7eb8)', 
                    color: 'white', 
                    border: '1px solid #3a6ea4', 
                    borderRadius: '3px', 
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >Save and return</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Medication DateTime Picker */}
      {showMedDateTimePicker && (
        <div className="modal-overlay" onClick={() => setShowMedDateTimePicker(false)}>
          <div className="picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">Select Date and Time</div>
            <div className="picker-content">
              <div className="picker-row">
                <div className="picker-field">
                  <label>Day</label>
                  <input type="number" value={medPickerDay} onChange={(e) => setMedPickerDay(parseInt(e.target.value) || 1)} min="1" max="31" className="picker-input" />
                </div>
                <div className="picker-field">
                  <label>Month</label>
                  <input type="number" value={medPickerMonth} onChange={(e) => setMedPickerMonth(parseInt(e.target.value) || 1)} min="1" max="12" className="picker-input" />
                </div>
                <div className="picker-field">
                  <label>Year</label>
                  <input type="number" value={medPickerYear} onChange={(e) => setMedPickerYear(parseInt(e.target.value) || 2025)} min="2020" max="2030" className="picker-input" />
                </div>
              </div>
              <div className="picker-row">
                <div className="picker-field">
                  <label>Hour</label>
                  <input type="number" value={medPickerHour} onChange={(e) => setMedPickerHour(parseInt(e.target.value) || 0)} min="0" max="23" className="picker-input" />
                </div>
                <div className="picker-field">
                  <label>Minute</label>
                  <input type="number" value={medPickerMinute} onChange={(e) => setMedPickerMinute(parseInt(e.target.value) || 0)} min="0" max="59" className="picker-input" />
                </div>
              </div>
            </div>
            <div className="picker-footer">
              <button className="picker-footer-btn cancel" onClick={() => setShowMedDateTimePicker(false)}>Cancel</button>
              <button className="picker-footer-btn ok" onClick={handleSetMedDateTime}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Medication Route Selection Modal */}
      {showMedRouteModal && (
        <div className="modal-overlay" onClick={() => setShowMedRouteModal(false)}>
          <div className="route-modal" onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: '#b8cce4',
            borderRadius: '5px',
            minWidth: '300px',
            maxWidth: '400px'
          }}>
            <div style={{
              background: 'linear-gradient(to bottom, #c63031, #a52829)',
              color: 'white',
              padding: '8px 15px',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              Route
            </div>
            <div style={{ padding: '10px', maxHeight: '400px', overflowY: 'auto' }}>
              {routesList.map((routeOption, index) => (
                <div 
                  key={index}
                  onClick={() => {
                    setMedRoute(routeOption)
                    setShowMedRouteModal(false)
                  }}
                  style={{
                    padding: '10px 15px',
                    cursor: 'pointer',
                    backgroundColor: index % 2 === 0 ? '#c8d8e8' : '#b8cce4',
                    borderBottom: '1px solid #7a9cc0',
                    color: '#1a3a5c'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#a8bcd4')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#c8d8e8' : '#b8cce4')}
                >
                  {routeOption}
                </div>
              ))}
            </div>
            <div style={{ padding: '10px', borderTop: '1px solid #7a9cc0', textAlign: 'right' }}>
              <button 
                onClick={() => setShowMedRouteModal(false)}
                style={{ 
                  padding: '8px 20px', 
                  background: 'linear-gradient(to bottom, #888, #666)', 
                  color: 'white', 
                  border: '1px solid #555', 
                  borderRadius: '3px', 
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Medication Notes Modal */}
      {showMedNotesModal && (
        <div className="modal-overlay" onClick={() => setShowMedNotesModal(false)}>
          <div className="vital-detail-modal" onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: '#b8cce4',
            borderRadius: '5px',
            minWidth: '500px',
            maxWidth: '600px'
          }}>
            <div style={{
              background: 'linear-gradient(to bottom, #c63031, #a52829)',
              color: 'white',
              padding: '8px 15px',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              Notes
            </div>
            <div style={{ padding: '20px' }}>
              <textarea
                value={medNotesTemp}
                onChange={(e) => setMedNotesTemp(e.target.value)}
                placeholder="Enter notes..."
                autoFocus
                style={{
                  width: '100%',
                  minHeight: '200px',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #7a9cc0',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
            </div>
            <div style={{ padding: '10px 20px', borderTop: '1px solid #7a9cc0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setShowMedNotesModal(false)}
                style={{ 
                  padding: '8px 20px', 
                  background: 'linear-gradient(to bottom, #888, #666)', 
                  color: 'white', 
                  border: '1px solid #555', 
                  borderRadius: '3px', 
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >Cancel</button>
              <button 
                onClick={() => {
                  setMedNotes(medNotesTemp)
                  setShowMedNotesModal(false)
                }}
                style={{ 
                  padding: '8px 20px', 
                  background: 'linear-gradient(to bottom, #4a7eba, #3a6ea8)', 
                  color: 'white', 
                  border: '1px solid #2a5a94', 
                  borderRadius: '3px', 
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Medication Not Possible Modal */}
      {showMedNotPossibleModal && (
        <div className="modal-overlay" onClick={() => setShowMedNotPossibleModal(false)}>
          <div className="route-modal" onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: '#b8cce4',
            borderRadius: '5px',
            minWidth: '350px',
            maxWidth: '450px'
          }}>
            <div style={{
              background: 'linear-gradient(to bottom, #c63031, #a52829)',
              color: 'white',
              padding: '8px 15px',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              Not Possible - Select Reason
            </div>
            <div style={{ padding: '10px', maxHeight: '400px', overflowY: 'auto' }}>
              {['Patient refused', 'Not indicated', 'Contraindicated', 'Not available', 'Time critical', 'Other'].map((reason, index) => (
                <div 
                  key={index}
                  onClick={() => {
                    setMedNotPossibleReason(reason)
                    setShowMedNotPossibleModal(false)
                  }}
                  style={{
                    padding: '10px 15px',
                    cursor: 'pointer',
                    backgroundColor: index % 2 === 0 ? '#c8d8e8' : '#b8cce4',
                    borderBottom: '1px solid #7a9cc0',
                    color: '#1a3a5c'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#a8bcd4')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#c8d8e8' : '#b8cce4')}
                >
                  {reason}
                </div>
              ))}
              <div 
                onClick={() => {
                  setMedNotPossibleReason('')
                  setShowMedNotPossibleModal(false)
                }}
                style={{
                  padding: '10px 15px',
                  cursor: 'pointer',
                  backgroundColor: '#ddd',
                  borderBottom: '1px solid #7a9cc0',
                  color: '#666',
                  fontStyle: 'italic'
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#ccc')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ddd')}
              >
                Clear selection
              </div>
            </div>
            <div style={{ padding: '10px', borderTop: '1px solid #7a9cc0', textAlign: 'right' }}>
              <button 
                onClick={() => setShowMedNotPossibleModal(false)}
                style={{ 
                  padding: '8px 20px', 
                  background: 'linear-gradient(to bottom, #888, #666)', 
                  color: 'white', 
                  border: '1px solid #555', 
                  borderRadius: '3px', 
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Intervention Entry Modal */}
      {showInterventionEntryModal && (
        <div className="modal-overlay" onClick={() => setShowInterventionEntryModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: '#b8cce4',
            borderRadius: '5px',
            width: '95%',
            maxWidth: '950px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(to bottom, #c63031, #a52829)',
              color: 'white',
              padding: '8px 15px',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              Add Intervention
            </div>

            {/* Form Content */}
            <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
              {/* Time and Performed By */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#1a3a5c', marginBottom: '6px' }}>
                    Time<span style={{ color: '#cc0000' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      value={intTime}
                      onClick={openIntDateTimePicker}
                      readOnly
                      style={{ 
                        flex: 1, 
                        padding: '10px 15px', 
                        border: intValidationErrors.time ? '2px solid #cc0000' : '1px solid #7a9cc0', 
                        borderRadius: '3px', 
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    />
                    <button onClick={setIntNow} style={{ 
                      padding: '10px 20px', 
                      background: 'linear-gradient(to bottom, #4a7eba, #3a6ea8)', 
                      color: 'white', 
                      border: '1px solid #2a5a94', 
                      borderRadius: '3px', 
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}>Now</button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#1a3a5c', marginBottom: '6px' }}>
                    Performed by<span style={{ color: '#cc0000' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    value={intPerformedBy}
                    onChange={(e) => setIntPerformedBy(e.target.value)}
                    placeholder="Roblox username"
                    style={{ 
                      width: '100%', 
                      padding: '10px 15px', 
                      border: intValidationErrors.performedBy ? '2px solid #cc0000' : '1px solid #7a9cc0', 
                      borderRadius: '3px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Airway Section */}
              <div style={{ marginBottom: '20px', backgroundColor: '#c8d8e8', padding: '15px', borderRadius: '5px' }}>
                <div style={{ fontWeight: 'bold', color: '#1a3a5c', marginBottom: '12px', fontSize: '15px' }}>Airway</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>Airway</label>
                    <select value={intAirway} onChange={(e) => setIntAirway(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}>
                      <option value="">Select...</option>
                      {airwayOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>Ventilation</label>
                    <select value={intVentilation} onChange={(e) => setIntVentilation(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}>
                      <option value="">Select...</option>
                      {ventilationOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>PEEP</label>
                    <input 
                      type="text" 
                      value={intPeep}
                      onChange={(e) => setIntPeep(e.target.value)}
                      placeholder="cmH2O"
                      style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>CPAP</label>
                    <input 
                      type="text" 
                      value={intCpap}
                      onChange={(e) => setIntCpap(e.target.value)}
                      placeholder="cmH2O"
                      style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>RSI</label>
                    <select value={intRsi} onChange={(e) => setIntRsi(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}>
                      <option value="">Select...</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Cardiac Section */}
              <div style={{ marginBottom: '20px', backgroundColor: '#c8d8e8', padding: '15px', borderRadius: '5px' }}>
                <div style={{ fontWeight: 'bold', color: '#1a3a5c', marginBottom: '12px', fontSize: '15px' }}>Cardiac</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>CPR</label>
                    <select value={intCpr} onChange={(e) => setIntCpr(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}>
                      <option value="">Select...</option>
                      <option value="Commenced">Commenced</option>
                      <option value="Continued">Continued</option>
                      <option value="ROSC">ROSC</option>
                      <option value="Ceased">Ceased</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>Defibrillation</label>
                    <input 
                      type="text" 
                      value={intDefibrillation}
                      onChange={(e) => setIntDefibrillation(e.target.value)}
                      placeholder="Joules"
                      style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>Cardioversion</label>
                    <input 
                      type="text" 
                      value={intCardioversion}
                      onChange={(e) => setIntCardioversion(e.target.value)}
                      placeholder="Joules"
                      style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>Pacing</label>
                    <input 
                      type="text" 
                      value={intPacing}
                      onChange={(e) => setIntPacing(e.target.value)}
                      placeholder="mA/BPM"
                      style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>Valsalva</label>
                    <select value={intValsalva} onChange={(e) => setIntValsalva(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}>
                      <option value="">Select...</option>
                      <option value="Standard">Standard</option>
                      <option value="Modified">Modified</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Invasive Section */}
              <div style={{ marginBottom: '20px', backgroundColor: '#c8d8e8', padding: '15px', borderRadius: '5px' }}>
                <div style={{ fontWeight: 'bold', color: '#1a3a5c', marginBottom: '12px', fontSize: '15px' }}>Invasive</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>IV Cannulation</label>
                    <select value={intIvCannulation} onChange={(e) => setIntIvCannulation(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}>
                      <option value="">Select...</option>
                      <option value="14G">14G</option>
                      <option value="16G">16G</option>
                      <option value="18G">18G</option>
                      <option value="20G">20G</option>
                      <option value="22G">22G</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>IO Access</label>
                    <select value={intIoAccess} onChange={(e) => setIntIoAccess(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}>
                      <option value="">Select...</option>
                      <option value="Tibial">Tibial</option>
                      <option value="Humeral">Humeral</option>
                      <option value="Sternal">Sternal</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>Chest Decompression</label>
                    <select value={intChestDecompression} onChange={(e) => setIntChestDecompression(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}>
                      <option value="">Select...</option>
                      <option value="Needle - Left">Needle - Left</option>
                      <option value="Needle - Right">Needle - Right</option>
                      <option value="Finger - Left">Finger - Left</option>
                      <option value="Finger - Right">Finger - Right</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>Stomach Decompression</label>
                    <select value={intStomachDecompression} onChange={(e) => setIntStomachDecompression(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}>
                      <option value="">Select...</option>
                      <option value="NG Tube">NG Tube</option>
                      <option value="OG Tube">OG Tube</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>Catheter Troubleshooting</label>
                    <select value={intCatheterTroubleshooting} onChange={(e) => setIntCatheterTroubleshooting(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}>
                      <option value="">Select...</option>
                      <option value="Flushed">Flushed</option>
                      <option value="Replaced">Replaced</option>
                      <option value="Removed">Removed</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>Nerve Block</label>
                    <input 
                      type="text" 
                      value={intNerveBlock}
                      onChange={(e) => setIntNerveBlock(e.target.value)}
                      placeholder="Details..."
                      style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Other Section */}
              <div style={{ marginBottom: '20px', backgroundColor: '#c8d8e8', padding: '15px', borderRadius: '5px' }}>
                <div style={{ fontWeight: 'bold', color: '#1a3a5c', marginBottom: '12px', fontSize: '15px' }}>Other</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>Positioning</label>
                    <select value={intPositioning} onChange={(e) => setIntPositioning(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}>
                      <option value="">Select...</option>
                      <option value="Recovery Position">Recovery Position</option>
                      <option value="Supine">Supine</option>
                      <option value="Fowlers">Fowlers</option>
                      <option value="Left Lateral">Left Lateral</option>
                      <option value="Trendelenburg">Trendelenburg</option>
                      <option value="Prone">Prone</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>Splint/Dressing/Tag</label>
                    <input 
                      type="text" 
                      value={intSplintDressingTag}
                      onChange={(e) => setIntSplintDressingTag(e.target.value)}
                      placeholder="Details..."
                      style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>Nasal Tamponade</label>
                    <select value={intNasalTamponade} onChange={(e) => setIntNasalTamponade(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}>
                      <option value="">Select...</option>
                      <option value="Rapid Rhino">Rapid Rhino</option>
                      <option value="Packing">Packing</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>Tourniquet</label>
                    <select value={intTourniquet} onChange={(e) => setIntTourniquet(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}>
                      <option value="">Select...</option>
                      <option value="Left Arm">Left Arm</option>
                      <option value="Right Arm">Right Arm</option>
                      <option value="Left Leg">Left Leg</option>
                      <option value="Right Leg">Right Leg</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>Limb Reduction</label>
                    <input 
                      type="text" 
                      value={intLimbReduction}
                      onChange={(e) => setIntLimbReduction(e.target.value)}
                      placeholder="Details..."
                      style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>Epley Manoeuvre</label>
                    <select value={intEpleyManoeuvre} onChange={(e) => setIntEpleyManoeuvre(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', fontSize: '13px' }}>
                      <option value="">Select...</option>
                      <option value="Left">Left</option>
                      <option value="Right">Right</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1a3a5c' }}>Other Intervention/Notes</label>
                  <textarea 
                    value={intOtherNotes}
                    onChange={(e) => setIntOtherNotes(e.target.value)}
                    placeholder="Any other intervention notes..."
                    style={{ width: '100%', padding: '8px', border: '1px solid #7a9cc0', borderRadius: '3px', minHeight: '60px', resize: 'vertical', fontSize: '13px' }}
                  />
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{ 
              padding: '15px 20px', 
              borderTop: '1px solid #7a9cc0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              backgroundColor: '#a8bcd4'
            }}>
              <button 
                onClick={() => {
                  resetInterventionForm()
                  setShowInterventionEntryModal(false)
                }}
                style={{ 
                  padding: '10px 20px', 
                  background: 'linear-gradient(to bottom, #888, #666)', 
                  color: 'white', 
                  border: '1px solid #555', 
                  borderRadius: '3px', 
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >Cancel and discard</button>
              <button 
                onClick={handleIntSaveAndEnterAnother}
                style={{ 
                  padding: '10px 20px', 
                  background: 'linear-gradient(to bottom, #4a7eba, #3a6ea8)', 
                  color: 'white', 
                  border: '1px solid #2a5a94', 
                  borderRadius: '3px', 
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >Save and enter another</button>
              <button 
                onClick={handleIntSaveAndReturn}
                style={{ 
                  padding: '10px 20px', 
                  background: 'linear-gradient(to bottom, #5a8eca, #4a7eb8)', 
                  color: 'white', 
                  border: '1px solid #3a6ea4', 
                  borderRadius: '3px', 
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >Save and return to Vital Obs/Treat</button>
            </div>
          </div>
        </div>
      )}

      {/* Intervention DateTime Picker */}
      {showInterventionDateTimePicker && (
        <div className="modal-overlay" onClick={() => setShowInterventionDateTimePicker(false)}>
          <div className="picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">Select Date and Time</div>
            <div className="picker-content">
              <div className="picker-row">
                <div className="picker-field">
                  <label>Day</label>
                  <input type="number" value={intPickerDay} onChange={(e) => setIntPickerDay(parseInt(e.target.value) || 1)} min="1" max="31" className="picker-input" />
                </div>
                <div className="picker-field">
                  <label>Month</label>
                  <input type="number" value={intPickerMonth} onChange={(e) => setIntPickerMonth(parseInt(e.target.value) || 1)} min="1" max="12" className="picker-input" />
                </div>
                <div className="picker-field">
                  <label>Year</label>
                  <input type="number" value={intPickerYear} onChange={(e) => setIntPickerYear(parseInt(e.target.value) || 2025)} min="2020" max="2030" className="picker-input" />
                </div>
              </div>
              <div className="picker-row">
                <div className="picker-field">
                  <label>Hour</label>
                  <input type="number" value={intPickerHour} onChange={(e) => setIntPickerHour(parseInt(e.target.value) || 0)} min="0" max="23" className="picker-input" />
                </div>
                <div className="picker-field">
                  <label>Minute</label>
                  <input type="number" value={intPickerMinute} onChange={(e) => setIntPickerMinute(parseInt(e.target.value) || 0)} min="0" max="59" className="picker-input" />
                </div>
              </div>
            </div>
            <div className="picker-footer">
              <button className="picker-footer-btn cancel" onClick={() => setShowInterventionDateTimePicker(false)}>Cancel</button>
              <button className="picker-footer-btn ok" onClick={handleSetIntDateTime}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Competency Tool Modal */}
      {showCompetencyModal && (
        <div className="modal-overlay" onClick={() => setShowCompetencyModal(false)}>
          <div className="competency-modal" onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: '#b8cce4',
            borderRadius: '5px',
            minWidth: '800px',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(to bottom, #c63031, #a52829)',
              color: 'white',
              padding: '8px 15px',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              Competency Tool
            </div>

            {/* Form Content */}
            <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
              {/* Time Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  fontWeight: 'bold', 
                  color: '#1a3a5c',
                  marginBottom: '8px'
                }}>
                  Time<span style={{ color: '#cc0000' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={competencyTime}
                    onClick={() => {
                      const now = new Date()
                      setCompetencyPickerDay(now.getDate())
                      setCompetencyPickerMonth(now.getMonth() + 1)
                      setCompetencyPickerYear(now.getFullYear())
                      setCompetencyPickerHour(now.getHours())
                      setCompetencyPickerMinute(now.getMinutes())
                      setShowCompetencyDateTimePicker(true)
                    }}
                    readOnly
                    style={{
                      width: '300px',
                      padding: '10px 15px',
                      border: competencyValidationErrors.time ? '2px solid #cc0000' : '1px solid #7a9cc0',
                      borderRadius: '3px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  />
                  <button
                    onClick={() => {
                      const now = new Date()
                      const formatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
                      setCompetencyTime(formatted)
                      setCompetencyValidationErrors({...competencyValidationErrors, time: false})
                    }}
                    style={{
                      padding: '10px 20px',
                      background: 'linear-gradient(to bottom, #5a7a9c, #4a6a8c)',
                      color: 'white',
                      border: '1px solid #3a5a7c',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Now
                  </button>
                </div>
              </div>

              {/* Question 1: Understand Information */}
              <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontWeight: 'bold', color: '#1a3a5c', flex: 1 }}>
                  Patient appears able to understand information provided to them on proposed treatments<span style={{ color: '#cc0000' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '30px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="understandInfo"
                      checked={competencyUnderstandInfo === 'yes'}
                      onChange={() => setCompetencyUnderstandInfo('yes')}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ color: '#1a3a5c' }}>Yes</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="understandInfo"
                      checked={competencyUnderstandInfo === 'no'}
                      onChange={() => setCompetencyUnderstandInfo('no')}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ color: '#1a3a5c' }}>No</span>
                  </label>
                </div>
              </div>

              {/* Question 2: Understand Consequences */}
              <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontWeight: 'bold', color: '#1a3a5c', flex: 1 }}>
                  Patient appears able to understand the consequences of their decisions<span style={{ color: '#cc0000' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '30px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="understandConsequences"
                      checked={competencyUnderstandConsequences === 'yes'}
                      onChange={() => setCompetencyUnderstandConsequences('yes')}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ color: '#1a3a5c' }}>Yes</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="understandConsequences"
                      checked={competencyUnderstandConsequences === 'no'}
                      onChange={() => setCompetencyUnderstandConsequences('no')}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ color: '#1a3a5c' }}>No</span>
                  </label>
                </div>
              </div>

              {/* Question 3: Remember Information */}
              <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontWeight: 'bold', color: '#1a3a5c', flex: 1 }}>
                  Patient appears able to remember information given to them<span style={{ color: '#cc0000' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '30px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="rememberInfo"
                      checked={competencyRememberInfo === 'yes'}
                      onChange={() => setCompetencyRememberInfo('yes')}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ color: '#1a3a5c' }}>Yes</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="rememberInfo"
                      checked={competencyRememberInfo === 'no'}
                      onChange={() => setCompetencyRememberInfo('no')}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ color: '#1a3a5c' }}>No</span>
                  </label>
                </div>
              </div>

              {/* Question 4: Self Harm */}
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontWeight: 'bold', color: '#1a3a5c', flex: 1 }}>
                  Patient has attempted (or expressed serious thoughts of) self-harm<span style={{ color: '#cc0000' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '30px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="selfHarm"
                      checked={competencySelfHarm === 'yes'}
                      onChange={() => setCompetencySelfHarm('yes')}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ color: '#1a3a5c' }}>Yes</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="selfHarm"
                      checked={competencySelfHarm === 'no'}
                      onChange={() => setCompetencySelfHarm('no')}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ color: '#1a3a5c' }}>No</span>
                  </label>
                </div>
              </div>

              {/* Save Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <button
                  onClick={() => {
                    // Validate required fields
                    const errors: {[key: string]: boolean} = {}
                    if (!competencyTime) errors.time = true
                    if (!competencyUnderstandInfo) errors.understandInfo = true
                    if (!competencyUnderstandConsequences) errors.understandConsequences = true
                    if (!competencyRememberInfo) errors.rememberInfo = true
                    if (!competencySelfHarm) errors.selfHarm = true
                    
                    setCompetencyValidationErrors(errors)
                    
                    if (Object.keys(errors).length > 0) {
                      return
                    }
                    
                    // Save the competency entry
                    const competencyEntry = {
                      time: competencyTime,
                      understandInfo: competencyUnderstandInfo,
                      understandConsequences: competencyUnderstandConsequences,
                      rememberInfo: competencyRememberInfo,
                      selfHarm: competencySelfHarm
                    }
                    setSavedCompetency([...savedCompetency, competencyEntry])
                    
                    // Reset form
                    setCompetencyTime('')
                    setCompetencyUnderstandInfo('')
                    setCompetencyUnderstandConsequences('')
                    setCompetencyRememberInfo('')
                    setCompetencySelfHarm('')
                    setCompetencyValidationErrors({})
                  }}
                  style={{
                    padding: '10px 40px',
                    background: 'linear-gradient(to bottom, #5a7a9c, #4a6a8c)',
                    color: 'white',
                    border: '1px solid #3a5a7c',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}
                >
                  Save
                </button>
              </div>

              {/* Saved Competency Log Table */}
              <div style={{ marginTop: '10px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.5fr 1.5fr 1.5fr 1fr 0.5fr',
                  backgroundColor: '#4a4a4a',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '12px'
                }}>
                  <div style={{ padding: '8px 10px', borderRight: '1px solid #666' }}>Time</div>
                  <div style={{ padding: '8px 10px', borderRight: '1px solid #666' }}>Understand Information?</div>
                  <div style={{ padding: '8px 10px', borderRight: '1px solid #666' }}>Understand Consequences?</div>
                  <div style={{ padding: '8px 10px', borderRight: '1px solid #666' }}>Remember Information?</div>
                  <div style={{ padding: '8px 10px', borderRight: '1px solid #666' }}>Self Harm?</div>
                  <div style={{ padding: '8px 10px' }}></div>
                </div>
                
                {/* Saved entries */}
                {savedCompetency.map((entry, index) => (
                  <div key={index} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1.5fr 1.5fr 1.5fr 1fr 0.5fr',
                    backgroundColor: index % 2 === 0 ? '#d4e0ed' : '#c4d4e4',
                    fontSize: '12px',
                    color: '#1a202c'
                  }}>
                    <div style={{ padding: '8px 10px', borderRight: '1px solid #999' }}>{entry.time}</div>
                    <div style={{ padding: '8px 10px', borderRight: '1px solid #999' }}>{entry.understandInfo === 'yes' ? 'Yes' : 'No'}</div>
                    <div style={{ padding: '8px 10px', borderRight: '1px solid #999' }}>{entry.understandConsequences === 'yes' ? 'Yes' : 'No'}</div>
                    <div style={{ padding: '8px 10px', borderRight: '1px solid #999' }}>{entry.rememberInfo === 'yes' ? 'Yes' : 'No'}</div>
                    <div style={{ padding: '8px 10px', borderRight: '1px solid #999' }}>{entry.selfHarm === 'yes' ? 'Yes' : 'No'}</div>
                    <div style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          setSavedCompetency(savedCompetency.filter((_, i) => i !== index))
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#cc0000',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                
                {savedCompetency.length === 0 && (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    backgroundColor: '#d4e0ed',
                    color: '#4a5568',
                    fontStyle: 'italic'
                  }}>
                    No competency assessments recorded
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              background: 'linear-gradient(to bottom, #5a7ca5, #3a5c85)',
              padding: '10px 20px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                onClick={handleCompetencyCancel}
                style={{
                  padding: '10px 25px',
                  background: 'linear-gradient(to bottom, #e0e0e0, #c0c0c0)',
                  color: '#333',
                  border: '1px solid #999',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Close modal (entries are already saved)
                  setCompetencyTime('')
                  setCompetencyUnderstandInfo('')
                  setCompetencyUnderstandConsequences('')
                  setCompetencyRememberInfo('')
                  setCompetencySelfHarm('')
                  setCompetencyValidationErrors({})
                  setShowCompetencyModal(false)
                }}
                style={{
                  padding: '10px 30px',
                  background: 'linear-gradient(to bottom, #5a7a9c, #4a6a8c)',
                  color: 'white',
                  border: '1px solid #3a5a7c',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Competency Tool Date/Time Picker */}
      {showCompetencyDateTimePicker && (
        <div className="modal-overlay" onClick={() => setShowCompetencyDateTimePicker(false)}>
          <div className="datetime-picker" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">Set Time</div>
            <div className="picker-display">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(competencyPickerYear, competencyPickerMonth - 1, competencyPickerDay).getDay()]}, {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][competencyPickerMonth - 1]} {String(competencyPickerDay).padStart(2, '0')}, {competencyPickerYear} {String(competencyPickerHour).padStart(2, '0')}:{String(competencyPickerMinute).padStart(2, '0')}
            </div>
            <div className="picker-controls">
              <div className="picker-column">
                <button className="picker-btn" onClick={() => setCompetencyPickerDay(Math.min(31, competencyPickerDay + 1))}>+</button>
                <div className="picker-value highlight">{String(competencyPickerDay).padStart(2, '0')}</div>
                <button className="picker-btn" onClick={() => setCompetencyPickerDay(Math.max(1, competencyPickerDay - 1))}>-</button>
              </div>
              <div className="picker-column">
                <button className="picker-btn" onClick={() => setCompetencyPickerMonth(competencyPickerMonth === 12 ? 1 : competencyPickerMonth + 1)}>+</button>
                <div className="picker-value">{String(competencyPickerMonth).padStart(2, '0')}</div>
                <button className="picker-btn" onClick={() => setCompetencyPickerMonth(competencyPickerMonth === 1 ? 12 : competencyPickerMonth - 1)}>-</button>
              </div>
              <div className="picker-column">
                <button className="picker-btn" onClick={() => setCompetencyPickerYear(competencyPickerYear + 1)}>+</button>
                <div className="picker-value">{competencyPickerYear}</div>
                <button className="picker-btn" onClick={() => setCompetencyPickerYear(Math.max(1900, competencyPickerYear - 1))}>-</button>
              </div>
              <div className="picker-column">
                <button className="picker-btn" onClick={() => setCompetencyPickerHour(competencyPickerHour === 23 ? 0 : competencyPickerHour + 1)}>+</button>
                <div className="picker-value highlight">{String(competencyPickerHour).padStart(2, '0')}</div>
                <button className="picker-btn" onClick={() => setCompetencyPickerHour(competencyPickerHour === 0 ? 23 : competencyPickerHour - 1)}>-</button>
              </div>
              <div className="picker-column">
                <button className="picker-btn" onClick={() => setCompetencyPickerMinute(competencyPickerMinute === 59 ? 0 : competencyPickerMinute + 1)}>+</button>
                <div className="picker-value highlight">{String(competencyPickerMinute).padStart(2, '0')}</div>
                <button className="picker-btn" onClick={() => setCompetencyPickerMinute(competencyPickerMinute === 0 ? 59 : competencyPickerMinute - 1)}>-</button>
              </div>
            </div>
            <div className="picker-actions">
              <button className="picker-action-btn cancel" onClick={() => setShowCompetencyDateTimePicker(false)}>Clear</button>
              <button className="picker-action-btn ok" onClick={() => {
                const formatted = `${String(competencyPickerDay).padStart(2, '0')}/${String(competencyPickerMonth).padStart(2, '0')}/${competencyPickerYear} ${String(competencyPickerHour).padStart(2, '0')}:${String(competencyPickerMinute).padStart(2, '0')}`
                setCompetencyTime(formatted)
                setCompetencyValidationErrors({...competencyValidationErrors, time: false})
                setShowCompetencyDateTimePicker(false)
              }}>Set</button>
            </div>
          </div>
        </div>
      )}

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
        message={`Are you sure you want to submit this ePRF?\n\nThis will:\n• Generate a PDF report for Patient ${patientLetter}\n• Save the record to the database\n\n${pdfOption ? '✓ PDF will be downloaded after submit' : '✗ PDF download disabled'}`}
        confirmText="Yes, Submit ePRF"
        cancelText="Cancel"
        type="success"
        isLoading={isSubmitting}
      />

      {/* PDF Option Checkbox */}
      {showSubmitModal && (
        <div style={{ position: 'fixed', bottom: '200px', left: '50%', transform: 'translateX(-50%)', zIndex: 10001, background: 'white', padding: '10px', borderRadius: '5px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={pdfOption}
              onChange={e => setPdfOption(e.target.checked)}
            />
            <span style={{ fontSize: '14px', color: '#1a3a5c' }}>Download PDF after submit</span>
          </label>
        </div>
      )}

      <ValidationErrorModal
        isOpen={showValidationErrorModal}
        onClose={() => setShowValidationErrorModal(false)}
        errors={validationErrorsModal}
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
          const params = new URLSearchParams({ id: incidentId, fleetId })
          router.push(`/vital-obs?${params}`)
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
    </div>
  )
}
