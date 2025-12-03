"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'

export const runtime = 'edge'

export default function PrimarySurveyPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const incidentId = searchParams?.get('id') || ''
  const fleetId = searchParams?.get('fleetId') || ''
  
  const [clinicalStatus, setClinicalStatus] = useState('')
  const [responsiveness, setResponsiveness] = useState('')
  const [airway, setAirway] = useState('')
  const [breathing, setBreathing] = useState('')
  const [circulation, setCirculation] = useState('')
  const [bloodLoss, setBloodLoss] = useState('')

  const handleLogout = () => {
    router.push('/')
  }

  const navigateTo = (section: string) => {
    const params = new URLSearchParams({ id: incidentId, fleetId })
    if (section === 'incident') router.push(`/incident?${params}`)
    else if (section === 'patient-info') router.push(`/patient-info?${params}`)
    else if (section === 'primary-survey') router.push(`/primary-survey?${params}`)
  }

  const handlePrevious = () => {
    navigateTo('patient-info')
  }

  const handleNext = () => {
    // Navigate to next section when created
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
          <button className="sidebar-btn" onClick={() => navigateTo('patient-info')}>Patient Information</button>
          <button className="sidebar-btn active">Primary Survey</button>
          <button className="sidebar-btn">Vital Obs / Treat</button>
          <button className="sidebar-btn">Hx Complaint</button>
          <button className="sidebar-btn">Past Medical History</button>
          <button className="sidebar-btn">Clinical Impression</button>
          <button className="sidebar-btn">Disposition</button>
          <button className="sidebar-btn">Media</button>
        </aside>

        <main className="incident-content">
          <section className="incident-section">
            <h2 className="section-title">Primary Survey</h2>
            
            <div className="form-row">
              <div className="form-field full-width">
                <label className="field-label required">Clinical Status at Scene</label>
                <div className="survey-options">
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
                <label className="field-label required">Responsiveness</label>
                <div className="survey-options">
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
                <label className="field-label required">Airway</label>
                <div className="survey-options">
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
                <label className="field-label required">Breathing</label>
                <div className="survey-options">
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
                <label className="field-label required">Circulation</label>
                <div className="survey-options">
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
                <label className="field-label required">Blood Loss</label>
                <div className="survey-options">
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
        <div className="footer-left">
          <button className="footer-btn internet">Internet</button>
          <button className="footer-btn server">Server</button>
        </div>
        <div className="footer-right">
          <button className="footer-btn orange" onClick={handlePrevious}>{"< Previous"}</button>
          <button className="footer-btn orange" onClick={handleNext}>{"Next >"}</button>
        </div>
      </div>
    </div>
  )
}
