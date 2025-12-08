import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

let _sql = null;
function getDb() {
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// GET - Fetch user's notifications
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const discordId = searchParams.get('discordId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const sql = getDb();

    if (!discordId) {
      return Response.json({ success: false, error: 'Missing discordId' }, { status: 400 });
    }

    let notifications;
    if (unreadOnly) {
      notifications = await sql`
        SELECT * FROM user_notifications 
        WHERE discord_id = ${discordId} 
        AND is_read = false
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else {
      notifications = await sql`
        SELECT * FROM user_notifications 
        WHERE discord_id = ${discordId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    }

    // Get unread count
    const unreadCount = await sql`
      SELECT COUNT(*) as count FROM user_notifications 
      WHERE discord_id = ${discordId} AND is_read = false
    `;

    return Response.json({ 
      success: true, 
      notifications,
      unreadCount: parseInt(unreadCount[0]?.count || 0)
    });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return Response.json({ success: true, notifications: [], unreadCount: 0 });
  }
}

// POST - Create a notification
export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      targetDiscordId, type, title, message, 
      incidentId, patientLetter, fromCallsign, link 
    } = body;
    const sql = getDb();

    if (!targetDiscordId || !type || !message) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    await sql`
      INSERT INTO user_notifications (
        discord_id, type, title, message, 
        incident_id, patient_letter, from_callsign, link, created_at
      ) VALUES (
        ${targetDiscordId}, ${type}, ${title || 'Notification'}, ${message},
        ${incidentId || null}, ${patientLetter || null}, 
        ${fromCallsign || null}, ${link || null}, NOW()
      )
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error('Notifications POST error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Mark notifications as read
export async function PUT(request) {
  try {
    const body = await request.json();
    const { discordId, action, notificationId, notificationIds } = body;
    const sql = getDb();

    if (!discordId) {
      return Response.json({ success: false, error: 'Missing discordId' }, { status: 400 });
    }

    switch (action) {
      case 'mark-read':
        if (notificationId) {
          await sql`
            UPDATE user_notifications 
            SET is_read = true 
            WHERE id = ${notificationId} AND discord_id = ${discordId}
          `;
        }
        break;

      case 'mark-all-read':
        await sql`
          UPDATE user_notifications 
          SET is_read = true 
          WHERE discord_id = ${discordId} AND is_read = false
        `;
        break;

      case 'mark-multiple-read':
        if (notificationIds && notificationIds.length > 0) {
          await sql`
            UPDATE user_notifications 
            SET is_read = true 
            WHERE id = ANY(${notificationIds}) AND discord_id = ${discordId}
          `;
        }
        break;

      default:
        return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Notifications PUT error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Clear notifications
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const discordId = searchParams.get('discordId');
    const action = searchParams.get('action');
    const notificationId = searchParams.get('notificationId');
    const sql = getDb();

    if (!discordId) {
      return Response.json({ success: false, error: 'Missing discordId' }, { status: 400 });
    }

    switch (action) {
      case 'delete-one':
        if (notificationId) {
          await sql`
            DELETE FROM user_notifications 
            WHERE id = ${notificationId} AND discord_id = ${discordId}
          `;
        }
        break;

      case 'clear-read':
        await sql`
          DELETE FROM user_notifications 
          WHERE discord_id = ${discordId} AND is_read = true
        `;
        break;

      case 'clear-all':
        await sql`
          DELETE FROM user_notifications 
          WHERE discord_id = ${discordId}
        `;
        break;

      default:
        return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Notifications DELETE error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
