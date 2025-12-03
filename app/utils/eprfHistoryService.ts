'use client'

// ePRF History and Management Service
// This service now uses the database API with localStorage as a cache

import * as api from './apiClient'

export interface EPRFRecord {
  id: string
  incidentId: string
  patientLetter: string
  status: 'incomplete' | 'complete'
  author: string // discordId of the author
  authorCallsign: string
  createdAt: string
  updatedAt: string
  submittedAt?: string
  fleetId: string
}

export interface EPRFGroup {
  incidentId: string
  patients: EPRFRecord[]
  allComplete: boolean
  createdAt: string
  fleetId: string
}

const EPRF_HISTORY_KEY = 'eprf_history'
const EPRF_CACHE_KEY = 'eprf_cache_timestamp'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Convert API record to local record format
function apiToLocal(record: api.EPRFRecord): EPRFRecord {
  return {
    id: `${record.incident_id}-${record.patient_letter}`,
    incidentId: record.incident_id,
    patientLetter: record.patient_letter,
    status: record.status as 'incomplete' | 'complete',
    author: record.author_discord_id,
    authorCallsign: record.author_callsign,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    submittedAt: record.submitted_at,
    fleetId: record.fleet_id
  }
}

// Get all ePRF records for a user (async version for API)
export async function getEPRFHistoryAsync(discordId: string): Promise<EPRFRecord[]> {
  try {
    const apiRecords = await api.getEPRFRecordsByUser(discordId)
    const records = apiRecords.map(apiToLocal)
    
    // Update local cache
    const allRecords = getAllEPRFRecords()
    const otherRecords = allRecords.filter(r => r.author !== discordId)
    localStorage.setItem(EPRF_HISTORY_KEY, JSON.stringify([...otherRecords, ...records]))
    localStorage.setItem(EPRF_CACHE_KEY, Date.now().toString())
    
    return records
  } catch (error) {
    console.error('Failed to fetch from API, using cache:', error)
    return getEPRFHistory(discordId)
  }
}

// Get all ePRF records for a user (sync version from cache)
export function getEPRFHistory(discordId: string): EPRFRecord[] {
  try {
    const data = localStorage.getItem(EPRF_HISTORY_KEY)
    if (!data) return []
    const allRecords: EPRFRecord[] = JSON.parse(data)
    return allRecords.filter(r => r.author === discordId)
  } catch {
    return []
  }
}

// Get all ePRF records (for admin purposes)
export function getAllEPRFRecords(): EPRFRecord[] {
  try {
    const data = localStorage.getItem(EPRF_HISTORY_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

// Save or update an ePRF record (local cache only)
export function saveEPRFRecordLocal(record: EPRFRecord): void {
  const allRecords = getAllEPRFRecords()
  const existingIndex = allRecords.findIndex(
    r => r.incidentId === record.incidentId && r.patientLetter === record.patientLetter
  )
  
  if (existingIndex >= 0) {
    allRecords[existingIndex] = { ...allRecords[existingIndex], ...record, updatedAt: new Date().toISOString() }
  } else {
    allRecords.push(record)
  }
  
  localStorage.setItem(EPRF_HISTORY_KEY, JSON.stringify(allRecords))
}

// Save or update an ePRF record (API + cache)
export async function saveEPRFRecord(record: EPRFRecord): Promise<void> {
  // Save to local cache first
  saveEPRFRecordLocal(record)
  
  // Then sync to API (fire and forget for now)
  try {
    await api.createEPRFRecord(
      record.incidentId,
      record.patientLetter,
      record.author,
      record.authorCallsign,
      record.fleetId
    )
  } catch (error) {
    console.error('Failed to sync to API:', error)
  }
}

// Create a new ePRF record (async version)
export async function createEPRFRecordAsync(
  incidentId: string, 
  patientLetter: string, 
  authorDiscordId: string, 
  authorCallsign: string,
  fleetId: string
): Promise<EPRFRecord> {
  const now = new Date().toISOString()
  const record: EPRFRecord = {
    id: `${incidentId}-${patientLetter}`,
    incidentId,
    patientLetter,
    status: 'incomplete',
    author: authorDiscordId,
    authorCallsign,
    createdAt: now,
    updatedAt: now,
    fleetId
  }
  
  // Save to local cache
  saveEPRFRecordLocal(record)
  
  // Save to API
  try {
    await api.createEPRFRecord(incidentId, patientLetter, authorDiscordId, authorCallsign, fleetId)
  } catch (error) {
    console.error('Failed to save to API:', error)
  }
  
  return record
}

// Create a new ePRF record (sync version - uses local cache)
export function createEPRFRecord(
  incidentId: string, 
  patientLetter: string, 
  authorDiscordId: string, 
  authorCallsign: string,
  fleetId: string
): EPRFRecord {
  const now = new Date().toISOString()
  const record: EPRFRecord = {
    id: `${incidentId}-${patientLetter}`,
    incidentId,
    patientLetter,
    status: 'incomplete',
    author: authorDiscordId,
    authorCallsign,
    createdAt: now,
    updatedAt: now,
    fleetId
  }
  saveEPRFRecordLocal(record)
  
  // Fire and forget API call
  api.createEPRFRecord(incidentId, patientLetter, authorDiscordId, authorCallsign, fleetId)
    .catch(err => console.error('Failed to sync to API:', err))
  
  return record
}

// Mark an ePRF as complete (async version)
export async function markEPRFCompleteAsync(incidentId: string, patientLetter: string): Promise<void> {
  // Update local cache
  markEPRFCompleteLocal(incidentId, patientLetter)
  
  // Update via API
  try {
    await api.markEPRFComplete(incidentId, patientLetter)
  } catch (error) {
    console.error('Failed to mark complete via API:', error)
  }
}

// Mark an ePRF as complete (local only)
function markEPRFCompleteLocal(incidentId: string, patientLetter: string): void {
  const allRecords = getAllEPRFRecords()
  const record = allRecords.find(
    r => r.incidentId === incidentId && r.patientLetter === patientLetter
  )
  
  if (record) {
    record.status = 'complete'
    record.submittedAt = new Date().toISOString()
    record.updatedAt = new Date().toISOString()
    localStorage.setItem(EPRF_HISTORY_KEY, JSON.stringify(allRecords))
  }
}

// Mark an ePRF as complete (sync version with fire-and-forget API)
export function markEPRFComplete(incidentId: string, patientLetter: string): void {
  markEPRFCompleteLocal(incidentId, patientLetter)
  
  // Fire and forget API call
  api.markEPRFComplete(incidentId, patientLetter)
    .catch(err => console.error('Failed to sync to API:', err))
}

// Delete an ePRF record (async version)
export async function deleteEPRFRecordAsync(incidentId: string, patientLetter: string, discordId?: string): Promise<boolean> {
  // Delete from local cache first
  const localSuccess = deleteEPRFRecordLocal(incidentId, patientLetter)
  
  // Delete via API
  try {
    await api.deleteEPRFRecord(incidentId, patientLetter, discordId)
    return true
  } catch (error) {
    console.error('Failed to delete via API:', error)
    return localSuccess
  }
}

// Delete an ePRF record (local only)
function deleteEPRFRecordLocal(incidentId: string, patientLetter: string): boolean {
  const allRecords = getAllEPRFRecords()
  const record = allRecords.find(
    r => r.incidentId === incidentId && r.patientLetter === patientLetter
  )
  
  if (record && record.status === 'incomplete') {
    const filtered = allRecords.filter(
      r => !(r.incidentId === incidentId && r.patientLetter === patientLetter)
    )
    localStorage.setItem(EPRF_HISTORY_KEY, JSON.stringify(filtered))
    clearEPRFData(incidentId)
    return true
  }
  return false
}

// Delete an ePRF record (sync version with fire-and-forget API)
export function deleteEPRFRecord(incidentId: string, patientLetter: string, discordId?: string): boolean {
  const success = deleteEPRFRecordLocal(incidentId, patientLetter)
  
  // Fire and forget API call
  api.deleteEPRFRecord(incidentId, patientLetter, discordId)
    .catch(err => console.error('Failed to sync delete to API:', err))
  
  return success
}

// Clear all localStorage data for an ePRF
function clearEPRFData(incidentId: string): void {
  const keys = [
    'incident',
    'patient_info',
    'primary_survey',
    'hx_complaint',
    'past_medical_history',
    'clinical_impression',
    'disposition',
    'vitals',
    'medications',
    'interventions',
    'media'
  ]
  
  keys.forEach(key => {
    localStorage.removeItem(`${key}_${incidentId}`)
  })
}

// Transfer ePRF to another user (async version)
export async function transferEPRFAsync(
  incidentId: string, 
  patientLetter: string, 
  newAuthorDiscordId: string,
  newAuthorCallsign: string
): Promise<boolean> {
  // Update local cache
  transferEPRFLocal(incidentId, patientLetter, newAuthorDiscordId, newAuthorCallsign)
  
  // Update via API
  try {
    await api.transferEPRF(incidentId, patientLetter, newAuthorDiscordId, newAuthorCallsign)
    return true
  } catch (error) {
    console.error('Failed to transfer via API:', error)
    return true // Still return true since local succeeded
  }
}

// Transfer ePRF to another user (local only)
function transferEPRFLocal(
  incidentId: string, 
  patientLetter: string, 
  newAuthorDiscordId: string,
  newAuthorCallsign: string
): boolean {
  const allRecords = getAllEPRFRecords()
  const record = allRecords.find(
    r => r.incidentId === incidentId && r.patientLetter === patientLetter
  )
  
  if (record) {
    record.author = newAuthorDiscordId
    record.authorCallsign = newAuthorCallsign
    record.updatedAt = new Date().toISOString()
    localStorage.setItem(EPRF_HISTORY_KEY, JSON.stringify(allRecords))
    return true
  }
  return false
}

// Transfer ePRF (sync version with fire-and-forget API)
export function transferEPRF(
  incidentId: string, 
  patientLetter: string, 
  newAuthorDiscordId: string,
  newAuthorCallsign: string
): boolean {
  const success = transferEPRFLocal(incidentId, patientLetter, newAuthorDiscordId, newAuthorCallsign)
  
  // Fire and forget API call
  api.transferEPRF(incidentId, patientLetter, newAuthorDiscordId, newAuthorCallsign)
    .catch(err => console.error('Failed to sync transfer to API:', err))
  
  return success
}

// Transfer all patients for an incident to another user (async version)
export async function transferAllPatientsAsync(
  incidentId: string,
  newAuthorDiscordId: string,
  newAuthorCallsign: string
): Promise<boolean> {
  const allRecords = getAllEPRFRecords()
  const incidentRecords = allRecords.filter(r => r.incidentId === incidentId)
  
  if (incidentRecords.length === 0) return false
  
  // Transfer each patient
  for (const record of incidentRecords) {
    await transferEPRFAsync(incidentId, record.patientLetter, newAuthorDiscordId, newAuthorCallsign)
  }
  
  return true
}

// Transfer all patients for an incident (sync version)
export function transferAllPatients(
  incidentId: string,
  newAuthorDiscordId: string,
  newAuthorCallsign: string
): boolean {
  const allRecords = getAllEPRFRecords()
  const incidentRecords = allRecords.filter(r => r.incidentId === incidentId)
  
  if (incidentRecords.length === 0) return false
  
  // Transfer each patient locally and fire API calls
  incidentRecords.forEach(record => {
    transferEPRF(incidentId, record.patientLetter, newAuthorDiscordId, newAuthorCallsign)
  })
  
  return true
}

// Search ePRFs with async API fetch
export async function searchEPRFsAsync(
  discordId: string, 
  query?: string, 
  status?: string
): Promise<EPRFRecord[]> {
  try {
    const apiRecords = await api.searchEPRFs(discordId, query, status)
    return apiRecords.map(apiToLocal)
  } catch (error) {
    console.error('Failed to search via API, using local cache:', error)
    return searchEPRFs(discordId, query || '', { status: status as any })
  }
}

// Group ePRFs by incident
export function groupEPRFsByIncident(records: EPRFRecord[]): EPRFGroup[] {
  const groups: { [key: string]: EPRFRecord[] } = {}
  
  records.forEach(record => {
    if (!groups[record.incidentId]) {
      groups[record.incidentId] = []
    }
    groups[record.incidentId].push(record)
  })
  
  return Object.entries(groups).map(([incidentId, patients]) => ({
    incidentId,
    patients: patients.sort((a, b) => a.patientLetter.localeCompare(b.patientLetter)),
    allComplete: patients.every(p => p.status === 'complete'),
    createdAt: patients[0]?.createdAt || '',
    fleetId: patients[0]?.fleetId || ''
  })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// Check if all patients for an incident are complete
export function areAllPatientsComplete(incidentId: string): boolean {
  const allRecords = getAllEPRFRecords()
  const incidentRecords = allRecords.filter(r => r.incidentId === incidentId)
  return incidentRecords.length > 0 && incidentRecords.every(r => r.status === 'complete')
}

// Get incomplete ePRFs for current user
export function getIncompleteEPRFs(discordId: string): EPRFRecord[] {
  return getEPRFHistory(discordId).filter(r => r.status === 'incomplete')
}

// Get complete ePRFs for current user
export function getCompleteEPRFs(discordId: string): EPRFRecord[] {
  return getEPRFHistory(discordId).filter(r => r.status === 'complete')
}

// Search/filter ePRFs
export function searchEPRFs(
  discordId: string, 
  query: string, 
  filters?: {
    status?: 'incomplete' | 'complete' | 'all'
    dateFrom?: string
    dateTo?: string
  }
): EPRFRecord[] {
  let records = getEPRFHistory(discordId)
  
  // Apply status filter
  if (filters?.status && filters.status !== 'all') {
    records = records.filter(r => r.status === filters.status)
  }
  
  // Apply date filters
  if (filters?.dateFrom) {
    const fromDate = new Date(filters.dateFrom).getTime()
    records = records.filter(r => new Date(r.createdAt).getTime() >= fromDate)
  }
  
  if (filters?.dateTo) {
    const toDate = new Date(filters.dateTo).getTime() + (24 * 60 * 60 * 1000) // Include full day
    records = records.filter(r => new Date(r.createdAt).getTime() <= toDate)
  }
  
  // Apply search query
  if (query.trim()) {
    const q = query.toLowerCase()
    records = records.filter(r => 
      r.incidentId.toLowerCase().includes(q) ||
      r.patientLetter.toLowerCase().includes(q) ||
      r.authorCallsign.toLowerCase().includes(q)
    )
  }
  
  return records
}

// Get record by incident and patient
export function getEPRFRecord(incidentId: string, patientLetter: string): EPRFRecord | null {
  const allRecords = getAllEPRFRecords()
  return allRecords.find(
    r => r.incidentId === incidentId && r.patientLetter === patientLetter
  ) || null
}

// Check if user has any incomplete multi-patient ePRFs that can't be submitted
export function getBlockedSubmissions(discordId: string): EPRFGroup[] {
  const records = getEPRFHistory(discordId)
  const groups = groupEPRFsByIncident(records)
  
  return groups.filter(group => 
    group.patients.length > 1 && 
    !group.allComplete && 
    group.patients.some(p => p.status === 'complete')
  )
}
