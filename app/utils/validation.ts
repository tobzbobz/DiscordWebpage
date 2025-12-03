// Validation utility for ePRF submission

export interface ValidationResult {
  isValid: boolean
  incompleteSections: string[]
  fieldErrors: { [section: string]: string[] }
}

// Map section names to localStorage key prefixes
const STORAGE_KEY_MAP: { [key: string]: string } = {
  'incident': 'incident',
  'patient-info': 'patient_info',
  'primary-survey': 'primary_survey',
  'hx-complaint': 'hx_complaint',
  'past-medical-history': 'past_medical_history',
  'clinical-impression': 'clinical_impression',
  'disposition': 'disposition'
}

// Required fields for each section
export const REQUIRED_FIELDS = {
  incident: {
    fields: ['caseType', 'dateTimeOfCall', 'incidentLocation', 'locationType'],
    labels: {
      caseType: 'Case Type',
      dateTimeOfCall: 'Date/Time of Call',
      incidentLocation: 'Incident Location',
      locationType: 'Location Type'
    }
  },
  'patient-info': {
    fields: ['robloxUsername', 'firstName', 'surname', 'sex', 'dob', 'age', 'ageType', 'ptAddress'],
    labels: {
      robloxUsername: 'Roblox Username',
      firstName: 'First Name',
      surname: 'Family Name (surname)',
      sex: 'Sex',
      dob: 'Date of Birth',
      age: 'Age',
      ageType: 'Age Type',
      ptAddress: 'Patient Address'
    }
  },
  'primary-survey': {
    fields: ['clinicalStatus', 'responsiveness', 'airway', 'breathing', 'circulation', 'bloodLoss'],
    labels: {
      clinicalStatus: 'Clinical Status at Scene',
      responsiveness: 'Responsiveness',
      airway: 'Airway',
      breathing: 'Breathing',
      circulation: 'Circulation',
      bloodLoss: 'Blood Loss'
    }
  },
  'hx-complaint': {
    fields: ['complaints', 'dateOfOnset'],
    labels: {
      complaints: 'Presenting Complaint',
      dateOfOnset: 'Date of Onset'
    }
  },
  'past-medical-history': {
    fields: ['pastMedicalHistory', 'medications', 'allergies', 'lastOralIntake'],
    labels: {
      pastMedicalHistory: 'Past Medical History',
      medications: 'Medications',
      allergies: 'Allergies',
      lastOralIntake: 'Last Oral Intake'
    }
  },
  'clinical-impression': {
    fields: ['primaryClinicalImpression'],
    labels: {
      primaryClinicalImpression: 'Primary Clinical Impression'
    }
  },
  disposition: {
    fields: ['disposition', 'finalPatientStatus', 'copyToGP'],
    labels: {
      disposition: 'Disposition',
      finalPatientStatus: 'Final Patient Status',
      copyToGP: 'Copy to GP?'
    }
  }
}

// Required fields for vitals entries (when an entry is made)
export const VITALS_REQUIRED_FIELDS = {
  time: 'Time'
}

// Required fields for medication entries (when an entry is made)
export const MEDICATION_REQUIRED_FIELDS = {
  time: 'Time',
  administeredBy: 'Administered by',
  medication: 'Medication',
  dose: 'Dose',
  unit: 'Unit',
  route: 'Route'
}

// Required fields for intervention entries (when an entry is made)
export const INTERVENTION_REQUIRED_FIELDS = {
  time: 'Time',
  performedBy: 'Performed by'
}

// Get localStorage key for a section
function getStorageKey(sectionName: string, incidentId: string): string {
  const prefix = STORAGE_KEY_MAP[sectionName] || sectionName.replace(/-/g, '_')
  return `${prefix}_${incidentId}`
}

// Validate a single section from localStorage
export function validateSection(sectionName: string, incidentId: string): string[] {
  const errors: string[] = []
  const config = REQUIRED_FIELDS[sectionName as keyof typeof REQUIRED_FIELDS]
  
  if (!config) return errors
  
  try {
    const storageKey = getStorageKey(sectionName, incidentId)
    const data = localStorage.getItem(storageKey)
    if (!data) {
      // If no data at all, all required fields are missing
      return config.fields.map(field => config.labels[field as keyof typeof config.labels])
    }
    
    const parsed = JSON.parse(data)
    
    for (const field of config.fields) {
      const value = parsed[field]
      // Handle arrays (like complaints) - check if empty
      if (Array.isArray(value)) {
        if (value.length === 0) {
          errors.push(config.labels[field as keyof typeof config.labels])
        }
      } else if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors.push(config.labels[field as keyof typeof config.labels])
      }
    }
  } catch (e) {
    console.error(`Error validating ${sectionName}:`, e)
  }
  
  return errors
}

// Validate all sections
export function validateAllSections(incidentId: string): ValidationResult {
  const incompleteSections: string[] = []
  const fieldErrors: { [section: string]: string[] } = {}
  
  for (const sectionName of Object.keys(REQUIRED_FIELDS)) {
    const errors = validateSection(sectionName, incidentId)
    if (errors.length > 0) {
      incompleteSections.push(sectionName)
      fieldErrors[sectionName] = errors
    }
  }
  
  // Also check for vitals entries that have incomplete required fields
  try {
    const vitalsData = localStorage.getItem(`vitals_${incidentId}`)
    if (vitalsData) {
      const vitals = JSON.parse(vitalsData)
      if (Array.isArray(vitals) && vitals.length > 0) {
        for (const entry of vitals) {
          if (!entry.time || entry.time.trim() === '') {
            if (!incompleteSections.includes('vital-obs')) {
              incompleteSections.push('vital-obs')
            }
            if (!fieldErrors['vital-obs']) {
              fieldErrors['vital-obs'] = []
            }
            if (!fieldErrors['vital-obs'].includes('Vitals entry missing Time')) {
              fieldErrors['vital-obs'].push('Vitals entry missing Time')
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Error validating vitals:', e)
  }
  
  // Check medication entries
  try {
    const medsData = localStorage.getItem(`medications_${incidentId}`)
    if (medsData) {
      const meds = JSON.parse(medsData)
      if (Array.isArray(meds) && meds.length > 0) {
        for (const entry of meds) {
          const missingFields: string[] = []
          if (!entry.time) missingFields.push('Time')
          if (!entry.administeredBy) missingFields.push('Administered by')
          if (!entry.medication) missingFields.push('Medication')
          if (!entry.dose) missingFields.push('Dose')
          if (!entry.unit) missingFields.push('Unit')
          if (!entry.route) missingFields.push('Route')
          
          if (missingFields.length > 0) {
            if (!incompleteSections.includes('medications')) {
              incompleteSections.push('medications')
            }
            if (!fieldErrors['medications']) {
              fieldErrors['medications'] = []
            }
            fieldErrors['medications'].push(`Medication entry missing: ${missingFields.join(', ')}`)
          }
        }
      }
    }
  } catch (e) {
    console.error('Error validating medications:', e)
  }
  
  // Check intervention entries
  try {
    const interventionsData = localStorage.getItem(`interventions_${incidentId}`)
    if (interventionsData) {
      const interventions = JSON.parse(interventionsData)
      if (Array.isArray(interventions) && interventions.length > 0) {
        for (const entry of interventions) {
          const missingFields: string[] = []
          if (!entry.time) missingFields.push('Time')
          if (!entry.performedBy) missingFields.push('Performed by')
          
          if (missingFields.length > 0) {
            if (!incompleteSections.includes('interventions')) {
              incompleteSections.push('interventions')
            }
            if (!fieldErrors['interventions']) {
              fieldErrors['interventions'] = []
            }
            fieldErrors['interventions'].push(`Intervention entry missing: ${missingFields.join(', ')}`)
          }
        }
      }
    }
  } catch (e) {
    console.error('Error validating interventions:', e)
  }
  
  return {
    isValid: incompleteSections.length === 0,
    incompleteSections,
    fieldErrors
  }
}

// Get section display name
export function getSectionDisplayName(section: string): string {
  const names: { [key: string]: string } = {
    'incident': 'Incident Information',
    'patient-info': 'Patient Information',
    'primary-survey': 'Primary Survey',
    'vital-obs': 'Vital Obs / Treat',
    'hx-complaint': 'Hx Complaint',
    'past-medical-history': 'Past Medical History',
    'clinical-impression': 'Clinical Impression',
    'disposition': 'Disposition',
    'media': 'Media',
    'medications': 'Medications',
    'interventions': 'Interventions'
  }
  return names[section] || section
}
