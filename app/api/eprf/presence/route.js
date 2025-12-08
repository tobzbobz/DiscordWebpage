import { 
  updatePresence,
  getActivePresence,
  removePresence,
  cleanupStalePresence
} from '../../../../lib/db';

export const runtime = 'edge';

// GET - Get active users viewing an ePRF
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get('incidentId');
    const patientLetter = searchParams.get('patientLetter');
    
    if (!incidentId || !patientLetter) {
      return Response.json({ success: false, error: 'Missing incidentId or patientLetter' }, { status: 400 });
    }
    
    const presences = await getActivePresence(incidentId, patientLetter);
    return Response.json({ success: true, presences });
  } catch (error) {
    console.error('GET presence error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Update presence (heartbeat)
export async function POST(request) {
  try {
    const body = await request.json();
    const { incidentId, patientLetter, userDiscordId, userCallsign, pageName } = body;
    
    if (!incidentId || !patientLetter || !userDiscordId) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    const presence = await updatePresence(
      incidentId,
      patientLetter,
      userDiscordId,
      userCallsign || '',
      pageName || 'unknown'
    );
    
    // Also get all active presences to return
    const presences = await getActivePresence(incidentId, patientLetter);
    
    return Response.json({ success: true, presence, presences });
  } catch (error) {
    console.error('POST presence error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Remove presence (user leaving)
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { incidentId, patientLetter, userDiscordId } = body;
    
    if (!incidentId || !patientLetter || !userDiscordId) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    const success = await removePresence(incidentId, patientLetter, userDiscordId);
    
    // Also cleanup stale presences
    await cleanupStalePresence();
    
    return Response.json({ success });
  } catch (error) {
    console.error('DELETE presence error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
