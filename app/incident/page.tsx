"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CASE_TYPES = [
  { value: 'MED', label: 'MED', desc: 'Medical' },
  { value: 'ACC', label: 'ACC', desc: 'Trauma' },
  { value: 'PTS', label: 'PTS', desc: 'Patient\nTransport' },
  { value: 'PVT', label: 'PVT', desc: '', disabled: true },
  { value: 'NO_EPRF', label: 'No ePRF', desc: '' },
  { value: 'EX_TRANSFER', label: 'Ex-Transfer/Event', desc: '' },
]

const LOCATION_TYPES = [
  { label: 'Home', disabled: false },
  { label: 'Farm', disabled: false },
  { label: 'Road', disabled: false },
  { label: 'Workplace', disabled: false },
  { label: 'Educational Facility', disabled: true },
  { label: 'Footpath', disabled: false },
  { label: 'Aged Care Facility', disabled: true },
  { label: 'Healthcare Facility', disabled: false },
  { label: 'Public (Other)', disabled: false },
  { label: 'Other', disabled: false }
]

export default function IncidentPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const incidentId = searchParams?.get('id') || ''
  const fleetId = searchParams?.get('fleetId') || ''
  
  const [caseType, setCaseType] = useState('MED')
  const [dateTimeOfCall, setDateTimeOfCall] = useState('')
  const [dispatchTime, setDispatchTime] = useState('')
  const [responding, setResponding] = useState('')
  const [atScene, setAtScene] = useState('')
  const [atPatient, setAtPatient] = useState('')
  const [departScene, setDepartScene] = useState('')
  const [atDestination, setAtDestination] = useState('')
  const [destination, setDestination] = useState('River City Hospital')
  const [incidentLocation, setIncidentLocation] = useState('')
  const [locationType, setLocationType] = useState('')
  const [locationTypeOther, setLocationTypeOther] = useState('')
  
  const [showDateTimePicker, setShowDateTimePicker] = useState(false)
  const [currentField, setCurrentField] = useState<string | null>(null)
  const [pickerDay, setPickerDay] = useState(3)
  const [pickerMonth, setPickerMonth] = useState(12)
  const [pickerYear, setPickerYear] = useState(2025)
  const [pickerHour, setPickerHour] = useState(18)
  const [pickerMinute, setPickerMinute] = useState(55)

  const handleLogout = () => {
    router.push('/')
  }

  const navigateTo = (section: string) => {
    const params = new URLSearchParams({ id: incidentId, fleetId })
    if (section === 'incident') router.push(`/incident?${params}`)
    else if (section === 'patient-info') router.push(`/patient-info?${params}`)
    else if (section === 'primary-survey') router.push(`/primary-survey?${params}`)
  }

  const setNow = (field: string) => {
    const now = new Date()
    const formatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    
    switch(field) {
      case 'dateTimeOfCall': setDateTimeOfCall(formatted); break
      case 'dispatchTime': setDispatchTime(formatted); break
      case 'responding': setResponding(formatted); break
      case 'atScene': setAtScene(formatted); break
      case 'atPatient': setAtPatient(formatted); break
      case 'departScene': setDepartScene(formatted); break
      case 'atDestination': setAtDestination(formatted); break
    }
  }

  const openDateTimePicker = (field: string) => {
    setCurrentField(field)
    const now = new Date()
    setPickerDay(now.getDate())
    setPickerMonth(now.getMonth() + 1)
    setPickerYear(now.getFullYear())
    setPickerHour(now.getHours())
    setPickerMinute(now.getMinutes())
    setShowDateTimePicker(true)
  }

  const handleSetDateTime = () => {
    if (currentField) {
      const formatted = `${String(pickerDay).padStart(2, '0')}/${String(pickerMonth).padStart(2, '0')}/${pickerYear} ${String(pickerHour).padStart(2, '0')}:${String(pickerMinute).padStart(2, '0')}`
      switch(currentField) {
        case 'dateTimeOfCall': setDateTimeOfCall(formatted); break
        case 'dispatchTime': setDispatchTime(formatted); break
        case 'responding': setResponding(formatted); break
        case 'atScene': setAtScene(formatted); break
        case 'atPatient': setAtPatient(formatted); break
        case 'departScene': setDepartScene(formatted); break
        case 'atDestination': setAtDestination(formatted); break
      }
    }
    setShowDateTimePicker(false)
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
          <button className="sidebar-btn active">Incident Information</button>
          <button className="sidebar-btn" onClick={() => navigateTo('patient-info')}>Patient Information</button>
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
            <h2 className="section-title">Incident Information</h2>
            
            <div className="form-row">
              <div className="form-field master-incident">
                <label className="field-label required">Master Incident Number</label>
                <input type="text" value={incidentId} readOnly className="text-input readonly master" />
              </div>
              
              <div className="form-field case-types">
                <label className="field-label required">Case Type</label>
                <div className="case-type-grid">
                  {CASE_TYPES.map(ct => (
                    <label key={ct.value} className={`case-type-option ${ct.disabled ? 'disabled' : ''}`}>
                      <input 
                        type="radio" 
                        name="caseType" 
                        value={ct.value}
                        checked={caseType === ct.value}
                        onChange={(e) => setCaseType(e.target.value)}
                        disabled={ct.disabled}
                      />
                      <span className="radio-label">
                        {ct.label}
                        {ct.desc && <span className="radio-desc">{ct.desc}</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-row times-row">
              <div className="form-field">
                <label className="field-label required">Date/Time of Call</label>
                <div className="input-with-btn">
                  <input 
                    type="text" 
                    value={dateTimeOfCall} 
                    onChange={(e) => setDateTimeOfCall(e.target.value)}
                    onClick={() => openDateTimePicker('dateTimeOfCall')}
                    className="text-input"
                    readOnly
                  />
                  <button className="now-btn" onClick={() => setNow('dateTimeOfCall')}>Now</button>
                </div>
              </div>
              
              <div className="form-field">
                <label className="field-label">Dispatch Time</label>
                <div className="input-with-btn">
                  <input type="text" value={dispatchTime} onChange={(e) => setDispatchTime(e.target.value)} onClick={() => openDateTimePicker('dispatchTime')} className="text-input" readOnly />
                  <button className="now-btn" onClick={() => setNow('dispatchTime')}>Now</button>
                </div>
              </div>
              
              <div className="form-field">
                <label className="field-label">Responding</label>
                <div className="input-with-btn">
                  <input type="text" value={responding} onChange={(e) => setResponding(e.target.value)} onClick={() => openDateTimePicker('responding')} className="text-input" readOnly />
                  <button className="now-btn" onClick={() => setNow('responding')}>Now</button>
                </div>
              </div>
              
              <div className="form-field">
                <label className="field-label">At Scene</label>
                <div className="input-with-btn">
                  <input type="text" value={atScene} onChange={(e) => setAtScene(e.target.value)} onClick={() => openDateTimePicker('atScene')} className="text-input" readOnly />
                  <button className="now-btn" onClick={() => setNow('atScene')}>Now</button>
                </div>
              </div>
            </div>

            <div className="form-row times-row">
              <div className="form-field">
                <label className="field-label">At Patient</label>
                <div className="input-with-btn">
                  <input type="text" value={atPatient} onChange={(e) => setAtPatient(e.target.value)} onClick={() => openDateTimePicker('atPatient')} className="text-input" readOnly />
                  <button className="now-btn" onClick={() => setNow('atPatient')}>Now</button>
                </div>
              </div>
              
              <div className="form-field">
                <label className="field-label">Depart Scene</label>
                <div className="input-with-btn">
                  <input type="text" value={departScene} onChange={(e) => setDepartScene(e.target.value)} onClick={() => openDateTimePicker('departScene')} className="text-input" readOnly />
                  <button className="now-btn" onClick={() => setNow('departScene')}>Now</button>
                </div>
              </div>
              
              <div className="form-field">
                <label className="field-label">At Destination</label>
                <div className="input-with-btn">
                  <input type="text" value={atDestination} onChange={(e) => setAtDestination(e.target.value)} onClick={() => openDateTimePicker('atDestination')} className="text-input" readOnly />
                  <button className="now-btn" onClick={() => setNow('atDestination')}>Now</button>
                </div>
              </div>
              
              <div className="form-field">
                <label className="field-label">Destination</label>
                <input type="text" value={destination} readOnly className="text-input readonly preset" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field full-width">
                <label className="field-label required">Incident Location</label>
                <input type="text" value={incidentLocation} onChange={(e) => setIncidentLocation(e.target.value)} className="text-input" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field full-width">
                <label className="field-label required">Location Type</label>
                <div className="location-type-grid">
                  {LOCATION_TYPES.map(lt => (
                    <label key={lt.label} className={`location-type-option${lt.disabled ? ' disabled' : ''}`}>
                      <input 
                        type="radio" 
                        name="locationType" 
                        value={lt.label}
                        checked={locationType === lt.label}
                        onChange={(e) => setLocationType(e.target.value)}
                        disabled={lt.disabled}
                      />
                      <span className="radio-label">{lt.label}</span>
                    </label>
                  ))}
                </div>
                {locationType === 'Other' && (
                  <input
                    type="text"
                    className="text-input"
                    style={{ marginTop: '10px' }}
                    placeholder="Please specify..."
                    value={locationTypeOther}
                    onChange={(e) => setLocationTypeOther(e.target.value)}
                  />
                )}
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
          <button className="footer-btn orange">{"< Previous"}</button>
          <button className="footer-btn orange" onClick={() => navigateTo('patient-info')}>{"Next >"}</button>
        </div>
      </div>

      {showDateTimePicker && (
        <div className="modal-overlay" onClick={() => setShowDateTimePicker(false)}>
          <div className="datetime-picker" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">Date/Time of Call</div>
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
                <button className="picker-btn" onClick={() => setPickerYear(Math.max(2000, pickerYear - 1))}>-</button>
              </div>
              <div className="picker-column">
                <button className="picker-btn" onClick={() => setPickerHour((pickerHour + 1) % 24)}>+</button>
                <div className="picker-value">{String(pickerHour).padStart(2, '0')}</div>
                <button className="picker-btn" onClick={() => setPickerHour(pickerHour === 0 ? 23 : pickerHour - 1)}>-</button>
              </div>
              <div className="picker-column">
                <button className="picker-btn" onClick={() => setPickerMinute((pickerMinute + 1) % 60)}>+</button>
                <div className="picker-value">{String(pickerMinute).padStart(2, '0')}</div>
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
    </div>
  )
}
