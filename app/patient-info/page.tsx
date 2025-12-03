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
  const [title, setTitle] = useState('')
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [surname, setSurname] = useState('')
  const [sex, setSex] = useState('')
  const [dob, setDob] = useState('')
  const [age, setAge] = useState('')
  const [ethnicity, setEthnicity] = useState('')
  const [ptAddress, setPtAddress] = useState('')
  const [suburb, setSuburb] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [postalAddress, setPostalAddress] = useState('')
  const [homePhone, setHomePhone] = useState('')
  const [workPhone, setWorkPhone] = useState('')
  const [mobilePhone, setMobilePhone] = useState('')
  const [email, setEmail] = useState('')
  const [residentCitizen, setResidentCitizen] = useState('')

  const handleLogout = () => {
    router.push('/')
  }

  const navigateTo = (section: string) => {
    const params = new URLSearchParams({ id: incidentId, fleetId })
    if (section === 'incident') router.push(`/incident?${params}`)
    else if (section === 'patient-info') router.push(`/patient-info?${params}`)
    else if (section === 'primary-survey') router.push(`/primary-survey?${params}`)
  }

  const copyToBilling = () => {
    setBillingAddress(ptAddress)
  }

  const copyToPostal = () => {
    setPostalAddress(ptAddress)
  }

  const handlePrevious = () => {
    navigateTo('incident')
  }

  const handleNext = () => {
    navigateTo('primary-survey')
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
            
            <div className="form-row">
              <div className="form-field">
                <label className="field-label required">Roblox Username</label>
                <input 
                  type="text" 
                  className="text-input" 
                  value={robloxUsername}
                  onChange={(e) => setRobloxUsername(e.target.value)}
                />
              </div>
              
              <div className="form-field">
                <label className="field-label">Title</label>
                <select 
                  className="text-input" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                >
                  <option value=""></option>
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Ms">Ms</option>
                  <option value="Miss">Miss</option>
                  <option value="Dr">Dr</option>
                  <option value="Rev">Rev</option>
                </select>
              </div>

              <div className="form-field">
                <label className="field-label required">First Name</label>
                <input 
                  type="text" 
                  className="text-input" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="field-label">Middle Name(s)</label>
                <input 
                  type="text" 
                  className="text-input" 
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="field-label required">Surname</label>
                <input 
                  type="text" 
                  className="text-input" 
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="field-label required">Sex</label>
                <div className="sex-options">
                  <label className="sex-option">
                    <input 
                      type="radio" 
                      name="sex" 
                      value="Male"
                      checked={sex === 'Male'}
                      onChange={(e) => setSex(e.target.value)}
                    />
                    Male
                  </label>
                  <label className="sex-option">
                    <input 
                      type="radio" 
                      name="sex" 
                      value="Female"
                      checked={sex === 'Female'}
                      onChange={(e) => setSex(e.target.value)}
                    />
                    Female
                  </label>
                  <label className="sex-option">
                    <input 
                      type="radio" 
                      name="sex" 
                      value="Indeterminate"
                      checked={sex === 'Indeterminate'}
                      onChange={(e) => setSex(e.target.value)}
                    />
                    Indeterminate
                  </label>
                  <label className="sex-option">
                    <input 
                      type="radio" 
                      name="sex" 
                      value="Unknown"
                      checked={sex === 'Unknown'}
                      onChange={(e) => setSex(e.target.value)}
                    />
                    Unknown
                  </label>
                </div>
              </div>

              <div className="form-field">
                <label className="field-label required">Date of Birth</label>
                <input 
                  type="text" 
                  className="text-input" 
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              <div className="form-field">
                <label className="field-label">Age</label>
                <input 
                  type="text" 
                  className="text-input" 
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="field-label">Ethnicity</label>
                <input 
                  type="text" 
                  className="text-input" 
                  value={ethnicity}
                  onChange={(e) => setEthnicity(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field full-width">
                <label className="field-label">Pt Address</label>
                <input 
                  type="text" 
                  className="text-input" 
                  value={ptAddress}
                  onChange={(e) => setPtAddress(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="field-label">Suburb</label>
                <input 
                  type="text" 
                  className="text-input" 
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field full-width">
                <label className="field-label">Billing Address</label>
                <div className="input-with-copy">
                  <input 
                    type="text" 
                    className="text-input" 
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                  />
                  <button className="copy-btn" onClick={copyToBilling}>Copy</button>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field full-width">
                <label className="field-label">Postal Address</label>
                <div className="input-with-copy">
                  <input 
                    type="text" 
                    className="text-input" 
                    value={postalAddress}
                    onChange={(e) => setPostalAddress(e.target.value)}
                  />
                  <button className="copy-btn" onClick={copyToPostal}>Copy</button>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="field-label">Home Phone</label>
                <input 
                  type="text" 
                  className="text-input readonly preset" 
                  value={homePhone}
                  readOnly
                />
              </div>

              <div className="form-field">
                <label className="field-label">Work Phone</label>
                <input 
                  type="text" 
                  className="text-input readonly preset" 
                  value={workPhone}
                  readOnly
                />
              </div>

              <div className="form-field">
                <label className="field-label">Mobile Phone</label>
                <input 
                  type="text" 
                  className="text-input readonly preset" 
                  value={mobilePhone}
                  readOnly
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="field-label">Email</label>
                <input 
                  type="text" 
                  className="text-input readonly preset" 
                  value={email}
                  readOnly
                />
              </div>

              <div className="form-field">
                <label className="field-label">Resident or Citizen</label>
                <input 
                  type="text" 
                  className="text-input readonly preset" 
                  value={residentCitizen}
                  readOnly
                />
              </div>
            </div>
          </section>
        </main>
      </div>

      <div className="eprf-footer incident-footer">
        <div className="footer-left">
          <button className="footer-btn internet">Internet</button>
          <button className="footer-btn server">Server</button>
          <button className="footer-btn green">Add Patient</button>
          <button className="footer-btn green">Transfer ePRF</button>
          <button className="footer-btn green">Submit ePRF</button>
        </div>
        <div className="footer-right">
          <button className="footer-btn orange" onClick={handlePrevious}>{"< Previous"}</button>
          <button className="footer-btn orange" onClick={handleNext}>{"Next >"}</button>
        </div>
      </div>
    </div>
  )
}
