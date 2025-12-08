'use client'

import { useState, useEffect } from 'react'
import { getSavedPatients, getCurrentPatientLetter, setCurrentPatientLetter, handleAddPatient } from '../utils/eprfService'

interface PatientManagementModalProps {
  isOpen: boolean
  onClose: () => void
  incidentId: string
  fleetId: string
  onPatientSwitch: (letter: string) => void
  onPatientAdded: (newLetter: string, previousLetter: string) => void
}

interface PatientInfo {
  letter: string
  name: string
  isCurrent: boolean
}

export default function PatientManagementModal({
  isOpen,
  onClose,
  incidentId,
  fleetId,
  onPatientSwitch,
  onPatientAdded
}: PatientManagementModalProps) {
  const [patients, setPatients] = useState<PatientInfo[]>([])
  const [currentLetter, setCurrentLetter] = useState('A')
  const [isAddingPatient, setIsAddingPatient] = useState(false)
  const [showAddConfirm, setShowAddConfirm] = useState(false)

  useEffect(() => {
    if (isOpen && incidentId) {
      loadPatients()
    }
  }, [isOpen, incidentId])

  const loadPatients = () => {
    const savedPatients = getSavedPatients(incidentId)
    const current = getCurrentPatientLetter(incidentId)
    setCurrentLetter(current)

    // Build patient list: saved patients + current patient
    const allPatients: PatientInfo[] = []
    
    // Add all saved patients
    savedPatients.forEach(letter => {
      const patientName = getPatientName(letter)
      allPatients.push({
        letter,
        name: patientName,
        isCurrent: letter === current
      })
    })

    // Add current patient if not in saved list
    if (!savedPatients.includes(current)) {
      const patientName = getPatientName(current)
      allPatients.push({
        letter: current,
        name: patientName,
        isCurrent: true
      })
    }

    // Sort by letter
    allPatients.sort((a, b) => a.letter.localeCompare(b.letter))
    setPatients(allPatients)
  }

  const getPatientName = (letter: string): string => {
    try {
      // Try to get patient info from localStorage
      const patientInfoKey = `patient_info_${incidentId}_${letter}`
      let data = localStorage.getItem(patientInfoKey)
      
      // If not found with letter suffix, check current data (if this is current patient)
      if (!data) {
        const currentData = localStorage.getItem(`patient_info_${incidentId}`)
        if (currentData && letter === getCurrentPatientLetter(incidentId)) {
          data = currentData
        }
      }

      if (data) {
        const parsed = JSON.parse(data)
        const firstName = parsed.firstName || ''
        const surname = parsed.surname || ''
        const robloxUsername = parsed.robloxUsername || ''
        
        if (firstName && surname) {
          return `${firstName} ${surname}`
        } else if (robloxUsername) {
          return robloxUsername
        }
      }
    } catch (e) {
      console.error('Error getting patient name:', e)
    }
    return `Patient ${letter}`
  }

  const handlePatientSelect = (letter: string) => {
    if (letter === currentLetter) {
      onClose()
      return
    }

    // Archive current patient data before switching
    archiveCurrentPatient()
    
    // Set new current patient
    setCurrentPatientLetter(incidentId, letter)
    
    // Load data for the selected patient
    loadPatientData(letter)
    
    // Notify parent
    onPatientSwitch(letter)
    onClose()
  }

  const archiveCurrentPatient = () => {
    const keys = [
      'patient_info',
      'primary_survey',
      'hx_complaint',
      'past_medical_history',
      'clinical_impression',
      'disposition',
      'vitals',
      'medications',
      'interventions'
    ]
    
    keys.forEach(key => {
      const currentKey = `${key}_${incidentId}`
      const archiveKey = `${key}_${incidentId}_${currentLetter}`
      const data = localStorage.getItem(currentKey)
      if (data) {
        localStorage.setItem(archiveKey, data)
      }
    })
  }

  const loadPatientData = (letter: string) => {
    const keys = [
      'patient_info',
      'primary_survey',
      'hx_complaint',
      'past_medical_history',
      'clinical_impression',
      'disposition',
      'vitals',
      'medications',
      'interventions'
    ]
    
    keys.forEach(key => {
      const archiveKey = `${key}_${incidentId}_${letter}`
      const currentKey = `${key}_${incidentId}`
      const data = localStorage.getItem(archiveKey)
      if (data) {
        localStorage.setItem(currentKey, data)
      } else {
        localStorage.removeItem(currentKey)
      }
    })
  }

  const handleAddPatientClick = () => {
    setShowAddConfirm(true)
  }

  const confirmAddPatient = async () => {
    setIsAddingPatient(true)
    try {
      const previousLetter = currentLetter
      const result = await handleAddPatient(incidentId)
      
      if (result.success) {
        setShowAddConfirm(false)
        onPatientAdded(result.newLetter, previousLetter)
        onClose()
      } else {
        alert(result.error || 'Failed to add patient')
      }
    } catch (error) {
      console.error('Add patient error:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsAddingPatient(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
        }

        .modal-content {
          background: #fff;
          border-radius: 12px;
          padding: 0;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          background: #4CAF50;
          padding: 20px 25px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
        }

        .modal-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }

        .patient-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }

        .patient-item {
          display: flex;
          align-items: center;
          padding: 15px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          background: #fff;
        }

        .patient-item:hover {
          border-color: #4CAF50;
          background: #f5fff5;
        }

        .patient-item.current {
          border-color: #4CAF50;
          background: #e8f5e9;
        }

        .patient-letter-badge {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #4CAF50;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 18px;
          margin-right: 15px;
        }

        .patient-item.current .patient-letter-badge {
          background: #2e7d32;
        }

        .patient-details {
          flex: 1;
        }

        .patient-name {
          font-weight: 600;
          font-size: 16px;
          color: #333;
        }

        .patient-status {
          font-size: 12px;
          color: #666;
          margin-top: 2px;
        }

        .current-badge {
          background: #4CAF50;
          color: white;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .no-patients {
          text-align: center;
          color: #666;
          padding: 20px;
        }

        .modal-footer {
          padding: 15px 20px;
          border-top: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #4CAF50;
          color: white;
        }

        .btn-primary:hover {
          background: #43a047;
        }

        .btn-secondary {
          background: #e0e0e0;
          color: #333;
        }

        .btn-secondary:hover {
          background: #d0d0d0;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .add-confirm-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.95);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 30px;
          text-align: center;
        }

        .add-confirm-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin-bottom: 15px;
        }

        .add-confirm-message {
          font-size: 14px;
          color: #666;
          margin-bottom: 25px;
          line-height: 1.5;
        }

        .add-confirm-buttons {
          display: flex;
          gap: 15px;
        }
      `}</style>

      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon">👥</div>
          <h2 className="modal-title">Manage Patients</h2>
        </div>

        <div className="modal-body">
          {patients.length === 0 ? (
            <div className="no-patients">
              <p>No patients yet. Click "Add New Patient" to get started.</p>
            </div>
          ) : (
            <div className="patient-list">
              {patients.map((patient) => (
                <div
                  key={patient.letter}
                  className={`patient-item ${patient.isCurrent ? 'current' : ''}`}
                  onClick={() => handlePatientSelect(patient.letter)}
                >
                  <div className="patient-letter-badge">{patient.letter}</div>
                  <div className="patient-details">
                    <div className="patient-name">{patient.name}</div>
                    <div className="patient-status">
                      {patient.isCurrent ? (
                        <span className="current-badge">Currently Editing</span>
                      ) : (
                        'Click to switch'
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={handleAddPatientClick}>
            + Add New Patient
          </button>
        </div>

        {showAddConfirm && (
          <div className="add-confirm-overlay">
            <div className="add-confirm-title">Add New Patient?</div>
            <div className="add-confirm-message">
              Patient {currentLetter} will be saved and you'll start a new patient record (Patient {String.fromCharCode(currentLetter.charCodeAt(0) + 1)}).
            </div>
            <div className="add-confirm-buttons">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowAddConfirm(false)}
                disabled={isAddingPatient}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={confirmAddPatient}
                disabled={isAddingPatient}
              >
                {isAddingPatient ? 'Adding...' : 'Add Patient'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
