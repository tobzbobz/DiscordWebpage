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

export default function PatientInfoPage() {
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

  const [robloxUsername, setRobloxUsername] = useState('')
  const [patientNotIdentified, setPatientNotIdentified] = useState(false)
  const [title, setTitle] = useState('')
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [surname, setSurname] = useState('')
  const [preferredName, setPreferredName] = useState('')
  const [sex, setSex] = useState('')
  const [dob, setDob] = useState('')
  const [age, setAge] = useState('')
  const [ageType, setAgeType] = useState('')
  const [ageEstimated, setAgeEstimated] = useState(false)
  const [ethnicity, setEthnicity] = useState('')
  const [iwi, setIwi] = useState('')
  const [ptAddress, setPtAddress] = useState('')
  const [billingPostalAddress, setBillingPostalAddress] = useState('')
  const [homePhone, setHomePhone] = useState('')
  const [workPhone, setWorkPhone] = useState('')
  const [mobilePhone, setMobilePhone] = useState('')
  const [email, setEmail] = useState('')
  const [residentCitizen, setResidentCitizen] = useState('')
  
  const [currentPage, setCurrentPage] = useState(1)
  const [currentSmoker, setCurrentSmoker] = useState('')
  const [currentMentalHealthCrisis, setCurrentMentalHealthCrisis] = useState('')
  const [alcoholContribute, setAlcoholContribute] = useState('')
  const [recreationalDrugs, setRecreationalDrugs] = useState('')
  const [estimatedImpairment, setEstimatedImpairment] = useState('')
  const [estimatedWeight, setEstimatedWeight] = useState('')
  const [nextOfKin, setNextOfKin] = useState('')
  
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [pickerDay, setPickerDay] = useState(3)
  const [pickerMonth, setPickerMonth] = useState(12)
  const [pickerYear, setPickerYear] = useState(2025)

  // Load patient letter on mount
  useEffect(() => {
    if (incidentId) {
      setPatientLetter(getCurrentPatientLetter(incidentId))
    }
  }, [incidentId])

  // Load saved data on mount
  useEffect(() => {
    if (incidentId) {
      const saved = localStorage.getItem(`patient_info_${incidentId}`)
      if (saved) {
        try {
          const p = JSON.parse(saved)
          if (p.robloxUsername) setRobloxUsername(p.robloxUsername)
          if (p.patientNotIdentified !== undefined) setPatientNotIdentified(p.patientNotIdentified)
          if (p.title) setTitle(p.title)
          if (p.firstName) setFirstName(p.firstName)
          if (p.middleName) setMiddleName(p.middleName)
          if (p.surname) setSurname(p.surname)
          if (p.preferredName) setPreferredName(p.preferredName)
          if (p.sex) setSex(p.sex)
          if (p.dob) setDob(p.dob)
          if (p.age) setAge(p.age)
          if (p.ageType) setAgeType(p.ageType)
          if (p.ageEstimated !== undefined) setAgeEstimated(p.ageEstimated)
          if (p.ethnicity) setEthnicity(p.ethnicity)
          if (p.iwi) setIwi(p.iwi)
          if (p.ptAddress) setPtAddress(p.ptAddress)
          if (p.billingPostalAddress) setBillingPostalAddress(p.billingPostalAddress)
          if (p.homePhone) setHomePhone(p.homePhone)
          if (p.workPhone) setWorkPhone(p.workPhone)
          if (p.mobilePhone) setMobilePhone(p.mobilePhone)
          if (p.email) setEmail(p.email)
          if (p.residentCitizen) setResidentCitizen(p.residentCitizen)
          if (p.currentSmoker) setCurrentSmoker(p.currentSmoker)
          if (p.currentMentalHealthCrisis) setCurrentMentalHealthCrisis(p.currentMentalHealthCrisis)
          if (p.alcoholContribute) setAlcoholContribute(p.alcoholContribute)
          if (p.recreationalDrugs) setRecreationalDrugs(p.recreationalDrugs)
          if (p.estimatedImpairment) setEstimatedImpairment(p.estimatedImpairment)
          if (p.estimatedWeight) setEstimatedWeight(p.estimatedWeight)
          if (p.nextOfKin) setNextOfKin(p.nextOfKin)
        } catch (e) {
          console.error('Failed to load saved patient info:', e)
        }
      }
    }
  }, [incidentId])

  // Save data whenever it changes
  useEffect(() => {
    if (incidentId) {
      const data = {
        robloxUsername, patientNotIdentified, title, firstName, middleName, surname, preferredName,
        sex, dob, age, ageType, ageEstimated, ethnicity, iwi, ptAddress, billingPostalAddress,
        homePhone, workPhone, mobilePhone, email, residentCitizen, currentSmoker,
        currentMentalHealthCrisis, alcoholContribute, recreationalDrugs, estimatedImpairment,
        estimatedWeight, nextOfKin
      }
      localStorage.setItem(`patient_info_${incidentId}`, JSON.stringify(data))
    }
  }, [incidentId, robloxUsername, patientNotIdentified, title, firstName, middleName, surname, preferredName,
      sex, dob, age, ageType, ageEstimated, ethnicity, iwi, ptAddress, billingPostalAddress,
      homePhone, workPhone, mobilePhone, email, residentCitizen, currentSmoker,
      currentMentalHealthCrisis, alcoholContribute, recreationalDrugs, estimatedImpairment,
      estimatedWeight, nextOfKin])

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
    return incompleteSections.includes('patient-info') && (
      (field === 'robloxUsername' && !robloxUsername) ||
      (field === 'firstName' && !firstName) ||
      (field === 'surname' && !surname) ||
      (field === 'sex' && !sex) ||
      (field === 'dob' && !dob) ||
      (field === 'age' && !age) ||
      (field === 'ageType' && !ageType) ||
      (field === 'ptAddress' && !ptAddress)
    )
  }

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
    // Transfer all patients for this incident to the target user
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

  const openDatePicker = () => {
    const now = new Date()
    setPickerDay(now.getDate())
    setPickerMonth(now.getMonth() + 1)
    setPickerYear(now.getFullYear())
    setShowDatePicker(true)
  }

  const handleSetDate = () => {
    const formatted = `${String(pickerDay).padStart(2, '0')}/${String(pickerMonth).padStart(2, '0')}/${pickerYear}`
    setDob(formatted)
    setShowDatePicker(false)
  }

  const copyToBillingPostal = () => {
    setBillingPostalAddress(ptAddress)
  }

  const copyToBilling = () => {
    setBillingPostalAddress(ptAddress)
  }

  const copyToPostal = () => {
    setBillingPostalAddress(ptAddress)
  }

  const handlePrevious = () => {
    if (currentPage === 2) {
      setCurrentPage(1)
    } else {
      navigateTo('incident')
    }
  }

  const handleNext = () => {
    if (currentPage === 1) {
      setCurrentPage(2)
    } else {
      navigateTo('primary-survey')
    }
  }

  const isImpairmentEnabled = () => {
    return currentSmoker === 'Yes' || alcoholContribute === 'Yes' || recreationalDrugs === 'Yes'
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
          <button className={`sidebar-btn active${incompleteSections.includes('patient-info') ? ' incomplete' : ''}`}>Patient Information</button>
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
            <h2 className="section-title">Patient Information</h2>
            
            {currentPage === 1 && (
              <>
            <div className="form-row">
              <div className="form-field" style={{ flex: '0 0 200px' }}>
                <label className={`field-label required ${hasFieldError('robloxUsername') ? 'validation-error-label' : ''}`}>Roblox Username</label>
                <input 
                  type="text" 
                  className={`text-input ${hasFieldError('robloxUsername') ? 'validation-error' : ''}`}
                  value={robloxUsername}
                  onChange={(e) => setRobloxUsername(e.target.value)}
                />
              </div>
              
              <div className="form-field" style={{ flex: '0 0 150px' }}>
                <label className="field-label">Title</label>
                <select 
                  className="text-input" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                >
                  <option value="">---</option>
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Ms">Ms</option>
                  <option value="Miss">Miss</option>
                  <option value="Dr">Dr</option>
                  <option value="Rev">Rev</option>
                </select>
              </div>

              <div className="form-field" style={{ flex: '1' }}>
                <label className="field-label" style={{ visibility: 'hidden' }}>Spacer</label>
                <label className="patient-checkbox">
                  <input 
                    type="checkbox" 
                    checked={patientNotIdentified}
                    onChange={(e) => setPatientNotIdentified(e.target.checked)}
                  />
                  Patient not fully identified
                </label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className={`field-label required ${hasFieldError('firstName') ? 'validation-error-label' : ''}`}>First Name</label>
                <input 
                  type="text" 
                  className={`text-input ${hasFieldError('firstName') ? 'validation-error' : ''}`}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="field-label">Middle Names</label>
                <input 
                  type="text" 
                  className="text-input" 
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className={`field-label required ${hasFieldError('surname') ? 'validation-error-label' : ''}`}>Family Name</label>
                <input 
                  type="text" 
                  className={`text-input ${hasFieldError('surname') ? 'validation-error' : ''}`}
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="field-label">Preferred Name</label>
                <input 
                  type="text" 
                  className="text-input" 
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field" style={{ flex: '0 0 200px' }}>
                <label className={`field-label required ${hasFieldError('sex') ? 'validation-error-label' : ''}`}>Sex</label>
                <select 
                  className={`text-input ${hasFieldError('sex') ? 'validation-error' : ''}`}
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                >
                  <option value="">---</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Indeterminate">Indeterminate</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>

              <div className="form-field">
                <label className={`field-label required ${hasFieldError('dob') ? 'validation-error-label' : ''}`}>DoB</label>
                <input 
                  type="text" 
                  className={`text-input ${hasFieldError('dob') ? 'validation-error' : ''}`}
                  value={dob}
                  onClick={openDatePicker}
                  readOnly
                />
              </div>

              <div className="form-field" style={{ flex: '0 0 100px' }}>
                <label className={`field-label required ${hasFieldError('age') ? 'validation-error-label' : ''}`}>Age</label>
                <input 
                  type="text" 
                  className={`text-input ${hasFieldError('age') ? 'validation-error' : ''}`}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>

              <div className="form-field" style={{ flex: '0 0 150px' }}>
                <label className={`field-label required ${hasFieldError('ageType') ? 'validation-error-label' : ''}`}>Age Type</label>
                <select 
                  className={`text-input ${hasFieldError('ageType') ? 'validation-error' : ''}`}
                  value={ageType}
                  onChange={(e) => setAgeType(e.target.value)}
                >
                  <option value="">---</option>
                  <option value="Days">Day(s)</option>
                  <option value="Months">Month(s)</option>
                  <option value="Years">Year(s)</option>
                </select>
              </div>

              <div className="form-field" style={{ flex: '0 0 80px' }}>
                <label className="field-label" style={{ visibility: 'hidden' }}>Spacer</label>
                <label className="patient-checkbox">
                  <input 
                    type="checkbox" 
                    checked={ageEstimated}
                    onChange={(e) => setAgeEstimated(e.target.checked)}
                  />
                  Est.
                </label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className={`field-label required ${hasFieldError('ptAddress') ? 'validation-error-label' : ''}`}>Patient Address</label>
                <textarea 
                  className={`text-input textarea-large ${hasFieldError('ptAddress') ? 'validation-error' : ''}`}
                  rows={3}
                  value={ptAddress}
                  onChange={(e) => setPtAddress(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', alignSelf: 'flex-end', marginBottom: '8px' }}>
                <button className="copy-btn-large" onClick={copyToBillingPostal}>Copy &gt;</button>
              </div>

              <div className="form-field">
                <label className="field-label">Billing or Postal Address</label>
                <textarea 
                  className="text-input textarea-large" 
                  rows={3}
                  value={billingPostalAddress}
                  onChange={(e) => setBillingPostalAddress(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="field-label">Home Phone</label>
                <input 
                  type="text" 
                  className="text-input grayed-disabled" 
                  value={homePhone}
                  onChange={(e) => setHomePhone(e.target.value)}
                  disabled
                />
              </div>

              <div className="form-field">
                <label className="field-label">Work Phone</label>
                <input 
                  type="text" 
                  className="text-input grayed-disabled" 
                  value={workPhone}
                  onChange={(e) => setWorkPhone(e.target.value)}
                  disabled
                />
              </div>

              <div className="form-field">
                <label className="field-label">Mobile Phone</label>
                <input 
                  type="text" 
                  className="text-input grayed-disabled" 
                  value={mobilePhone}
                  onChange={(e) => setMobilePhone(e.target.value)}
                  disabled
                />
              </div>

              <div className="form-field">
                <label className="field-label">Email</label>
                <input 
                  type="text" 
                  className="text-input grayed-disabled" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field" style={{ flex: '0 0 300px' }}>
                <label className="field-label">Ethnicity</label>
                <select 
                  className="text-input grayed-disabled" 
                  value={ethnicity}
                  onChange={(e) => setEthnicity(e.target.value)}
                  disabled
                >
                  <option value="">---</option>
                  <option value="European">European</option>
                  <option value="Maori">Māori</option>
                  <option value="Pacific">Pacific</option>
                  <option value="Asian">Asian</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-field" style={{ flex: '0 0 300px' }}>
                <label className="field-label">Iwi</label>
                <select 
                  className="text-input grayed-disabled" 
                  value={iwi}
                  onChange={(e) => setIwi(e.target.value)}
                  disabled
                >
                  <option value="">---</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field" style={{ flex: '0 0 400px' }}>
                <label className="field-label">NZ Resident or Citizen</label>
                <div className="sex-options">
                  <label className="sex-option grayed-disabled">
                    <input 
                      type="radio" 
                      name="residentCitizen" 
                      value="Yes"
                      checked={residentCitizen === 'Yes'}
                      onChange={(e) => setResidentCitizen(e.target.value)}
                      disabled
                    />
                    Yes
                  </label>
                  <label className="sex-option grayed-disabled">
                    <input 
                      type="radio" 
                      name="residentCitizen" 
                      value="No"
                      checked={residentCitizen === 'No'}
                      onChange={(e) => setResidentCitizen(e.target.value)}
                      disabled
                    />
                    No
                  </label>
                  <label className="sex-option grayed-disabled">
                    <input 
                      type="radio" 
                      name="residentCitizen" 
                      value="Unknown"
                      checked={residentCitizen === 'Unknown'}
                      onChange={(e) => setResidentCitizen(e.target.value)}
                      disabled
                    />
                    Unknown
                  </label>
                </div>
              </div>
            </div>
              </>
            )}

            {currentPage === 2 && (
              <>
            <div className="form-row">
              <div className="form-field" style={{ flex: 1 }}>
                <label className="field-label">Current smoker?</label>
                <div className="substance-options">
                  <label className="substance-question">
                    <input
                      type="radio"
                      name="currentSmoker"
                      value="Yes"
                      checked={currentSmoker === 'Yes'}
                      onChange={(e) => setCurrentSmoker(e.target.value)}
                    />
                    Yes
                  </label>
                  <label className="substance-question">
                    <input
                      type="radio"
                      name="currentSmoker"
                      value="No"
                      checked={currentSmoker === 'No'}
                      onChange={(e) => setCurrentSmoker(e.target.value)}
                    />
                    No
                  </label>
                </div>
              </div>

              <div className="form-field" style={{ flex: 1 }}>
                <label className="field-label">Current mental health crisis?</label>
                <div className="substance-options">
                  <label className="substance-question">
                    <input
                      type="radio"
                      name="mentalHealthCrisis"
                      value="Yes"
                      checked={currentMentalHealthCrisis === 'Yes'}
                      onChange={(e) => setCurrentMentalHealthCrisis(e.target.value)}
                    />
                    Yes
                  </label>
                  <label className="substance-question">
                    <input
                      type="radio"
                      name="mentalHealthCrisis"
                      value="No"
                      checked={currentMentalHealthCrisis === 'No'}
                      onChange={(e) => setCurrentMentalHealthCrisis(e.target.value)}
                    />
                    No
                  </label>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field" style={{ flex: 1 }}>
                <label className="field-label">Did alcohol contribute?</label>
                <div className="substance-options">
                  <label className="substance-question">
                    <input
                      type="radio"
                      name="alcoholContribute"
                      value="Yes"
                      checked={alcoholContribute === 'Yes'}
                      onChange={(e) => setAlcoholContribute(e.target.value)}
                    />
                    Yes
                  </label>
                  <label className="substance-question">
                    <input
                      type="radio"
                      name="alcoholContribute"
                      value="No"
                      checked={alcoholContribute === 'No'}
                      onChange={(e) => setAlcoholContribute(e.target.value)}
                    />
                    No
                  </label>
                  <label className="substance-question">
                    <input
                      type="radio"
                      name="alcoholContribute"
                      value="Not Sure"
                      checked={alcoholContribute === 'Not Sure'}
                      onChange={(e) => setAlcoholContribute(e.target.value)}
                    />
                    Not Sure
                  </label>
                  <label className="substance-question">
                    <input
                      type="radio"
                      name="alcoholContribute"
                      value="3rd Party"
                      checked={alcoholContribute === '3rd Party'}
                      onChange={(e) => setAlcoholContribute(e.target.value)}
                    />
                    3rd Party
                  </label>
                </div>
              </div>

              <div className="form-field" style={{ flex: 1 }}>
                <label className="field-label">Estimated impairment level</label>
                <select
                  className="text-input"
                  value={estimatedImpairment}
                  onChange={(e) => setEstimatedImpairment(e.target.value)}
                  disabled={!isImpairmentEnabled()}
                  style={{ opacity: isImpairmentEnabled() ? 1 : 0.5 }}
                >
                  <option value="">---</option>
                  <option value="Uninhibited">Uninhibited</option>
                  <option value="Overly talkative">Overly talkative</option>
                  <option value="Slurring">Slurring</option>
                  <option value="Unintelligible words">Unintelligible words</option>
                  <option value="Unable to mobilise">Unable to mobilise</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field" style={{ flex: 1 }}>
                <label className="field-label">Did patient take recreational drugs?</label>
                <div className="substance-options">
                  <label className="substance-question">
                    <input
                      type="radio"
                      name="recreationalDrugs"
                      value="Yes"
                      checked={recreationalDrugs === 'Yes'}
                      onChange={(e) => setRecreationalDrugs(e.target.value)}
                    />
                    Yes
                  </label>
                  <label className="substance-question">
                    <input
                      type="radio"
                      name="recreationalDrugs"
                      value="No"
                      checked={recreationalDrugs === 'No'}
                      onChange={(e) => setRecreationalDrugs(e.target.value)}
                    />
                    No
                  </label>
                </div>
              </div>

              <div className="form-field" style={{ flex: 1 }}>
                <label className="field-label">Estimated weight (kg)</label>
                <input
                  type="text"
                  className="text-input"
                  value={estimatedWeight}
                  onChange={(e) => setEstimatedWeight(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field full-width">
                <label className="field-label">Next of Kin</label>
                <input
                  type="text"
                  className="text-input"
                  value={nextOfKin}
                  onChange={(e) => setNextOfKin(e.target.value)}
                />
              </div>
            </div>
              </>
            )}
          </section>
        </main>
      </div>

      {showDatePicker && (
        <div className="modal-overlay" onClick={() => setShowDatePicker(false)}>
          <div className="datetime-picker date-only-picker" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">Set Date</div>
            <div className="picker-display">
              Wed, December {String(pickerDay).padStart(2, '0')}, {pickerYear}
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
            </div>
            <div className="picker-actions">
              <button className="picker-action-btn cancel" onClick={() => setShowDatePicker(false)}>Clear</button>
              <button className="picker-action-btn ok" onClick={handleSetDate}>Set</button>
            </div>
          </div>
        </div>
      )}

      <div className="eprf-footer incident-footer">
        <div className="footer-left">
          <button className="footer-btn internet">Internet</button>
          <button className="footer-btn server">Server</button>
          <button className="footer-btn green" onClick={handleAddPatientClick}>Add Patient</button>
          <button className="footer-btn green" onClick={handleTransferClick}>Transfer ePRF</button>
          <button className="footer-btn green" onClick={handleSubmitEPRF}>Submit ePRF</button>
        </div>
        <div className="footer-center">
          <span className="page-counter">Page {currentPage} of 2</span>
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
    </div>
  )
}
