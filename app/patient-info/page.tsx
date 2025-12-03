"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'

export const runtime = 'edge'

export default function PatientInfoPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const incidentId = searchParams?.get('id') || ''
  const fleetId = searchParams?.get('fleetId') || ''
  
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

  const handleLogout = () => {
    router.push('/')
  }

  const navigateTo = (section: string) => {
    const params = new URLSearchParams({ id: incidentId, fleetId })
    if (section === 'incident') router.push(`/incident?${params}`)
    else if (section === 'patient-info') router.push(`/patient-info?${params}`)
    else if (section === 'primary-survey') router.push(`/primary-survey?${params}`)
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
        <button className="nav-btn">Home</button>
        <button className="nav-btn">Tools</button>
        <button className="nav-btn">Quick Nav</button>
        <button className="nav-btn" onClick={handleLogout}>Manage Crew</button>
      </div>

      <div className="incident-layout">
        <aside className="sidebar">
          <button className="sidebar-btn" onClick={() => navigateTo('incident')}>Incident Information</button>
          <button className="sidebar-btn active">Patient Information</button>
          <button className="sidebar-btn" onClick={() => navigateTo('primary-survey')}>Primary Survey</button>
          <button className="sidebar-btn">Vital Obs / Treat</button>
          <button className="sidebar-btn">Hx Complaint</button>
          <button className="sidebar-btn">Past Medical History</button>
          <button className="sidebar-btn">Clinical Impression</button>
          <button className="sidebar-btn">Disposition</button>
          <button className="sidebar-btn">Media</button>
        </aside>

        <main className="incident-content">
          <section className="incident-section">
            <h2 className="section-title">Patient Information</h2>
            
            {currentPage === 1 && (
              <>
            <div className="form-row">
              <div className="form-field" style={{ flex: '0 0 200px' }}>
                <label className="field-label required">Roblox Username</label>
                <input 
                  type="text" 
                  className="text-input" 
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
                <label className="field-label required">First Name</label>
                <input 
                  type="text" 
                  className="text-input" 
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
                <label className="field-label required">Family Name</label>
                <input 
                  type="text" 
                  className="text-input" 
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
                <label className="field-label required">Sex</label>
                <select 
                  className="text-input" 
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
                <label className="field-label required">DoB</label>
                <input 
                  type="text" 
                  className="text-input" 
                  value={dob}
                  onClick={openDatePicker}
                  readOnly
                />
              </div>

              <div className="form-field" style={{ flex: '0 0 100px' }}>
                <label className="field-label required">Age</label>
                <input 
                  type="text" 
                  className="text-input" 
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>

              <div className="form-field" style={{ flex: '0 0 150px' }}>
                <label className="field-label required">Age Type</label>
                <select 
                  className="text-input" 
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
                <label className="field-label required">Patient Address</label>
                <textarea 
                  className="text-input textarea-large" 
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
                />
              </div>

              <div className="form-field">
                <label className="field-label">Work Phone</label>
                <input 
                  type="text" 
                  className="text-input grayed-disabled" 
                  value={workPhone}
                  onChange={(e) => setWorkPhone(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="field-label">Mobile Phone</label>
                <input 
                  type="text" 
                  className="text-input grayed-disabled" 
                  value={mobilePhone}
                  onChange={(e) => setMobilePhone(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="field-label">Email</label>
                <input 
                  type="text" 
                  className="text-input grayed-disabled" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field" style={{ flex: '0 0 300px' }}>
                <label className="field-label required">Ethnicity</label>
                <select 
                  className="text-input grayed-disabled" 
                  value={ethnicity}
                  onChange={(e) => setEthnicity(e.target.value)}
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
                >
                  <option value="">---</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field" style={{ flex: '0 0 400px' }}>
                <label className="field-label required">NZ Resident or Citizen</label>
                <div className="sex-options">
                  <label className="sex-option grayed-disabled">
                    <input 
                      type="radio" 
                      name="residentCitizen" 
                      value="Yes"
                      checked={residentCitizen === 'Yes'}
                      onChange={(e) => setResidentCitizen(e.target.value)}
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
        </div>
        <div className="footer-center">
          <span className="page-counter">Page {currentPage} of 2</span>
        </div>
        <div className="footer-right">
          <button className="footer-btn orange" onClick={handlePrevious}>{"< Previous"}</button>
          <button className="footer-btn orange" onClick={handleNext}>{"Next >"}</button>
        </div>
      </div>
    </div>
  )
}
