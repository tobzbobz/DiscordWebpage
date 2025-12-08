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

function formatDateOnly(dateStr: string): string {
  if (!dateStr) return 'N/A'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
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

function addFieldRow(doc: jsPDF, label: string, value: string, x: number, y: number, width: number = 85): number {
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(60, 60, 60)
  doc.text(label + ':', x, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  const displayValue = value || 'N/A'
  const lines = doc.splitTextToSize(displayValue, width - 5)
  doc.text(lines, x, y + 4)
  return y + 4 + (lines.length * 4)
}

function addField(doc: jsPDF, label: string, value: string, x: number, y: number, width: number = 90): number {
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(60, 60, 60)
  doc.text(label + ':', x, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  const displayValue = value || 'N/A'
  const lines = doc.splitTextToSize(displayValue, width - 5)
  doc.text(lines, x, y + 4)
  return y + 4 + (lines.length * 3.5)
}

function addTableHeader(doc: jsPDF, headers: string[], colWidths: number[], y: number): number {
  doc.setFillColor(230, 235, 240)
  doc.rect(15, y - 3, 180, 6, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 51, 102)
  let xPos = 17
  headers.forEach((header, i) => {
    doc.text(header, xPos, y)
    xPos += colWidths[i]
  })
  doc.setTextColor(0, 0, 0)
  return y + 5
}

function checkPageBreak(doc: jsPDF, y: number, needed: number = 30): number {
  if (y + needed > 275) {
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
    
    const headers = ['Time', 'HR', 'BP', 'SpO2', 'RR', 'Temp', 'GCS', 'Pain']
    const colWidths = [28, 18, 32, 20, 18, 20, 22, 22]
    
    y = addTableHeader(doc, headers, colWidths, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    
    const vitalColWidths = [28, 18, 32, 20, 18, 20, 22, 22]
    
    data.vitals.forEach((vital, idx) => {
      y = checkPageBreak(doc, y, 8)
      // Alternate row backgrounds
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252)
        doc.rect(15, y - 3, 180, 5, 'F')
      }
      let xPos = 17
      const row = [
        vital.time || '',
        vital.heartRate || '',
        vital.bloodPressure || '',
        vital.spo2 ? `${vital.spo2}%` : '',
        vital.respRate || '',
        vital.temp ? `${vital.temp}°C` : '',
        vital.gcsTotal || '',
        vital.painScore ? `${vital.painScore}/10` : ''
      ]
      row.forEach((cell, i) => {
        doc.text(String(cell), xPos, y)
        xPos += vitalColWidths[i]
      })
      y += 5
    })
    
    y += 5
  }
  
  y = checkPageBreak(doc, y, 50)
  
  // Medications Section
  if (data.medications && data.medications.length > 0) {
    y = addSectionHeader(doc, 'Medications Administered', y)
    
    const medHeaders = ['Time', 'Medication', 'Dose', 'Route', 'Admin By']
    const medColWidths = [28, 55, 35, 30, 32]
    
    y = addTableHeader(doc, medHeaders, medColWidths, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    
    data.medications.forEach((med, idx) => {
      y = checkPageBreak(doc, y, 8)
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252)
        doc.rect(15, y - 3, 180, 5, 'F')
      }
      let xPos = 17
      const row = [
        med.time || '',
        med.medication || '',
        `${med.dose || ''} ${med.unit || ''}`.trim(),
        med.route || '',
        med.administeredBy || ''
      ]
      row.forEach((cell, i) => {
        const text = doc.splitTextToSize(String(cell), medColWidths[i] - 2)[0]
        doc.text(text, xPos, y)
        xPos += medColWidths[i]
      })
      y += 5
    })
    
    y += 5
  }
  
  y = checkPageBreak(doc, y, 50)
  
  // Interventions Section
  if (data.interventions && data.interventions.length > 0) {
    y = addSectionHeader(doc, 'Interventions Performed', y)
    
    data.interventions.forEach((intervention, index) => {
      y = checkPageBreak(doc, y, 25)
      
      // Intervention header with background
      doc.setFillColor(240, 245, 250)
      doc.rect(15, y - 3, 180, 7, 'F')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 51, 102)
      doc.text(`Intervention ${index + 1}`, 17, y + 1)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text(`Time: ${intervention.time || 'N/A'} | Performed By: ${intervention.performedBy || 'N/A'}`, 55, y + 1)
      doc.setTextColor(0, 0, 0)
      y += 7
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      
      const details: string[] = []
      if (intervention.airway) details.push(`Airway: ${intervention.airway}`)
      if (intervention.ventilation) details.push(`Ventilation: ${intervention.ventilation}`)
      if (intervention.cpr) details.push(`CPR: ${intervention.cpr}`)
      if (intervention.defibrillation) details.push(`Defibrillation: ${intervention.defibrillation}`)
      if (intervention.ivCannulation) details.push(`IV Cannulation: ${intervention.ivCannulation}`)
      if (intervention.ioAccess) details.push(`IO Access: ${intervention.ioAccess}`)
      if (intervention.woundCare) details.push(`Wound Care: ${intervention.woundCare}`)
      if (intervention.splinting) details.push(`Splinting: ${intervention.splinting}`)
      if (intervention.notes) details.push(`Notes: ${intervention.notes}`)
      
      if (details.length > 0) {
        details.forEach(detail => {
          y = checkPageBreak(doc, y, 6)
          const lines = doc.splitTextToSize(`• ${detail}`, 175)
          doc.text(lines, 20, y)
          y += lines.length * 4
        })
      } else {
        doc.setTextColor(128, 128, 128)
        doc.text('No intervention details recorded', 20, y)
        doc.setTextColor(0, 0, 0)
        y += 4
      }
      y += 4
    })
    
    y += 5
  }
  
  y = checkPageBreak(doc, y, 50)
  
  // Clinical Impression Section
  y = addSectionHeader(doc, 'Clinical Impression & Assessment', y)
  const ci = data.clinicalImpression || {}
  
  y = addFieldRow(doc, 'Primary Clinical Impression', ci.primaryClinicalImpression, 15, y, 180)
  if (ci.secondaryClinicalImpression) {
    y = addFieldRow(doc, 'Secondary Clinical Impression', ci.secondaryClinicalImpression, 15, y, 180)
  }
  if (ci.clinicalNotes) {
    y = addFieldRow(doc, 'Clinical Notes', ci.clinicalNotes, 15, y, 180)
  }
  
  y += 5
  y = checkPageBreak(doc, y, 50)
  
  // Disposition Section
  y = addSectionHeader(doc, 'Disposition & Outcome', y)
  const disp = data.disposition || {}
  
  y1 = y; y2 = y
  y1 = addFieldRow(doc, 'Disposition', disp.disposition, col1x, y1)
  y2 = addFieldRow(doc, 'Final Patient Status', disp.finalPatientStatus, col2x, y2)
  
  y = Math.max(y1, y2)
  if (disp.receivingFacility) y = addFieldRow(doc, 'Receiving Facility', disp.receivingFacility, 15, y, 180)
  if (disp.handoverTo) y = addFieldRow(doc, 'Handover To', disp.handoverTo, 15, y, 180)
  if (disp.handoverTime) y = addFieldRow(doc, 'Handover Time', disp.handoverTime, 15, y, 180)
  
  if (disp.copyToGP) {
    y += 3
    doc.setFillColor(245, 248, 250)
    doc.rect(15, y - 2, 180, 20, 'F')
    doc.setDrawColor(200, 210, 220)
    doc.rect(15, y - 2, 180, 20, 'S')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    doc.text('Copy to GP:', 17, y + 3)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    const gpLines = doc.splitTextToSize(disp.copyToGP, 170)
    doc.text(gpLines.slice(0, 4), 17, y + 8)
    y += 22
  }
  
  // Confidentiality notice
  y = checkPageBreak(doc, y, 30)
  y += 10
  doc.setFillColor(255, 250, 240)
  doc.rect(10, y - 3, 190, 15, 'F')
  doc.setDrawColor(200, 180, 150)
  doc.rect(10, y - 3, 190, 15, 'S')
  doc.setFontSize(7)
  doc.setTextColor(100, 80, 60)
  doc.setFont('helvetica', 'bold')
  doc.text('CONFIDENTIAL MEDICAL RECORD', 105, y + 2, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.text('This document contains sensitive patient information protected under medical confidentiality laws.', 105, y + 7, { align: 'center' })
  doc.text('Unauthorised disclosure is prohibited. Handle in accordance with data protection regulations.', 105, y + 11, { align: 'center' })
  doc.setTextColor(0, 0, 0)
  
  // Footer on all pages
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    
    // Footer line
    doc.setDrawColor(0, 51, 102)
    doc.setLineWidth(0.5)
    doc.line(10, 285, 200, 285)
    
    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    doc.text(`Page ${i} of ${pageCount}`, 105, 291, { align: 'center' })
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 12, 291)
    doc.text(`ePRF: ${data.incidentId}-${data.patientLetter}`, 198, 291, { align: 'right' })
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
  
  // Helper to get data - tries patient-specific key first, falls back to base key
  const getPatientData = (baseKey: string) => {
    // First try the archived/patient-specific key
    let data = getItem(`${baseKey}_${incidentId}_${patientLetter}`)
    if (data) return data
    // Fall back to base key (for current patient or single patient)
    return getItem(`${baseKey}_${incidentId}`)
  }
  
  return {
    incidentId,
    patientLetter,
    incident: getItem(`incident_${incidentId}`),
    patientInfo: getPatientData('patient_info'),
    primarySurvey: getPatientData('primary_survey'),
    hxComplaint: getPatientData('hx_complaint'),
    pastMedicalHistory: getPatientData('past_medical_history'),
    clinicalImpression: getPatientData('clinical_impression'),
    disposition: getPatientData('disposition'),
    vitals: getPatientData('vitals') || [],
    medications: getPatientData('meds') || getPatientData('medications') || [],
    interventions: getPatientData('interventions') || []
  }
}
