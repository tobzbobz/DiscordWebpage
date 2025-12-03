'use client'

import { jsPDF } from 'jspdf'

interface EPRFData {
  incidentId: string
  patientLetter: string
  incident: any
  patientInfo: any
  primarySurvey: any
  hxComplaint: any
  pastMedicalHistory: any
  clinicalImpression: any
  disposition: any
  vitals: any[]
  medications: any[]
  interventions: any[]
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A'
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

function addSectionHeader(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(0, 82, 147) // Navy blue
  doc.rect(10, y, 190, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 15, y + 6)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  return y + 12
}

function addField(doc: jsPDF, label: string, value: string, x: number, y: number, width: number = 90): number {
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(label + ':', x, y)
  doc.setFont('helvetica', 'normal')
  const displayValue = value || 'N/A'
  const lines = doc.splitTextToSize(displayValue, width - 5)
  doc.text(lines, x, y + 4)
  return y + 4 + (lines.length * 3.5)
}

function checkPageBreak(doc: jsPDF, y: number, needed: number = 30): number {
  if (y + needed > 280) {
    doc.addPage()
    return 20
  }
  return y
}

export function generateEPRFPdf(data: EPRFData): jsPDF {
  const doc = new jsPDF()
  let y = 15
  
  // Header
  doc.setFillColor(0, 51, 102)
  doc.rect(0, 0, 210, 25, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Electronic Patient Report Form (ePRF)', 105, 12, { align: 'center' })
  doc.setFontSize(10)
  doc.text(`Incident ID: ${data.incidentId} | Patient: ${data.patientLetter}`, 105, 20, { align: 'center' })
  doc.setTextColor(0, 0, 0)
  
  y = 35
  
  // Incident Information Section
  y = addSectionHeader(doc, 'Incident Information', y)
  const inc = data.incident || {}
  
  doc.setFontSize(9)
  y = addField(doc, 'Case Type', inc.caseType, 15, y)
  y = addField(doc, 'Date/Time of Call', formatDate(inc.dateTimeOfCall), 15, y)
  y = addField(doc, 'Incident Location', inc.incidentLocation, 15, y)
  y = addField(doc, 'Location Type', inc.locationType, 15, y)
  if (inc.chiefComplaint) y = addField(doc, 'Chief Complaint', inc.chiefComplaint, 15, y)
  
  y += 5
  y = checkPageBreak(doc, y, 50)
  
  // Patient Information Section
  y = addSectionHeader(doc, 'Patient Information', y)
  const pt = data.patientInfo || {}
  
  const col1x = 15, col2x = 110
  let y1 = y, y2 = y
  
  y1 = addField(doc, 'Roblox Username', pt.robloxUsername, col1x, y1)
  y2 = addField(doc, 'NHS Number', pt.nhsNo, col2x, y2)
  
  y1 = addField(doc, 'First Name', pt.firstName, col1x, y1)
  y2 = addField(doc, 'Surname', pt.surname, col2x, y2)
  
  y1 = addField(doc, 'Sex', pt.sex, col1x, y1)
  y2 = addField(doc, 'Date of Birth', pt.dob, col2x, y2)
  
  y1 = addField(doc, 'Age', `${pt.age || ''} ${pt.ageType || ''}`.trim(), col1x, y1)
  y2 = addField(doc, 'Weight', pt.weight ? `${pt.weight} kg` : '', col2x, y2)
  
  y = Math.max(y1, y2)
  y = addField(doc, 'Patient Address', pt.ptAddress, 15, y, 180)
  
  y += 5
  y = checkPageBreak(doc, y, 50)
  
  // Primary Survey Section
  y = addSectionHeader(doc, 'Primary Survey', y)
  const ps = data.primarySurvey || {}
  
  y1 = y; y2 = y
  y1 = addField(doc, 'Clinical Status', ps.clinicalStatus, col1x, y1)
  y2 = addField(doc, 'Responsiveness', ps.responsiveness, col2x, y2)
  
  y1 = addField(doc, 'Airway', ps.airway, col1x, y1)
  y2 = addField(doc, 'Breathing', ps.breathing, col2x, y2)
  
  y1 = addField(doc, 'Circulation', ps.circulation, col1x, y1)
  y2 = addField(doc, 'Blood Loss', ps.bloodLoss, col2x, y2)
  
  if (ps.traumaType) {
    y = Math.max(y1, y2)
    y = addField(doc, 'Trauma Type', ps.traumaType, 15, y)
  } else {
    y = Math.max(y1, y2)
  }
  
  y += 5
  y = checkPageBreak(doc, y, 40)
  
  // Hx & Complaint Section
  y = addSectionHeader(doc, 'Presenting Complaint & History', y)
  const hx = data.hxComplaint || {}
  
  const complaints = Array.isArray(hx.complaints) ? hx.complaints.join(', ') : hx.complaints
  y = addField(doc, 'Presenting Complaint(s)', complaints, 15, y, 180)
  y = addField(doc, 'Date of Onset', hx.dateOfOnset, 15, y)
  if (hx.symptoms) y = addField(doc, 'Symptoms', hx.symptoms, 15, y, 180)
  if (hx.patientNarrative) y = addField(doc, 'Patient Narrative', hx.patientNarrative, 15, y, 180)
  
  y += 5
  y = checkPageBreak(doc, y, 40)
  
  // Past Medical History Section
  y = addSectionHeader(doc, 'Past Medical History', y)
  const pmh = data.pastMedicalHistory || {}
  
  y = addField(doc, 'Past Medical History', pmh.pastMedicalHistory, 15, y, 180)
  y = addField(doc, 'Medications', pmh.medications, 15, y, 180)
  y = addField(doc, 'Allergies', pmh.allergies, 15, y, 180)
  y = addField(doc, 'Last Oral Intake', pmh.lastOralIntake, 15, y, 180)
  
  y += 5
  y = checkPageBreak(doc, y, 50)
  
  // Vital Observations Section
  if (data.vitals && data.vitals.length > 0) {
    y = addSectionHeader(doc, 'Vital Observations', y)
    
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    const headers = ['Time', 'HR', 'BP', 'SpO2', 'RR', 'Temp', 'GCS', 'Pain']
    const colWidths = [30, 20, 30, 20, 20, 20, 20, 20]
    let xPos = 15
    
    headers.forEach((header, i) => {
      doc.text(header, xPos, y)
      xPos += colWidths[i]
    })
    
    y += 4
    doc.setFont('helvetica', 'normal')
    
    data.vitals.forEach((vital) => {
      y = checkPageBreak(doc, y, 8)
      xPos = 15
      const row = [
        vital.time || '',
        vital.heartRate || '',
        vital.bloodPressure || '',
        vital.spo2 || '',
        vital.respRate || '',
        vital.temp || '',
        vital.gcsTotal || '',
        vital.painScore || ''
      ]
      row.forEach((cell, i) => {
        doc.text(String(cell), xPos, y)
        xPos += colWidths[i]
      })
      y += 4
    })
    
    y += 5
  }
  
  y = checkPageBreak(doc, y, 50)
  
  // Medications Section
  if (data.medications && data.medications.length > 0) {
    y = addSectionHeader(doc, 'Medications Administered', y)
    
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    const headers = ['Time', 'Medication', 'Dose', 'Route', 'Admin By']
    const colWidths = [30, 50, 30, 30, 40]
    let xPos = 15
    
    headers.forEach((header, i) => {
      doc.text(header, xPos, y)
      xPos += colWidths[i]
    })
    
    y += 4
    doc.setFont('helvetica', 'normal')
    
    data.medications.forEach((med) => {
      y = checkPageBreak(doc, y, 8)
      xPos = 15
      const row = [
        med.time || '',
        med.medication || '',
        `${med.dose || ''} ${med.unit || ''}`.trim(),
        med.route || '',
        med.administeredBy || ''
      ]
      row.forEach((cell, i) => {
        const text = doc.splitTextToSize(String(cell), colWidths[i] - 2)[0]
        doc.text(text, xPos, y)
        xPos += colWidths[i]
      })
      y += 4
    })
    
    y += 5
  }
  
  y = checkPageBreak(doc, y, 50)
  
  // Interventions Section
  if (data.interventions && data.interventions.length > 0) {
    y = addSectionHeader(doc, 'Interventions', y)
    
    data.interventions.forEach((intervention, index) => {
      y = checkPageBreak(doc, y, 20)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(`Intervention ${index + 1}: ${intervention.time || ''} by ${intervention.performedBy || ''}`, 15, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      
      const details: string[] = []
      if (intervention.airway) details.push(`Airway: ${intervention.airway}`)
      if (intervention.ventilation) details.push(`Ventilation: ${intervention.ventilation}`)
      if (intervention.cpr) details.push(`CPR: ${intervention.cpr}`)
      if (intervention.defibrillation) details.push(`Defibrillation: ${intervention.defibrillation}`)
      if (intervention.ivCannulation) details.push(`IV: ${intervention.ivCannulation}`)
      if (intervention.ioAccess) details.push(`IO: ${intervention.ioAccess}`)
      
      if (details.length > 0) {
        const detailText = details.join(' | ')
        const lines = doc.splitTextToSize(detailText, 180)
        doc.text(lines, 15, y)
        y += lines.length * 4
      }
      y += 3
    })
    
    y += 5
  }
  
  y = checkPageBreak(doc, y, 40)
  
  // Clinical Impression Section
  y = addSectionHeader(doc, 'Clinical Impression', y)
  const ci = data.clinicalImpression || {}
  
  y = addField(doc, 'Primary Clinical Impression', ci.primaryClinicalImpression, 15, y, 180)
  if (ci.secondaryClinicalImpression) {
    y = addField(doc, 'Secondary Clinical Impression', ci.secondaryClinicalImpression, 15, y, 180)
  }
  if (ci.clinicalNotes) {
    y = addField(doc, 'Clinical Notes', ci.clinicalNotes, 15, y, 180)
  }
  
  y += 5
  y = checkPageBreak(doc, y, 40)
  
  // Disposition Section
  y = addSectionHeader(doc, 'Disposition', y)
  const disp = data.disposition || {}
  
  y1 = y; y2 = y
  y1 = addField(doc, 'Disposition', disp.disposition, col1x, y1)
  y2 = addField(doc, 'Final Patient Status', disp.finalPatientStatus, col2x, y2)
  
  y = Math.max(y1, y2)
  y = addField(doc, 'Copy to GP', disp.copyToGP, 15, y)
  
  if (disp.receivingFacility) y = addField(doc, 'Receiving Facility', disp.receivingFacility, 15, y)
  if (disp.handoverTo) y = addField(doc, 'Handover To', disp.handoverTo, 15, y)
  
  // Footer on last page
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' })
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 15, 290)
    doc.text(`ePRF ID: ${data.incidentId}-${data.patientLetter}`, 195, 290, { align: 'right' })
  }
  
  return doc
}

export function downloadEPRFPdf(data: EPRFData): void {
  const doc = generateEPRFPdf(data)
  doc.save(`ePRF_${data.incidentId}_Patient${data.patientLetter}_${new Date().toISOString().split('T')[0]}.pdf`)
}

// Collect all ePRF data from localStorage for a given incident
export function collectEPRFData(incidentId: string, patientLetter: string): EPRFData {
  const getItem = (key: string) => {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  }
  
  return {
    incidentId,
    patientLetter,
    incident: getItem(`incident_${incidentId}`),
    patientInfo: getItem(`patient_info_${incidentId}`),
    primarySurvey: getItem(`primary_survey_${incidentId}`),
    hxComplaint: getItem(`hx_complaint_${incidentId}`),
    pastMedicalHistory: getItem(`past_medical_history_${incidentId}`),
    clinicalImpression: getItem(`clinical_impression_${incidentId}`),
    disposition: getItem(`disposition_${incidentId}`),
    vitals: getItem(`vitals_${incidentId}`) || [],
    medications: getItem(`medications_${incidentId}`) || [],
    interventions: getItem(`interventions_${incidentId}`) || []
  }
}
