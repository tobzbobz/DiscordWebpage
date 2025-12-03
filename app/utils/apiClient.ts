// API Client for ePRF database operations

export interface EPRFRecord {
  id: number;
  incident_id: string;
  patient_letter: string;
  status: 'incomplete' | 'complete';
  author_discord_id: string;
  author_callsign: string;
  fleet_id: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
}

export interface User {
  id: number;
  discord_id: string;
  discord_username: string;
  callsign: string;
  vehicle: string;
  last_login: string;
}

// ePRF Records API
export async function createEPRFRecord(
  incidentId: string,
  patientLetter: string,
  authorDiscordId: string,
  authorCallsign: string,
  fleetId: string
): Promise<EPRFRecord | null> {
  try {
    const response = await fetch('/api/eprf/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incidentId,
        patientLetter,
        authorDiscordId,
        authorCallsign,
        fleetId
      })
    });
    const data = await response.json();
    if (data.success) {
      return data.record;
    }
    console.error('createEPRFRecord error:', data.error);
    return null;
  } catch (error) {
    console.error('createEPRFRecord error:', error);
    return null;
  }
}

export async function getEPRFRecord(
  incidentId: string,
  patientLetter: string
): Promise<EPRFRecord | null> {
  try {
    const params = new URLSearchParams({ incidentId, patientLetter });
    const response = await fetch(`/api/eprf/records?${params}`);
    const data = await response.json();
    return data.success ? data.record : null;
  } catch (error) {
    console.error('getEPRFRecord error:', error);
    return null;
  }
}

export async function getEPRFRecordsByUser(discordId: string): Promise<EPRFRecord[]> {
  try {
    const params = new URLSearchParams({ discordId });
    const response = await fetch(`/api/eprf/records?${params}`);
    const data = await response.json();
    return data.success ? data.records : [];
  } catch (error) {
    console.error('getEPRFRecordsByUser error:', error);
    return [];
  }
}

export async function searchEPRFs(
  discordId: string,
  query?: string,
  status?: string
): Promise<EPRFRecord[]> {
  try {
    const params = new URLSearchParams({ discordId });
    if (query) params.set('query', query);
    if (status) params.set('status', status);
    const response = await fetch(`/api/eprf/records?${params}`);
    const data = await response.json();
    return data.success ? data.records : [];
  } catch (error) {
    console.error('searchEPRFs error:', error);
    return [];
  }
}

export async function markEPRFComplete(
  incidentId: string,
  patientLetter: string
): Promise<EPRFRecord | null> {
  try {
    const response = await fetch('/api/eprf/records', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId, patientLetter, action: 'complete' })
    });
    const data = await response.json();
    return data.success ? data.record : null;
  } catch (error) {
    console.error('markEPRFComplete error:', error);
    return null;
  }
}

export async function transferEPRF(
  incidentId: string,
  patientLetter: string,
  newAuthorDiscordId: string,
  newAuthorCallsign: string
): Promise<EPRFRecord | null> {
  try {
    const response = await fetch('/api/eprf/records', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incidentId,
        patientLetter,
        action: 'transfer',
        newAuthorDiscordId,
        newAuthorCallsign
      })
    });
    const data = await response.json();
    return data.success ? data.record : null;
  } catch (error) {
    console.error('transferEPRF error:', error);
    return null;
  }
}

export async function deleteEPRFRecord(
  incidentId: string,
  patientLetter: string,
  discordId?: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/eprf/records', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId, patientLetter, discordId })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('deleteEPRFRecord error:', error);
    return false;
  }
}

// ePRF Form Data API
export async function saveEPRFData(
  incidentId: string,
  patientLetter: string,
  section: string,
  formData: any
): Promise<boolean> {
  try {
    const response = await fetch('/api/eprf/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId, patientLetter, section, data: formData })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('saveEPRFData error:', error);
    return false;
  }
}

export async function getEPRFData(
  incidentId: string,
  patientLetter: string,
  section: string
): Promise<any | null> {
  try {
    const params = new URLSearchParams({ incidentId, patientLetter, section });
    const response = await fetch(`/api/eprf/data?${params}`);
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('getEPRFData error:', error);
    return null;
  }
}

export async function getAllEPRFData(
  incidentId: string,
  patientLetter: string
): Promise<{ [key: string]: any }> {
  try {
    const params = new URLSearchParams({ incidentId, patientLetter, all: 'true' });
    const response = await fetch(`/api/eprf/data?${params}`);
    const data = await response.json();
    return data.success ? data.data : {};
  } catch (error) {
    console.error('getAllEPRFData error:', error);
    return {};
  }
}

// User API
export async function loginUser(
  discordId: string,
  discordUsername: string,
  callsign: string,
  vehicle: string
): Promise<User | null> {
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, discordUsername, callsign, vehicle })
    });
    const data = await response.json();
    return data.success ? data.user : null;
  } catch (error) {
    console.error('loginUser error:', error);
    return null;
  }
}

export async function getActiveUsers(): Promise<User[]> {
  try {
    const response = await fetch('/api/users?active=true');
    const data = await response.json();
    return data.success ? data.users : [];
  } catch (error) {
    console.error('getActiveUsers error:', error);
    return [];
  }
}

export async function getUser(discordId: string): Promise<User | null> {
  try {
    const params = new URLSearchParams({ discordId });
    const response = await fetch(`/api/users?${params}`);
    const data = await response.json();
    return data.success ? data.user : null;
  } catch (error) {
    console.error('getUser error:', error);
    return null;
  }
}

// Initialize database (call once on first deploy)
export async function initializeDatabase(): Promise<boolean> {
  try {
    const response = await fetch('/api/db/init');
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('initializeDatabase error:', error);
    return false;
  }
}

// Admin Discord ID
export const ADMIN_DISCORD_ID = '695765253612953651';

// Check if user is admin
export function isAdmin(discordId: string): boolean {
  return discordId === ADMIN_DISCORD_ID;
}

// Admin API Functions
export interface AdminEPRFRecord extends EPRFRecord {
  user_callsign?: string;
  discord_username?: string;
}

export async function adminGetAllRecords(
  discordId: string,
  query?: string,
  status?: string,
  authorId?: string
): Promise<AdminEPRFRecord[]> {
  try {
    const params = new URLSearchParams({ discordId });
    if (query) params.set('query', query);
    if (status) params.set('status', status);
    if (authorId) params.set('authorId', authorId);
    const response = await fetch(`/api/admin/records?${params}`);
    const data = await response.json();
    return data.success ? data.records : [];
  } catch (error) {
    console.error('adminGetAllRecords error:', error);
    return [];
  }
}

export async function adminGetAllUsers(discordId: string): Promise<User[]> {
  try {
    const params = new URLSearchParams({ discordId, type: 'users' });
    const response = await fetch(`/api/admin/records?${params}`);
    const data = await response.json();
    return data.success ? data.users : [];
  } catch (error) {
    console.error('adminGetAllUsers error:', error);
    return [];
  }
}

export async function adminDeleteRecord(
  discordId: string,
  incidentId: string,
  patientLetter: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/records', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, incidentId, patientLetter })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('adminDeleteRecord error:', error);
    return false;
  }
}

export async function adminTransferRecord(
  discordId: string,
  incidentId: string,
  patientLetter: string,
  newAuthorDiscordId: string,
  newAuthorCallsign: string
): Promise<AdminEPRFRecord | null> {
  try {
    const response = await fetch('/api/admin/records', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId,
        incidentId,
        patientLetter,
        action: 'transfer',
        newAuthorDiscordId,
        newAuthorCallsign
      })
    });
    const data = await response.json();
    return data.success ? data.record : null;
  } catch (error) {
    console.error('adminTransferRecord error:', error);
    return null;
  }
}

export async function adminUpdateStatus(
  discordId: string,
  incidentId: string,
  patientLetter: string,
  status: 'incomplete' | 'complete'
): Promise<AdminEPRFRecord | null> {
  try {
    const response = await fetch('/api/admin/records', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId,
        incidentId,
        patientLetter,
        action: 'updateStatus',
        status
      })
    });
    const data = await response.json();
    return data.success ? data.record : null;
  } catch (error) {
    console.error('adminUpdateStatus error:', error);
    return null;
  }
}
