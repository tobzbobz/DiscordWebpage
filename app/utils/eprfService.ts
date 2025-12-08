'use client'

import { validateAllSections, ValidationResult } from './validation'
import { collectEPRFData, downloadEPRFPdf } from './pdfGenerator'

// Get the current patient letter from localStorage or default to 'A'
export function getCurrentPatientLetter(incidentId: string): string {
  try {
    const letter = localStorage.getItem(`patient_letter_${incidentId}`)
    return letter || 'A'
  } catch {
    return 'A'
  }
}

// Set the current patient letter
export function setCurrentPatientLetter(incidentId: string, letter: string): void {
  localStorage.setItem(`patient_letter_${incidentId}`, letter)
}

// Get all saved patients for an incident
export function getSavedPatients(incidentId: string): string[] {
  try {
    const data = localStorage.getItem(`saved_patients_${incidentId}`)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

// Add a patient to the saved patients list
function addSavedPatient(incidentId: string, letter: string): void {
  const patients = getSavedPatients(incidentId)
  if (!patients.includes(letter)) {
    patients.push(letter)
    localStorage.setItem(`saved_patients_${incidentId}`, JSON.stringify(patients))
  }
}

// Get the next patient letter (A -> B -> C, etc.)
export function getNextPatientLetter(currentLetter: string): string {
  const code = currentLetter.charCodeAt(0)
  // Support up to Z (26 patients)
  if (code >= 90) return 'Z' // Already at Z
  return String.fromCharCode(code + 1)
}

// Archive current patient data with the patient letter suffix
function archivePatientData(incidentId: string, patientLetter: string): void {
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
    const archiveKey = `${key}_${incidentId}_${patientLetter}`
    const data = localStorage.getItem(currentKey)
    if (data) {
      localStorage.setItem(archiveKey, data)
    }
  })
}

// Clear patient-specific data (not incident data)
function clearPatientData(incidentId: string): void {
  const keys = [
    'patient_info',
    'primary_survey',
    'hx_complaint',
    'past_medical_history',
    'clinical_impression',
    'disposition',
    'vitals',
    'meds',
    'interventions',
    'media',
    'competency'
  ]
  
  keys.forEach(key => {
    localStorage.removeItem(`${key}_${incidentId}`)
  })
  
  // Also clear any draft data
  const draftKeys = [
    'vitals_draft',
    'meds_draft',
    'interventions_draft'
  ]
  
  draftKeys.forEach(key => {
    localStorage.removeItem(`${key}_${incidentId}`)
  })
}

// Add Patient: Archive current, move to next letter, clear form
export async function handleAddPatient(incidentId: string): Promise<{ success: boolean; newLetter: string; error?: string }> {
  try {
    const currentLetter = getCurrentPatientLetter(incidentId)
    
    // Archive current patient data
    archivePatientData(incidentId, currentLetter)
    
    // Add to saved patients list
    addSavedPatient(incidentId, currentLetter)
    
    // Get next letter
    const nextLetter = getNextPatientLetter(currentLetter)
    
    // Set the new patient letter
    setCurrentPatientLetter(incidentId, nextLetter)
    
    // Clear patient-specific data for the new patient
    clearPatientData(incidentId)
    
    return { success: true, newLetter: nextLetter }
  } catch (error) {
    console.error('Error adding patient:', error)
    return { success: false, newLetter: '', error: 'Failed to add patient' }
  }
}

// Submit ePRF: Validate, generate PDF, save to database
export async function handleSubmitEPRF(
  incidentId: string, 
  fleetId: string,
  downloadPdf: boolean = true
): Promise<{ 
  success: boolean; 
  validationResult?: ValidationResult;
  error?: string 
}> {
  try {
    // First validate all sections
    const validationResult = validateAllSections(incidentId)
  
    if (!validationResult.isValid) {
      return { 
        success: false, 
        validationResult,
        error: 'Please complete all required fields before submitting' 
      }
    }
  
    const currentLetter = getCurrentPatientLetter(incidentId)
  
    // Collect all ePRF data
    const eprfData = collectEPRFData(incidentId, currentLetter)
  
    // Generate and download PDF if requested
    if (downloadPdf) {
      downloadEPRFPdf(eprfData)
    }
  
    // Save to database
    try {
      const response = await fetch('/api/eprf/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          incidentId,
          fleetId,
          patientLetter: currentLetter,
          data: eprfData,
          submittedAt: new Date().toISOString()
        })
      })
    
      if (!response.ok) {
        console.warn('Database save failed, but PDF was downloaded')
      }
    } catch (dbError) {
      console.warn('Database save failed, but PDF was downloaded:', dbError)
      // Don't fail the whole operation if DB save fails
    }
  
    // Archive this patient's data
    archivePatientData(incidentId, currentLetter)
    addSavedPatient(incidentId, currentLetter)
  
    return { success: true }
  } catch (error) {
    console.error('Error submitting ePRF:', error)
    return { success: false, error: 'Failed to submit ePRF' }
  }
}

// Get all patient data for an incident (for viewing/editing previous patients)
export function getPatientData(incidentId: string, patientLetter: string): any {
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
  
  const data: any = {}
  
  keys.forEach(key => {
    const archiveKey = `${key}_${incidentId}_${patientLetter}`
    const stored = localStorage.getItem(archiveKey)
    if (stored) {
      try {
        data[key] = JSON.parse(stored)
      } catch {
        data[key] = null
      }
    }
  })
  
  return data
}
