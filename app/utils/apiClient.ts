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
  const params = new URLSearchParams({ discordId });
  const response = await fetch(`/api/eprf/records?${params}`);
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch records');
  }
  return data.records || [];
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

// ==========================================
// ADMIN COLLABORATION API
// ==========================================

export interface AdminCollabStats {
  activeUsers: number;
  totalActivityLogs: number;
  pendingAccessRequests: number;
  activeSectionLocks: number;
  activeShareLinks: number;
  totalCollaborators: number;
  expiredAccess: number;
}

export interface AdminPresence {
  id: number;
  incident_id: string;
  patient_letter: string;
  user_discord_id: string;
  user_callsign: string;
  page_name: string;
  last_seen: string;
}

export interface AdminActivityLog {
  id: number;
  incident_id: string;
  patient_letter: string;
  user_discord_id: string;
  user_callsign: string;
  action_type: string;
  section?: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  description?: string;
  created_at: string;
}

export interface AdminAccessRequest {
  id: number;
  incident_id: string;
  patient_letter?: string;
  requester_discord_id: string;
  requester_callsign: string;
  requested_permission: PermissionLevel;
  message?: string;
  status: 'pending' | 'approved' | 'denied';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface AdminShareLink {
  id: number;
  incident_id: string;
  patient_letter?: string;
  code: string;
  permission_level: PermissionLevel;
  created_by_discord_id: string;
  max_uses?: number;
  uses_count: number;
  expires_at?: string;
  created_at: string;
}

export interface AdminSectionLock {
  id: number;
  incident_id: string;
  patient_letter: string;
  section: string;
  locked_by_discord_id: string;
  locked_by_callsign: string;
  lock_level: string;
  auto_expire_at?: string;
  locked_at: string;
}

// Get admin collaboration stats
export async function adminGetCollabStats(discordId: string): Promise<AdminCollabStats | null> {
  try {
    const params = new URLSearchParams({ discordId, type: 'stats' });
    const response = await fetch(`/api/admin/collaboration?${params}`);
    const data = await response.json();
    return data.success ? data.stats : null;
  } catch (error) {
    console.error('adminGetCollabStats error:', error);
    return null;
  }
}

// Get active presence
export async function adminGetPresence(discordId: string): Promise<AdminPresence[]> {
  try {
    const params = new URLSearchParams({ discordId, type: 'presence' });
    const response = await fetch(`/api/admin/collaboration?${params}`);
    const data = await response.json();
    return data.success ? data.presence : [];
  } catch (error) {
    console.error('adminGetPresence error:', error);
    return [];
  }
}

// Get activity logs
export async function adminGetActivityLogs(
  discordId: string,
  options?: { incidentId?: string; patientLetter?: string; limit?: number; offset?: number; actionType?: string }
): Promise<{ activity: AdminActivityLog[]; total: number }> {
  try {
    const params = new URLSearchParams({ discordId, type: 'activity' });
    if (options?.incidentId) params.append('incidentId', options.incidentId);
    if (options?.patientLetter) params.append('patientLetter', options.patientLetter);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.actionType) params.append('actionType', options.actionType);
    
    const response = await fetch(`/api/admin/collaboration?${params}`);
    const data = await response.json();
    return data.success ? { activity: data.activity, total: data.total } : { activity: [], total: 0 };
  } catch (error) {
    console.error('adminGetActivityLogs error:', error);
    return { activity: [], total: 0 };
  }
}

// Get access requests
export async function adminGetAccessRequests(discordId: string, status: string = 'pending'): Promise<AdminAccessRequest[]> {
  try {
    const params = new URLSearchParams({ discordId, type: 'access-requests', status });
    const response = await fetch(`/api/admin/collaboration?${params}`);
    const data = await response.json();
    return data.success ? data.requests : [];
  } catch (error) {
    console.error('adminGetAccessRequests error:', error);
    return [];
  }
}

// Get share links
export async function adminGetShareLinks(discordId: string): Promise<AdminShareLink[]> {
  try {
    const params = new URLSearchParams({ discordId, type: 'share-links' });
    const response = await fetch(`/api/admin/collaboration?${params}`);
    const data = await response.json();
    return data.success ? data.shareLinks : [];
  } catch (error) {
    console.error('adminGetShareLinks error:', error);
    return [];
  }
}

// Get section locks
export async function adminGetSectionLocks(discordId: string): Promise<AdminSectionLock[]> {
  try {
    const params = new URLSearchParams({ discordId, type: 'section-locks' });
    const response = await fetch(`/api/admin/collaboration?${params}`);
    const data = await response.json();
    return data.success ? data.locks : [];
  } catch (error) {
    console.error('adminGetSectionLocks error:', error);
    return [];
  }
}

// Get expired access
export async function adminGetExpiredAccess(discordId: string): Promise<Collaborator[]> {
  try {
    const params = new URLSearchParams({ discordId, type: 'expired-access' });
    const response = await fetch(`/api/admin/collaboration?${params}`);
    const data = await response.json();
    return data.success ? data.expired : [];
  } catch (error) {
    console.error('adminGetExpiredAccess error:', error);
    return [];
  }
}

// Admin action helper
async function adminCollabAction(discordId: string, callsign: string, action: string, data: Record<string, any>): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch('/api/admin/collaboration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, callsign, action, ...data })
    });
    return await response.json();
  } catch (error) {
    console.error(`adminCollabAction ${action} error:`, error);
    return { success: false, error: 'Request failed' };
  }
}

// Force disconnect a user
export async function adminForceDisconnect(discordId: string, callsign: string, targetDiscordId: string, incidentId?: string, patientLetter?: string) {
  return adminCollabAction(discordId, callsign, 'force-disconnect', { targetDiscordId, incidentId, patientLetter });
}

// Force unlock a section
export async function adminForceUnlock(discordId: string, callsign: string, incidentId: string, patientLetter: string, section?: string) {
  return adminCollabAction(discordId, callsign, 'force-unlock', { incidentId, patientLetter, section });
}

// Approve access request
export async function adminApproveAccess(discordId: string, callsign: string, requestId: number, permissionLevel: PermissionLevel) {
  return adminCollabAction(discordId, callsign, 'approve-access', { requestId, permissionLevel });
}

// Deny access request
export async function adminDenyAccess(discordId: string, callsign: string, requestId: number, reason?: string) {
  return adminCollabAction(discordId, callsign, 'deny-access', { requestId, reason });
}

// Revoke share link
export async function adminRevokeShareLink(discordId: string, callsign: string, linkId: number) {
  return adminCollabAction(discordId, callsign, 'revoke-share-link', { linkId });
}

// Add collaborator
export async function adminAddCollaborator(
  discordId: string, 
  callsign: string, 
  incidentId: string, 
  targetDiscordId: string, 
  targetCallsign: string, 
  permissionLevel: PermissionLevel,
  expiresAt?: string
) {
  return adminCollabAction(discordId, callsign, 'add-collaborator', { incidentId, targetDiscordId, targetCallsign, permissionLevel, expiresAt });
}

// Remove collaborator
export async function adminRemoveCollaborator(discordId: string, callsign: string, incidentId: string, targetDiscordId: string) {
  return adminCollabAction(discordId, callsign, 'remove-collaborator', { incidentId, targetDiscordId });
}

// Update permission
export async function adminUpdatePermission(discordId: string, callsign: string, incidentId: string, targetDiscordId: string, newPermissionLevel: PermissionLevel) {
  return adminCollabAction(discordId, callsign, 'update-permission', { incidentId, targetDiscordId, newPermissionLevel });
}

// Send notification
export async function adminSendNotification(discordId: string, callsign: string, title: string, message: string, targetDiscordId?: string, notificationType?: string) {
  return adminCollabAction(discordId, callsign, 'send-notification', { title, message, targetDiscordId, notificationType });
}

// Cleanup expired access
export async function adminCleanupExpired(discordId: string, callsign: string) {
  return adminCollabAction(discordId, callsign, 'cleanup-expired', {});
}

// Cleanup old logs
export async function adminCleanupOldLogs(discordId: string, callsign: string) {
  return adminCollabAction(discordId, callsign, 'cleanup-old-logs', {});
}

// Restore expired collaborator
export async function adminRestoreCollaborator(discordId: string, callsign: string, incidentId: string, targetDiscordId: string, newExpiresAt?: string) {
  return adminCollabAction(discordId, callsign, 'restore-collaborator', { incidentId, targetDiscordId, newExpiresAt });
}

// ==========================================
// COLLABORATION API
// ==========================================

export type PermissionLevel = 'owner' | 'manage' | 'edit' | 'view';

export interface Collaborator {
  id: number;
  incident_id: string;
  user_discord_id: string;
  user_callsign: string;
  permission_level: PermissionLevel;
  added_by_discord_id: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  discord_username?: string;
}

// Get all collaborators for an ePRF
export async function getCollaborators(incidentId: string): Promise<{ collaborators: Collaborator[], owner: any }> {
  try {
    const params = new URLSearchParams({ incidentId });
    const response = await fetch(`/api/eprf/collaborators?${params}`);
    const data = await response.json();
    return data.success ? { collaborators: data.collaborators, owner: data.owner } : { collaborators: [], owner: null };
  } catch (error) {
    console.error('getCollaborators error:', error);
    return { collaborators: [], owner: null };
  }
}

// Get user's permission level for an ePRF
export async function getPermissionLevel(incidentId: string, userDiscordId: string): Promise<PermissionLevel | null> {
  try {
    const params = new URLSearchParams({ incidentId, userDiscordId, checkPermission: 'true' });
    const response = await fetch(`/api/eprf/collaborators?${params}`);
    const data = await response.json();
    return data.success ? data.permission : null;
  } catch (error) {
    console.error('getPermissionLevel error:', error);
    return null;
  }
}

// Shared ePRF record with collaboration info
export interface SharedEPRFRecord {
  incident_id: string;
  patient_letter: string;
  status: 'incomplete' | 'complete';
  author_discord_id: string;
  author_callsign: string;
  fleet_id: string;
  created_at: string;
  updated_at: string;
  permission_level: PermissionLevel;
  access_type: 'incident' | 'patient'; // incident = full access, patient = specific patient only
}

// Get ePRFs shared with a user (for dashboard)
export async function getSharedEPRFs(userDiscordId: string): Promise<SharedEPRFRecord[]> {
  try {
    const params = new URLSearchParams({ userDiscordId, getShared: 'true' });
    const response = await fetch(`/api/eprf/collaborators?${params}`);
    const data = await response.json();
    return data.success ? data.records : [];
  } catch (error) {
    console.error('getSharedEPRFs error:', error);
    return [];
  }
}

// Add a collaborator
export async function addCollaborator(
  incidentId: string,
  userDiscordId: string,
  userCallsign: string,
  permissionLevel: PermissionLevel,
  addedByDiscordId: string
): Promise<Collaborator | null> {
  try {
    const response = await fetch('/api/eprf/collaborators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incidentId,
        userDiscordId,
        userCallsign,
        permissionLevel,
        addedByDiscordId
      })
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to add collaborator');
    }
    return data.collaborator;
  } catch (error) {
    console.error('addCollaborator error:', error);
    throw error;
  }
}

// Update collaborator permission
export async function updateCollaboratorPermission(
  incidentId: string,
  userDiscordId: string,
  newPermissionLevel: PermissionLevel,
  requesterDiscordId: string
): Promise<Collaborator | null> {
  try {
    const response = await fetch('/api/eprf/collaborators', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updatePermission',
        incidentId,
        userDiscordId,
        newPermissionLevel,
        requesterDiscordId
      })
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to update permission');
    }
    return data.collaborator;
  } catch (error) {
    console.error('updateCollaboratorPermission error:', error);
    throw error;
  }
}

// Remove a collaborator
export async function removeCollaborator(
  incidentId: string,
  userDiscordId: string,
  requesterDiscordId: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/eprf/collaborators', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incidentId,
        userDiscordId,
        requesterDiscordId
      })
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to remove collaborator');
    }
    return true;
  } catch (error) {
    console.error('removeCollaborator error:', error);
    throw error;
  }
}

// Transfer ownership
export async function transferOwnershipAPI(
  incidentId: string,
  currentOwnerDiscordId: string,
  currentOwnerCallsign: string,
  newOwnerDiscordId: string,
  newOwnerCallsign: string,
  requesterDiscordId: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/eprf/collaborators', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'transfer',
        incidentId,
        currentOwnerDiscordId,
        currentOwnerCallsign,
        newOwnerDiscordId,
        newOwnerCallsign,
        requesterDiscordId
      })
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to transfer ownership');
    }
    return true;
  } catch (error) {
    console.error('transferOwnership error:', error);
    throw error;
  }
}

// Check if user can edit (owner, manage, or edit permission)
export function canEdit(permission: PermissionLevel | null): boolean {
  return permission === 'owner' || permission === 'manage' || permission === 'edit';
}

// Check if user can manage collaborators (owner or manage permission)
export function canManageCollaborators(permission: PermissionLevel | null): boolean {
  return permission === 'owner' || permission === 'manage';
}

// Check if user is owner
export function isOwner(permission: PermissionLevel | null): boolean {
  return permission === 'owner';
}

// Check user's ePRF access
export async function checkEPRFAccess(
  incidentId: string, 
  userDiscordId: string
): Promise<{ hasAccess: boolean, permission: PermissionLevel | null }> {
  try {
    const permission = await getPermissionLevel(incidentId, userDiscordId);
    return { hasAccess: permission !== null, permission };
  } catch (error) {
    console.error('checkEPRFAccess error:', error);
    return { hasAccess: false, permission: null };
  }
}

// ==========================================
// PER-PATIENT COLLABORATION API
// ==========================================

export interface PatientCollaborator {
  id: number;
  incident_id: string;
  patient_letter: string;
  user_discord_id: string;
  user_callsign: string;
  permission_level: PermissionLevel;
  added_by_discord_id: string;
  created_at: string;
  updated_at: string;
}

// Get all collaborators for a specific patient
export async function getPatientCollaborators(
  incidentId: string, 
  patientLetter: string
): Promise<{ collaborators: PatientCollaborator[], owner: any }> {
  try {
    const params = new URLSearchParams({ incidentId, patientLetter });
    const response = await fetch(`/api/eprf/patient-collaborators?${params}`);
    const data = await response.json();
    return data.success ? { collaborators: data.collaborators, owner: data.owner } : { collaborators: [], owner: null };
  } catch (error) {
    console.error('getPatientCollaborators error:', error);
    return { collaborators: [], owner: null };
  }
}

// Get user's permission level for a specific patient
export async function getPatientPermissionLevel(
  incidentId: string, 
  patientLetter: string,
  userDiscordId: string
): Promise<PermissionLevel | null> {
  try {
    const params = new URLSearchParams({ incidentId, patientLetter, userDiscordId, checkPermission: 'true' });
    const response = await fetch(`/api/eprf/patient-collaborators?${params}`);
    const data = await response.json();
    return data.success ? data.permission : null;
  } catch (error) {
    console.error('getPatientPermissionLevel error:', error);
    return null;
  }
}

// Check if user can transfer a specific patient
export async function checkCanTransferPatient(
  incidentId: string, 
  patientLetter: string,
  userDiscordId: string
): Promise<boolean> {
  try {
    const params = new URLSearchParams({ incidentId, patientLetter, userDiscordId, checkCanTransfer: 'true' });
    const response = await fetch(`/api/eprf/patient-collaborators?${params}`);
    const data = await response.json();
    return data.success ? data.canTransfer : false;
  } catch (error) {
    console.error('checkCanTransferPatient error:', error);
    return false;
  }
}

// Add a collaborator to a specific patient
export async function addPatientCollaborator(
  incidentId: string,
  patientLetter: string,
  userDiscordId: string,
  userCallsign: string,
  permissionLevel: PermissionLevel,
  addedByDiscordId: string
): Promise<PatientCollaborator | null> {
  try {
    const response = await fetch('/api/eprf/patient-collaborators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incidentId,
        patientLetter,
        userDiscordId,
        userCallsign,
        permissionLevel,
        addedByDiscordId
      })
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to add patient collaborator');
    }
    return data.collaborator;
  } catch (error) {
    console.error('addPatientCollaborator error:', error);
    throw error;
  }
}

// Update a patient collaborator's permission level
export async function updatePatientCollaboratorPermission(
  incidentId: string,
  patientLetter: string,
  userDiscordId: string,
  newPermissionLevel: PermissionLevel,
  requesterDiscordId: string
): Promise<PatientCollaborator | null> {
  try {
    const response = await fetch('/api/eprf/patient-collaborators', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updatePermission',
        incidentId,
        patientLetter,
        userDiscordId,
        newPermissionLevel,
        requesterDiscordId
      })
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to update patient collaborator permission');
    }
    return data.collaborator;
  } catch (error) {
    console.error('updatePatientCollaboratorPermission error:', error);
    throw error;
  }
}

// Remove a collaborator from a specific patient
export async function removePatientCollaborator(
  incidentId: string,
  patientLetter: string,
  userDiscordId: string,
  requesterDiscordId: string
): Promise<boolean> {
  try {
    const params = new URLSearchParams({ incidentId, patientLetter, userDiscordId, requesterDiscordId });
    const response = await fetch(`/api/eprf/patient-collaborators?${params}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to remove patient collaborator');
    }
    return true;
  } catch (error) {
    console.error('removePatientCollaborator error:', error);
    throw error;
  }
}

// Transfer patient ownership
export async function transferPatientOwnershipAPI(
  incidentId: string,
  patientLetter: string,
  currentOwnerDiscordId: string,
  currentOwnerCallsign: string,
  newOwnerDiscordId: string,
  newOwnerCallsign: string,
  requesterDiscordId: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/eprf/patient-collaborators', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'transferPatient',
        incidentId,
        patientLetter,
        currentOwnerDiscordId,
        currentOwnerCallsign,
        newOwnerDiscordId,
        newOwnerCallsign,
        requesterDiscordId
      })
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to transfer patient ownership');
    }
    return true;
  } catch (error) {
    console.error('transferPatientOwnership error:', error);
    throw error;
  }
}

// Auto-add incident managers to a new patient
export async function addManagersToNewPatient(
  incidentId: string,
  patientLetter: string,
  requesterDiscordId: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/eprf/patient-collaborators', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addManagersToPatient',
        incidentId,
        patientLetter,
        requesterDiscordId
      })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('addManagersToNewPatient error:', error);
    return false;
  }
}

// Check user's patient access
export async function checkPatientAccess(
  incidentId: string,
  patientLetter: string,
  userDiscordId: string
): Promise<{ hasAccess: boolean, permission: PermissionLevel | null, canTransfer: boolean }> {
  try {
    const permission = await getPatientPermissionLevel(incidentId, patientLetter, userDiscordId);
    const canTransfer = await checkCanTransferPatient(incidentId, patientLetter, userDiscordId);
    return { hasAccess: permission !== null, permission, canTransfer };
  } catch (error) {
    console.error('checkPatientAccess error:', error);
    return { hasAccess: false, permission: null, canTransfer: false };
  }
}

// ==========================================
// NOTIFICATION API
// ==========================================

export interface Notification {
  id: number;
  user_discord_id: string;
  incident_id?: string;
  patient_letter?: string;
  notification_type: string;
  title: string;
  message: string;
  from_user_discord_id?: string;
  from_user_callsign?: string;
  read: boolean;
  created_at: string;
}

export async function getNotifications(userDiscordId: string, unreadOnly: boolean = false): Promise<Notification[]> {
  try {
    const params = new URLSearchParams({ userDiscordId, unreadOnly: String(unreadOnly) });
    const response = await fetch(`/api/eprf/notifications?${params}`);
    const data = await response.json();
    return data.success ? data.notifications : [];
  } catch (error) {
    console.error('getNotifications error:', error);
    return [];
  }
}

export async function getUnreadNotificationCount(userDiscordId: string): Promise<number> {
  try {
    const params = new URLSearchParams({ userDiscordId, countOnly: 'true' });
    const response = await fetch(`/api/eprf/notifications?${params}`);
    const data = await response.json();
    return data.success ? data.count : 0;
  } catch (error) {
    console.error('getUnreadNotificationCount error:', error);
    return 0;
  }
}

export async function markNotificationRead(notificationId: number, userDiscordId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/eprf/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markRead', notificationId, userDiscordId })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('markNotificationRead error:', error);
    return false;
  }
}

export async function markAllNotificationsRead(userDiscordId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/eprf/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markAllRead', userDiscordId })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('markAllNotificationsRead error:', error);
    return false;
  }
}

export async function createNotificationAPI(
  userDiscordId: string,
  notificationType: string,
  title: string,
  message: string,
  options?: {
    incidentId?: string;
    patientLetter?: string;
    fromUserDiscordId?: string;
    fromUserCallsign?: string;
  }
): Promise<Notification | null> {
  try {
    const response = await fetch('/api/eprf/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userDiscordId,
        notificationType,
        title,
        message,
        ...options
      })
    });
    const data = await response.json();
    return data.success ? data.notification : null;
  } catch (error) {
    console.error('createNotificationAPI error:', error);
    return null;
  }
}

// ==========================================
// PRESENCE API (Live users)
// ==========================================

export interface Presence {
  id: number;
  incident_id: string;
  patient_letter: string;
  user_discord_id: string;
  user_callsign: string;
  page_name: string;
  last_seen: string;
}

export async function updatePresence(
  incidentId: string,
  patientLetter: string,
  userDiscordId: string,
  userCallsign: string,
  pageName: string
): Promise<{ presence: Presence | null; presences: Presence[] }> {
  try {
    const response = await fetch('/api/eprf/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId, patientLetter, userDiscordId, userCallsign, pageName })
    });
    const data = await response.json();
    return data.success ? { presence: data.presence, presences: data.presences } : { presence: null, presences: [] };
  } catch (error) {
    console.error('updatePresence error:', error);
    return { presence: null, presences: [] };
  }
}

export async function getActivePresence(incidentId: string, patientLetter: string): Promise<Presence[]> {
  try {
    const params = new URLSearchParams({ incidentId, patientLetter });
    const response = await fetch(`/api/eprf/presence?${params}`);
    const data = await response.json();
    return data.success ? data.presences : [];
  } catch (error) {
    console.error('getActivePresence error:', error);
    return [];
  }
}

export async function removePresence(incidentId: string, patientLetter: string, userDiscordId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/eprf/presence', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId, patientLetter, userDiscordId })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('removePresence error:', error);
    return false;
  }
}

// ==========================================
// ACTIVITY LOG API
// ==========================================

export interface ActivityLogEntry {
  id: number;
  incident_id: string;
  patient_letter: string;
  user_discord_id: string;
  user_callsign: string;
  action_type: string;
  section?: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  description?: string;
  created_at: string;
}

export async function getActivityLog(incidentId: string, patientLetter: string, limit: number = 50): Promise<ActivityLogEntry[]> {
  try {
    const params = new URLSearchParams({ incidentId, patientLetter, limit: String(limit) });
    const response = await fetch(`/api/eprf/activity?${params}`);
    const data = await response.json();
    return data.success ? data.activities : [];
  } catch (error) {
    console.error('getActivityLog error:', error);
    return [];
  }
}

export async function logActivityAPI(
  incidentId: string,
  patientLetter: string,
  userDiscordId: string,
  userCallsign: string,
  actionType: string,
  options?: {
    section?: string;
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    description?: string;
  }
): Promise<ActivityLogEntry | null> {
  try {
    const response = await fetch('/api/eprf/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incidentId,
        patientLetter,
        userDiscordId,
        userCallsign,
        actionType,
        ...options
      })
    });
    const data = await response.json();
    return data.success ? data.activity : null;
  } catch (error) {
    console.error('logActivityAPI error:', error);
    return null;
  }
}

// ==========================================
// SECTION LOCKS API
// ==========================================

export interface SectionLock {
  id: number;
  incident_id: string;
  patient_letter: string;
  section: string;
  locked_to_level: PermissionLevel;
  locked_by_discord_id: string;
  locked_by_callsign: string;
  locked_at: string;
}

export async function getSectionLocks(incidentId: string, patientLetter: string): Promise<SectionLock[]> {
  try {
    const params = new URLSearchParams({ incidentId, patientLetter });
    const response = await fetch(`/api/eprf/section-locks?${params}`);
    const data = await response.json();
    return data.success ? data.locks : [];
  } catch (error) {
    console.error('getSectionLocks error:', error);
    return [];
  }
}

export async function getSectionLock(incidentId: string, patientLetter: string, section: string): Promise<SectionLock | null> {
  try {
    const params = new URLSearchParams({ incidentId, patientLetter, section });
    const response = await fetch(`/api/eprf/section-locks?${params}`);
    const data = await response.json();
    return data.success ? data.lock : null;
  } catch (error) {
    console.error('getSectionLock error:', error);
    return null;
  }
}

export async function checkCanEditSection(
  incidentId: string,
  patientLetter: string,
  section: string,
  userDiscordId: string
): Promise<{ canEdit: boolean; userPermission?: PermissionLevel }> {
  try {
    const params = new URLSearchParams({ 
      incidentId, 
      patientLetter, 
      section, 
      userDiscordId,
      checkCanEdit: 'true' 
    });
    const response = await fetch(`/api/eprf/section-locks?${params}`);
    const data = await response.json();
    return data.success ? { canEdit: data.canEdit, userPermission: data.userPermission } : { canEdit: false };
  } catch (error) {
    console.error('checkCanEditSection error:', error);
    return { canEdit: false };
  }
}

export async function lockSectionAPI(
  incidentId: string,
  patientLetter: string,
  section: string,
  lockedToLevel: PermissionLevel,
  lockerDiscordId: string,
  lockerCallsign: string
): Promise<SectionLock | null> {
  try {
    const response = await fetch('/api/eprf/section-locks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId, patientLetter, section, lockedToLevel, lockerDiscordId, lockerCallsign })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.lock;
  } catch (error) {
    console.error('lockSectionAPI error:', error);
    throw error;
  }
}

export async function unlockSectionAPI(
  incidentId: string,
  patientLetter: string,
  section: string,
  unlockerDiscordId: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/eprf/section-locks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId, patientLetter, section, unlockerDiscordId })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('unlockSectionAPI error:', error);
    return false;
  }
}

// ==========================================
// SHARE LINKS API
// ==========================================

export interface ShareLinkInfo {
  incidentId: string;
  patientLetter?: string;
  permissionLevel: PermissionLevel;
  isExpired: boolean;
  isUsed: boolean;
  usedBy?: string;
}

export interface ShareLink {
  id: number;
  link_code: string;
  incident_id: string;
  patient_letter?: string;
  permission_level: PermissionLevel;
  created_by_discord_id: string;
  used_by_discord_id?: string;
  expires_at?: string;
  created_at: string;
}

export async function getShareLinkInfo(linkCode: string): Promise<ShareLinkInfo | null> {
  try {
    const params = new URLSearchParams({ linkCode });
    const response = await fetch(`/api/eprf/share-links?${params}`);
    const data = await response.json();
    return data.success ? data.link : null;
  } catch (error) {
    console.error('getShareLinkInfo error:', error);
    return null;
  }
}

export async function createShareLinkAPI(
  incidentId: string,
  permissionLevel: PermissionLevel,
  createdByDiscordId: string,
  options?: {
    patientLetter?: string;
    expiresInHours?: number;
  }
): Promise<{ link: ShareLink; shareUrl: string } | null> {
  try {
    const response = await fetch('/api/eprf/share-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId, permissionLevel, createdByDiscordId, ...options })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return { link: data.link, shareUrl: data.shareUrl };
  } catch (error) {
    console.error('createShareLinkAPI error:', error);
    throw error;
  }
}

export async function useShareLinkAPI(
  linkCode: string,
  userDiscordId: string,
  userCallsign: string
): Promise<{ success: boolean; message: string; incidentId?: string }> {
  try {
    const response = await fetch('/api/eprf/share-links', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkCode, userDiscordId, userCallsign })
    });
    return await response.json();
  } catch (error) {
    console.error('useShareLinkAPI error:', error);
    return { success: false, message: 'Failed to use share link' };
  }
}

// ==========================================
// TIME-LIMITED ACCESS HELPERS
// ==========================================

export async function addCollaboratorWithExpiry(
  incidentId: string,
  userDiscordId: string,
  userCallsign: string,
  permissionLevel: PermissionLevel,
  addedByDiscordId: string,
  expiresInHours: number
): Promise<Collaborator | null> {
  // For now, use regular addCollaborator - expiry is handled server-side
  // The API would need to be extended to support expiry
  return addCollaborator(incidentId, userDiscordId, userCallsign, permissionLevel, addedByDiscordId);
}

// ==========================================
// MODERATION API
// ==========================================

export interface UserAccess {
  canView: boolean;
  canEdit: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  blocked?: boolean;
  reason?: string;
}

export interface Broadcast {
  id: number;
  message: string;
  is_active: boolean;
  created_by_discord_id: string;
  created_by_callsign: string;
  created_at: string;
  expires_at?: string;
}

export interface Announcement {
  id: number;
  title?: string;
  message: string;
  is_active: boolean;
  created_by_discord_id: string;
  created_by_callsign: string;
  created_at: string;
  expires_at?: string;
}

export interface AccessListEntry {
  id: number;
  list_type: 'blacklist' | 'whitelist' | 'admin';
  user_discord_id: string;
  user_callsign: string;
  reason?: string;
  is_hard_ban: boolean;
  added_by_discord_id: string;
  added_by_callsign: string;
  created_at: string;
}

export interface UserKick {
  id: number;
  user_discord_id: string;
  user_callsign: string;
  kicked_by_discord_id: string;
  kicked_by_callsign: string;
  reason?: string;
  duration_minutes?: number;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface SystemSettings {
  blacklist_enabled: boolean;
  whitelist_enabled: boolean;
  maintenance_mode: boolean;
  serious_maintenance_mode: boolean;
}

export interface UserStats {
  user: User;
  eprfs: {
    total_eprfs: number;
    completed_eprfs: number;
    incomplete_eprfs: number;
  };
  collaborations: number;
  totalActions: number;
}

// Check user access (public endpoint)
export async function checkUserAccess(targetDiscordId: string): Promise<UserAccess> {
  try {
    const params = new URLSearchParams({ type: 'check-access', targetDiscordId });
    const response = await fetch(`/api/admin/moderation?${params}`);
    const data = await response.json();
    return data.success ? data.access : { canView: true, canEdit: true, isAdmin: false, isOwner: false };
  } catch (error) {
    console.error('checkUserAccess error:', error);
    return { canView: true, canEdit: true, isAdmin: false, isOwner: false };
  }
}

// Get active broadcast (public endpoint)
export async function getActiveBroadcast(): Promise<Broadcast | null> {
  try {
    const params = new URLSearchParams({ type: 'active-broadcast' });
    const response = await fetch(`/api/admin/moderation?${params}`);
    const data = await response.json();
    return data.success ? data.broadcast : null;
  } catch (error) {
    console.error('getActiveBroadcast error:', error);
    return null;
  }
}

// Get active announcements (public endpoint)
export async function getActiveAnnouncements(): Promise<Announcement[]> {
  try {
    const params = new URLSearchParams({ type: 'active-announcements' });
    const response = await fetch(`/api/admin/moderation?${params}`);
    const data = await response.json();
    return data.success ? data.announcements : [];
  } catch (error) {
    console.error('getActiveAnnouncements error:', error);
    return [];
  }
}

// Get system status (public endpoint)
export async function getSystemStatus(): Promise<SystemSettings> {
  try {
    const params = new URLSearchParams({ type: 'system-status' });
    const response = await fetch(`/api/admin/moderation?${params}`);
    const data = await response.json();
    return data.success ? data.settings : { blacklist_enabled: false, whitelist_enabled: false, maintenance_mode: false, serious_maintenance_mode: false };
  } catch (error) {
    console.error('getSystemStatus error:', error);
    return { blacklist_enabled: false, whitelist_enabled: false, maintenance_mode: false, serious_maintenance_mode: false };
  }
}

// Initialize moderation tables (owner only)
export async function initModerationTables(discordId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, action: 'init-tables' })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('initModerationTables error:', error);
    return false;
  }
}

// Admin: Get kicks list
export async function getKicks(discordId: string): Promise<UserKick[]> {
  try {
    const params = new URLSearchParams({ discordId, type: 'kicks' });
    const response = await fetch(`/api/admin/moderation?${params}`);
    const data = await response.json();
    return data.success ? data.kicks : [];
  } catch (error) {
    console.error('getKicks error:', error);
    return [];
  }
}

// Admin: Get broadcasts list
export async function getBroadcasts(discordId: string): Promise<Broadcast[]> {
  try {
    const params = new URLSearchParams({ discordId, type: 'broadcasts' });
    const response = await fetch(`/api/admin/moderation?${params}`);
    const data = await response.json();
    return data.success ? data.broadcasts : [];
  } catch (error) {
    console.error('getBroadcasts error:', error);
    return [];
  }
}

// Admin: Get announcements list
export async function getAnnouncementsList(discordId: string): Promise<Announcement[]> {
  try {
    const params = new URLSearchParams({ discordId, type: 'announcements' });
    const response = await fetch(`/api/admin/moderation?${params}`);
    const data = await response.json();
    return data.success ? data.announcements : [];
  } catch (error) {
    console.error('getAnnouncementsList error:', error);
    return [];
  }
}

// Admin: Get user activity
export async function getUserActivity(discordId: string, targetDiscordId: string, limit: number = 100): Promise<any[]> {
  try {
    const params = new URLSearchParams({ discordId, type: 'user-activity', targetDiscordId, limit: limit.toString() });
    const response = await fetch(`/api/admin/moderation?${params}`);
    const data = await response.json();
    return data.success ? data.activity : [];
  } catch (error) {
    console.error('getUserActivity error:', error);
    return [];
  }
}

// Admin: Get user stats
export async function getUserStats(discordId: string, targetDiscordId: string): Promise<UserStats | null> {
  try {
    const params = new URLSearchParams({ discordId, type: 'user-stats', targetDiscordId });
    const response = await fetch(`/api/admin/moderation?${params}`);
    const data = await response.json();
    return data.success ? data.stats : null;
  } catch (error) {
    console.error('getUserStats error:', error);
    return null;
  }
}

// Admin: Export audit logs
export async function exportAuditLogs(discordId: string, startDate?: string, endDate?: string, format: 'json' | 'csv' = 'json'): Promise<any> {
  try {
    const params = new URLSearchParams({ discordId, type: 'export-logs', format });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await fetch(`/api/admin/moderation?${params}`);
    
    if (format === 'csv') {
      return await response.text();
    }
    const data = await response.json();
    return data.success ? data.logs : [];
  } catch (error) {
    console.error('exportAuditLogs error:', error);
    return format === 'csv' ? '' : [];
  }
}

// Owner: Get access list (blacklist, whitelist, or admin)
export async function getAccessList(discordId: string, listType: 'blacklist' | 'whitelist' | 'admin-list'): Promise<AccessListEntry[]> {
  try {
    const params = new URLSearchParams({ discordId, type: listType });
    const response = await fetch(`/api/admin/moderation?${params}`);
    const data = await response.json();
    return data.success ? data.list : [];
  } catch (error) {
    console.error('getAccessList error:', error);
    return [];
  }
}

// Owner: Get all settings
export async function getModerationSettings(discordId: string): Promise<any[]> {
  try {
    const params = new URLSearchParams({ discordId, type: 'settings' });
    const response = await fetch(`/api/admin/moderation?${params}`);
    const data = await response.json();
    return data.success ? data.settings : [];
  } catch (error) {
    console.error('getModerationSettings error:', error);
    return [];
  }
}

// Admin: Kick user
export async function kickUser(
  discordId: string, 
  callsign: string, 
  targetDiscordId: string, 
  targetCallsign: string, 
  reason?: string, 
  durationMinutes?: number
): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, callsign, action: 'kick', targetDiscordId, targetCallsign, reason, durationMinutes })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('kickUser error:', error);
    return false;
  }
}

// Admin: Unkick user
export async function unkickUser(discordId: string, targetDiscordId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/moderation', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, action: 'unkick', targetDiscordId })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('unkickUser error:', error);
    return false;
  }
}

// Owner: Ban user (add to blacklist and enable it)
export async function banUser(
  discordId: string, 
  callsign: string, 
  targetDiscordId: string, 
  targetCallsign: string, 
  reason?: string, 
  isHardBan: boolean = false
): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, callsign, action: 'ban-user', targetDiscordId, targetCallsign, reason, isHardBan })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('banUser error:', error);
    return false;
  }
}

// Owner: Unban user (remove from blacklist)
export async function unbanUser(discordId: string, targetDiscordId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/moderation', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, action: 'unban-user', targetDiscordId })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('unbanUser error:', error);
    return false;
  }
}

// Owner: Toggle hard ban
export async function toggleHardBan(discordId: string, targetDiscordId: string, isHardBan: boolean): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/moderation', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, action: 'toggle-hard-ban', targetDiscordId, isHardBan })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('toggleHardBan error:', error);
    return false;
  }
}

// Owner: Add to access list
export async function addToAccessList(
  discordId: string, 
  callsign: string, 
  listType: 'blacklist' | 'whitelist' | 'admin',
  targetDiscordId: string, 
  targetCallsign: string, 
  reason?: string,
  isHardBan: boolean = false
): Promise<boolean> {
  try {
    const actionMap = {
      'blacklist': 'add-to-blacklist',
      'whitelist': 'add-to-whitelist',
      'admin': 'add-admin'
    };
    const response = await fetch('/api/admin/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, callsign, action: actionMap[listType], targetDiscordId, targetCallsign, reason, isHardBan })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('addToAccessList error:', error);
    return false;
  }
}

// Owner: Remove from access list
export async function removeFromAccessList(
  discordId: string, 
  listType: 'blacklist' | 'whitelist' | 'admin',
  targetDiscordId: string
): Promise<boolean> {
  try {
    const actionMap = {
      'blacklist': 'remove-from-blacklist',
      'whitelist': 'remove-from-whitelist',
      'admin': 'remove-admin'
    };
    const params = new URLSearchParams({ discordId, action: actionMap[listType], targetDiscordId });
    const response = await fetch(`/api/admin/moderation?${params}`, { method: 'DELETE' });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('removeFromAccessList error:', error);
    return false;
  }
}

// Owner: Update system setting
export async function updateModerationSetting(discordId: string, settingKey: string, settingValue: string): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, action: 'update-setting', settingKey, settingValue })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('updateModerationSetting error:', error);
    return false;
  }
}

// Admin: Create broadcast
export async function createBroadcast(discordId: string, callsign: string, message: string, expiresAt?: string): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, callsign, action: 'create-broadcast', message, expiresAt })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('createBroadcast error:', error);
    return false;
  }
}

// Admin: Toggle broadcast
export async function toggleBroadcast(discordId: string, id: number, isActive: boolean): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/moderation', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, action: 'toggle-broadcast', id, isActive })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('toggleBroadcast error:', error);
    return false;
  }
}

// Owner: Delete broadcast
export async function deleteBroadcast(discordId: string, id: number): Promise<boolean> {
  try {
    const params = new URLSearchParams({ discordId, action: 'delete-broadcast', id: id.toString() });
    const response = await fetch(`/api/admin/moderation?${params}`, { method: 'DELETE' });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('deleteBroadcast error:', error);
    return false;
  }
}

// Admin: Create announcement
export async function createAnnouncement(discordId: string, callsign: string, title: string, message: string, expiresAt?: string): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, callsign, action: 'create-announcement', title, message, expiresAt })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('createAnnouncement error:', error);
    return false;
  }
}

// Admin: Toggle announcement
export async function toggleAnnouncement(discordId: string, id: number, isActive: boolean): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/moderation', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, action: 'toggle-announcement', id, isActive })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('toggleAnnouncement error:', error);
    return false;
  }
}

// Owner: Delete announcement
export async function deleteAnnouncement(discordId: string, id: number): Promise<boolean> {
  try {
    const params = new URLSearchParams({ discordId, action: 'delete-announcement', id: id.toString() });
    const response = await fetch(`/api/admin/moderation?${params}`, { method: 'DELETE' });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('deleteAnnouncement error:', error);
    return false;
  }
}

// ==============================================
// REAL-TIME COLLABORATION API
// ==============================================

export interface RealtimeEvent {
  type: 'cursor' | 'chat' | 'notification' | 'presence' | 'typing';
  payload: any;
}

export interface CursorPosition {
  incidentId: string;
  patientLetter?: string;
  fieldName: string;
  cursorPosition?: { x: number; y: number };
  cursorColor?: string;
}

export interface ChatMessage {
  id?: number;
  incidentId: string;
  patientLetter?: string;
  chatType: 'incident' | 'patient';
  senderDiscordId: string;
  senderCallsign: string;
  message: string;
  mentions?: string[];
  createdAt?: string;
}

// Note: This is different from the Notification interface at line ~1110
// This is for the new notification center component
export interface NotificationCenterItem {
  id?: number;
  discordId: string;
  type: 'mention' | 'access_request' | 'collaborator_added' | 'record_updated' | 'broadcast' | 'kick' | 'announcement';
  title?: string;
  message: string;
  incidentId?: string;
  patientLetter?: string;
  fromCallsign?: string;
  link?: string;
  isRead?: boolean;
  createdAt?: string;
}

export interface VersionHistoryEntry {
  id: number;
  incidentId: string;
  patientLetter?: string;
  sectionName: string;
  changedByDiscordId: string;
  changedByCallsign: string;
  previousData: any;
  newData: any;
  diffData?: any;
  changeSummary?: string;
  createdAt: string;
}

// SSE connection for real-time updates
export function subscribeToRealtimeEvents(
  discordId: string,
  channels: ('cursors' | 'chat' | 'notifications' | 'presence')[],
  incidentId?: string,
  onMessage?: (event: RealtimeEvent) => void,
  onError?: (error: Event) => void
): EventSource | null {
  try {
    const params = new URLSearchParams({ discordId, channels: channels.join(',') });
    if (incidentId) params.set('incidentId', incidentId);
    
    const eventSource = new EventSource(`/api/realtime/stream?${params}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch (e) {
        console.error('Error parsing SSE message:', e);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      onError?.(error);
    };
    
    return eventSource;
  } catch (error) {
    console.error('subscribeToRealtimeEvents error:', error);
    return null;
  }
}

// Send cursor position update
export async function sendCursorUpdate(
  discordId: string,
  callsign: string,
  cursor: CursorPosition
): Promise<boolean> {
  try {
    const response = await fetch('/api/realtime/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId,
        callsign,
        action: 'cursor-move',
        incidentId: cursor.incidentId,
        patientLetter: cursor.patientLetter,
        fieldName: cursor.fieldName,
        cursorPosition: cursor.cursorPosition,
        cursorColor: cursor.cursorColor
      })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('sendCursorUpdate error:', error);
    return false;
  }
}

// Send chat message
export async function sendChatMessage(
  discordId: string,
  callsign: string,
  chat: ChatMessage
): Promise<{ success: boolean; messageId?: number }> {
  try {
    const response = await fetch('/api/realtime/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId,
        callsign,
        action: 'chat-message',
        incidentId: chat.incidentId,
        patientLetter: chat.patientLetter,
        chatType: chat.chatType,
        message: chat.message,
        mentions: chat.mentions
      })
    });
    const data = await response.json();
    return { success: data.success, messageId: data.messageId };
  } catch (error) {
    console.error('sendChatMessage error:', error);
    return { success: false };
  }
}

// Send typing indicator
export async function sendTypingIndicator(
  discordId: string,
  callsign: string,
  incidentId: string,
  patientLetter?: string,
  isTyping: boolean = true
): Promise<boolean> {
  try {
    const response = await fetch('/api/realtime/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId,
        callsign,
        action: 'typing',
        incidentId,
        patientLetter,
        isTyping
      })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('sendTypingIndicator error:', error);
    return false;
  }
}

// Send presence update
export async function sendPresenceUpdate(
  discordId: string,
  callsign: string,
  incidentId: string,
  patientLetter?: string,
  status: 'active' | 'idle' | 'left' = 'active'
): Promise<boolean> {
  try {
    const response = await fetch('/api/realtime/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId,
        callsign,
        action: 'presence-update',
        incidentId,
        patientLetter,
        status
      })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('sendPresenceUpdate error:', error);
    return false;
  }
}

// Get chat history for an incident
export async function getChatHistory(
  discordId: string,
  incidentId: string,
  chatType: 'incident' | 'patient' = 'incident',
  patientLetter?: string,
  limit: number = 50
): Promise<ChatMessage[]> {
  try {
    const params = new URLSearchParams({
      discordId,
      action: 'get-chat',
      incidentId,
      chatType,
      limit: limit.toString()
    });
    if (patientLetter) params.set('patientLetter', patientLetter);
    
    const response = await fetch(`/api/realtime/events?${params}`);
    const data = await response.json();
    return data.success ? data.messages : [];
  } catch (error) {
    console.error('getChatHistory error:', error);
    return [];
  }
}

// ==============================================
// EXTENDED NOTIFICATIONS API (using new /api/notifications endpoint)
// ==============================================

// Extended Notification interface for new notification center
export interface ExtendedNotification {
  id?: number;
  discordId: string;
  type: 'mention' | 'access_request' | 'collaborator_added' | 'record_updated' | 'broadcast' | 'kick' | 'announcement';
  title?: string;
  message: string;
  incidentId?: string;
  patientLetter?: string;
  fromCallsign?: string;
  link?: string;
  isRead?: boolean;
  createdAt?: string;
}

// Get user notifications from notification center
export async function getExtendedNotifications(
  discordId: string,
  unreadOnly: boolean = false,
  limit: number = 50
): Promise<ExtendedNotification[]> {
  try {
    const params = new URLSearchParams({
      discordId,
      action: unreadOnly ? 'get-unread' : 'get-all',
      limit: limit.toString()
    });
    
    const response = await fetch(`/api/notifications?${params}`);
    const data = await response.json();
    return data.success ? data.notifications : [];
  } catch (error) {
    console.error('getExtendedNotifications error:', error);
    return [];
  }
}

// Get unread notification count from notification center
export async function getExtendedUnreadCount(discordId: string): Promise<number> {
  try {
    const params = new URLSearchParams({ discordId, action: 'get-count' });
    const response = await fetch(`/api/notifications?${params}`);
    const data = await response.json();
    return data.success ? data.count : 0;
  } catch (error) {
    console.error('getExtendedUnreadCount error:', error);
    return 0;
  }
}

// Create a notification in notification center (for system/admin use)
export async function createExtendedNotification(notification: ExtendedNotification): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...notification, action: 'create' })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('createExtendedNotification error:', error);
    return false;
  }
}

// Mark notification as read in notification center
export async function markExtendedNotificationRead(discordId: string, notificationId: number): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, action: 'mark-read', id: notificationId })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('markExtendedNotificationRead error:', error);
    return false;
  }
}

// Mark all notifications as read in notification center
export async function markAllExtendedNotificationsRead(discordId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, action: 'mark-all-read' })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('markAllExtendedNotificationsRead error:', error);
    return false;
  }
}

// Delete a notification from notification center
export async function deleteExtendedNotification(discordId: string, notificationId: number): Promise<boolean> {
  try {
    const params = new URLSearchParams({ discordId, action: 'delete', id: notificationId.toString() });
    const response = await fetch(`/api/notifications?${params}`, { method: 'DELETE' });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('deleteExtendedNotification error:', error);
    return false;
  }
}

// Delete all notifications from notification center
export async function clearAllExtendedNotifications(discordId: string): Promise<boolean> {
  try {
    const params = new URLSearchParams({ discordId, action: 'delete-all' });
    const response = await fetch(`/api/notifications?${params}`, { method: 'DELETE' });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('clearAllExtendedNotifications error:', error);
    return false;
  }
}

// ==============================================
// VERSION HISTORY API
// ==============================================

// Get version history for a record/section
export async function getVersionHistory(
  discordId: string,
  incidentId: string,
  sectionName?: string,
  patientLetter?: string,
  limit: number = 50
): Promise<VersionHistoryEntry[]> {
  try {
    const params = new URLSearchParams({
      discordId,
      action: 'get-history',
      incidentId,
      limit: limit.toString()
    });
    if (sectionName) params.set('sectionName', sectionName);
    if (patientLetter) params.set('patientLetter', patientLetter);
    
    const response = await fetch(`/api/version-history?${params}`);
    const data = await response.json();
    return data.success ? data.history : [];
  } catch (error) {
    console.error('getVersionHistory error:', error);
    return [];
  }
}

// Get a specific version
export async function getVersion(discordId: string, versionId: number): Promise<VersionHistoryEntry | null> {
  try {
    const params = new URLSearchParams({
      discordId,
      action: 'get-version',
      versionId: versionId.toString()
    });
    
    const response = await fetch(`/api/version-history?${params}`);
    const data = await response.json();
    return data.success ? data.version : null;
  } catch (error) {
    console.error('getVersion error:', error);
    return null;
  }
}

// Create a version entry (called when saving data)
export async function createVersion(
  discordId: string,
  callsign: string,
  incidentId: string,
  sectionName: string,
  previousData: any,
  newData: any,
  patientLetter?: string,
  changeSummary?: string
): Promise<{ success: boolean; versionId?: number }> {
  try {
    const response = await fetch('/api/version-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId,
        callsign,
        action: 'create',
        incidentId,
        patientLetter,
        sectionName,
        previousData,
        newData,
        changeSummary
      })
    });
    const data = await response.json();
    return { success: data.success, versionId: data.versionId };
  } catch (error) {
    console.error('createVersion error:', error);
    return { success: false };
  }
}

// Restore a previous version
export async function restoreVersion(
  discordId: string,
  callsign: string,
  versionId: number
): Promise<{ success: boolean; restoredData?: any }> {
  try {
    const response = await fetch('/api/version-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId,
        callsign,
        action: 'restore',
        versionId
      })
    });
    const data = await response.json();
    return { success: data.success, restoredData: data.restoredData };
  } catch (error) {
    console.error('restoreVersion error:', error);
    return { success: false };
  }
}

// ==============================================
// RATE LIMITING API
// ==============================================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfter?: number;
}

// Check if action is rate limited
export async function checkRateLimit(
  discordId: string,
  actionType: 'general' | 'login' | 'sensitive' | 'admin' = 'general'
): Promise<RateLimitResult> {
  try {
    const params = new URLSearchParams({
      discordId,
      action: 'check',
      actionType
    });
    
    const response = await fetch(`/api/rate-limit?${params}`);
    const data = await response.json();
    return {
      allowed: data.allowed ?? false,
      remaining: data.remaining ?? 0,
      limit: data.limit ?? 100,
      retryAfter: data.retryAfter
    };
  } catch (error) {
    console.error('checkRateLimit error:', error);
    return { allowed: true, remaining: 100, limit: 100 }; // Fail open
  }
}

// Record a request for rate limiting
export async function recordRequest(
  discordId: string,
  actionType: 'general' | 'login' | 'sensitive' | 'admin' = 'general'
): Promise<boolean> {
  try {
    const response = await fetch('/api/rate-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, actionType })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('recordRequest error:', error);
    return false;
  }
}

// ==============================================
// ADVANCED SEARCH API
// ==============================================

export interface SearchResult {
  incidentId: string;
  patientLetter: string;
  matchType: string;
  matchedField: string;
  matchedValue: string;
  relevanceScore: number;
  status: string;
  authorCallsign: string;
  createdAt: string;
}

// Advanced search across all accessible records
export async function searchRecords(
  discordId: string,
  query: string,
  filters?: {
    status?: 'incomplete' | 'complete';
    dateFrom?: string;
    dateTo?: string;
    section?: string;
  },
  limit: number = 50
): Promise<SearchResult[]> {
  try {
    const params = new URLSearchParams({
      discordId,
      query,
      limit: limit.toString()
    });
    
    if (filters?.status) params.set('status', filters.status);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    if (filters?.section) params.set('section', filters.section);
    
    const response = await fetch(`/api/search?${params}`);
    const data = await response.json();
    return data.success ? data.results : [];
  } catch (error) {
    console.error('searchRecords error:', error);
    return [];
  }
}

// ==============================================
// USER PREFERENCES API
// ==============================================

export interface UserPreferences {
  dashboardLayout: any[];
  quickFilters: Record<string, boolean>;
  shortcutsEnabled: boolean;
  fabEnabled: boolean;
}

// Get user preferences
export async function getUserPreferences(discordId: string): Promise<UserPreferences | null> {
  try {
    const params = new URLSearchParams({ discordId, action: 'get-preferences' });
    const response = await fetch(`/api/user/preferences?${params}`);
    const data = await response.json();
    return data.success ? data.preferences : null;
  } catch (error) {
    console.error('getUserPreferences error:', error);
    return null;
  }
}

// Update user preferences
export async function updateUserPreferences(
  discordId: string,
  preferences: Partial<UserPreferences>
): Promise<boolean> {
  try {
    const response = await fetch('/api/user/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, ...preferences })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('updateUserPreferences error:', error);
    return false;
  }
}
