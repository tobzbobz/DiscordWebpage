"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'

export const runtime = 'edge'

export default function MedicationsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const incidentId = searchParams?.get('id') || ''
  const fleetId = searchParams?.get('fleetId') || ''
  
  // Saved medications array
  const [savedMedications, setSavedMedications] = useState<any[]>([])
  
  const [showNewMedication, setShowNewMedication] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showRouteModal, setShowRouteModal] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [showNotPossibleModal, setShowNotPossibleModal] = useState(false)
  const [showDateTimePicker, setShowDateTimePicker] = useState(false)
  
  // Medication state
  const [time, setTime] = useState('')
  const [administeredBy, setAdministeredBy] = useState('')
  const [medication, setMedication] = useState('')
  const [dose, setDose] = useState('')
  const [unit, setUnit] = useState('')
  const [route, setRoute] = useState('')
  const [notes, setNotes] = useState('')
  const [notPossible, setNotPossible] = useState('')
  const [drawnUpNotUsed, setDrawnUpNotUsed] = useState(false)
  const [brokenAmpoule, setBrokenAmpoule] = useState(false)
  const [discarded, setDiscarded] = useState(false)
  
  // Modal state
  const [notesValue, setNotesValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [notPossibleReason, setNotPossibleReason] = useState('')
  
  // Date/time picker state
  const [pickerDay, setPickerDay] = useState(1)
  const [pickerMonth, setPickerMonth] = useState(1)
  const [pickerYear, setPickerYear] = useState(2025)
  const [pickerHour, setPickerHour] = useState(0)
  const [pickerMinute, setPickerMinute] = useState(0)
  
  // Medication list
  const medications = [
    { name: 'Adenosine', code: 'CPG EAS 14.2' },
    { name: 'Adrenaline', code: 'CPG EAS 14.3' },
    { name: 'Amiodarone', code: 'CPG EAS 14.4' },
    { name: 'Aspirin', code: 'CPG EAS 14.6' },
    { name: 'Atropine', code: 'CPG EAS 14.7' },
    { name: 'Calcium Chloride', code: 'CPG EAS 14.8' },
    { name: 'Cefazolin', code: 'CPG EAS 14.49' },
    { name: 'Ceftriaxone', code: 'CPG EAS 14.9' },
    { name: 'Clopidogrel', code: 'CPG EAS 14.10' },
    { name: 'Droperidol', code: 'CPG EAS 14.11' },
    { name: 'Enoxaparin', code: 'CPG EAS 14.12' },
    { name: 'Fentanyl', code: 'CPG EAS 14.13' },
    { name: 'Glucagon', code: 'CPG EAS 14.15' },
    { name: 'Glucose Gel', code: 'CPG EAS 14.16' },
    { name: 'GTN (Glyceryl Trinitrate) IV', code: 'CPG EAS 14.50' },
    { name: 'GTN (Glyceryl Trinitrate) Spray', code: 'CPG EAS 14.17' },
    { name: 'Heparin', code: 'CPG EAS 14.19' },
    { name: 'Hydrocortisone', code: 'CPG EAS 14.20' },
    { name: 'Ibuprofen', code: 'CPG EAS 14.21' },
    { name: 'Ipratropium', code: 'CPG EAS 14.22' },
    { name: 'Ketamine', code: 'CPG EAS 14.23' },
    { name: 'Labetalol', code: 'CPG EAS 14.24' },
    { name: 'Levetiracetam', code: 'CPG EAS 14.51' },
    { name: 'Lignocaine 1%', code: 'CPG EAS 14.25' },
    { name: 'Loratadine', code: 'CPG EAS 14.26' },
    { name: 'Magnesium Sulphate', code: 'CPG EAS 14.27' },
    { name: 'Metaraminol', code: 'CPG EAS 14.28' },
    { name: 'Methoxyflurane', code: 'CPG EAS 14.29' },
    { name: 'Metoprolol Tartrate', code: 'CPG EAS 14.52' },
    { name: 'Midazolam', code: 'CPG EAS 14.31' },
    { name: 'Morphine', code: 'CPG EAS 14.32' },
    { name: 'Naloxone', code: 'CPG EAS 14.33' },
    { name: 'Olanzapine', code: 'CPG EAS 14.34' },
    { name: 'Ondansetron', code: 'CPG EAS 14.35' },
    { name: 'Oxytocin', code: 'CPG EAS 14.36' },
    { name: 'Paracetamol', code: 'CPG EAS 14.37' },
    { name: 'Prednisone and Prednisolone', code: 'CPG EAS 14.38' },
    { name: 'Rocuronium', code: 'CPG EAS 14.40' },
    { name: 'Ropivacaine 0.75%', code: 'CPG EAS 14.41' },
    { name: 'Salbutamol', code: 'CPG EAS 14.42' },
    { name: 'Sodium Bicarbonate 8.4%', code: 'CPG EAS 14.43' },
    { name: 'Suxamethonium', code: 'CPG EAS 14.44' },
    { name: 'Tenecteplase', code: 'CPG EAS 14.45' },
    { name: 'Ticagrelor', code: 'CPG EAS 14.53' },
    { name: 'Tramadol', code: 'CPG EAS 14.46' },
    { name: 'Tranexamic Acid', code: 'CPG EAS 14.47' }
  ]
  
  const routes = [
    'Per oral',
    'Nasal prongs',
    'Nebuliser mask',
    'Sublingual',
    'Inhaled',
    'Intravenous',
    'Intramuscular'
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

  const handleNewMedication = () => {
    setShowNewMedication(true)
  }

  const resetMedicationForm = () => {
    setTime('')
    setAdministeredBy('')
    setDose('')
    setUnit('')
    setRoute('')
    setNotes('')
    setNotPossible('')
    setDrawnUpNotUsed(false)
    setBrokenAmpoule(false)
    setDiscarded(false)
    setNotesValue('')
    setNotPossibleReason('')
  }

  const saveCurrentMedication = () => {
    const medEntry = {
      time,
      administeredBy,
      medication,
      dose,
      unit,
      route,
      notes,
      drawnUpNotUsed,
      brokenAmpoule,
      discarded,
      notPossible
    }
    setSavedMedications([...savedMedications, medEntry])
  }

  const handleSaveAndReturn = () => {
    saveCurrentMedication()
    setShowNewMedication(false)
  }

  const handleSaveAndEnterSame = () => {
    saveCurrentMedication()
    // Reset all except medication
    setTime('')
    setAdministeredBy('')
    setDose('')
    setUnit('')
    setRoute('')
    setNotes('')
    setNotPossible('')
    setDrawnUpNotUsed(false)
    setBrokenAmpoule(false)
    setDiscarded(false)
    setNotesValue('')
    setNotPossibleReason('')
  }

  const handleSaveAndEnterDifferent = () => {
    saveCurrentMedication()
    // Reset everything including medication
    resetMedicationForm()
    setMedication('')
  }

  const handleCancelAndDiscard = () => {
    resetMedicationForm()
    setMedication('')
    setShowNewMedication(false)
  }

  const handleSearchClick = () => {
    setShowSearchModal(true)
  }

  const handleListClick = () => {
    setSearchQuery('')
    setShowSearchModal(true)
  }

  const handleMedicationSelect = (medName: string) => {
    setMedication(medName)
    setShowSearchModal(false)
    setSearchQuery('')
  }

  const handleRouteClick = () => {
    setShowRouteModal(true)
  }

  const handleRouteSelect = (routeOption: string) => {
    setRoute(routeOption)
    setShowRouteModal(false)
  }

  const handleNotesClick = () => {
    setShowNotesModal(true)
  }

  const handleNotesOk = () => {
    setNotes(notesValue)
    setShowNotesModal(false)
  }

  const handleNotPossibleClick = () => {
    setShowNotPossibleModal(true)
  }

  const handleNotPossibleSelect = (reason: string) => {
    setNotPossibleReason(reason)
    setNotPossible(reason)
    setShowNotPossibleModal(false)
  }

  const filteredMedications = medications.filter(med =>
    med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    med.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
          {!showNewMedication ? (
            <section className="incident-section">
              <h2 className="section-title">Medication</h2>
              {savedMedications.length === 0 ? (
                <div className="no-record-message">No record found.</div>
              ) : (
                <div style={{ marginTop: '20px' }}>
                  {savedMedications.map((med, index) => (
                    <div key={index} style={{
                      backgroundColor: '#d8e8f8',
                      padding: '15px',
                      marginBottom: '10px',
                      borderRadius: '4px',
                      border: '1px solid #a8c5e0'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#2c5282' }}>
                        {med.time || 'No time recorded'}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '14px' }}>
                        {med.medication && <div><strong>Med:</strong> {med.medication}</div>}
                        {med.dose && <div><strong>Dose:</strong> {med.dose} {med.unit}</div>}
                        {med.route && <div><strong>Route:</strong> {med.route}</div>}
                        {med.administeredBy && <div><strong>By:</strong> {med.administeredBy}</div>}
                        {med.notes && <div style={{ gridColumn: '1 / -1' }}><strong>Notes:</strong> {med.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="incident-section">
              <h2 className="section-title">Medication</h2>
              
              <div className="medication-form">
                <div className="medication-row">
                  <div className="medication-field" style={{ flex: '0 0 300px' }}>
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

                  <div className="medication-field" style={{ flex: 1 }}>
                    <label className="field-label required">Administered by</label>
                    <input 
                      type="text" 
                      value={administeredBy}
                      onChange={(e) => setAdministeredBy(e.target.value)}
                      className="text-input"
                      placeholder="roblox username"
                    />
                  </div>
                </div>

                <div className="medication-row">
                  <div className="medication-field" style={{ flex: 1 }}>
                    <label className="field-label required">Medication</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        type="text" 
                        value={medication}
                        className="text-input"
                        readOnly
                        style={{ flex: 1 }}
                      />
                      <button className="search-btn" onClick={handleSearchClick}>Search</button>
                      <button className="search-btn" onClick={handleListClick}>List</button>
                    </div>
                  </div>
                </div>

                <div className="medication-row">
                  <div className="medication-field" style={{ flex: '0 0 80px' }}>
                    <label className="field-label">
                      <input type="checkbox" checked={false} disabled style={{ marginRight: '8px' }} />
                      PRN
                    </label>
                  </div>

                  <div className="medication-field" style={{ flex: '0 0 200px' }}>
                    <label className="field-label required">Dose</label>
                    <input 
                      type="number" 
                      value={dose}
                      onChange={(e) => setDose(e.target.value)}
                      className="text-input"
                    />
                  </div>

                  <div className="medication-field" style={{ flex: '0 0 200px' }}>
                    <label className="field-label required">Unit</label>
                    <input 
                      type="text" 
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="text-input"
                    />
                  </div>

                  <div className="medication-field" style={{ flex: 1 }}>
                    <label className="field-label required">Route</label>
                    <input 
                      type="text" 
                      value={route}
                      className="text-input clickable-input"
                      readOnly
                      onClick={handleRouteClick}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                </div>

                <div className="medication-row">
                  <div className="medication-field" style={{ flex: 1 }}>
                    <label className="field-label">Notes</label>
                    <input 
                      type="text" 
                      value={notes}
                      className="text-input clickable-input"
                      readOnly
                      onClick={handleNotesClick}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>

                  <div className="medication-field" style={{ flex: 1 }}>
                    <label className="field-label">Reason for ATP Violation</label>
                    <input 
                      type="text" 
                      className="text-input grayed-disabled"
                      disabled
                      readOnly
                    />
                  </div>
                </div>

                <div className="medication-row">
                  <div className="medication-field">
                    <label className="field-label">
                      <input 
                        type="checkbox" 
                        checked={drawnUpNotUsed}
                        onChange={(e) => setDrawnUpNotUsed(e.target.checked)}
                        style={{ marginRight: '8px' }}
                      />
                      Drawn up not used
                    </label>
                  </div>

                  <div className="medication-field">
                    <label className="field-label">
                      <input 
                        type="checkbox" 
                        checked={brokenAmpoule}
                        onChange={(e) => setBrokenAmpoule(e.target.checked)}
                        style={{ marginRight: '8px' }}
                      />
                      Broken ampoule
                    </label>
                  </div>

                  <div className="medication-field">
                    <label className="field-label">
                      <input 
                        type="checkbox" 
                        checked={discarded}
                        onChange={(e) => setDiscarded(e.target.checked)}
                        style={{ marginRight: '8px' }}
                      />
                      Discarded
                    </label>
                  </div>
                </div>

                <div className="medication-row">
                  <div className="medication-field" style={{ flex: 1 }}>
                    <label className="field-label">Not possible</label>
                    <input 
                      type="text" 
                      value={notPossibleReason}
                      className="text-input clickable-input"
                      readOnly
                      onClick={handleNotPossibleClick}
                      style={{ cursor: 'pointer' }}
                      placeholder="Select reason"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {!showNewMedication ? (
        <div className="eprf-footer vitals-footer">
          <div className="footer-left">
            <button className="footer-btn large-blue" onClick={() => navigateTo('vital-obs')}>New Vitals</button>
            <button className="footer-btn large-blue" onClick={handleNewMedication}>New Meds</button>
            <button className="footer-btn large-blue" onClick={() => {
              const params = new URLSearchParams({ id: incidentId, fleetId })
              router.push(`/interventions?${params}`)
            }}>New Intervention</button>
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
            <button className="footer-btn blue">Competency Tool</button>
          </div>
          <div className="footer-right">
            <button className="footer-btn gray" onClick={handleCancelAndDiscard}>Cancel and discard changes</button>
            <button className="footer-btn blue" onClick={handleSaveAndEnterSame}>Save and enter the same medicine again</button>
            <button className="footer-btn blue" onClick={handleSaveAndEnterDifferent}>Save and enter a different medicine</button>
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

      {/* Medication Search/List Modal */}
      {showSearchModal && (
        <div className="modal-overlay" onClick={() => setShowSearchModal(false)}>
          <div className="medication-search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="medication-search-header">Search Medication</div>
            
            <div className="medication-search-input-section">
              <label className="medication-search-label">Medication *</label>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="medication-search-input"
                placeholder="Type to search..."
                autoFocus
              />
              <div className="medication-search-buttons">
                <button className="medication-search-btn reset" onClick={() => setSearchQuery('')}>Reset...</button>
                <button className="medication-search-btn search">Search</button>
              </div>
            </div>

            <div className="medication-list-header">Medication *</div>
            <div className="medication-list-container">
              {filteredMedications.map((med, index) => (
                <div 
                  key={index}
                  className="medication-list-item"
                  onClick={() => handleMedicationSelect(med.name)}
                >
                  <div className="medication-name">{med.name}</div>
                  <div className="medication-code">{med.code}</div>
                </div>
              ))}
            </div>

            <div className="medication-search-footer">
              <button className="medication-search-footer-btn cancel" onClick={() => setShowSearchModal(false)}>Cancel</button>
              <button className="medication-search-footer-btn ok" onClick={() => setShowSearchModal(false)}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Route Selection Modal */}
      {showRouteModal && (
        <div className="modal-overlay" onClick={() => setShowRouteModal(false)}>
          <div className="route-modal" onClick={(e) => e.stopPropagation()}>
            <div className="route-header">Route</div>
            <div className="route-list">
              {routes.map((routeOption, index) => (
                <div 
                  key={index}
                  className="route-item"
                  onClick={() => handleRouteSelect(routeOption)}
                >
                  {routeOption}
                </div>
              ))}
            </div>
            <div className="route-footer">
              <button className="route-footer-btn cancel" onClick={() => setShowRouteModal(false)}>Cancel</button>
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
              <button className="vital-modal-btn secondary">Competency Tool</button>
              <button className="vital-modal-btn cancel" onClick={() => setShowNotesModal(false)}>Cancel</button>
              <button className="vital-modal-btn ok" onClick={handleNotesOk}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Not Possible Modal */}
      {showNotPossibleModal && (
        <div className="modal-overlay" onClick={() => setShowNotPossibleModal(false)}>
          <div className="not-possible-modal" onClick={(e) => e.stopPropagation()}>
            <div className="not-possible-header">Not possible</div>
            
            <div className="not-possible-options">
              <button 
                className={`not-possible-option ${notPossibleReason === 'Patient does not understand' ? 'selected' : ''}`}
                onClick={() => handleNotPossibleSelect('Patient does not understand')}
              >
                Patient does not understand
              </button>
              <button 
                className={`not-possible-option ${notPossibleReason === 'Patient refused' ? 'selected' : ''}`}
                onClick={() => handleNotPossibleSelect('Patient refused')}
              >
                Patient refused
              </button>
              <button 
                className={`not-possible-option ${notPossibleReason === 'Patient unconscious' ? 'selected' : ''}`}
                onClick={() => handleNotPossibleSelect('Patient unconscious')}
              >
                Patient unconscious
              </button>
              <button 
                className={`not-possible-option ${notPossibleReason === 'Not indicated' ? 'selected' : ''}`}
                onClick={() => handleNotPossibleSelect('Not indicated')}
              >
                Not indicated
              </button>
              <button 
                className={`not-possible-option ${notPossibleReason === 'Contraindicated' ? 'selected' : ''}`}
                onClick={() => handleNotPossibleSelect('Contraindicated')}
              >
                Contraindicated
              </button>
              <button 
                className={`not-possible-option ${notPossibleReason === 'Equipment failure' ? 'selected' : ''}`}
                onClick={() => handleNotPossibleSelect('Equipment failure')}
              >
                Equipment failure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
