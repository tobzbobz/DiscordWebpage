import { upsertUser, getActiveUsers, getUser } from '../../../lib/db';

export const runtime = 'edge';

// GET - Fetch users
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const discordId = searchParams.get('discordId');
    const activeOnly = searchParams.get('active');
    
    if (discordId) {
      const user = await getUser(discordId);
      return Response.json({ success: true, user });
    } else if (activeOnly === 'true') {
      const users = await getActiveUsers();
      return Response.json({ success: true, users });
    } else {
      return Response.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }
  } catch (error) {
    console.error('GET users error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create/update user (login)
export async function POST(request) {
  try {
    const body = await request.json();
    const { discordId, discordUsername, callsign, vehicle } = body;
    
    if (!discordId) {
      return Response.json({ success: false, error: 'Missing discordId' }, { status: 400 });
    }
    
    const user = await upsertUser(
      discordId,
      discordUsername || '',
      callsign || '',
      vehicle || ''
    );
    
    return Response.json({ success: true, user });
  } catch (error) {
    console.error('POST user error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
