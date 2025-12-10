"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
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
import { checkEPRFAccess, checkCanTransferPatient, PermissionLevel, canManageCollaborators } from '../utils/apiClient'

export const runtime = 'edge'

export default function PrimarySurveyPage() {
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

  const [clinicalStatus, setClinicalStatus] = useState('')
  const [responsiveness, setResponsiveness] = useState('')
  const [airway, setAirway] = useState('')
  const [breathing, setBreathing] = useState('')
  const [circulation, setCirculation] = useState('')
  const [bloodLoss, setBloodLoss] = useState('')

  // Load patient letter on mount
  useEffect(() => {
    if (incidentId) {
      setPatientLetter(getCurrentPatientLetter(incidentId))
    }
  }, [incidentId])

  // Load saved data on mount
  useEffect(() => {
    if (incidentId) {
      const saved = localStorage.getItem(`primary_survey_${incidentId}`)
      if (saved) {
        try {
          const p = JSON.parse(saved)
          if (p.clinicalStatus) setClinicalStatus(p.clinicalStatus)
          if (p.responsiveness) setResponsiveness(p.responsiveness)
          if (p.airway) setAirway(p.airway)
          if (p.breathing) setBreathing(p.breathing)
          if (p.circulation) setCirculation(p.circulation)
          if (p.bloodLoss) setBloodLoss(p.bloodLoss)
        } catch (e) {
          console.error('Failed to load saved primary survey:', e)
        }
      }
    }
  }, [incidentId])

  // Save data whenever it changes
  useEffect(() => {
    if (incidentId) {
      const data = { clinicalStatus, responsiveness, airway, breathing, circulation, bloodLoss }
      localStorage.setItem(`primary_survey_${incidentId}`, JSON.stringify(data))
    }
  }, [incidentId, clinicalStatus, responsiveness, airway, breathing, circulation, bloodLoss])

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

  const hasFieldError = (field: string) => {
    return incompleteSections.includes('primary-survey') && (
      (field === 'clinicalStatus' && !clinicalStatus) ||
      (field === 'responsiveness' && !responsiveness) ||
      (field === 'airway' && !airway) ||
      (field === 'breathing' && !breathing) ||
      (field === 'circulation' && !circulation) ||
      (field === 'bloodLoss' && !bloodLoss)
    )
  }

  const handleLogout = () => {
    clearCurrentUser()
    router.replace('/')
  }

  const handleHome = () => {
    const params = new URLSearchParams({ fleetId })
    router.push(`/dashboard?${params}`)
  }

  // Admin Panel removed from primary-survey page

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
    navigateTo('patient-info')
  }

  const handleNext = () => {
    navigateTo('vital-obs')
  }

  return (
    <div className="eprf-dashboard incident-page">
      <div className="eprf-nav">
        <button className="nav-btn" onClick={handleHome}>Home</button>
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
        {/* Admin Panel button removed from primary-survey page */}
        <button className="nav-btn" onClick={handleLogout}>Logout</button>
        {incidentId && patientLetter && (
          <PresenceIndicator 
            incidentId={incidentId}
            patientLetter={patientLetter}
            userDiscordId={getCurrentUser()?.discordId || ''}
            userCallsign={getCurrentUser()?.callsign || ''}
            pageName="primary-survey"
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
          <button className={`sidebar-btn active${incompleteSections.includes('primary-survey') ? ' incomplete' : ''}`}>Primary Survey</button>
          <button className={`sidebar-btn${incompleteSections.includes('vital-obs') ? ' incomplete' : ''}`} onClick={() => navigateTo('vital-obs')}>Vital Obs / Treat</button>
          <button className={`sidebar-btn${incompleteSections.includes('hx-complaint') ? ' incomplete' : ''}`} onClick={() => navigateTo('hx-complaint')}>Hx Complaint</button>
          <button className={`sidebar-btn${incompleteSections.includes('past-medical-history') ? ' incomplete' : ''}`} onClick={() => navigateTo('past-medical-history')}>Past Medical History</button>
          <button className={`sidebar-btn${incompleteSections.includes('clinical-impression') ? ' incomplete' : ''}`} onClick={() => navigateTo('clinical-impression')}>Clinical Impression</button>
          <button className={`sidebar-btn${incompleteSections.includes('disposition') ? ' incomplete' : ''}`} onClick={() => navigateTo('disposition')}>Disposition</button>
          <button className="sidebar-btn" onClick={() => navigateTo('media')}>Media</button>
        </aside>

        <main className="incident-content">
          <section className="incident-section">
            <h2 className="section-title">Primary Survey</h2>
            
            <div className="form-row">
              <div className="form-field full-width">
                <label className={`field-label required ${hasFieldError('clinicalStatus') ? 'validation-error-label' : ''}`}>Clinical Status at Scene</label>
                <div className={`survey-options ${hasFieldError('clinicalStatus') ? 'validation-error-radio' : ''}`}>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="clinicalStatus" 
                      value="0"
                      checked={clinicalStatus === '0'}
                      onChange={(e) => setClinicalStatus(e.target.value)}
                    />
                    0
                  </label>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="clinicalStatus" 
                      value="1"
                      checked={clinicalStatus === '1'}
                      onChange={(e) => setClinicalStatus(e.target.value)}
                    />
                    1
                  </label>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="clinicalStatus" 
                      value="2"
                      checked={clinicalStatus === '2'}
                      onChange={(e) => setClinicalStatus(e.target.value)}
                    />
                    2
                  </label>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="clinicalStatus" 
                      value="3"
                      checked={clinicalStatus === '3'}
                      onChange={(e) => setClinicalStatus(e.target.value)}
                    />
                    3
                  </label>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="clinicalStatus" 
                      value="4"
                      checked={clinicalStatus === '4'}
                      onChange={(e) => setClinicalStatus(e.target.value)}
                    />
                    4
                  </label>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field full-width">
                <label className={`field-label required ${hasFieldError('responsiveness') ? 'validation-error-label' : ''}`}>Responsiveness</label>
                <div className={`survey-options ${hasFieldError('responsiveness') ? 'validation-error-radio' : ''}`}>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="responsiveness" 
                      value="Alert"
                      checked={responsiveness === 'Alert'}
                      onChange={(e) => setResponsiveness(e.target.value)}
                    />
                    Alert
                  </label>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="responsiveness" 
                      value="Voice"
                      checked={responsiveness === 'Voice'}
                      onChange={(e) => setResponsiveness(e.target.value)}
                    />
                    Voice
                  </label>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="responsiveness" 
                      value="Pain"
                      checked={responsiveness === 'Pain'}
                      onChange={(e) => setResponsiveness(e.target.value)}
                    />
                    Pain
                  </label>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="responsiveness" 
                      value="Unresponsive"
                      checked={responsiveness === 'Unresponsive'}
                      onChange={(e) => setResponsiveness(e.target.value)}
                    />
                    Unresponsive
                  </label>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field full-width">
                <label className={`field-label required ${hasFieldError('airway') ? 'validation-error-label' : ''}`}>Airway</label>
                <div className={`survey-options ${hasFieldError('airway') ? 'validation-error-radio' : ''}`}>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="airway" 
                      value="Patent (Clear)"
                      checked={airway === 'Patent (Clear)'}
                      onChange={(e) => setAirway(e.target.value)}
                    />
                    Patent (Clear)
                  </label>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="airway" 
                      value="Partially obstructed"
                      checked={airway === 'Partially obstructed'}
                      onChange={(e) => setAirway(e.target.value)}
                    />
                    Partially obstructed
                  </label>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="airway" 
                      value="Obstructed"
                      checked={airway === 'Obstructed'}
                      onChange={(e) => setAirway(e.target.value)}
                    />
                    Obstructed
                  </label>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field full-width">
                <label className={`field-label required ${hasFieldError('breathing') ? 'validation-error-label' : ''}`}>Breathing</label>
                <div className={`survey-options ${hasFieldError('breathing') ? 'validation-error-radio' : ''}`}>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="breathing" 
                      value="Effective"
                      checked={breathing === 'Effective'}
                      onChange={(e) => setBreathing(e.target.value)}
                    />
                    Effective
                  </label>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="breathing" 
                      value="Ineffective"
                      checked={breathing === 'Ineffective'}
                      onChange={(e) => setBreathing(e.target.value)}
                    />
                    Ineffective
                  </label>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="breathing" 
                      value="Absent"
                      checked={breathing === 'Absent'}
                      onChange={(e) => setBreathing(e.target.value)}
                    />
                    Absent
                  </label>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field full-width">
                <label className={`field-label required ${hasFieldError('circulation') ? 'validation-error-label' : ''}`}>Circulation</label>
                <div className={`survey-options ${hasFieldError('circulation') ? 'validation-error-radio' : ''}`}>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="circulation" 
                      value="Normal"
                      checked={circulation === 'Normal'}
                      onChange={(e) => setCirculation(e.target.value)}
                    />
                    Normal
                  </label>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="circulation" 
                      value="Compromised"
                      checked={circulation === 'Compromised'}
                      onChange={(e) => setCirculation(e.target.value)}
                    />
                    Compromised
                  </label>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="circulation" 
                      value="Absent"
                      checked={circulation === 'Absent'}
                      onChange={(e) => setCirculation(e.target.value)}
                    />
                    Absent
                  </label>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field full-width">
                <label className={`field-label required ${hasFieldError('bloodLoss') ? 'validation-error-label' : ''}`}>Blood Loss</label>
                <div className={`survey-options ${hasFieldError('bloodLoss') ? 'validation-error-radio' : ''}`}>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="bloodLoss" 
                      value="Nil"
                      checked={bloodLoss === 'Nil'}
                      onChange={(e) => setBloodLoss(e.target.value)}
                    />
                    Nil
                  </label>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="bloodLoss" 
                      value="Not life threatening"
                      checked={bloodLoss === 'Not life threatening'}
                      onChange={(e) => setBloodLoss(e.target.value)}
                    />
                    Not life threatening
                  </label>
                  <label className="survey-option">
                    <input 
                      type="radio" 
                      name="bloodLoss" 
                      value="Life threatening"
                      checked={bloodLoss === 'Life threatening'}
                      onChange={(e) => setBloodLoss(e.target.value)}
                    />
                    Life threatening
                  </label>
                </div>
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
          setPatientLetter(letter)
          const params = new URLSearchParams({ id: incidentId, fleetId })
          router.push(`/primary-survey?${params}`)
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
