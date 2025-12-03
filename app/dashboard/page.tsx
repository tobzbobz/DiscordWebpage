"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const fleetId = searchParams?.get('fleetId') || ''
  const [showNewCase, setShowNewCase] = useState(false)
  const [incidentNumber, setIncidentNumber] = useState('0000')
  const [caseNumber, setCaseNumber] = useState('001')
  const [caseDate, setCaseDate] = useState('')
  const [caseLetter, setCaseLetter] = useState('A')

  useEffect(() => {
    // Set current date on mount
    const today = new Date()
    const formatted = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`
    setCaseDate(formatted)
  }, [])

  const handleLogout = () => {
    router.push('/')
  }

  const handleNewCase = () => {
    setShowNewCase(true)
  }

  const handleCaseOK = () => {
    // Generate full incident number
    const fullIncidentNumber = `${incidentNumber}-${caseNumber}-${caseDate}-${caseLetter}`
    // Navigate to incident information page
    router.push(`/incident?id=${encodeURIComponent(fullIncidentNumber)}&fleetId=${encodeURIComponent(fleetId)}`)
    setShowNewCase(false)
  }

  const handleCaseCancel = () => {
    setShowNewCase(false)
  }

  const incrementIncident = () => {
    const num = parseInt(incidentNumber) || 0
    setIncidentNumber(String(Math.min(9999, num + 1)).padStart(4, '0'))
  }

  const decrementIncident = () => {
    const num = parseInt(incidentNumber) || 0
    setIncidentNumber(String(Math.max(0, num - 1)).padStart(4, '0'))
  }

  return (
    <div className="eprf-dashboard">
      <div className="eprf-nav">
        <button className="nav-btn" onClick={handleNewCase}>New Case</button>
        <button className="nav-btn">Sync ePRF</button>
        <button className="nav-btn">Retrieve ePRF</button>
        <button className="nav-btn" onClick={handleLogout}>Logout</button>
      </div>

      <div className="dashboard-content">
        {/* Main content area - empty for now as requested */}
      </div>

      <div className="eprf-footer">
        <div className="footer-left">
          <button className="footer-btn internet">Internet</button>
          <button className="footer-btn server">Server</button>
        </div>
        <div className="footer-center">
          <span className="fleet-label">Fleet ID:</span>
          <span className="fleet-id">{fleetId}</span>
        </div>
        <div className="footer-right">
          <span className="version">v 2.19.1</span>
          <button className="footer-btn discovery">Initiate Discovery</button>
        </div>
      </div>

      {showNewCase && (
        <div className="modal-overlay" onClick={handleCaseCancel}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">Master Incident Number</div>
            <div className="modal-body">
              <div className="modal-section-label">Incident Number</div>
              <div className="incident-fields">
                <div className="incident-input-group">
                  <input
                    type="number"
                    value={incidentNumber}
                    onChange={(e) => setIncidentNumber(e.target.value.slice(0, 4).padStart(4, '0'))}
                    className="incident-input"
                    min="0"
                    max="9999"
                  />
                  <div className="incident-arrows">
                    <button className="arrow-btn up" onClick={incrementIncident}>▲</button>
                    <button className="arrow-btn down" onClick={decrementIncident}>▼</button>
                  </div>
                </div>
                <span className="separator">-</span>
                <input
                  type="text"
                  value={caseNumber}
                  readOnly
                  className="incident-part readonly"
                />
                <span className="separator">-</span>
                <input
                  type="text"
                  value={caseDate}
                  readOnly
                  className="incident-part date readonly"
                />
                <span className="separator">-</span>
                <input
                  type="text"
                  value={caseLetter}
                  readOnly
                  className="incident-part letter readonly"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={handleCaseCancel}>Cancel</button>
              <button className="modal-btn ok" onClick={handleCaseOK}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
