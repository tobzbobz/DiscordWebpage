import { 
  createShareLink,
  getShareLink,
  useShareLink,
  getCollaboratorPermission
} from '../../../../lib/db';

export const runtime = 'edge';

// GET - Get share link info (for previewing before using)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const linkCode = searchParams.get('linkCode');
    
    if (!linkCode) {
      return Response.json({ success: false, error: 'Missing linkCode' }, { status: 400 });
    }
    
    const link = await getShareLink(linkCode);
    
    if (!link) {
      return Response.json({ success: false, error: 'Share link not found' }, { status: 404 });
    }
    
    // Check if expired
    const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
    
    // Check if already used by someone else
    const isUsed = !!link.used_by_discord_id;
    
    return Response.json({ 
      success: true, 
      link: {
        incidentId: link.incident_id,
        patientLetter: link.patient_letter,
        permissionLevel: link.permission_level,
        isExpired,
        isUsed,
        usedBy: link.used_by_discord_id
      }
    });
  } catch (error) {
    console.error('GET share link error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create a new share link
export async function POST(request) {
  try {
    const body = await request.json();
    const { incidentId, permissionLevel, createdByDiscordId, patientLetter, expiresInHours } = body;
    
    if (!incidentId || !permissionLevel || !createdByDiscordId) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    // Verify the creator has permission to share
    const creatorPermission = await getCollaboratorPermission(incidentId, createdByDiscordId);
    
    if (!creatorPermission || (creatorPermission !== 'owner' && creatorPermission !== 'manage')) {
      return Response.json({ success: false, error: 'You do not have permission to create share links' }, { status: 403 });
    }
    
    // Managers can only create view or edit links
    if (creatorPermission === 'manage' && (permissionLevel === 'owner' || permissionLevel === 'manage')) {
      return Response.json({ success: false, error: 'You can only create view or edit share links' }, { status: 403 });
    }
    
    const link = await createShareLink(
      incidentId,
      permissionLevel,
      createdByDiscordId,
      { patientLetter, expiresInHours }
    );
    
    // Return the full URL
    const shareUrl = `/share/${link.link_code}`;
    
    return Response.json({ success: true, link, shareUrl });
  } catch (error) {
    console.error('POST share link error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Use a share link
export async function PUT(request) {
  try {
    const body = await request.json();
    const { linkCode, userDiscordId, userCallsign } = body;
    
    if (!linkCode || !userDiscordId) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    const result = await useShareLink(linkCode, userDiscordId, userCallsign || '');
    
    return Response.json(result);
  } catch (error) {
    console.error('PUT share link error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
