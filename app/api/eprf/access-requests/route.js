import { 
  createAccessRequest,
  getPendingAccessRequests,
  reviewAccessRequest,
  addCollaborator,
  addPatientCollaborator,
  getCollaboratorPermission,
  createNotification
} from '../../../../lib/db';
import { ADMIN_DISCORD_ID } from '../../../utils/apiClient';

export const runtime = 'edge';

const ADMIN_ID = '695765253612953651';

// GET - Get pending access requests (admin only)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get('incidentId');
    const requesterDiscordId = searchParams.get('requesterDiscordId');
    
    if (!incidentId || !requesterDiscordId) {
      return Response.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Only admins can view all requests
    if (requesterDiscordId !== ADMIN_ID) {
      return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }
    
    const requests = await getPendingAccessRequests(incidentId);
    return Response.json({ success: true, requests });
  } catch (error) {
    console.error('GET access requests error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create an access request
export async function POST(request) {
  try {
    const body = await request.json();
    const { incidentId, requesterDiscordId, requesterCallsign, requestedPermission, patientLetter, message } = body;
    
    if (!incidentId || !requesterDiscordId) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    const accessRequest = await createAccessRequest(
      incidentId,
      requesterDiscordId,
      requesterCallsign || '',
      requestedPermission || 'view',
      { patientLetter, message }
    );
    
    // TODO: Notify owner about the request
    
    return Response.json({ success: true, accessRequest });
  } catch (error) {
    console.error('POST access request error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Review an access request (admin only)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { requestId, reviewerDiscordId, approved, incidentId, patientLetter, userDiscordId, userCallsign, permissionLevel } = body;
    
    if (!requestId || !reviewerDiscordId) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    // Only admins can review requests
    if (reviewerDiscordId !== ADMIN_ID) {
      return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }
    
    const accessRequest = await reviewAccessRequest(requestId, reviewerDiscordId, approved);
    
    if (!accessRequest) {
      return Response.json({ success: false, error: 'Access request not found' }, { status: 404 });
    }
    
    // If approved, add the user as a collaborator
    if (approved) {
      if (patientLetter) {
        await addPatientCollaborator(
          incidentId,
          patientLetter,
          userDiscordId,
          userCallsign,
          permissionLevel || 'view',
          reviewerDiscordId
        );
      } else {
        await addCollaborator(
          incidentId,
          userDiscordId,
          userCallsign,
          permissionLevel || 'view',
          reviewerDiscordId
        );
      }
      
      // Notify the requester
      await createNotification(
        accessRequest.requester_discord_id,
        'access_approved',
        'Access Request Approved',
        `Your request to access incident ${incidentId} has been approved.`,
        { incidentId, fromUserDiscordId: reviewerDiscordId }
      );
    } else {
      // Notify the requester about rejection
      await createNotification(
        accessRequest.requester_discord_id,
        'access_rejected',
        'Access Request Rejected',
        `Your request to access incident ${incidentId} has been rejected.`,
        { incidentId, fromUserDiscordId: reviewerDiscordId }
      );
    }
    
    return Response.json({ success: true, accessRequest });
  } catch (error) {
    console.error('PUT access request error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
