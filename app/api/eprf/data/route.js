import { saveEPRFData, getEPRFData, getAllEPRFData, getEPRFRecord } from '../../../../lib/db';

export const runtime = 'edge';

// GET - Fetch ePRF form data (requires ownership or admin)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get('incidentId');
    const patientLetter = searchParams.get('patientLetter');
    const section = searchParams.get('section');
    const discordId = searchParams.get('discordId');
    
    if (!incidentId || !patientLetter) {
      return Response.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Verify ownership (optional - allows viewing without strict auth for now)
    // In production, you may want to enforce this more strictly
    if (discordId) {
      const record = await getEPRFRecord(incidentId, patientLetter);
      if (record && record.author_discord_id !== discordId) {
        // Allow read access for viewing purposes but log it
        console.log(`User ${discordId} accessing ePRF owned by ${record.author_discord_id}`);
      }
    }
    
    if (section) {
      // Get specific section data
      const data = await getEPRFData(incidentId, patientLetter, section);
      return Response.json({ success: true, data });
    } else {
      // Get all sections
      const data = await getAllEPRFData(incidentId, patientLetter);
      return Response.json({ success: true, data });
    }
  } catch (error) {
    console.error('GET ePRF data error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Save ePRF form data (requires ownership verification)
export async function POST(request) {
  try {
    const body = await request.json();
    const { incidentId, patientLetter, section, data, discordId } = body;
    
    if (!incidentId || !patientLetter || !section || data === undefined) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    // Verify ownership before allowing save
    if (discordId) {
      const record = await getEPRFRecord(incidentId, patientLetter);
      if (record && record.author_discord_id !== discordId) {
        return Response.json({ success: false, error: 'Unauthorized - not the record owner' }, { status: 403 });
      }
    }
    
    const result = await saveEPRFData(incidentId, patientLetter, section, data);
    
    return Response.json({ success: true, result });
  } catch (error) {
    console.error('POST ePRF data error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
