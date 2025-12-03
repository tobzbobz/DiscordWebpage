import { saveEPRFData, getEPRFData, getAllEPRFData } from '../../../../lib/db';

export const runtime = 'edge';

// GET - Fetch ePRF form data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get('incidentId');
    const patientLetter = searchParams.get('patientLetter');
    const section = searchParams.get('section');
    
    if (!incidentId || !patientLetter) {
      return Response.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
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

// POST - Save ePRF form data
export async function POST(request) {
  try {
    const body = await request.json();
    const { incidentId, patientLetter, section, data } = body;
    
    if (!incidentId || !patientLetter || !section || data === undefined) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    const result = await saveEPRFData(incidentId, patientLetter, section, data);
    
    return Response.json({ success: true, result });
  } catch (error) {
    console.error('POST ePRF data error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
