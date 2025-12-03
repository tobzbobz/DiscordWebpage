import { 
  createEPRFRecord, 
  getEPRFRecord, 
  getEPRFRecordsByUser,
  markEPRFComplete,
  deleteEPRFRecord,
  transferEPRF,
  searchEPRFs
} from '../../../../lib/db';

export const runtime = 'edge';

// GET - Fetch ePRF records
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const discordId = searchParams.get('discordId');
    const incidentId = searchParams.get('incidentId');
    const patientLetter = searchParams.get('patientLetter');
    const query = searchParams.get('query');
    const status = searchParams.get('status');
    
    if (incidentId && patientLetter) {
      // Get specific record - require discordId for authorization
      const record = await getEPRFRecord(incidentId, patientLetter);
      // Note: We allow fetching for viewing but modification requires ownership
      return Response.json({ success: true, record });
    } else if (discordId) {
      // Search/list records for user
      const records = await searchEPRFs(discordId, query, status);
      return Response.json({ success: true, records });
    } else {
      return Response.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }
  } catch (error) {
    console.error('GET ePRF error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create new ePRF record
export async function POST(request) {
  try {
    const body = await request.json();
    const { incidentId, patientLetter, authorDiscordId, authorCallsign, fleetId } = body;
    
    if (!incidentId || !patientLetter || !authorDiscordId) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    const record = await createEPRFRecord(
      incidentId, 
      patientLetter, 
      authorDiscordId, 
      authorCallsign || 'Unknown',
      fleetId || ''
    );
    
    return Response.json({ success: true, record });
  } catch (error) {
    console.error('POST ePRF error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update ePRF record (complete, transfer)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { action, incidentId, patientLetter, discordId, newAuthorDiscordId, newAuthorCallsign } = body;
    
    if (!incidentId || !patientLetter || !action) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    // Verify ownership before allowing modifications
    if (discordId) {
      const existingRecord = await getEPRFRecord(incidentId, patientLetter);
      if (existingRecord && existingRecord.author_discord_id !== discordId) {
        return Response.json({ success: false, error: 'Unauthorized - not the record owner' }, { status: 403 });
      }
    }
    
    let record;
    
    if (action === 'complete') {
      record = await markEPRFComplete(incidentId, patientLetter);
    } else if (action === 'transfer') {
      if (!newAuthorDiscordId || !newAuthorCallsign) {
        return Response.json({ success: false, error: 'Missing transfer target' }, { status: 400 });
      }
      record = await transferEPRF(incidentId, patientLetter, newAuthorDiscordId, newAuthorCallsign);
    } else {
      return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
    
    return Response.json({ success: true, record });
  } catch (error) {
    console.error('PUT ePRF error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete ePRF record (requires ownership verification)
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { incidentId, patientLetter, discordId } = body;
    
    if (!incidentId || !patientLetter) {
      return Response.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Verify ownership before deletion
    if (discordId) {
      const existingRecord = await getEPRFRecord(incidentId, patientLetter);
      if (existingRecord && existingRecord.author_discord_id !== discordId) {
        return Response.json({ success: false, error: 'Unauthorized - not the record owner' }, { status: 403 });
      }
    }
    
    const deleted = await deleteEPRFRecord(incidentId, patientLetter);
    
    if (deleted) {
      return Response.json({ success: true, message: 'Record deleted' });
    } else {
      return Response.json({ success: false, error: 'Record not found or already completed' }, { status: 404 });
    }
  } catch (error) {
    console.error('DELETE ePRF error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
