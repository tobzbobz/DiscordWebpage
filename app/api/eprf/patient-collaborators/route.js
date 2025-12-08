import { 
  addPatientCollaborator, 
  removePatientCollaborator, 
  getPatientCollaborators, 
  getPatientPermission,
  updatePatientCollaboratorPermission,
  canTransferPatient,
  transferPatientOwnership,
  getEPRFRecord,
  getCollaboratorPermission,
  addManagersToPatient
} from '../../../../lib/db';

export const runtime = 'edge';

// GET - Get patient collaborators or check permissions
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get('incidentId');
    const patientLetter = searchParams.get('patientLetter');
    const userDiscordId = searchParams.get('userDiscordId');
    const checkPermission = searchParams.get('checkPermission');
    const checkCanTransfer = searchParams.get('checkCanTransfer');
    
    if (!incidentId) {
      return Response.json({ success: false, error: 'Missing incidentId' }, { status: 400 });
    }
    
    // Check if user can transfer this patient
    if (checkCanTransfer && patientLetter && userDiscordId) {
      const canTransfer = await canTransferPatient(incidentId, patientLetter, userDiscordId);
      return Response.json({ success: true, canTransfer });
    }
    
    // Check user's permission level for a patient
    if (checkPermission && patientLetter && userDiscordId) {
      const permission = await getPatientPermission(incidentId, patientLetter, userDiscordId);
      return Response.json({ success: true, permission });
    }
    
    // Get all collaborators for a patient
    if (patientLetter) {
      const collaborators = await getPatientCollaborators(incidentId, patientLetter);
      
      // Also get the patient owner info
      const record = await getEPRFRecord(incidentId, patientLetter);
      const owner = record ? {
        user_discord_id: record.author_discord_id,
        user_callsign: record.author_callsign,
        permission_level: 'owner',
        is_owner: true
      } : null;
      
      return Response.json({ success: true, collaborators, owner });
    }
    
    return Response.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
  } catch (error) {
    console.error('GET patient collaborators error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Add a patient collaborator
export async function POST(request) {
  try {
    const body = await request.json();
    const { incidentId, patientLetter, userDiscordId, userCallsign, permissionLevel, addedByDiscordId } = body;
    
    if (!incidentId || !patientLetter || !userDiscordId || !permissionLevel || !addedByDiscordId) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    // Verify the requester has permission to add collaborators for this patient
    const requesterPatientPermission = await getPatientPermission(incidentId, patientLetter, addedByDiscordId);
    const requesterIncidentPermission = await getCollaboratorPermission(incidentId, addedByDiscordId);
    
    const isIncidentOwnerOrManager = requesterIncidentPermission === 'owner' || requesterIncidentPermission === 'manage';
    const isPatientOwnerOrManager = requesterPatientPermission === 'owner' || requesterPatientPermission === 'manage';
    
    if (!isIncidentOwnerOrManager && !isPatientOwnerOrManager) {
      return Response.json({ success: false, error: 'You do not have permission to add collaborators to this patient' }, { status: 403 });
    }
    
    // Non-incident-level managers can only add edit or view collaborators
    if (!isIncidentOwnerOrManager && (permissionLevel === 'owner' || permissionLevel === 'manage')) {
      return Response.json({ success: false, error: 'You can only add edit or view collaborators' }, { status: 403 });
    }
    
    const collaborator = await addPatientCollaborator(
      incidentId, 
      patientLetter,
      userDiscordId, 
      userCallsign || '', 
      permissionLevel, 
      addedByDiscordId
    );
    
    return Response.json({ success: true, collaborator });
  } catch (error) {
    console.error('POST patient collaborator error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update patient collaborator permission or transfer patient ownership
export async function PUT(request) {
  try {
    const body = await request.json();
    const { action, incidentId, patientLetter, userDiscordId, requesterDiscordId } = body;
    
    if (!incidentId || !patientLetter) {
      return Response.json({ success: false, error: 'Missing incidentId or patientLetter' }, { status: 400 });
    }
    
    if (action === 'transferPatient') {
      const { currentOwnerDiscordId, currentOwnerCallsign, newOwnerDiscordId, newOwnerCallsign } = body;
      
      // Verify requester can transfer this patient
      const canTransfer = await canTransferPatient(incidentId, patientLetter, requesterDiscordId);
      if (!canTransfer) {
        return Response.json({ 
          success: false, 
          error: 'Only the incident owner or patient owner can transfer this patient' 
        }, { status: 403 });
      }
      
      const success = await transferPatientOwnership(
        incidentId,
        patientLetter,
        currentOwnerDiscordId,
        currentOwnerCallsign,
        newOwnerDiscordId,
        newOwnerCallsign
      );
      
      return Response.json({ success });
    }
    
    if (action === 'updatePermission') {
      const { newPermissionLevel } = body;
      
      // Verify requester has permission for this patient
      const requesterPermission = await getPatientPermission(incidentId, patientLetter, requesterDiscordId);
      
      if (!requesterPermission || (requesterPermission !== 'owner' && requesterPermission !== 'manage')) {
        return Response.json({ success: false, error: 'You do not have permission to update patient collaborators' }, { status: 403 });
      }
      
      // Get current permission of target user
      const targetPermission = await getPatientPermission(incidentId, patientLetter, userDiscordId);
      
      // Manage users can't change owner or other manage users
      if (requesterPermission === 'manage') {
        if (targetPermission === 'owner' || targetPermission === 'manage') {
          return Response.json({ success: false, error: 'You cannot modify this user\'s permissions' }, { status: 403 });
        }
        if (newPermissionLevel === 'owner' || newPermissionLevel === 'manage') {
          return Response.json({ success: false, error: 'You can only set edit or view permissions' }, { status: 403 });
        }
      }
      
      const collaborator = await updatePatientCollaboratorPermission(
        incidentId, 
        patientLetter, 
        userDiscordId, 
        newPermissionLevel
      );
      return Response.json({ success: true, collaborator });
    }
    
    if (action === 'addManagersToPatient') {
      // Used when creating a new patient to auto-add incident managers
      const requesterPermission = await getCollaboratorPermission(incidentId, requesterDiscordId);
      
      if (!requesterPermission || (requesterPermission !== 'owner' && requesterPermission !== 'manage')) {
        return Response.json({ success: false, error: 'You do not have permission to do this' }, { status: 403 });
      }
      
      await addManagersToPatient(incidentId, patientLetter, requesterDiscordId);
      return Response.json({ success: true });
    }
    
    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('PUT patient collaborator error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Remove a patient collaborator
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get('incidentId');
    const patientLetter = searchParams.get('patientLetter');
    const userDiscordId = searchParams.get('userDiscordId');
    const requesterDiscordId = searchParams.get('requesterDiscordId');
    
    if (!incidentId || !patientLetter || !userDiscordId || !requesterDiscordId) {
      return Response.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Verify requester has permission
    const requesterPermission = await getPatientPermission(incidentId, patientLetter, requesterDiscordId);
    
    if (!requesterPermission || (requesterPermission !== 'owner' && requesterPermission !== 'manage')) {
      return Response.json({ success: false, error: 'You do not have permission to remove patient collaborators' }, { status: 403 });
    }
    
    // Check target user permission - manage can't remove owner or other manage
    const targetPermission = await getPatientPermission(incidentId, patientLetter, userDiscordId);
    
    if (requesterPermission === 'manage' && (targetPermission === 'owner' || targetPermission === 'manage')) {
      return Response.json({ success: false, error: 'You cannot remove this user' }, { status: 403 });
    }
    
    // Owners can't be removed (they would need to transfer first)
    if (targetPermission === 'owner') {
      return Response.json({ success: false, error: 'Cannot remove the patient owner. Transfer ownership first.' }, { status: 403 });
    }
    
    const success = await removePatientCollaborator(incidentId, patientLetter, userDiscordId);
    return Response.json({ success });
  } catch (error) {
    console.error('DELETE patient collaborator error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
