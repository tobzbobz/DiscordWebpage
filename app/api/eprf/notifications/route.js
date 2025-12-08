import { 
  createNotification,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount
} from '../../../../lib/db';

export const runtime = 'edge';

// GET - Get notifications for a user
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userDiscordId = searchParams.get('userDiscordId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const countOnly = searchParams.get('countOnly') === 'true';
    
    if (!userDiscordId) {
      return Response.json({ success: false, error: 'Missing userDiscordId' }, { status: 400 });
    }
    
    if (countOnly) {
      const count = await getUnreadNotificationCount(userDiscordId);
      return Response.json({ success: true, count });
    }
    
    const notifications = await getNotifications(userDiscordId, unreadOnly);
    return Response.json({ success: true, notifications });
  } catch (error) {
    console.error('GET notifications error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create a notification
export async function POST(request) {
  try {
    const body = await request.json();
    const { userDiscordId, notificationType, title, message, incidentId, patientLetter, fromUserDiscordId, fromUserCallsign } = body;
    
    if (!userDiscordId || !notificationType || !title || !message) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    const notification = await createNotification(
      userDiscordId,
      notificationType,
      title,
      message,
      { incidentId, patientLetter, fromUserDiscordId, fromUserCallsign }
    );
    
    return Response.json({ success: true, notification });
  } catch (error) {
    console.error('POST notification error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Mark notification(s) as read
export async function PUT(request) {
  try {
    const body = await request.json();
    const { action, userDiscordId, notificationId } = body;
    
    if (!userDiscordId) {
      return Response.json({ success: false, error: 'Missing userDiscordId' }, { status: 400 });
    }
    
    if (action === 'markAllRead') {
      await markAllNotificationsRead(userDiscordId);
      return Response.json({ success: true });
    }
    
    if (action === 'markRead' && notificationId) {
      const success = await markNotificationRead(notificationId, userDiscordId);
      return Response.json({ success });
    }
    
    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('PUT notification error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
