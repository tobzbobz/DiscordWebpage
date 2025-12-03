import { 
  getAllEPRFRecords, 
  getAllUsers,
  adminDeleteEPRFRecord,
  adminUpdateEPRFRecord,
  transferEPRF
} from '../../../../lib/db';

export const runtime = 'edge';

// Admin Discord ID - only this user can access admin functions
const ADMIN_DISCORD_ID = '695765253612953651';

// Verify admin access
function isAdmin(discordId) {
  return discordId === ADMIN_DISCORD_ID;
}

// GET - Fetch all ePRF records (admin only)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const discordId = searchParams.get('discordId');
    const query = searchParams.get('query');
    const status = searchParams.get('status');
    const authorId = searchParams.get('authorId');
    const type = searchParams.get('type');
    
    if (!isAdmin(discordId)) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }
    
    if (type === 'users') {
      const users = await getAllUsers();
      return Response.json({ success: true, users });
    }
    
    const records = await getAllEPRFRecords(query || undefined, status || undefined, authorId || undefined);
    return Response.json({ success: true, records });
  } catch (error) {
    console.error('Admin GET error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update ePRF record (admin only)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { discordId, incidentId, patientLetter, action, newAuthorDiscordId, newAuthorCallsign, status } = body;
    
    if (!isAdmin(discordId)) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }
    
    if (!incidentId || !patientLetter) {
      return Response.json({ success: false, error: 'Missing incidentId or patientLetter' }, { status: 400 });
    }
    
    let record;
    
    if (action === 'transfer') {
      record = await transferEPRF(incidentId, patientLetter, newAuthorDiscordId, newAuthorCallsign);
    } else if (action === 'updateStatus') {
      record = await adminUpdateEPRFRecord(incidentId, patientLetter, { status });
    } else {
      record = await adminUpdateEPRFRecord(incidentId, patientLetter, body.updates || {});
    }
    
    return Response.json({ success: true, record });
  } catch (error) {
    console.error('Admin PUT error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete any ePRF record (admin only)
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { discordId, incidentId, patientLetter } = body;
    
    if (!isAdmin(discordId)) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }
    
    if (!incidentId || !patientLetter) {
      return Response.json({ success: false, error: 'Missing incidentId or patientLetter' }, { status: 400 });
    }
    
    const deleted = await adminDeleteEPRFRecord(incidentId, patientLetter);
    return Response.json({ success: true, deleted });
  } catch (error) {
    console.error('Admin DELETE error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
