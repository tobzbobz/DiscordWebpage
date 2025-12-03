"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'

export const runtime = 'edge'

export default function InterventionsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const incidentId = searchParams?.get('id') || ''
  const fleetId = searchParams?.get('fleetId') || ''
  
  // Saved interventions array
  const [savedInterventions, setSavedInterventions] = useState<any[]>([])
  
  const [showNewIntervention, setShowNewIntervention] = useState(false)
  const [showAirwayModal, setShowAirwayModal] = useState(false)
  const [showRSIModal, setShowRSIModal] = useState(false)
  const [showCPRModal, setShowCPRModal] = useState(false)
  const [showDefibrillationModal, setShowDefibrillationModal] = useState(false)
  const [showIVModal, setShowIVModal] = useState(false)
  const [showIOModal, setShowIOModal] = useState(false)
  const [showPositioningModal, setShowPositioningModal] = useState(false)
  const [showSplintModal, setShowSplintModal] = useState(false)
  const [showTourniquetModal, setShowTourniquetModal] = useState(false)
  const [showOtherNotesModal, setShowOtherNotesModal] = useState(false)
  const [showDateTimePicker, setShowDateTimePicker] = useState(false)
  const [showCPRDiscontinuedPicker, setShowCPRDiscontinuedPicker] = useState(false)
  
  // Intervention state
  const [time, setTime] = useState('')
  const [performedBy, setPerformedBy] = useState('')
  
  // Airway section
  const [airway, setAirway] = useState('')
  const [ventilation, setVentilation] = useState('')
  const [peep, setPeep] = useState('')
  const [cpap, setCpap] = useState('')
  const [rsi, setRsi] = useState('')
  
  // Cardiac section
  const [cpr, setCpr] = useState('')
  const [cprCompressions, setCprCompressions] = useState('')
  const [cprVentilations, setCprVentilations] = useState('')
  const [cprContinuous, setCprContinuous] = useState(false)
  const [cprDiscontinued, setCprDiscontinued] = useState('')
  const [defibrillation, setDefibrillation] = useState('')
  const [cardioversion, setCardioversion] = useState('')
  const [pacing, setPacing] = useState('')
  const [valsalva, setValsalva] = useState('')
  
  // Invasive section
  const [ivCannulation, setIvCannulation] = useState('')
  const [ivSite, setIvSite] = useState('')
  const [ivAttempts, setIvAttempts] = useState('')
  const [ivSuccessful, setIvSuccessful] = useState('')
  const [ioAccess, setIoAccess] = useState('')
  const [ioSite, setIoSite] = useState('')
  const [ioAttempts, setIoAttempts] = useState('')
  const [ioSuccessful, setIoSuccessful] = useState('')
  const [ioNotes, setIoNotes] = useState('')
  const [chestDecompression, setChestDecompression] = useState('')
  const [stomachDecompression, setStomachDecompression] = useState('')
  const [catheterTroubleshooting, setCatheterTroubleshooting] = useState('')
  const [nerveBlock, setNerveBlock] = useState('')
  
  // Other section
  const [positioning, setPositioning] = useState('')
  const [positioningPosition, setPositioningPosition] = useState('')
  const [positioningLegsElevated, setPositioningLegsElevated] = useState('')
  const [positioningOther, setPositioningOther] = useState('')
  const [splintDressingTag, setSplintDressingTag] = useState('')
  const [splintSelection, setSplintSelection] = useState('')
  const [splintOther, setSplintOther] = useState('')
  const [nasalTamponade, setNasalTamponade] = useState('')
  const [tourniquet, setTourniquet] = useState('')
  const [tourniquetLocation, setTourniquetLocation] = useState('')
  const [tourniquetSuccessful, setTourniquetSuccessful] = useState('')
  const [limbReduction, setLimbReduction] = useState('')
  const [epleManoeuvre, setEpleManoeuvre] = useState('')
  const [otherInterventionNotes, setOtherInterventionNotes] = useState('')
  
  // Modal state
  const [airwayMethod, setAirwayMethod] = useState('')
  const [defibrillationJoules, setDefibrillationJoules] = useState('')
  
  // Date/time picker state
  const [pickerDay, setPickerDay] = useState(1)
  const [pickerMonth, setPickerMonth] = useState(1)
  const [pickerYear, setPickerYear] = useState(2025)
  const [pickerHour, setPickerHour] = useState(0)
  const [pickerMinute, setPickerMinute] = useState(0)
  
  const airwayMethods = [
    'Manual Clear',
    'OPA',
    'Intubation',
    'Other Device',
    'Suction',
    'NPA',
    'Cricothyroidotomy',
    'Jaw Thrust',
    'LMA',
    'Laryngoscopy'
  ]
  
  const ventilationOptions = [
    'Manual',
    'Mechanical'
  ]
  
  const rsiOptions = [
    'Successful',
    'Unsuccessful'
  ]
  
  const splintOptions = [
    'Dressing',
    'Bandage',
    'Cardboard Splint',
    'Traction Splint',
    'KED or Similar',
    'Firm Cervical Collar',
    'Cervical Lanyard'
  ]

  const handleLogout = () => {
    router.push('/')
  }

  const navigateTo = (section: string) => {
    const params = new URLSearchParams({ id: incidentId, fleetId })
    if (section === 'incident') router.push(`/incident?${params}`)
    else if (section === 'patient-info') router.push(`/patient-info?${params}`)
    else if (section === 'primary-survey') router.push(`/primary-survey?${params}`)
    else if (section === 'vital-obs') router.push(`/vital-obs?${params}`)
    else if (section === 'medications') router.push(`/medications?${params}`)
  }

  const handlePrevious = () => {
    navigateTo('vital-obs')
  }

  const handleNext = () => {
    // Navigate to next section when created
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

  const handleNewIntervention = () => {
    setShowNewIntervention(true)
  }

  const resetInterventionForm = () => {
    setTime('')
    setPerformedBy('')
    setAirway('')
    setVentilation('')
    setPeep('')
    setCpap('')
    setRsi('')
    setCpr('')
    setCprCompressions('')
    setCprVentilations('')
    setCprContinuous(false)
    setCprDiscontinued('')
    setDefibrillation('')
    setDefibrillationJoules('')
    setCardioversion('')
    setPacing('')
    setValsalva('')
    setIvCannulation('')
    setIvSite('')
    setIvAttempts('')
    setIvSuccessful('')
    setIoAccess('')
    setIoSite('')
    setIoAttempts('')
    setIoSuccessful('')
    setIoNotes('')
    setChestDecompression('')
    setStomachDecompression('')
    setCatheterTroubleshooting('')
    setNerveBlock('')
    setPositioning('')
    setPositioningPosition('')
    setPositioningLegsElevated('')
    setPositioningOther('')
    setSplintDressingTag('')
    setSplintSelection('')
    setSplintOther('')
    setNasalTamponade('')
    setTourniquet('')
    setTourniquetLocation('')
    setTourniquetSuccessful('')
    setLimbReduction('')
    setEpleManoeuvre('')
    setOtherInterventionNotes('')
    setAirwayMethod('')
  }

  const saveCurrentIntervention = () => {
    const interventionEntry = {
      time,
      performedBy,
      airway,
      ventilation,
      rsi,
      cpr,
      defibrillation,
      cardioversion,
      pacing,
      valsalva,
      ivCannulation,
      ioAccess,
      chestDecompression,
      stomachDecompression,
      catheterTroubleshooting,
      nerveBlock,
      positioning,
      splintDressingTag,
      nasalTamponade,
      tourniquet,
      limbReduction,
      epleManoeuvre,
      otherInterventionNotes
    }
    setSavedInterventions([...savedInterventions, interventionEntry])
  }

  const handleSaveAndReturn = () => {
    saveCurrentIntervention()
    const params = new URLSearchParams({ id: incidentId, fleetId })
    router.push(`/vital-obs?${params}`)
  }

  const handleSaveAndEnterAnother = () => {
    saveCurrentIntervention()
    resetInterventionForm()
  }

  const handleCancelAndDiscard = () => {
    resetInterventionForm()
    setShowNewIntervention(false)
  }

  const handleAirwayClick = () => {
    setShowAirwayModal(true)
  }

  const handleAirwaySelect = (method: string) => {
    setAirwayMethod(method)
    setAirway(method)
    setShowAirwayModal(false)
  }

  const handleRSIClick = () => {
    setShowRSIModal(true)
  }

  const handleRSISelect = (option: string) => {
    setRsi(option)
    setShowRSIModal(false)
  }

  const handleCPRClick = () => {
    setShowCPRModal(true)
  }

  const handleCPROk = () => {
    const ratio = cprContinuous ? 'Continuous' : `${cprCompressions}:${cprVentilations}`
    setCpr(ratio)
    setShowCPRModal(false)
  }

  const openCPRDiscontinuedPicker = () => {
    const now = new Date()
    setPickerDay(now.getDate())
    setPickerMonth(now.getMonth() + 1)
    setPickerYear(now.getFullYear())
    setPickerHour(now.getHours())
    setPickerMinute(now.getMinutes())
    setShowCPRDiscontinuedPicker(true)
  }

  const handleSetCPRDiscontinued = () => {
    const formatted = `${String(pickerDay).padStart(2, '0')}/${String(pickerMonth).padStart(2, '0')}/${pickerYear} ${String(pickerHour).padStart(2, '0')}:${String(pickerMinute).padStart(2, '0')}`
    setCprDiscontinued(formatted)
    setShowCPRDiscontinuedPicker(false)
  }

  const setCPRDiscontinuedNow = () => {
    const now = new Date()
    const formatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setCprDiscontinued(formatted)
  }

  const handleDefibrillationClick = () => {
    setShowDefibrillationModal(true)
  }

  const handleDefibrillationSelect = (joules: string) => {
    setDefibrillation(joules)
    setDefibrillationJoules(joules)
    setShowDefibrillationModal(false)
  }

  const handleIVClick = () => {
    setShowIVModal(true)
  }

  const handleIVOk = () => {
    const parts = []
    if (ivSite) parts.push(ivSite)
    if (ivAttempts) parts.push(`${ivAttempts} attempts`)
    if (ivSuccessful) parts.push(ivSuccessful)
    setIvCannulation(parts.join(', '))
    setShowIVModal(false)
  }

  const handleIOClick = () => {
    setShowIOModal(true)
  }

  const handleIOOk = () => {
    const parts = []
    if (ioSite) parts.push(ioSite)
    if (ioAttempts) parts.push(`${ioAttempts} attempts`)
    if (ioSuccessful) parts.push(ioSuccessful)
    setIoAccess(parts.join(', '))
    setShowIOModal(false)
  }

  const handlePositioningClick = () => {
    setShowPositioningModal(true)
  }

  const handlePositioningOk = () => {
    const parts = []
    if (positioningPosition) parts.push(positioningPosition)
    if (positioningLegsElevated) parts.push(`Legs: ${positioningLegsElevated}`)
    if (positioningOther) parts.push(positioningOther)
    setPositioning(parts.join(', '))
    setShowPositioningModal(false)
  }

  const handleSplintClick = () => {
    setShowSplintModal(true)
  }

  const handleSplintSelect = (option: string) => {
    setSplintSelection(option)
    if (option !== 'Other') {
      setSplintDressingTag(option)
      setShowSplintModal(false)
    }
  }

  const handleSplintOk = () => {
    if (splintSelection === 'Other' && splintOther) {
      setSplintDressingTag(splintOther)
    }
    setShowSplintModal(false)
  }

  const handleTourniquetClick = () => {
    setShowTourniquetModal(true)
  }

  const handleTourniquetOk = () => {
    const parts = []
    if (tourniquetLocation) parts.push(tourniquetLocation)
    if (tourniquetSuccessful) parts.push(tourniquetSuccessful)
    setTourniquet(parts.join(', '))
    setShowTourniquetModal(false)
  }

  const handleOtherNotesClick = () => {
    setShowOtherNotesModal(true)
  }

  const handleOtherNotesOk = () => {
    setShowOtherNotesModal(false)
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
          <button className="sidebar-btn" onClick={() => navigateTo('vital-obs')}>Vital Obs / Treat</button>
          <button className="sidebar-btn">Hx Complaint</button>
          <button className="sidebar-btn">Past Medical History</button>
          <button className="sidebar-btn">Clinical Impression</button>
          <button className="sidebar-btn">Disposition</button>
          <button className="sidebar-btn">Media</button>
        </aside>

        <main className="incident-content">
          {!showNewIntervention ? (
            <section className="incident-section">
              <h2 className="section-title">Intervention(s)</h2>
              {savedInterventions.length === 0 ? (
                <div className="no-record-message">No record found.</div>
              ) : (
                <div style={{ marginTop: '20px' }}>
                  {savedInterventions.map((intervention, index) => (
                    <div key={index} style={{
                      backgroundColor: '#d8e8f8',
                      padding: '15px',
                      marginBottom: '10px',
                      borderRadius: '4px',
                      border: '1px solid #a8c5e0'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#2c5282' }}>
                        Time: {intervention.time || 'No time recorded'} | Performed by: {intervention.performedBy || 'Not specified'}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '14px' }}>
                        {intervention.airway && <div><strong>Airway:</strong> {intervention.airway}</div>}
                        {intervention.ventilation && <div><strong>Ventilation:</strong> {intervention.ventilation}</div>}
                        {intervention.rsi && <div><strong>RSI:</strong> {intervention.rsi}</div>}
                        {intervention.cpr && <div><strong>CPR:</strong> {intervention.cpr}</div>}
                        {intervention.defibrillation && <div><strong>Defibrillation:</strong> {intervention.defibrillation}</div>}
                        {intervention.ivCannulation && <div><strong>IV Cannulation:</strong> {intervention.ivCannulation}</div>}
                        {intervention.ioAccess && <div><strong>IO Access:</strong> {intervention.ioAccess}</div>}
                        {intervention.positioning && <div><strong>Positioning:</strong> {intervention.positioning}</div>}
                        {intervention.splintDressingTag && <div><strong>Splint/Dressing/Tag:</strong> {intervention.splintDressingTag}</div>}
                        {intervention.tourniquet && <div><strong>Tourniquet:</strong> {intervention.tourniquet}</div>}
                        {intervention.otherInterventionNotes && <div style={{ gridColumn: '1 / -1' }}><strong>Other Notes:</strong> {intervention.otherInterventionNotes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="incident-section">
              <h2 className="section-title">Intervention(s)</h2>
              
              <div className="intervention-form">
                {/* Time and Performed By Row */}
                <div className="intervention-header-row">
                  <div className="intervention-field" style={{ flex: '0 0 300px' }}>
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

                  <div className="intervention-field" style={{ flex: 1 }}>
                    <label className="field-label required">Performed by</label>
                    <input 
                      type="text" 
                      value={performedBy}
                      onChange={(e) => setPerformedBy(e.target.value)}
                      className="text-input"
                      placeholder="roblox username"
                    />
                  </div>
                </div>

                {/* Airway Section */}
                <div className="intervention-category">
                  <div className="intervention-category-label">Airway</div>
                  <div className="intervention-row">
                    <div className="intervention-field">
                      <label className="field-label">Airway</label>
                      <input 
                        type="text" 
                        value={airway}
                        className="text-input clickable-input"
                        readOnly
                        onClick={handleAirwayClick}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">Ventilation</label>
                      <select 
                        value={ventilation}
                        onChange={(e) => setVentilation(e.target.value)}
                        className="text-input"
                      >
                        <option value=""></option>
                        {ventilationOptions.map((option, index) => (
                          <option key={index} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">PEEP (cmH₂0)</label>
                      <input 
                        type="text" 
                        className="text-input grayed-disabled"
                        disabled
                        readOnly
                      />
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">CPAP (cmH₂O)</label>
                      <input 
                        type="text" 
                        className="text-input grayed-disabled"
                        disabled
                        readOnly
                      />
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">RSI</label>
                      <input 
                        type="text" 
                        value={rsi}
                        className="text-input clickable-input"
                        readOnly
                        onClick={handleRSIClick}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Cardiac Section */}
                <div className="intervention-category">
                  <div className="intervention-category-label">Cardiac</div>
                  <div className="intervention-row">
                    <div className="intervention-field">
                      <label className="field-label">CPR</label>
                      <input 
                        type="text" 
                        value={cpr}
                        className="text-input clickable-input"
                        readOnly
                        onClick={handleCPRClick}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">Defibrillation (Joules)</label>
                      <input 
                        type="text" 
                        value={defibrillation}
                        className="text-input clickable-input"
                        readOnly
                        onClick={handleDefibrillationClick}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">Cardioversion (Joules)</label>
                      <input 
                        type="text" 
                        className="text-input grayed-disabled"
                        disabled
                        readOnly
                      />
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">Pacing</label>
                      <input 
                        type="text" 
                        className="text-input grayed-disabled"
                        disabled
                        readOnly
                      />
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">Valsalva</label>
                      <input 
                        type="text" 
                        className="text-input grayed-disabled"
                        disabled
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                {/* Invasive Section */}
                <div className="intervention-category">
                  <div className="intervention-category-label">Invasive</div>
                  <div className="intervention-row" style={{ marginBottom: '10px' }}>
                    <div className="intervention-field">
                      <label className="field-label">IV Cannulation</label>
                      <input 
                        type="text" 
                        value={ivCannulation}
                        readOnly
                        onClick={handleIVClick}
                        className="text-input"
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">IO Access</label>
                      <input 
                        type="text" 
                        value={ioAccess}
                        readOnly
                        onClick={handleIOClick}
                        className="text-input"
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">Chest Decompression</label>
                      <input 
                        type="text" 
                        value={chestDecompression}
                        disabled
                        readOnly
                        className="text-input grayed-disabled"
                      />
                    </div>
                  </div>
                  <div className="intervention-row">
                    <div className="intervention-field">
                      <label className="field-label">Stomach Decompression</label>
                      <input 
                        type="text" 
                        value={stomachDecompression}
                        disabled
                        readOnly
                        className="text-input grayed-disabled"
                      />
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">Catheter Troubleshooting</label>
                      <input 
                        type="text" 
                        value={catheterTroubleshooting}
                        disabled
                        readOnly
                        className="text-input grayed-disabled"
                      />
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">Nerve Block</label>
                      <input 
                        type="text" 
                        value={nerveBlock}
                        disabled
                        readOnly
                        className="text-input grayed-disabled"
                      />
                    </div>
                  </div>
                </div>

                {/* Other Section */}
                <div className="intervention-category">
                  <div className="intervention-category-label">Other</div>
                  <div className="intervention-row" style={{ marginBottom: '10px' }}>
                    <div className="intervention-field">
                      <label className="field-label">Positioning</label>
                      <input 
                        type="text" 
                        value={positioning}
                        readOnly
                        onClick={handlePositioningClick}
                        className="text-input"
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">Splint/Dressing/Tag</label>
                      <input 
                        type="text" 
                        value={splintDressingTag}
                        readOnly
                        onClick={handleSplintClick}
                        className="text-input"
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">Nasal Tamponade</label>
                      <input 
                        type="text" 
                        value={nasalTamponade}
                        disabled
                        readOnly
                        className="text-input grayed-disabled"
                      />
                    </div>
                  </div>
                  <div className="intervention-row" style={{ marginBottom: '10px' }}>
                    <div className="intervention-field">
                      <label className="field-label">Tourniquet</label>
                      <input 
                        type="text" 
                        value={tourniquet}
                        readOnly
                        onClick={handleTourniquetClick}
                        className="text-input"
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">Limb Reduction</label>
                      <input 
                        type="text" 
                        value={limbReduction}
                        disabled
                        readOnly
                        className="text-input grayed-disabled"
                      />
                    </div>
                    <div className="intervention-field">
                      <label className="field-label">Eple Manoeuvre</label>
                      <input 
                        type="text" 
                        value={epleManoeuvre}
                        disabled
                        readOnly
                        className="text-input grayed-disabled"
                      />
                    </div>
                  </div>
                  <div className="intervention-row">
                    <div className="intervention-field" style={{ flex: 1 }}>
                      <label className="field-label">Other Intervention/Notes</label>
                      <input 
                        type="text" 
                        value={otherInterventionNotes}
                        readOnly
                        onClick={handleOtherNotesClick}
                        className="text-input"
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {!showNewIntervention ? (
        <div className="eprf-footer vitals-footer">
          <div className="footer-left">
            <button className="footer-btn large-blue" onClick={() => navigateTo('vital-obs')}>New Vitals</button>
            <button className="footer-btn large-blue" onClick={() => navigateTo('medications')}>New Meds</button>
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
          </div>
          <div className="footer-right">
            <button className="footer-btn gray" onClick={handleCancelAndDiscard}>Cancel and discard changes</button>
            <button className="footer-btn blue" onClick={handleSaveAndEnterAnother}>Save and enter another intervention</button>
            <button className="footer-btn blue" onClick={handleSaveAndReturn}>Save and return to Vital Obs/Treat</button>
          </div>
        </div>
      )}

      {/* Date/Time Picker Modal */}
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
                <button className="picker-btn" onClick={() => setPickerYear(pickerYear - 1)}>-</button>
              </div>
              <div className="picker-column">
                <button className="picker-btn" onClick={() => setPickerHour((pickerHour + 1) % 24)}>+</button>
                <div className="picker-value highlight">{String(pickerHour).padStart(2, '0')}</div>
                <button className="picker-btn" onClick={() => setPickerHour((pickerHour - 1 + 24) % 24)}>-</button>
              </div>
              <div className="picker-column">
                <button className="picker-btn" onClick={() => setPickerMinute((pickerMinute + 1) % 60)}>+</button>
                <div className="picker-value highlight">{String(pickerMinute).padStart(2, '0')}</div>
                <button className="picker-btn" onClick={() => setPickerMinute((pickerMinute - 1 + 60) % 60)}>-</button>
              </div>
            </div>
            <div className="picker-footer">
              <button className="picker-footer-btn cancel" onClick={() => setShowDateTimePicker(false)}>Cancel</button>
              <button className="picker-footer-btn ok" onClick={handleSetDateTime}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Airway Modal */}
      {showAirwayModal && (
        <div className="modal-overlay" onClick={() => setShowAirwayModal(false)}>
          <div className="airway-modal" onClick={(e) => e.stopPropagation()}>
            <div className="airway-header">Airway</div>
            <div className="airway-content">
              <div className="airway-method-label">Method *</div>
              <div className="airway-methods-grid">
                {airwayMethods.map((method, index) => (
                  <label key={index} className="airway-method-option">
                    <input
                      type="radio"
                      name="airwayMethod"
                      checked={airwayMethod === method}
                      onChange={() => setAirwayMethod(method)}
                    />
                    <span>{method}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="airway-footer">
              <button className="airway-footer-btn cancel" onClick={() => setShowAirwayModal(false)}>Cancel</button>
              <button className="airway-footer-btn ok" onClick={() => handleAirwaySelect(airwayMethod)}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* RSI Modal */}
      {showRSIModal && (
        <div className="modal-overlay" onClick={() => setShowRSIModal(false)}>
          <div className="rsi-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rsi-header">RSI</div>
            <div className="rsi-content">
              {rsiOptions.map((option, index) => (
                <div 
                  key={index}
                  className="rsi-option"
                  onClick={() => handleRSISelect(option)}
                >
                  {option}
                </div>
              ))}
            </div>
            <div className="rsi-footer">
              <button className="rsi-footer-btn cancel" onClick={() => setShowRSIModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* CPR Modal */}
      {showCPRModal && (
        <div className="modal-overlay" onClick={() => setShowCPRModal(false)}>
          <div className="cpr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cpr-header">CPR</div>
            <div className="cpr-content">
              <div className="cpr-ratio-section">
                <div className="cpr-ratio-label">CPR Ratio:</div>
                <div className="cpr-ratio-inputs">
                  <div className="cpr-input-group">
                    <label className="cpr-input-label">Compressions *</label>
                    <input 
                      type="number" 
                      value={cprCompressions}
                      onChange={(e) => setCprCompressions(e.target.value)}
                      className="cpr-input green-input"
                      disabled={cprContinuous}
                    />
                  </div>
                  <div className="cpr-ratio-divider">/</div>
                  <div className="cpr-input-group">
                    <label className="cpr-input-label">Ventilations *</label>
                    <input 
                      type="number" 
                      value={cprVentilations}
                      onChange={(e) => setCprVentilations(e.target.value)}
                      className="cpr-input"
                      disabled={cprContinuous}
                    />
                  </div>
                  <div className="cpr-or">OR</div>
                  <div className="cpr-continuous-group">
                    <label className="cpr-continuous-label">
                      <input 
                        type="checkbox" 
                        checked={cprContinuous}
                        onChange={(e) => setCprContinuous(e.target.checked)}
                      />
                      <span>Continuous Compressions</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="cpr-discontinued-section">
                <label className="cpr-input-label">Time CPR Discontinued</label>
                <div className="input-with-btn">
                  <input 
                    type="text" 
                    value={cprDiscontinued}
                    className="cpr-input"
                    readOnly
                    onClick={openCPRDiscontinuedPicker}
                  />
                  <button className="now-btn" onClick={setCPRDiscontinuedNow}>Now</button>
                </div>
              </div>
            </div>
            <div className="cpr-footer">
              <button className="cpr-footer-btn cancel" onClick={() => setShowCPRModal(false)}>Cancel</button>
              <button className="cpr-footer-btn ok" onClick={handleCPROk}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* CPR Discontinued Time Picker */}
      {showCPRDiscontinuedPicker && (
        <div className="modal-overlay" onClick={() => setShowCPRDiscontinuedPicker(false)}>
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
                <button className="picker-btn" onClick={() => setPickerYear(pickerYear - 1)}>-</button>
              </div>
              <div className="picker-column">
                <button className="picker-btn" onClick={() => setPickerHour((pickerHour + 1) % 24)}>+</button>
                <div className="picker-value highlight">{String(pickerHour).padStart(2, '0')}</div>
                <button className="picker-btn" onClick={() => setPickerHour((pickerHour - 1 + 24) % 24)}>-</button>
              </div>
              <div className="picker-column">
                <button className="picker-btn" onClick={() => setPickerMinute((pickerMinute + 1) % 60)}>+</button>
                <div className="picker-value highlight">{String(pickerMinute).padStart(2, '0')}</div>
                <button className="picker-btn" onClick={() => setPickerMinute((pickerMinute - 1 + 60) % 60)}>-</button>
              </div>
            </div>
            <div className="picker-footer">
              <button className="picker-footer-btn cancel" onClick={() => setShowCPRDiscontinuedPicker(false)}>Cancel</button>
              <button className="picker-footer-btn ok" onClick={handleSetCPRDiscontinued}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Defibrillation Modal */}
      {showDefibrillationModal && (
        <div className="modal-overlay" onClick={() => setShowDefibrillationModal(false)}>
          <div className="defibrillation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="defibrillation-header">Defibrillation (Joules)</div>
            <div className="defibrillation-content">
              <div className="defibrillation-category">AED</div>
              {['25', '50', '100', '150', '200', '360'].map((joules, index) => (
                <div 
                  key={index}
                  className="defibrillation-option"
                  onClick={() => handleDefibrillationSelect(joules)}
                >
                  {joules}
                </div>
              ))}
            </div>
            <div className="defibrillation-footer">
              <button className="defibrillation-footer-btn cancel" onClick={() => setShowDefibrillationModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showIVModal && (
        <div className="modal-overlay" onClick={() => setShowIVModal(false)}>
          <div className="iv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="iv-header">IV Cannulation</div>
            <div className="iv-content">
              <div className="iv-section">
                <label className="iv-section-label">Site</label>
                <div className="iv-site-grid">
                  {['Left hand', 'Right hand', 'Left forearm', 'Right forearm', 'Left ACF', 'Right ACF', 'Left EJV', 'Right EJV'].map((site, index) => (
                    <label key={index} className="iv-radio-label">
                      <input 
                        type="radio"
                        name="ivSite"
                        value={site}
                        checked={ivSite === site}
                        onChange={(e) => setIvSite(e.target.value)}
                      />
                      <span>{site}</span>
                    </label>
                  ))}
                  <label className="iv-radio-label">
                    <input 
                      type="radio"
                      name="ivSite"
                      value="Other"
                      checked={ivSite === 'Other'}
                      onChange={(e) => setIvSite(e.target.value)}
                    />
                    <span>Other</span>
                  </label>
                </div>
              </div>
              <div className="iv-section grayed-section">
                <label className="iv-section-label">Gauge</label>
                <div className="iv-gauge-grid">
                  {['14', '16', '18', '20', '22', '24'].map((gauge, index) => (
                    <label key={index} className="iv-radio-label">
                      <input 
                        type="radio"
                        name="ivGauge"
                        disabled
                      />
                      <span>{gauge}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="iv-section">
                <label className="iv-section-label">Number of attempts</label>
                <input 
                  type="number"
                  value={ivAttempts}
                  onChange={(e) => setIvAttempts(e.target.value)}
                  className="iv-attempts-input"
                  min="1"
                />
              </div>
              <div className="iv-section">
                <label className="iv-section-label">Success</label>
                <div className="iv-success-grid">
                  <label className="iv-radio-label">
                    <input 
                      type="radio"
                      name="ivSuccess"
                      value="Successful"
                      checked={ivSuccessful === 'Successful'}
                      onChange={(e) => setIvSuccessful(e.target.value)}
                    />
                    <span>Successful</span>
                  </label>
                  <label className="iv-radio-label">
                    <input 
                      type="radio"
                      name="ivSuccess"
                      value="Unsuccessful"
                      checked={ivSuccessful === 'Unsuccessful'}
                      onChange={(e) => setIvSuccessful(e.target.value)}
                    />
                    <span>Unsuccessful</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="iv-footer">
              <button className="iv-footer-btn cancel" onClick={() => setShowIVModal(false)}>Cancel</button>
              <button className="iv-footer-btn ok" onClick={handleIVOk}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showIOModal && (
        <div className="modal-overlay" onClick={() => setShowIOModal(false)}>
          <div className="io-modal" onClick={(e) => e.stopPropagation()}>
            <div className="io-header">IO Access</div>
            <div className="io-content">
              <div className="io-section">
                <label className="io-section-label">Site</label>
                <div className="io-site-grid">
                  {['Left tibial', 'Right tibial', 'Left humeral', 'Right humeral'].map((site, index) => (
                    <label key={index} className="io-radio-label">
                      <input 
                        type="radio"
                        name="ioSite"
                        value={site}
                        checked={ioSite === site}
                        onChange={(e) => setIoSite(e.target.value)}
                      />
                      <span>{site}</span>
                    </label>
                  ))}
                  <label className="io-radio-label">
                    <input 
                      type="radio"
                      name="ioSite"
                      value="Other"
                      checked={ioSite === 'Other'}
                      onChange={(e) => setIoSite(e.target.value)}
                    />
                    <span>Other</span>
                  </label>
                </div>
              </div>
              <div className="io-section grayed-section">
                <label className="io-section-label">Gauge</label>
                <div className="io-gauge-grid">
                  {['Cook needle', 'EZIO Short', 'EZIO Adult', 'EZIO Long'].map((gauge, index) => (
                    <label key={index} className="io-radio-label">
                      <input 
                        type="radio"
                        name="ioGauge"
                        disabled
                      />
                      <span>{gauge}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="io-section">
                <label className="io-section-label">Number of attempts</label>
                <input 
                  type="number"
                  value={ioAttempts}
                  onChange={(e) => setIoAttempts(e.target.value)}
                  className="io-attempts-input"
                  min="1"
                />
              </div>
              <div className="io-section">
                <label className="io-section-label">Success</label>
                <div className="io-success-grid">
                  <label className="io-radio-label">
                    <input 
                      type="radio"
                      name="ioSuccess"
                      value="Successful"
                      checked={ioSuccessful === 'Successful'}
                      onChange={(e) => setIoSuccessful(e.target.value)}
                    />
                    <span>Successful</span>
                  </label>
                  <label className="io-radio-label">
                    <input 
                      type="radio"
                      name="ioSuccess"
                      value="Unsuccessful"
                      checked={ioSuccessful === 'Unsuccessful'}
                      onChange={(e) => setIoSuccessful(e.target.value)}
                    />
                    <span>Unsuccessful</span>
                  </label>
                </div>
              </div>
              <div className="io-section">
                <label className="io-section-label">Notes</label>
                <textarea
                  value={ioNotes}
                  onChange={(e) => setIoNotes(e.target.value)}
                  className="io-notes-input"
                  placeholder="Enter notes..."
                  rows={3}
                />
              </div>
            </div>
            <div className="io-footer">
              <button className="io-footer-btn cancel" onClick={() => setShowIOModal(false)}>Cancel</button>
              <button className="io-footer-btn ok" onClick={handleIOOk}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showPositioningModal && (
        <div className="modal-overlay" onClick={() => setShowPositioningModal(false)}>
          <div className="positioning-modal" onClick={(e) => e.stopPropagation()}>
            <div className="positioning-header">Positioning</div>
            <div className="positioning-content">
              <div className="positioning-section">
                <label className="positioning-section-label">Position<span style={{ color: 'red' }}>*</span></label>
                <div className="positioning-position-grid">
                  {['Recovery', 'Supine (lying flat)', 'Seated', 'Lateral (on side)', 'Semi-recumbent', 'Prone'].map((pos, index) => (
                    <label key={index} className="positioning-radio-label">
                      <input 
                        type="radio"
                        name="position"
                        value={pos}
                        checked={positioningPosition === pos}
                        onChange={(e) => setPositioningPosition(e.target.value)}
                      />
                      <span>{pos}</span>
                    </label>
                  ))}
                  <label className="positioning-radio-label">
                    <input 
                      type="radio"
                      name="position"
                      value="Other"
                      checked={positioningPosition === 'Other'}
                      onChange={(e) => setPositioningPosition(e.target.value)}
                    />
                    <span>Other</span>
                  </label>
                </div>
              </div>
              <div className="positioning-section">
                <label className="positioning-section-label">Legs elevated?</label>
                <div className="positioning-legs-grid">
                  <label className="positioning-radio-label">
                    <input 
                      type="radio"
                      name="legsElevated"
                      value="Yes"
                      checked={positioningLegsElevated === 'Yes'}
                      onChange={(e) => setPositioningLegsElevated(e.target.value)}
                    />
                    <span>Yes</span>
                  </label>
                  <label className="positioning-radio-label">
                    <input 
                      type="radio"
                      name="legsElevated"
                      value="No"
                      checked={positioningLegsElevated === 'No'}
                      onChange={(e) => setPositioningLegsElevated(e.target.value)}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>
              {positioningPosition === 'Other' && (
                <div className="positioning-section">
                  <label className="positioning-section-label">Other</label>
                  <input 
                    type="text"
                    value={positioningOther}
                    onChange={(e) => setPositioningOther(e.target.value)}
                    className="positioning-other-input"
                    placeholder="Enter other position..."
                  />
                </div>
              )}
            </div>
            <div className="positioning-footer">
              <button className="positioning-footer-btn cancel" onClick={() => setShowPositioningModal(false)}>Cancel</button>
              <button className="positioning-footer-btn ok" onClick={handlePositioningOk}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showSplintModal && (
        <div className="modal-overlay" onClick={() => setShowSplintModal(false)}>
          <div className="splint-modal" onClick={(e) => e.stopPropagation()}>
            <div className="splint-header">Splint/Dressing/Tag</div>
            <div className="splint-content">
              {splintOptions.map((option, index) => (
                <div 
                  key={index}
                  className={`splint-option ${splintSelection === option ? 'selected' : ''}`}
                  onClick={() => handleSplintSelect(option)}
                >
                  {option}
                </div>
              ))}
              <div 
                className={`splint-option ${splintSelection === 'Other' ? 'selected' : ''}`}
                onClick={() => handleSplintSelect('Other')}
              >
                Other
              </div>
              {splintSelection === 'Other' && (
                <div className="splint-other-section">
                  <input 
                    type="text"
                    value={splintOther}
                    onChange={(e) => setSplintOther(e.target.value)}
                    className="splint-other-input"
                    placeholder="Enter other..."
                  />
                  <button className="splint-other-ok" onClick={handleSplintOk}>OK</button>
                </div>
              )}
            </div>
            <div className="splint-footer">
              <button className="splint-footer-btn cancel" onClick={() => setShowSplintModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showTourniquetModal && (
        <div className="modal-overlay" onClick={() => setShowTourniquetModal(false)}>
          <div className="tourniquet-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tourniquet-header">Tourniquet</div>
            <div className="tourniquet-content">
              <div className="tourniquet-section">
                <label className="tourniquet-section-label">Tourniquet<span style={{ color: 'red' }}>*</span></label>
                <div className="tourniquet-location-grid">
                  <label className="tourniquet-radio-label">
                    <input 
                      type="radio"
                      name="tourniquetLocation"
                      value="Left arm"
                      checked={tourniquetLocation === 'Left arm'}
                      onChange={(e) => setTourniquetLocation(e.target.value)}
                    />
                    <span>Left arm</span>
                  </label>
                  <label className="tourniquet-radio-label">
                    <input 
                      type="radio"
                      name="tourniquetLocation"
                      value="Right arm"
                      checked={tourniquetLocation === 'Right arm'}
                      onChange={(e) => setTourniquetLocation(e.target.value)}
                    />
                    <span>Right arm</span>
                  </label>
                  <label className="tourniquet-radio-label">
                    <input 
                      type="radio"
                      name="tourniquetLocation"
                      value="Left leg"
                      checked={tourniquetLocation === 'Left leg'}
                      onChange={(e) => setTourniquetLocation(e.target.value)}
                    />
                    <span>Left leg</span>
                  </label>
                  <label className="tourniquet-radio-label">
                    <input 
                      type="radio"
                      name="tourniquetLocation"
                      value="Right leg"
                      checked={tourniquetLocation === 'Right leg'}
                      onChange={(e) => setTourniquetLocation(e.target.value)}
                    />
                    <span>Right leg</span>
                  </label>
                </div>
              </div>
              <div className="tourniquet-section">
                <label className="tourniquet-section-label">Tourniquet successful<span style={{ color: 'red' }}>*</span></label>
                <div className="tourniquet-success-grid">
                  <label className="tourniquet-radio-label">
                    <input 
                      type="radio"
                      name="tourniquetSuccessful"
                      value="Successful"
                      checked={tourniquetSuccessful === 'Successful'}
                      onChange={(e) => setTourniquetSuccessful(e.target.value)}
                    />
                    <span>Successful</span>
                  </label>
                  <label className="tourniquet-radio-label">
                    <input 
                      type="radio"
                      name="tourniquetSuccessful"
                      value="Unsuccessful"
                      checked={tourniquetSuccessful === 'Unsuccessful'}
                      onChange={(e) => setTourniquetSuccessful(e.target.value)}
                    />
                    <span>Unsuccessful</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="tourniquet-footer">
              <button className="tourniquet-footer-btn cancel" onClick={() => setShowTourniquetModal(false)}>Cancel</button>
              <button className="tourniquet-footer-btn ok" onClick={handleTourniquetOk}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showOtherNotesModal && (
        <div className="modal-overlay" onClick={() => setShowOtherNotesModal(false)}>
          <div className="vital-detail-modal notes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vital-detail-header">Other Intervention/Notes</div>
            <div className="vital-detail-content">
              <textarea
                value={otherInterventionNotes}
                onChange={(e) => setOtherInterventionNotes(e.target.value)}
                className="notes-textarea"
                placeholder="Enter notes..."
                rows={10}
              />
            </div>
            <div className="vital-detail-footer">
              <button className="footer-btn gray" onClick={() => setShowOtherNotesModal(false)}>Cancel</button>
              <button className="footer-btn blue" onClick={handleOtherNotesOk}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
