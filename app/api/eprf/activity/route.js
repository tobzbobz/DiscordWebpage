import { 
  logActivity,
  getActivityLog
} from '../../../../lib/db';

export const runtime = 'edge';

// GET - Get activity log for a patient
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get('incidentId');
    const patientLetter = searchParams.get('patientLetter');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!incidentId || !patientLetter) {
      return Response.json({ success: false, error: 'Missing incidentId or patientLetter' }, { status: 400 });
    }
    
    const activities = await getActivityLog(incidentId, patientLetter, limit);
    return Response.json({ success: true, activities });
  } catch (error) {
    console.error('GET activity log error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Log an activity
export async function POST(request) {
  try {
    const body = await request.json();
    const { incidentId, patientLetter, userDiscordId, userCallsign, actionType, section, fieldName, oldValue, newValue, description } = body;
    
    if (!incidentId || !patientLetter || !userDiscordId || !actionType) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    const activity = await logActivity(
      incidentId,
      patientLetter,
      userDiscordId,
      userCallsign || '',
      actionType,
      { section, fieldName, oldValue, newValue, description }
    );
    
    return Response.json({ success: true, activity });
  } catch (error) {
    console.error('POST activity log error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
