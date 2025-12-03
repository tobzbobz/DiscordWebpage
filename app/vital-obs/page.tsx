"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'

export const runtime = 'edge'

export default function VitalObsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const incidentId = searchParams?.get('id') || ''
  const fleetId = searchParams?.get('fleetId') || ''
  
  // Saved vitals array
  const [savedVitals, setSavedVitals] = useState<any[]>([])
  
  const [showNewVitals, setShowNewVitals] = useState(false)
  const [showGCSModal, setShowGCSModal] = useState(false)
  const [showHRModal, setShowHRModal] = useState(false)
  const [showRRModal, setShowRRModal] = useState(false)
  const [showRRNotPossibleModal, setShowRRNotPossibleModal] = useState(false)
  const [showDateTimePicker, setShowDateTimePicker] = useState(false)
  
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
  
  // Date/time picker state
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
    else if (section === 'vital-obs') router.push(`/vital-obs?${params}`)
  }

  const handlePrevious = () => {
    navigateTo('primary-survey')
  }

  const handleNext = () => {
    // Navigate to next section when created
  }
  
  const handleNewMeds = () => {
    const params = new URLSearchParams({ id: incidentId, fleetId })
    router.push(`/medications?${params}`)
  }
  
  const handleNewIntervention = () => {
    const params = new URLSearchParams({ id: incidentId, fleetId })
    router.push(`/interventions?${params}`)
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
    setShowDateTimePicker(false)
  }

  const setNow = () => {
    const now = new Date()
    const formatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setTime(formatted)
  }

  const openGCSModal = () => {
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

  const getGCSTotal = () => {
    const eyeScore = gcsEye ? parseInt(gcsEye) : 0
    const verbalScore = gcsVerbal ? parseInt(gcsVerbal) : 0
    const motorScore = gcsMotor ? parseInt(gcsMotor) : 0
    return eyeScore + verbalScore + motorScore
  }

  const openHRModal = () => {
    setShowHRModal(true)
  }

  const handleHROk = () => {
    setShowHRModal(false)
    setShowRRModal(true)
  }

  const openRRModal = () => {
    setShowRRModal(true)
  }

  const handleRROk = () => {
    setShowRRModal(false)
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
    setShowBPSpO2Modal(true)
  }

  const handleBPSpO2Ok = () => {
    const bpValue = systolic && diastolic ? `${systolic}/${diastolic}` : ''
    setBloodPressure(bpValue)
    setSpo2(spO2Value)
    setShowBPSpO2Modal(false)
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
    setShowECGModal(true)
  }

  const handleECGOk = () => {
    setShowECGModal(false)
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
    setShowBGLModal(true)
  }

  const handleBGLOk = () => {
    setShowBGLModal(false)
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
    setShowPainScoreModal(true)
  }

  const handlePainScoreOk = () => {
    setPainScore(painScoreValue)
    setShowPainScoreModal(false)
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
    setShowPupilsModal(true)
  }

  const handlePupilsOk = () => {
    setPupils(`L:${pupilSizeLeft} R:${pupilSizeRight}`)
    setShowPupilsModal(false)
    setShowETCO2SkinModal(true)
  }
  
  const openETCO2SkinModal = () => {
    setShowETCO2SkinModal(true)
  }

  const handleETCO2SkinOk = () => {
    setSkin(skinColor)
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
    setShowNotesModal(true)
  }

  const handleNotesOk = () => {
    setNotes(notesValue)
    setShowNotesModal(false)
  }

  const handleNewVitals = () => {
    setShowNewVitals(true)
  }

  const resetVitalsForm = () => {
    setTime('')
    setGcs('')
    setHeartRate('')
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

  const saveCurrentVitals = () => {
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
      notes
    }
    setSavedVitals([...savedVitals, vitalEntry])
  }

  const handleSaveAndReturn = () => {
    saveCurrentVitals()
    setShowNewVitals(false)
  }

  const handleSaveAndEnterAnother = () => {
    saveCurrentVitals()
    resetVitalsForm()
  }

  const handleCancelAndDiscard = () => {
    resetVitalsForm()
    setShowNewVitals(false)
    // Reset form
    setTime('')
    setGcs('')
    setHeartRate('')
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
          <button className="sidebar-btn" onClick={() => navigateTo('primary-survey')}>Primary Survey</button>
          <button className="sidebar-btn active">Vital Obs / Treat</button>
          <button className="sidebar-btn">Hx Complaint</button>
          <button className="sidebar-btn">Past Medical History</button>
          <button className="sidebar-btn">Clinical Impression</button>
          <button className="sidebar-btn">Disposition</button>
          <button className="sidebar-btn">Media</button>
        </aside>

        <main className="incident-content">
          {!showNewVitals ? (
            <section className="incident-section">
              <h2 className="section-title">Vital Obs / Treat</h2>
              {savedVitals.length === 0 ? (
                <div className="no-record-message">No record found.</div>
              ) : (
                <div style={{ marginTop: '20px' }}>
                  {savedVitals.map((vital, index) => (
                    <div key={index} style={{
                      backgroundColor: '#d8e8f8',
                      padding: '15px',
                      marginBottom: '10px',
                      borderRadius: '4px',
                      border: '1px solid #a8c5e0'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#2c5282' }}>
                        {vital.time || 'No time recorded'}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '14px' }}>
                        {vital.gcs && <div><strong>GCS:</strong> {vital.gcs}</div>}
                        {vital.heartRate && <div><strong>HR:</strong> {vital.heartRate}</div>}
                        {vital.respiratoryRate && <div><strong>RR:</strong> {vital.respiratoryRate}</div>}
                        {vital.bloodPressure && <div><strong>BP:</strong> {vital.bloodPressure}</div>}
                        {vital.spo2 && <div><strong>SpO2:</strong> {vital.spo2}%</div>}
                        {vital.ecg && <div><strong>ECG:</strong> {vital.ecg}</div>}
                        {vital.bloodGlucose && <div><strong>BGL:</strong> {vital.bloodGlucose}</div>}
                        {vital.capRefill && <div><strong>CR:</strong> {vital.capRefill}s</div>}
                        {vital.temperature && <div><strong>Temp:</strong> {vital.temperature}°C</div>}
                        {vital.painScore && <div><strong>Pain:</strong> {vital.painScore}</div>}
                        {vital.pupils && <div><strong>Pupils:</strong> {vital.pupils}</div>}
                        {vital.skin && <div><strong>Skin:</strong> {vital.skin}</div>}
                        {vital.notes && <div style={{ gridColumn: '1 / -1' }}><strong>Notes:</strong> {vital.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button 
                className="add-patient-btn"
                onClick={handleNewVitals}
                style={{ marginTop: '20px' }}
              >
                New Vitals
              </button>
            </section>
          ) : (
            <section className="incident-section">
              <h2 className="section-title">Vital Observation(s)</h2>
              
              <div className="vitals-grid">
                <div className="vital-field">
                  <label className="field-label required">Time</label>
                  <div className="input-with-btn">
                    <input 
                      type="text" 
                      value={time} 
                      onChange={(e) => setTime(e.target.value)}
                      onClick={openDateTimePicker}
                      className="text-input"
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
                    className="text-input clickable-input"
                    readOnly
                    onClick={openBGLModal}
                  />
                </div>

                <div className="vital-field">
                  <label className="field-label">Cap Refill (sec)</label>
                  <input 
                    type="text" 
                    value={capRefill}
                    className="text-input clickable-input"
                    readOnly
                    onClick={openBGLModal}
                  />
                </div>

                <div className="vital-field">
                  <label className="field-label">Temperature (°C)</label>
                  <input 
                    type="text" 
                    value={temperature}
                    className="text-input clickable-input"
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
            <button className="footer-btn large-blue" onClick={handleNewVitals}>New Vitals</button>
            <button className="footer-btn large-blue" onClick={handleNewMeds}>New Meds</button>
            <button className="footer-btn large-blue" onClick={handleNewIntervention}>New Intervention</button>
          </div>
          <div className="footer-center">
            <button className="footer-btn green">Transfer ePRF</button>
            <button className="footer-btn green">Submit ePRF</button>
          </div>
          <div className="footer-right">
            <button className="footer-btn orange" onClick={handlePrevious}>{"< Previous"}</button>
            <button className="footer-btn orange" onClick={handleNext}>{"Next >"}</button>
          </div>
        </div>
      ) : (
        <div className="eprf-footer vitals-edit-footer">
          <div className="footer-left">
            <button className="footer-btn internet">Internet</button>
            <button className="footer-btn server">Server</button>
          </div>
          <div className="footer-right">
            <button className="footer-btn gray" onClick={handleCancelAndDiscard}>Cancel and discard changes</button>
            <button className="footer-btn blue" onClick={handleSaveAndEnterAnother}>Save and enter another set of observations</button>
            <button className="footer-btn blue" onClick={handleSaveAndReturn}>Save and return to Vital Obs/Treat</button>
          </div>
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
        <div className="modal-overlay" onClick={() => setShowGCSModal(false)}>
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
              <button className="gcs-action-btn cancel" onClick={() => setShowGCSModal(false)}>Cancel</button>
              <button className="gcs-action-btn ok" onClick={handleGCSOk}>OK</button>
              <button className="gcs-action-btn next" onClick={handleGCSOk}>Heart Rate &gt;</button>
            </div>
          </div>
        </div>
      )}

      {showHRModal && (
        <div className="modal-overlay" onClick={() => setShowHRModal(false)}>
          <div className="vital-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vital-modal-header">Heart Rate (/min)</div>
            
            <div className="vital-modal-section">
              <label className="vital-modal-label required">Heart Rate</label>
              <input 
                type="number" 
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                className="text-input"
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
              <button className="vital-modal-btn cancel" onClick={() => setShowHRModal(false)}>Cancel</button>
              <button className="vital-modal-btn ok" onClick={handleHROk}>OK</button>
              <button className="vital-modal-btn next" onClick={handleHROk}>Resp Rate &gt;</button>
            </div>
          </div>
        </div>
      )}

      {showRRModal && (
        <div className="modal-overlay" onClick={() => setShowRRModal(false)}>
          <div className="vital-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vital-modal-header">Respiratory Rate (/min)</div>
            
            <div className="vital-modal-row">
              <div className="vital-modal-section" style={{ flex: 1 }}>
                <label className="vital-modal-label required">Respiratory rate per minute</label>
                <input 
                  type="number" 
                  value={rrPerMinute}
                  onChange={(e) => setRrPerMinute(e.target.value)}
                  className="text-input"
                />
              </div>

              <div className="vital-modal-section" style={{ flex: 1 }}>
                <label className="vital-modal-label">Words per breath</label>
                <input 
                  type="number" 
                  value={rrWordsPerBreath}
                  onChange={(e) => setRrWordsPerBreath(e.target.value)}
                  className="text-input"
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
              <button className="vital-modal-btn cancel" onClick={() => setShowRRModal(false)}>Cancel</button>
              <button className="vital-modal-btn ok" onClick={handleRROk}>OK</button>
              <button className="vital-modal-btn next" onClick={() => { setShowRRModal(false); setShowBPSpO2Modal(true); }}>BP+SpO2 &gt;</button>
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
        <div className="modal-overlay" onClick={() => setShowBPSpO2Modal(false)}>
          <div className="vital-detail-modal bp-spo2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vital-modal-header">Blood Pressure (mmHg)</div>
            
            <div className="vital-modal-row">
              <div className="vital-modal-section" style={{ flex: 1 }}>
                <label className="vital-modal-label required">Systolic</label>
                <input 
                  type="number" 
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  className="text-input"
                />
              </div>

              <div className="vital-modal-section" style={{ flex: 1 }}>
                <label className="vital-modal-label required">Diastolic</label>
                <input 
                  type="number" 
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  className="text-input"
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
              <input 
                type="number" 
                value={spO2Value}
                onChange={(e) => setSpO2Value(e.target.value)}
                className="text-input"
                style={{ maxWidth: '200px' }}
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
              <button className="vital-modal-btn cancel" onClick={() => setShowBPSpO2Modal(false)}>Cancel</button>
              <button className="vital-modal-btn ok" onClick={handleBPSpO2Ok}>OK</button>
              <button className="vital-modal-btn next" onClick={() => { setShowBPSpO2Modal(false); setShowECGModal(true); }}>ECG &gt;</button>
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
        <div className="modal-overlay" onClick={() => setShowECGModal(false)}>
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
              <button className="vital-modal-btn cancel" onClick={() => setShowECGModal(false)}>Cancel</button>
              <button className="vital-modal-btn ok" onClick={handleECGOk}>OK</button>
              <button className="vital-modal-btn next" onClick={() => { setShowECGModal(false); setShowBGLModal(true); }}>BGL+CR+Temp &gt;</button>
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
        <div className="modal-overlay" onClick={() => setShowBGLModal(false)}>
          <div className="vital-detail-modal bp-spo2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vital-modal-header">Blood Glucose + Cap Refill + Temperature</div>
            
            <div className="vital-modal-section">
              <div className="vital-modal-row">
                <label className="vital-modal-label">Blood Glucose (mmol/L)</label>
                <input 
                  type="number" 
                  className="vital-modal-input"
                  value={bglValue}
                  onChange={(e) => setBglValue(e.target.value)}
                  placeholder="Enter BGL"
                  step="0.1"
                />
              </div>
              <div className="vital-modal-row">
                <label className="vital-modal-label">Not possible</label>
                <input 
                  type="text" 
                  className="vital-modal-input"
                  value={bglNotPossibleReason}
                  readOnly
                  onClick={handleBGLNotPossibleClick}
                  placeholder="Select reason"
                  style={{ cursor: 'pointer' }}
                />
              </div>
            </div>

            <div className="vital-modal-divider"></div>

            <div className="vital-modal-section">
              <div className="vital-modal-row">
                <label className="vital-modal-label">Cap Refill (seconds)</label>
                <input 
                  type="number" 
                  className="vital-modal-input"
                  value={capRefillValue}
                  onChange={(e) => setCapRefillValue(e.target.value)}
                  placeholder="Enter seconds"
                  step="0.1"
                />
              </div>
              <div className="vital-modal-row">
                <label className="vital-modal-label">Not possible</label>
                <input 
                  type="text" 
                  className="vital-modal-input"
                  value={capRefillNotPossibleReason}
                  readOnly
                  onClick={handleCapRefillNotPossibleClick}
                  placeholder="Select reason"
                  style={{ cursor: 'pointer' }}
                />
              </div>
            </div>

            <div className="vital-modal-divider"></div>

            <div className="vital-modal-section">
              <div className="vital-modal-row">
                <label className="vital-modal-label">Temperature (°C)</label>
                <input 
                  type="number" 
                  className="vital-modal-input"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  placeholder="Enter temperature"
                  step="0.1"
                />
              </div>
              <div className="vital-modal-row">
                <label className="vital-modal-label">Not possible</label>
                <input 
                  type="text" 
                  className="vital-modal-input"
                  value={tempNotPossibleReason}
                  readOnly
                  onClick={handleTempNotPossibleClick}
                  placeholder="Select reason"
                  style={{ cursor: 'pointer' }}
                />
              </div>
            </div>

            <div className="vital-modal-actions">
              <button className="vital-modal-btn secondary" onClick={() => { setShowBGLModal(false); setShowECGModal(true); }}>{'< ECG'}</button>
              <button className="vital-modal-btn secondary">Competency Tool</button>
              <button className="vital-modal-btn cancel" onClick={() => setShowBGLModal(false)}>Cancel</button>
              <button className="vital-modal-btn ok" onClick={handleBGLOk}>OK</button>
              <button className="vital-modal-btn next" onClick={() => { setShowBGLModal(false); setShowPainScoreModal(true); }}>Pain Score {'>'}</button>
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
        <div className="modal-overlay" onClick={() => setShowPainScoreModal(false)}>
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
                  className="vital-modal-input"
                  value={painScoreNotPossibleReason}
                  readOnly
                  onClick={handlePainScoreNotPossibleClick}
                  placeholder="Select reason"
                  style={{ cursor: 'pointer' }}
                />
              </div>
            </div>

            <div className="vital-modal-actions">
              <button className="vital-modal-btn secondary" onClick={() => { setShowPainScoreModal(false); setShowBGLModal(true); }}>{'< BGL+CR+Temp'}</button>
              <button className="vital-modal-btn secondary">Competency Tool</button>
              <button className="vital-modal-btn cancel" onClick={() => setShowPainScoreModal(false)}>Cancel</button>
              <button className="vital-modal-btn ok" onClick={handlePainScoreOk}>OK</button>
              <button className="vital-modal-btn next" onClick={() => { setShowPainScoreModal(false); setShowPupilsModal(true); }}>Pupils {'>'}</button>
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
        <div className="modal-overlay" onClick={() => setShowPupilsModal(false)}>
          <div className="vital-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vital-modal-header">Pupils</div>
            
            <div className="vital-modal-section">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                {/* Left Eye */}
                <div>
                  <h3 style={{ marginBottom: '15px', color: '#2c5282' }}>Left Eye</h3>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Size</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '8px' }}>
                      {['9', '8', '7', '6', '5'].map((size) => (
                        <div
                          key={size}
                          onClick={() => setPupilSizeLeft(size)}
                          style={{
                            cursor: 'pointer',
                            padding: '8px',
                            border: pupilSizeLeft === size ? '3px solid #4a90e2' : '2px solid #ccc',
                            borderRadius: '8px',
                            backgroundColor: pupilSizeLeft === size ? '#e6f2ff' : '#fff',
                            textAlign: 'center',
                            fontWeight: 'bold'
                          }}
                        >
                          {size}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                      {['4', '3', '2', '1', 'Prosthetic'].map((size) => (
                        <div
                          key={size}
                          onClick={() => setPupilSizeLeft(size)}
                          style={{
                            cursor: 'pointer',
                            padding: '8px',
                            border: pupilSizeLeft === size ? '3px solid #4a90e2' : '2px solid #ccc',
                            borderRadius: '8px',
                            backgroundColor: pupilSizeLeft === size ? '#e6f2ff' : '#fff',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: size === 'Prosthetic' ? '11px' : '14px'
                          }}
                        >
                          {size}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Reacts to light</label>
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
                            fontWeight: 'bold'
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
                  <h3 style={{ marginBottom: '15px', color: '#2c5282' }}>Right Eye</h3>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Size</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '8px' }}>
                      {['9', '8', '7', '6', '5'].map((size) => (
                        <div
                          key={size}
                          onClick={() => setPupilSizeRight(size)}
                          style={{
                            cursor: 'pointer',
                            padding: '8px',
                            border: pupilSizeRight === size ? '3px solid #4a90e2' : '2px solid #ccc',
                            borderRadius: '8px',
                            backgroundColor: pupilSizeRight === size ? '#e6f2ff' : '#fff',
                            textAlign: 'center',
                            fontWeight: 'bold'
                          }}
                        >
                          {size}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                      {['4', '3', '2', '1', 'Prosthetic'].map((size) => (
                        <div
                          key={size}
                          onClick={() => setPupilSizeRight(size)}
                          style={{
                            cursor: 'pointer',
                            padding: '8px',
                            border: pupilSizeRight === size ? '3px solid #4a90e2' : '2px solid #ccc',
                            borderRadius: '8px',
                            backgroundColor: pupilSizeRight === size ? '#e6f2ff' : '#fff',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: size === 'Prosthetic' ? '11px' : '14px'
                          }}
                        >
                          {size}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Reacts to light</label>
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
                            fontWeight: 'bold'
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
              <button className="vital-modal-btn cancel" onClick={() => setShowPupilsModal(false)}>Cancel</button>
              <button className="vital-modal-btn ok" onClick={handlePupilsOk}>OK</button>
              <button className="vital-modal-btn next" onClick={() => { setShowPupilsModal(false); setShowETCO2SkinModal(true); }}>ETCO2+Skin {'>'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ETCO2 + Skin Modal */}
      {showETCO2SkinModal && (
        <div className="modal-overlay" onClick={() => setShowETCO2SkinModal(false)}>
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
                  className="vital-modal-input"
                  value={skinNotPossibleReason}
                  readOnly
                  onClick={handleSkinNotPossibleClick}
                  placeholder="Select reason"
                  style={{ cursor: 'pointer' }}
                />
              </div>
            </div>

            <div className="vital-modal-actions">
              <button className="vital-modal-btn secondary" onClick={() => { setShowETCO2SkinModal(false); setShowPupilsModal(true); }}>{'< Pupils'}</button>
              <button className="vital-modal-btn secondary">Competency Tool</button>
              <button className="vital-modal-btn cancel" onClick={() => setShowETCO2SkinModal(false)}>Cancel</button>
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
        <div className="modal-overlay" onClick={() => setShowNotesModal(false)}>
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
              <button className="vital-modal-btn cancel" onClick={() => setShowNotesModal(false)}>Cancel</button>
              <button className="vital-modal-btn ok" onClick={handleNotesOk}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
