import { initializeDatabase } from '../../../../lib/db';

export const runtime = 'edge';

// Admin Discord ID for authorization
const ADMIN_DISCORD_ID = '695765253612953651';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');
    
    // Only allow admin to initialize database
    if (adminId !== ADMIN_DISCORD_ID) {
      return Response.json({ success: false, error: 'Unauthorized - Admin access required' }, { status: 403 });
    }
    
    await initializeDatabase();
    return Response.json({ success: true, message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Database initialization error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
