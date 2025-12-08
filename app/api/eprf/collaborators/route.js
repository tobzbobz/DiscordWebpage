import { 
  addCollaborator, 
  removeCollaborator, 
  getCollaborators, 
  getCollaboratorPermission,
  updateCollaboratorPermission,
  getSharedEPRFs,
  transferOwnership,
  getEPRFRecord,
  syncHighLevelPermissions,
  createNotification
} from '../../../../lib/db';

export const runtime = 'edge';

// GET - Get collaborators for an ePRF or shared ePRFs for a user
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get('incidentId');
    const userDiscordId = searchParams.get('userDiscordId');
    const checkPermission = searchParams.get('checkPermission');
    const getShared = searchParams.get('getShared');
    
    // Get shared ePRFs for a user
    if (getShared && userDiscordId) {
      const sharedRecords = await getSharedEPRFs(userDiscordId);
      return Response.json({ success: true, records: sharedRecords });
    }
    
    // Check user's permission level for an ePRF
    if (checkPermission && incidentId && userDiscordId) {
      const permission = await getCollaboratorPermission(incidentId, userDiscordId);
      return Response.json({ success: true, permission });
    }
    
    // Get all collaborators for an ePRF
    if (incidentId) {
      const collaborators = await getCollaborators(incidentId);
      
      // Also get the owner info
      const record = await getEPRFRecord(incidentId, 'A');
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
    console.error('GET collaborators error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Add a collaborator
export async function POST(request) {
  try {
    const body = await request.json();
    const { incidentId, userDiscordId, userCallsign, permissionLevel, addedByDiscordId } = body;
    
    if (!incidentId || !userDiscordId || !permissionLevel || !addedByDiscordId) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    // Verify the requester has permission to add collaborators
    const requesterPermission = await getCollaboratorPermission(incidentId, addedByDiscordId);
    
    if (!requesterPermission || (requesterPermission !== 'owner' && requesterPermission !== 'manage')) {
      return Response.json({ success: false, error: 'You do not have permission to add collaborators' }, { status: 403 });
    }
    
    // Manage users can only add edit or view collaborators
    if (requesterPermission === 'manage' && (permissionLevel === 'owner' || permissionLevel === 'manage')) {
      return Response.json({ success: false, error: 'You can only add edit or view collaborators' }, { status: 403 });
    }
    
    const collaborator = await addCollaborator(
      incidentId, 
      userDiscordId, 
      userCallsign || '', 
      permissionLevel, 
      addedByDiscordId
    );
    
    // Create notification for the added user
    const permissionLabels = { owner: 'Owner', manage: 'Manager', edit: 'Editor', view: 'Viewer' };
    await createNotification(
      userDiscordId,
      'collaborator_added',
      'Added as Collaborator',
      `You have been added as ${permissionLabels[permissionLevel] || permissionLevel} to incident ${incidentId}`,
      { incidentId, fromUserDiscordId: addedByDiscordId }
    );
    
    // Sync high-level permissions across all patients
    if (permissionLevel === 'owner' || permissionLevel === 'manage') {
      await syncHighLevelPermissions(incidentId, userDiscordId, userCallsign || '', permissionLevel, addedByDiscordId);
    }
    
    return Response.json({ success: true, collaborator });
  } catch (error) {
    console.error('POST collaborator error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update collaborator permission or transfer ownership
export async function PUT(request) {
  try {
    const body = await request.json();
    const { action, incidentId, userDiscordId, requesterDiscordId } = body;
    
    if (action === 'transfer') {
      const { currentOwnerDiscordId, currentOwnerCallsign, newOwnerDiscordId, newOwnerCallsign } = body;
      
      // Verify requester is the owner
      const requesterPermission = await getCollaboratorPermission(incidentId, requesterDiscordId);
      if (requesterPermission !== 'owner') {
        return Response.json({ success: false, error: 'Only the owner can transfer ownership' }, { status: 403 });
      }
      
      const success = await transferOwnership(
        incidentId,
        currentOwnerDiscordId,
        currentOwnerCallsign,
        newOwnerDiscordId,
        newOwnerCallsign
      );
      
      // Notify new owner
      if (success) {
        await createNotification(
          newOwnerDiscordId,
          'ownership_transferred',
          'ePRF Ownership Transferred',
          `You are now the owner of incident ${incidentId}`,
          { incidentId, fromUserDiscordId: currentOwnerDiscordId }
        );
        
        // Notify previous owner
        await createNotification(
          currentOwnerDiscordId,
          'ownership_transferred',
          'ePRF Ownership Transferred',
          `You have transferred ownership of incident ${incidentId} to ${newOwnerCallsign}`,
          { incidentId }
        );
      }
      
      return Response.json({ success });
    }
    
    if (action === 'updatePermission') {
      const { newPermissionLevel, userCallsign } = body;
      
      // Verify requester has permission
      const requesterPermission = await getCollaboratorPermission(incidentId, requesterDiscordId);
      
      if (!requesterPermission || (requesterPermission !== 'owner' && requesterPermission !== 'manage')) {
        return Response.json({ success: false, error: 'You do not have permission to update collaborators' }, { status: 403 });
      }
      
      // Get current permission of target user
      const targetPermission = await getCollaboratorPermission(incidentId, userDiscordId);
      
      // Manage users can't change owner or other manage users
      if (requesterPermission === 'manage') {
        if (targetPermission === 'owner' || targetPermission === 'manage') {
          return Response.json({ success: false, error: 'You cannot modify this user\'s permissions' }, { status: 403 });
        }
        if (newPermissionLevel === 'owner' || newPermissionLevel === 'manage') {
          return Response.json({ success: false, error: 'You can only set edit or view permissions' }, { status: 403 });
        }
      }
      
      const collaborator = await updateCollaboratorPermission(incidentId, userDiscordId, newPermissionLevel);
      
      // Notify user of permission change
      const permissionLabels = { owner: 'Owner', manage: 'Manager', edit: 'Editor', view: 'Viewer' };
      await createNotification(
        userDiscordId,
        'permission_changed',
        'Permission Level Changed',
        `Your permission for incident ${incidentId} has been changed to ${permissionLabels[newPermissionLevel] || newPermissionLevel}`,
        { incidentId, fromUserDiscordId: requesterDiscordId }
      );
      
      // Sync high-level permissions across all patients if upgrading to manage+
      if (newPermissionLevel === 'owner' || newPermissionLevel === 'manage') {
        await syncHighLevelPermissions(incidentId, userDiscordId, userCallsign || '', newPermissionLevel, requesterDiscordId);
      }
      
      return Response.json({ success: true, collaborator });
    }
    
    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('PUT collaborator error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Remove a collaborator
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { incidentId, userDiscordId, requesterDiscordId } = body;
    
    if (!incidentId || !userDiscordId || !requesterDiscordId) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    // Verify requester has permission
    const requesterPermission = await getCollaboratorPermission(incidentId, requesterDiscordId);
    const targetPermission = await getCollaboratorPermission(incidentId, userDiscordId);
    
    // Can't remove the owner
    if (targetPermission === 'owner') {
      return Response.json({ success: false, error: 'Cannot remove the owner' }, { status: 403 });
    }
    
    // Only owner can remove anyone, manage can only remove edit/view
    if (requesterPermission === 'manage') {
      if (targetPermission === 'manage') {
        return Response.json({ success: false, error: 'You cannot remove users with manage permission' }, { status: 403 });
      }
    } else if (requesterPermission !== 'owner') {
      return Response.json({ success: false, error: 'You do not have permission to remove collaborators' }, { status: 403 });
    }
    
    const success = await removeCollaborator(incidentId, userDiscordId);
    return Response.json({ success });
  } catch (error) {
    console.error('DELETE collaborator error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
