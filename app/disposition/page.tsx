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
import { isAdmin, checkEPRFAccess, checkCanTransferPatient, PermissionLevel, canManageCollaborators } from '../utils/apiClient'

export const runtime = 'edge'

export default function DispositionPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const incidentId = searchParams?.get('id') || ''
  const fleetId = searchParams?.get('fleetId') || ''

  const [incompleteSections, setIncompleteSections] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = 2
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

  const [formData, setFormData] = useState({
    disposition: '',
    noTreatmentReason: 'Transport not indicated',
    noTransportReason: '',
    finalPatientStatus: '',
    dispositionNotes: '',
    referralPathway: '',
    acsAccessCode: '',
    reasonForDelay: '',
    // Page 2
    nonTransportAdvice: '',
    copyToGP: '',
    noteToGP: '',
    flagForAudit: false,
    auditReason: ''
  })

  // Load patient letter on mount
  useEffect(() => {
    if (incidentId) {
      setPatientLetter(getCurrentPatientLetter(incidentId))
    }
  }, [incidentId])

  // Load saved data on mount
  useEffect(() => {
    if (incidentId) {
      const saved = localStorage.getItem(`disposition_${incidentId}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setFormData(prev => ({ ...prev, ...parsed }))
        } catch (e) {
          console.error('Failed to parse saved data:', e)
        }
      }
    }
  }, [incidentId])

  // Save data whenever it changes
  useEffect(() => {
    if (incidentId) {
      localStorage.setItem(`disposition_${incidentId}`, JSON.stringify(formData))
    }
  }, [formData, incidentId])

  const noTreatmentReasons = [
    'Treatment not indicated',
    'Patient declined treatment',
    'Patient absconded',
    'Patient deceased'
  ]

  const noTransportReasons = [
    'Transport not indicated',
    'Patient declined transport',
    'Patient absconded',
    'Patient deceased'
  ]

  const handleLogout = () => {
    clearCurrentUser()
    router.replace('/')
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
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    } else {
      navigateTo('clinical-impression')
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    } else {
      navigateTo('media')
    }
  }

  const handleSubmitEPRF = () => {
    const result = validateAllSections(incidentId)
    setIncompleteSections(result.incompleteSections)
    
    if (result.isValid) {
      // Show confirmation modal
      setShowSubmitModal(true)
    } else {
      // Show validation error modal
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
        
        // Navigate to patient info for the new patient
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
    return incompleteSections.includes('disposition') && (
      (field === 'disposition' && !formData.disposition) ||
      (field === 'finalPatientStatus' && !formData.finalPatientStatus) ||
      (field === 'copyToGP' && !formData.copyToGP)
    )
  }

  const handleRadioChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Check if non-transport was selected (any option other than Transport)
  const isNonTransport = formData.disposition !== '' && formData.disposition !== 'Transport'

  return (
    <div className="eprf-dashboard incident-page">
      <style jsx>{`
        .disposition-section {
          padding: 20px;
        }

        .disposition-title {
          font-size: 16px;
          font-weight: bold;
          color: #1a3a5c;
          margin-bottom: 15px;
        }

        .disposition-title.required::after {
          content: '*';
          color: #cc0000;
          margin-left: 2px;
        }

        .disposition-options {
          display: flex;
          gap: 60px;
          margin-bottom: 25px;
        }

        .disposition-option {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 15px;
          color: #1a3a5c;
        }

        .disposition-option input[type="radio"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }

        .reason-row {
          display: flex;
          gap: 40px;
          margin-bottom: 25px;
        }

        .reason-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .reason-label {
          font-size: 15px;
          font-weight: bold;
          color: #1a3a5c;
        }

        .reason-select {
          padding: 8px 12px;
          font-size: 14px;
          border: 1px solid #7a9cc0;
          border-radius: 3px;
          background: white;
          min-width: 200px;
          cursor: pointer;
        }

        .reason-select:focus {
          outline: none;
          border-color: #5a8ab8;
        }

        .status-section {
          margin-bottom: 25px;
        }

        .status-title {
          font-size: 15px;
          font-weight: bold;
          color: #1a3a5c;
          margin-bottom: 10px;
        }

        .status-title.required::after {
          content: '*';
          color: #cc0000;
          margin-left: 2px;
        }

        .status-options {
          display: flex;
          gap: 50px;
        }

        .status-option {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 15px;
          color: #1a3a5c;
        }

        .status-option input[type="radio"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }

        .notes-section {
          margin-bottom: 25px;
        }

        .notes-label {
          font-size: 15px;
          font-weight: bold;
          color: #1a3a5c;
          margin-bottom: 8px;
          display: block;
        }

        .notes-textarea {
          width: 100%;
          min-height: 80px;
          padding: 10px 12px;
          font-size: 14px;
          border: 1px solid #7a9cc0;
          border-radius: 3px;
          background: white;
          resize: vertical;
          font-family: inherit;
        }

        .notes-textarea:focus {
          outline: none;
          border-color: #5a8ab8;
        }

        .pathway-row {
          display: flex;
          gap: 30px;
          margin-bottom: 25px;
        }

        .pathway-field {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .pathway-label {
          font-size: 15px;
          font-weight: bold;
          color: #1a3a5c;
        }

        .pathway-input {
          padding: 8px 12px;
          font-size: 14px;
          border: 1px solid #7a9cc0;
          border-radius: 3px;
          background: #d0d8e0;
          color: #666;
          cursor: not-allowed;
        }

        .pathway-input.grayed {
          background: #c8d0d8;
          pointer-events: none;
        }

        .delay-section {
          margin-bottom: 25px;
        }

        .delay-label {
          font-size: 15px;
          font-weight: bold;
          color: #1a3a5c;
          margin-bottom: 8px;
          display: block;
        }

        .delay-input {
          width: 100%;
          padding: 10px 12px;
          font-size: 14px;
          border: 1px solid #7a9cc0;
          border-radius: 3px;
          background: white;
          font-family: inherit;
        }

        .delay-input:focus {
          outline: none;
          border-color: #5a8ab8;
        }

        /* Page 2 styles */
        .page2-section {
          padding: 20px;
        }

        .non-transport-section {
          margin-bottom: 25px;
        }

        .section-label {
          font-size: 15px;
          font-weight: bold;
          color: #1a3a5c;
          background: #6a7ba2;
          color: white;
          padding: 2px 8px;
          display: inline-block;
          margin-bottom: 8px;
        }

        .large-textarea {
          width: 100%;
          min-height: 100px;
          padding: 10px 12px;
          font-size: 14px;
          border: 1px solid #7a9cc0;
          border-radius: 3px;
          background: white;
          resize: vertical;
          font-family: inherit;
        }

        .large-textarea:focus {
          outline: none;
          border-color: #5a8ab8;
        }

        .large-textarea.grayed {
          background: #c8d0d8;
          color: #666;
          cursor: not-allowed;
        }

        .gp-section {
          margin-bottom: 25px;
        }

        .gp-row {
          display: flex;
          align-items: flex-start;
          gap: 40px;
          margin-bottom: 15px;
        }

        .gp-options {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .gp-title {
          font-size: 15px;
          font-weight: bold;
          color: white;
          background: #6a7ba2;
          padding: 2px 8px;
          display: inline-block;
          margin-bottom: 8px;
        }

        .gp-title.required::after {
          content: '*';
          color: #cc0000;
          margin-left: 2px;
        }

        .gp-option {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 15px;
          color: #1a3a5c;
        }

        .gp-option input[type="radio"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .gp-textarea-area {
          flex: 1;
        }

        .gp-textarea {
          width: 100%;
          height: 60px;
          padding: 8px 10px;
          font-size: 14px;
          border: 1px solid #7a9cc0;
          border-radius: 3px;
          background: white;
          font-family: inherit;
          resize: none;
        }

        .gp-textarea.grayed {
          background: #c8d0d8;
          color: #666;
          cursor: not-allowed;
        }

        .gp-notes-textarea {
          width: 100%;
          height: 60px;
          padding: 8px 10px;
          font-size: 14px;
          border: 1px solid #7a9cc0;
          border-radius: 3px;
          background: white;
          font-family: inherit;
          resize: none;
        }

        .gp-notes-textarea.grayed {
          background: #c8d0d8;
          color: #666;
          cursor: not-allowed;
        }

        .note-to-gp-section {
          margin-bottom: 25px;
        }

        .note-to-gp-label {
          font-size: 15px;
          font-weight: bold;
          color: white;
          background: #6a7ba2;
          padding: 2px 8px;
          display: inline-block;
          margin-bottom: 8px;
        }

        .note-to-gp-input {
          width: 100%;
          padding: 10px 12px;
          font-size: 14px;
          border: 1px solid #7a9cc0;
          border-radius: 3px;
          background: white;
          font-family: inherit;
        }

        .note-to-gp-input:focus {
          outline: none;
          border-color: #5a8ab8;
        }

        .audit-section {
          display: flex;
          align-items: flex-start;
          gap: 40px;
          margin-bottom: 25px;
        }

        .audit-checkbox-area {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-top: 25px;
        }

        .audit-checkbox {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }

        .audit-label {
          font-size: 15px;
          font-weight: bold;
          color: white;
          background: #6a7ba2;
          padding: 2px 8px;
          cursor: pointer;
        }

        .audit-reason-area {
          flex: 1;
        }

        .reason-title {
          font-size: 15px;
          font-weight: bold;
          color: white;
          background: #6a7ba2;
          padding: 2px 8px;
          display: inline-block;
          margin-bottom: 8px;
        }

        .reason-input {
          width: 100%;
          padding: 10px 12px;
          font-size: 14px;
          border: 1px solid #7a9cc0;
          border-radius: 3px;
          background: white;
          font-family: inherit;
        }

        .reason-input:focus {
          outline: none;
          border-color: #5a8ab8;
        }

        .reason-input.grayed {
          background: #c8d0d8;
          color: #666;
          cursor: not-allowed;
        }
      `}</style>

      <div className="eprf-nav">
        <button className="nav-btn" onClick={handleHome}>Home</button>
        <button className="nav-btn" onClick={() => setShowPatientManagementModal(true)}>Manage Patients</button>
        {canManageCollaborators(userPermission) && (
          <button className="nav-btn" onClick={() => setShowCollaboratorsModal(true)}>Manage Collaborators</button>
        )}
        <button className="nav-btn" onClick={handleAdminPanel}>Admin Panel</button>
        <button className="nav-btn" onClick={handleLogout}>Logout</button>
        {incidentId && patientLetter && (
          <PresenceIndicator 
            incidentId={incidentId}
            patientLetter={patientLetter}
            userDiscordId={getCurrentUser()?.discordId || ''}
            userCallsign={getCurrentUser()?.callsign || ''}
            pageName="disposition"
          />
        )}
        <div className="page-counter">
          <span className="patient-letter">{patientLetter}</span>
          <span className="page-indicator">{currentPage} of {totalPages}</span>
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
          <button className={`sidebar-btn active${incompleteSections.includes('disposition') ? ' incomplete' : ''}`}>Disposition</button>
          <button className="sidebar-btn" onClick={() => navigateTo('media')}>Media</button>
        </aside>

        <main className="incident-content">
          {currentPage === 1 && (
          <section className="incident-section disposition-section">
            {/* Disposition */}
            <div className={`disposition-title required ${hasFieldError('disposition') ? 'validation-error-label' : ''}`}>Disposition</div>
            <div className={`disposition-options ${hasFieldError('disposition') ? 'validation-error-radio' : ''}`}>
              <label className="disposition-option">
                <input
                  type="radio"
                  name="disposition"
                  value="Transport"
                  checked={formData.disposition === 'Transport'}
                  onChange={(e) => handleRadioChange('disposition', e.target.value)}
                />
                Transport
              </label>
              <label className="disposition-option">
                <input
                  type="radio"
                  name="disposition"
                  value="Treat or Assist only"
                  checked={formData.disposition === 'Treat or Assist only'}
                  onChange={(e) => handleRadioChange('disposition', e.target.value)}
                />
                Treat or Assist only
              </label>
              <label className="disposition-option">
                <input
                  type="radio"
                  name="disposition"
                  value="Treat and Refer"
                  checked={formData.disposition === 'Treat and Refer'}
                  onChange={(e) => handleRadioChange('disposition', e.target.value)}
                />
                Treat and Refer
              </label>
              <label className="disposition-option">
                <input
                  type="radio"
                  name="disposition"
                  value="No treatment"
                  checked={formData.disposition === 'No treatment'}
                  onChange={(e) => handleRadioChange('disposition', e.target.value)}
                />
                No treatment
              </label>
            </div>

            {/* No Treatment Reason and No Transport Reason */}
            <div className="reason-row">
              <div className="reason-field">
                <label className="reason-label">No Treatment Reason</label>
                <select
                  className="reason-select"
                  value={formData.noTreatmentReason}
                  onChange={(e) => handleInputChange('noTreatmentReason', e.target.value)}
                >
                  {noTreatmentReasons.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              <div className="reason-field">
                <label className="reason-label">No Transport Reason</label>
                <select
                  className="reason-select"
                  value={formData.noTransportReason}
                  onChange={(e) => handleInputChange('noTransportReason', e.target.value)}
                >
                  <option value=""></option>
                  {noTransportReasons.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Final Patient Status */}
            <div className="status-section">
              <div className={`status-title required ${hasFieldError('finalPatientStatus') ? 'validation-error-label' : ''}`}>Final Patient Status</div>
              <div className={`status-options ${hasFieldError('finalPatientStatus') ? 'validation-error-radio' : ''}`}>
                <label className="status-option">
                  <input
                    type="radio"
                    name="finalPatientStatus"
                    value="0"
                    checked={formData.finalPatientStatus === '0'}
                    onChange={(e) => handleRadioChange('finalPatientStatus', e.target.value)}
                  />
                  0
                </label>
                <label className="status-option">
                  <input
                    type="radio"
                    name="finalPatientStatus"
                    value="1"
                    checked={formData.finalPatientStatus === '1'}
                    onChange={(e) => handleRadioChange('finalPatientStatus', e.target.value)}
                  />
                  1
                </label>
                <label className="status-option">
                  <input
                    type="radio"
                    name="finalPatientStatus"
                    value="2"
                    checked={formData.finalPatientStatus === '2'}
                    onChange={(e) => handleRadioChange('finalPatientStatus', e.target.value)}
                  />
                  2
                </label>
                <label className="status-option">
                  <input
                    type="radio"
                    name="finalPatientStatus"
                    value="3"
                    checked={formData.finalPatientStatus === '3'}
                    onChange={(e) => handleRadioChange('finalPatientStatus', e.target.value)}
                  />
                  3
                </label>
                <label className="status-option">
                  <input
                    type="radio"
                    name="finalPatientStatus"
                    value="4"
                    checked={formData.finalPatientStatus === '4'}
                    onChange={(e) => handleRadioChange('finalPatientStatus', e.target.value)}
                  />
                  4
                </label>
              </div>
            </div>

            {/* Disposition Notes */}
            <div className="notes-section">
              <label className="notes-label">Disposition Notes</label>
              <textarea
                className="notes-textarea"
                value={formData.dispositionNotes}
                onChange={(e) => handleInputChange('dispositionNotes', e.target.value)}
                placeholder=""
              />
            </div>

            {/* Referral Pathway and ACS access code */}
            <div className="pathway-row">
              <div className="pathway-field">
                <label className="pathway-label">Referral Pathway</label>
                <input
                  type="text"
                  className="pathway-input grayed"
                  value={formData.referralPathway}
                  disabled
                  readOnly
                />
              </div>

              <div className="pathway-field">
                <label className="pathway-label">ACS access code</label>
                <input
                  type="text"
                  className="pathway-input grayed"
                  value={formData.acsAccessCode}
                  disabled
                  readOnly
                />
              </div>
            </div>

            {/* Reason for delay at scene */}
            <div className="delay-section">
              <label className="delay-label">Reason for delay at scene</label>
              <input
                type="text"
                className="delay-input"
                value={formData.reasonForDelay}
                onChange={(e) => handleInputChange('reasonForDelay', e.target.value)}
                placeholder=""
              />
            </div>
          </section>
          )}

          {currentPage === 2 && (
          <section className="incident-section page2-section">
            {/* Non Transport Advice */}
            <div className="non-transport-section">
              <label className="section-label">Non Transport Advice</label>
              <textarea
                className={`large-textarea ${!isNonTransport ? 'grayed' : ''}`}
                value={formData.nonTransportAdvice}
                onChange={(e) => handleInputChange('nonTransportAdvice', e.target.value)}
                disabled={!isNonTransport}
                placeholder=""
              />
            </div>

            {/* Copy to GP */}
            <div className="gp-section">
              <div className="gp-row">
                <div className={`gp-options ${hasFieldError('copyToGP') ? 'validation-error-radio' : ''}`}>
                  <span className={`gp-title required ${hasFieldError('copyToGP') ? 'validation-error-label' : ''}`}>Copy to GP?</span>
                  <label className="gp-option">
                    <input
                      type="radio"
                      name="copyToGP"
                      value="Not this time"
                      checked={formData.copyToGP === 'Not this time'}
                      onChange={(e) => handleRadioChange('copyToGP', e.target.value)}
                    />
                    Not this time
                  </label>
                  <label className="gp-option">
                    <input
                      type="radio"
                      name="copyToGP"
                      value="Yes"
                      checked={formData.copyToGP === 'Yes'}
                      onChange={(e) => handleRadioChange('copyToGP', e.target.value)}
                    />
                    Yes
                  </label>
                </div>
                <div className="gp-textarea-area">
                  <textarea
                    className="gp-textarea grayed"
                    disabled
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Note to GP */}
            <div className="note-to-gp-section">
              <label className="note-to-gp-label">Note to GP</label>
              <input
                type="text"
                className="note-to-gp-input"
                value={formData.noteToGP}
                onChange={(e) => handleInputChange('noteToGP', e.target.value)}
                placeholder=""
              />
            </div>

            {/* Flag for Audit and Reason */}
            <div className="audit-section">
              <div className="audit-checkbox-area">
                <input
                  type="checkbox"
                  className="audit-checkbox"
                  id="flagForAudit"
                  checked={formData.flagForAudit}
                  onChange={(e) => handleInputChange('flagForAudit', e.target.checked)}
                />
                <label className="audit-label" htmlFor="flagForAudit">Flag for Audit</label>
              </div>
              <div className="audit-reason-area">
                <label className="reason-title">Reason</label>
                <input
                  type="text"
                  className={`reason-input ${!formData.flagForAudit ? 'grayed' : ''}`}
                  value={formData.auditReason}
                  onChange={(e) => handleInputChange('auditReason', e.target.value)}
                  disabled={!formData.flagForAudit}
                  placeholder=""
                />
              </div>
            </div>
          </section>
          )}
        </main>
      </div>

      <div className="eprf-footer incident-footer">
        <ConnectionStatus />
        <div className="footer-left">
          <button className="footer-btn discovery" onClick={handleAddPatientClick}>Add Patient</button>
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
        errors={validationErrors}
        getSectionDisplayName={getSectionDisplayName}
      />

      {/* Success Modal */}
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
          router.push(`/disposition?${params}`)
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
