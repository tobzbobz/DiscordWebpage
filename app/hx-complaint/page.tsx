"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { validateAllSections, getSectionDisplayName } from '../utils/validation'
import { handleAddPatient as addPatientService, handleSubmitEPRF as submitEPRFService, getCurrentPatientLetter } from '../utils/eprfService'
import ConfirmationModal, { ValidationErrorModal, SuccessModal } from '../components/ConfirmationModal'
import TransferModal from '../components/TransferModal'
import { getCurrentUser } from '../utils/userService'
import { isAdmin } from '../utils/apiClient'

export const runtime = 'edge'

export default function HxComplaintPage() {
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
  const [validationErrors, setValidationErrors] = useState<{[section: string]: string[]}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' })

  const [currentPage, setCurrentPage] = useState(1)
  
  // Form state - initialize from localStorage
  const [formData, setFormData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`hx_complaint_${incidentId}`)
      return saved ? JSON.parse(saved) : {
        complaints: [],
        otherComplaint: '',
        dateOfOnset: '',
        onsetUnknown: false,
        historyOfIncident: '',
        mechanismOfInjury: '',
        otherMechanism: '',
        sports: ''
      }
    }
    return {
      complaints: [],
      otherComplaint: '',
      dateOfOnset: '',
      onsetUnknown: false,
      historyOfIncident: '',
      mechanismOfInjury: '',
      otherMechanism: '',
      sports: ''
    }
  })
  
  const [showDateTimePicker, setShowDateTimePicker] = useState(false)
  const [showOtherModal, setShowOtherModal] = useState(false)
  const [showOtherMechanismModal, setShowOtherMechanismModal] = useState(false)
  const [showSportsModal, setShowSportsModal] = useState(false)
  const [showOtherSportsModal, setShowOtherSportsModal] = useState(false)
  const [tempOtherText, setTempOtherText] = useState('')
  const [tempOtherMechanism, setTempOtherMechanism] = useState('')
  const [tempOtherSports, setTempOtherSports] = useState('')
  
  // Date/time picker state
  const [pickerDay, setPickerDay] = useState(1)
  const [pickerMonth, setPickerMonth] = useState(1)
  const [pickerYear, setPickerYear] = useState(2025)
  const [pickerHour, setPickerHour] = useState(0)
  const [pickerMinute, setPickerMinute] = useState(0)
  
  // Load patient letter on mount
  useEffect(() => {
    if (incidentId) {
      setPatientLetter(getCurrentPatientLetter(incidentId))
    }
  }, [incidentId])

  // Persist form data to localStorage whenever it changes
  useEffect(() => {
    if (incidentId) {
      localStorage.setItem(`hx_complaint_${incidentId}`, JSON.stringify(formData))
    }
  }, [formData, incidentId])
  
  const complaintOptions = [
    'Abdominal pain',
    'Back pain (non-traumatic)',
    'Cardiac arrest',
    'Collapse - fainting',
    'Fall',
    'Fracture - dislocation',
    'Palpitations',
    'Seizure',
    'Soft tissue injury',
    'Other',
    'Assault',
    'Burn',
    'Chest pain',
    'Diabetic problem',
    'Fever- infection',
    'Laceration',
    'Poisoning',
    'Shortness of breath',
    'Stroke'
  ]
  
  const mechanismOptions = [
    'RTA',
    'Assault',
    'Machinery accidents',
    'Excessive heat',
    'Chemical poisoning',
    'Other',
    'Work accident',
    'Excessive cold',
    'Animal attack/bites',
    'Smoke fire and flames',
    'Fall'
  ]
  
  const sportsOptions = [
    'Rugby Union',
    'Rugby League',
    'Touch Rugby',
    'Netball',
    'Soccer',
    'Cricket',
    'Basketball',
    'Swimming',
    'Cycling',
    'Jogging',
    'Abseiling',
    'Aerobatics',
    'Aerobics',
    'American Football',
    'Archery',
    'Athletics',
    'Australian Rules Football',
    'Badminton',
    'Ballooning',
    'Baseball',
    'Billiards/Pool/Snooker',
    'Boating',
    'Bowling - Tenpin',
    'Bowls',
    'Boxing',
    'Bungy Jumping',
    'Canoeing',
    'Croquet',
    'Curling',
    'Cycling - BMX',
    'Cycling - Mountainbike',
    'Cycling - Road Racing',
    'Cycling - Track',
    'Dancing',
    'Darts',
    'Diving - Pool',
    'Diving - Underwater',
    'Fencing',
    'Fishing',
    'Gliding',
    'Go-karting',
    'Golf',
    'Gymnastics',
    'Hang Gliding',
    'Hockey',
    'Horse Racing',
    'Horse Riding',
    'Horse Riding - eventing/show jumping',
    'Hunting',
    'Ice Skating',
    'Indoor Cricket',
    'Kayaking',
    'Luge Riding/Bobsleigh/Tobogganing',
    'Martial Arts',
    'Motor Cycle Racing',
    'Motor Cycling',
    'Motor Racing',
    'Mountaineering',
    'Multisport (biathlon, triathlon)',
    'Orienteering',
    'Parachute Jumping',
    'Para-gliding',
    'Parapenting',
    'Polo',
    'Rock Climbing',
    'Roller Skating',
    'Rowing',
    'Running',
    'Shooting',
    'Skateboarding',
    'Skiing - Snow',
    'Snowboarding',
    'Softball',
    'Squash',
    'Surfing',
    'Table Tennis',
    'Tennis',
    'Trail Biking, Motor-Cross',
    'Tramping',
    'Trampolining',
    'Volley Ball',
    'Water Polo',
    'Water Skiing',
    'Weightlifting',
    'Wind Surfing',
    'Wrestling',
    'Yachting',
    'Other'
  ]
  
  // Split into two columns
  const leftColumnComplaints = complaintOptions.slice(0, 10)
  const rightColumnComplaints = complaintOptions.slice(10)
  
  const leftColumnMechanism = mechanismOptions.slice(0, 6)
  const rightColumnMechanism = mechanismOptions.slice(6)

  const handleLogout = () => {
    router.push('/')
  }

  const handleHome = () => {
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

  const handlePrevious = () => {
    if (currentPage === 2) {
      setCurrentPage(1)
    } else {
      navigateTo('vital-obs')
    }
  }

  const handleNext = () => {
    if (currentPage === 1) {
      setCurrentPage(2)
    } else {
      navigateTo('past-medical-history')
    }
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

  const hasFieldError = (field: string) => {
    return incompleteSections.includes('hx-complaint') && (
      (field === 'complaints' && formData.complaints.length === 0) ||
      (field === 'dateOfOnset' && !formData.dateOfOnset)
    )
  }

  const handleComplaintChange = (complaint: string, checked: boolean) => {
    if (complaint === 'Other') {
      if (checked) {
        setTempOtherText(formData.otherComplaint)
        setShowOtherModal(true)
      } else {
        setFormData({
          ...formData,
          complaints: formData.complaints.filter((c: string) => c !== 'Other'),
          otherComplaint: ''
        })
      }
    } else {
      if (checked) {
        setFormData({
          ...formData,
          complaints: [...formData.complaints, complaint]
        })
      } else {
        setFormData({
          ...formData,
          complaints: formData.complaints.filter((c: string) => c !== complaint)
        })
      }
    }
  }

  const handleOtherOk = () => {
    setFormData({
      ...formData,
      complaints: [...formData.complaints.filter((c: string) => c !== 'Other'), 'Other'],
      otherComplaint: tempOtherText
    })
    setShowOtherModal(false)
  }

  const handleOtherCancel = () => {
    setTempOtherText('')
    setShowOtherModal(false)
  }

  const handleMechanismChange = (mechanism: string) => {
    if (mechanism === 'Other') {
      setTempOtherMechanism(formData.otherMechanism)
      setShowOtherMechanismModal(true)
    } else {
      setFormData({
        ...formData,
        mechanismOfInjury: mechanism,
        otherMechanism: ''
      })
    }
  }

  const handleOtherMechanismOk = () => {
    setFormData({
      ...formData,
      mechanismOfInjury: 'Other',
      otherMechanism: tempOtherMechanism
    })
    setShowOtherMechanismModal(false)
  }

  const handleOtherMechanismCancel = () => {
    setTempOtherMechanism('')
    setShowOtherMechanismModal(false)
  }

  const handleSportsClick = () => {
    setShowSportsModal(true)
  }

  const handleSportsSelect = (sport: string) => {
    if (sport === 'Other') {
      setTempOtherSports('')
      setShowSportsModal(false)
      setShowOtherSportsModal(true)
    } else {
      setFormData({
        ...formData,
        sports: sport
      })
      setShowSportsModal(false)
    }
  }

  const handleOtherSportsOk = () => {
    setFormData({
      ...formData,
      sports: tempOtherSports
    })
    setShowOtherSportsModal(false)
  }

  const handleOtherSportsCancel = () => {
    setTempOtherSports('')
    setShowOtherSportsModal(false)
  }

  const handleOnsetUnknownChange = (checked: boolean) => {
    setFormData({
      ...formData,
      onsetUnknown: checked,
      dateOfOnset: checked ? '' : formData.dateOfOnset
    })
  }

  const openDateTimePicker = () => {
    if (formData.onsetUnknown) return
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
    setFormData({
      ...formData,
      dateOfOnset: formatted
    })
    setShowDateTimePicker(false)
  }

  const setNow = () => {
    if (formData.onsetUnknown) return
    const now = new Date()
    const formatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setFormData({
      ...formData,
      dateOfOnset: formatted
    })
  }

  const handleHistoryChange = (value: string) => {
    setFormData({
      ...formData,
      historyOfIncident: value
    })
  }

  return (
    <div className="eprf-dashboard incident-page">
      <div className="eprf-nav">
        <button className="nav-btn" onClick={handleHome}>Home</button>
        <button className="nav-btn">Tools</button>
        <button className="nav-btn" onClick={handleAdminPanel}>Admin Panel</button>
        <button className="nav-btn" onClick={handleLogout}>Manage Crew</button>
        <div className="page-counter">
          <span className="patient-letter">{patientLetter}</span>
          <span className="page-indicator">{currentPage} of 2</span>
        </div>
      </div>

      <div className="incident-layout">
        <aside className="sidebar">
          <button className={`sidebar-btn${incompleteSections.includes('incident') ? ' incomplete' : ''}`} onClick={() => navigateTo('incident')}>Incident Information</button>
          <button className={`sidebar-btn${incompleteSections.includes('patient-info') ? ' incomplete' : ''}`} onClick={() => navigateTo('patient-info')}>Patient Information</button>
          <button className={`sidebar-btn${incompleteSections.includes('primary-survey') ? ' incomplete' : ''}`} onClick={() => navigateTo('primary-survey')}>Primary Survey</button>
          <button className={`sidebar-btn${incompleteSections.includes('vital-obs') ? ' incomplete' : ''}`} onClick={() => navigateTo('vital-obs')}>Vital Obs / Treat</button>
          <button className={`sidebar-btn active${incompleteSections.includes('hx-complaint') ? ' incomplete' : ''}`} onClick={() => navigateTo('hx-complaint')}>Hx Complaint</button>
          <button className={`sidebar-btn${incompleteSections.includes('past-medical-history') ? ' incomplete' : ''}`} onClick={() => navigateTo('past-medical-history')}>Past Medical History</button>
          <button className={`sidebar-btn${incompleteSections.includes('clinical-impression') ? ' incomplete' : ''}`} onClick={() => navigateTo('clinical-impression')}>Clinical Impression</button>
          <button className={`sidebar-btn${incompleteSections.includes('disposition') ? ' incomplete' : ''}`} onClick={() => navigateTo('disposition')}>Disposition</button>
          <button className="sidebar-btn" onClick={() => navigateTo('media')}>Media</button>
        </aside>

        <main className="incident-content">
          {currentPage === 1 ? (
            <section className="incident-section">
              <div className="form-group">
                <label className={`field-label required ${hasFieldError('complaints') ? 'validation-error-label' : ''}`}>Presenting Complaint (Reason Ambulance Called)</label>
                <div style={{ display: 'flex', gap: '40px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {leftColumnComplaints.map((complaint) => (
                      <label key={complaint} className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={formData.complaints.includes(complaint)}
                          onChange={(e) => handleComplaintChange(complaint, e.target.checked)}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ color: '#1a1a1a' }}>{complaint}</span>
                      </label>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {rightColumnComplaints.map((complaint) => (
                      <label key={complaint} className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={formData.complaints.includes(complaint)}
                          onChange={(e) => handleComplaintChange(complaint, e.target.checked)}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ color: '#1a1a1a' }}>{complaint}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <label className={`field-label required ${hasFieldError('dateOfOnset') ? 'validation-error-label' : ''}`}>Date of Onset</label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                      <input
                        type="text"
                        className={`text-input ${hasFieldError('dateOfOnset') ? 'validation-error' : ''}`}
                        value={formData.dateOfOnset}
                        onClick={openDateTimePicker}
                        readOnly
                        placeholder=""
                        disabled={formData.onsetUnknown}
                        style={{ 
                          flex: 1,
                          backgroundColor: formData.onsetUnknown ? '#d0d0d0' : '#fff',
                          color: formData.onsetUnknown ? '#888' : '#000',
                          cursor: formData.onsetUnknown ? 'not-allowed' : 'pointer'
                        }}
                      />
                      <button 
                        className="now-btn" 
                        onClick={setNow}
                        disabled={formData.onsetUnknown}
                        style={{
                          opacity: formData.onsetUnknown ? 0.5 : 1,
                          cursor: formData.onsetUnknown ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Now
                      </button>
                    </div>
                  </div>
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                    <input
                      type="checkbox"
                      checked={formData.onsetUnknown}
                      onChange={(e) => handleOnsetUnknownChange(e.target.checked)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ color: '#1a1a1a' }}>Onset unknown</span>
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="field-label">History of Incident</label>
                <textarea
                  className="text-input"
                  value={formData.historyOfIncident}
                  onChange={(e) => handleHistoryChange(e.target.value)}
                  style={{ 
                    width: '100%', 
                    minHeight: '120px', 
                    resize: 'vertical',
                    marginTop: '5px'
                  }}
                />
              </div>
            </section>
          ) : (
            <section className="incident-section">
              <div className="form-group">
                <label className="field-label">Mechanism of Injury</label>
                <div style={{ display: 'flex', gap: '40px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {leftColumnMechanism.map((mechanism) => (
                      <label key={mechanism} className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="radio"
                          name="mechanism"
                          checked={formData.mechanismOfInjury === mechanism || (mechanism === 'Other' && formData.mechanismOfInjury === 'Other')}
                          onChange={() => handleMechanismChange(mechanism)}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ color: '#1a1a1a' }}>{mechanism}</span>
                      </label>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {rightColumnMechanism.map((mechanism) => (
                      <label key={mechanism} className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="radio"
                          name="mechanism"
                          checked={formData.mechanismOfInjury === mechanism}
                          onChange={() => handleMechanismChange(mechanism)}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ color: '#1a1a1a' }}>{mechanism}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="field-label">Sports</label>
                <input
                  type="text"
                  className="text-input"
                  value={formData.sports}
                  onClick={handleSportsClick}
                  readOnly
                  placeholder=""
                  style={{ 
                    width: '100%',
                    cursor: 'pointer',
                    marginTop: '5px'
                  }}
                />
              </div>
            </section>
          )}
        </main>
      </div>

      <div className="eprf-footer">
        <div className="footer-left">
          <button className="footer-btn internet">Internet</button>
          <button className="footer-btn server">Server</button>
          <button className="footer-btn green" onClick={handleAddPatientClick}>Add Patient</button>
          <button className="footer-btn green" onClick={handleTransferClick}>Transfer ePRF</button>
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

      {/* Date Time Picker Modal */}
      {showDateTimePicker && (
        <div className="modal-overlay" onClick={() => setShowDateTimePicker(false)}>
          <div className="datetime-picker" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">Set Date of Onset</div>
            <div className="picker-display">
              {String(pickerDay).padStart(2, '0')}/{String(pickerMonth).padStart(2, '0')}/{pickerYear} {String(pickerHour).padStart(2, '0')}:{String(pickerMinute).padStart(2, '0')}
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

      {/* Other Complaint Modal */}
      {showOtherModal && (
        <div className="modal-overlay" onClick={handleOtherCancel}>
          <div className="gcs-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="gcs-header">Other Complaint</div>
            <div style={{ padding: '20px' }}>
              <label className="field-label">Please specify the complaint:</label>
              <textarea
                className="text-input"
                value={tempOtherText}
                onChange={(e) => setTempOtherText(e.target.value)}
                style={{ 
                  width: '100%', 
                  minHeight: '100px', 
                  resize: 'vertical',
                  marginTop: '10px'
                }}
                autoFocus
              />
            </div>
            <div className="gcs-actions">
              <button className="gcs-btn cancel" onClick={handleOtherCancel}>Cancel</button>
              <button className="gcs-btn ok" onClick={handleOtherOk}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Other Mechanism Modal */}
      {showOtherMechanismModal && (
        <div className="modal-overlay" onClick={handleOtherMechanismCancel}>
          <div className="gcs-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="gcs-header">Other Mechanism of Injury</div>
            <div style={{ padding: '20px' }}>
              <label className="field-label">Please specify the mechanism:</label>
              <textarea
                className="text-input"
                value={tempOtherMechanism}
                onChange={(e) => setTempOtherMechanism(e.target.value)}
                style={{ 
                  width: '100%', 
                  minHeight: '100px', 
                  resize: 'vertical',
                  marginTop: '10px'
                }}
                autoFocus
              />
            </div>
            <div className="gcs-actions">
              <button className="gcs-btn cancel" onClick={handleOtherMechanismCancel}>Cancel</button>
              <button className="gcs-btn ok" onClick={handleOtherMechanismOk}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Sports Selection Modal */}
      {showSportsModal && (
        <div className="modal-overlay" onClick={() => setShowSportsModal(false)}>
          <div className="gcs-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '80vh' }}>
            <div className="gcs-header" style={{ backgroundColor: '#4a6fa5', color: '#8b0000', fontWeight: 'bold' }}>Sports</div>
            <div style={{ 
              maxHeight: '60vh', 
              overflowY: 'auto',
              backgroundColor: '#d4e4f7'
            }}>
              {sportsOptions.map((sport, index) => (
                <div 
                  key={sport}
                  onClick={() => handleSportsSelect(sport)}
                  style={{
                    padding: '15px 20px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #b8c8d8',
                    backgroundColor: index % 2 === 0 ? '#d4e4f7' : '#e4f0fc',
                    color: '#000',
                    fontSize: '18px'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#a8c4e4'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#d4e4f7' : '#e4f0fc'}
                >
                  {sport}
                </div>
              ))}
            </div>
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#4a6fa5',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button 
                onClick={() => setShowSportsModal(false)}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#a8d4e6',
                  border: '1px solid #6a8a9a',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Other Sports Modal */}
      {showOtherSportsModal && (
        <div className="modal-overlay" onClick={handleOtherSportsCancel}>
          <div className="gcs-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="gcs-header">Other Sport</div>
            <div style={{ padding: '20px' }}>
              <label className="field-label">Please specify the sport:</label>
              <input
                type="text"
                className="text-input"
                value={tempOtherSports}
                onChange={(e) => setTempOtherSports(e.target.value)}
                style={{ 
                  width: '100%', 
                  marginTop: '10px'
                }}
                autoFocus
              />
            </div>
            <div className="gcs-actions">
              <button className="gcs-btn cancel" onClick={handleOtherSportsCancel}>Cancel</button>
              <button className="gcs-btn ok" onClick={handleOtherSportsOk}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
