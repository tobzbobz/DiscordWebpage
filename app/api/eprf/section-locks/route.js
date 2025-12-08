import { 
  lockSection,
  unlockSection,
  getSectionLocks,
  getSectionLock,
  canEditSection,
  canLockToLevel,
  getPatientPermission,
  createNotification
} from '../../../../lib/db';

export const runtime = 'edge';

// GET - Get section locks for a patient
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get('incidentId');
    const patientLetter = searchParams.get('patientLetter');
    const section = searchParams.get('section');
    const userDiscordId = searchParams.get('userDiscordId');
    const checkCanEdit = searchParams.get('checkCanEdit') === 'true';
    
    if (!incidentId || !patientLetter) {
      return Response.json({ success: false, error: 'Missing incidentId or patientLetter' }, { status: 400 });
    }
    
    // Check if user can edit a specific section
    if (checkCanEdit && section && userDiscordId) {
      const userPermission = await getPatientPermission(incidentId, patientLetter, userDiscordId);
      if (!userPermission) {
        return Response.json({ success: true, canEdit: false, reason: 'no_access' });
      }
      const canEdit = await canEditSection(incidentId, patientLetter, section, userPermission);
      return Response.json({ success: true, canEdit, userPermission });
    }
    
    // Get single section lock
    if (section) {
      const lock = await getSectionLock(incidentId, patientLetter, section);
      return Response.json({ success: true, lock });
    }
    
    // Get all section locks
    const locks = await getSectionLocks(incidentId, patientLetter);
    return Response.json({ success: true, locks });
  } catch (error) {
    console.error('GET section locks error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Lock a section
export async function POST(request) {
  try {
    const body = await request.json();
    const { incidentId, patientLetter, section, lockedToLevel, lockerDiscordId, lockerCallsign } = body;
    
    if (!incidentId || !patientLetter || !section || !lockedToLevel || !lockerDiscordId) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    // Check if the user has permission to lock to this level
    const userPermission = await getPatientPermission(incidentId, patientLetter, lockerDiscordId);
    
    if (!userPermission) {
      return Response.json({ success: false, error: 'No access to this patient' }, { status: 403 });
    }
    
    // Permission rules for locking:
    // - manage can lock to edit
    // - owner can lock to manage or edit
    // - Only check canLockToLevel for non-owner permissions
    if (!canLockToLevel(userPermission, lockedToLevel)) {
      return Response.json({ 
        success: false, 
        error: `Your permission level (${userPermission}) cannot lock sections to ${lockedToLevel}` 
      }, { status: 403 });
    }
    
    const lock = await lockSection(
      incidentId,
      patientLetter,
      section,
      lockedToLevel,
      lockerDiscordId,
      lockerCallsign || ''
    );
    
    return Response.json({ success: true, lock });
  } catch (error) {
    console.error('POST section lock error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Unlock a section
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { incidentId, patientLetter, section, unlockerDiscordId } = body;
    
    if (!incidentId || !patientLetter || !section || !unlockerDiscordId) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    // Check if the user has permission to unlock
    const userPermission = await getPatientPermission(incidentId, patientLetter, unlockerDiscordId);
    const lock = await getSectionLock(incidentId, patientLetter, section);
    
    if (!lock) {
      return Response.json({ success: true, message: 'Section is not locked' });
    }
    
    // User must have higher permission than the lock level to unlock
    // OR be the person who locked it
    const permissionOrder = { 'owner': 4, 'manage': 3, 'edit': 2, 'view': 1 };
    const canUnlock = 
      lock.locked_by_discord_id === unlockerDiscordId ||
      permissionOrder[userPermission] > permissionOrder[lock.locked_to_level];
    
    if (!canUnlock) {
      return Response.json({ 
        success: false, 
        error: 'You do not have permission to unlock this section' 
      }, { status: 403 });
    }
    
    const success = await unlockSection(incidentId, patientLetter, section);
    return Response.json({ success });
  } catch (error) {
    console.error('DELETE section lock error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
