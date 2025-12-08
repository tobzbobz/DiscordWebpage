import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

// Lazy database initialization
let _sql = null;
function getDb() {
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// SSE endpoint for real-time updates
// Clients subscribe to channels: notifications, cursors, chat, presence
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const discordId = searchParams.get('discordId');
  const incidentId = searchParams.get('incidentId');
  const channels = (searchParams.get('channels') || 'notifications').split(',');

  if (!discordId) {
    return new Response('Missing discordId', { status: 400 });
  }

  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  let intervalId;
  let isActive = true;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const connectMsg = `data: ${JSON.stringify({ type: 'connected', channels })}\n\n`;
      controller.enqueue(encoder.encode(connectMsg));

      // Poll for updates every 2 seconds (more responsive than before)
      intervalId = setInterval(async () => {
        if (!isActive) return;

        try {
          const updates = [];
          const sql = getDb();

          // Check for notifications
          if (channels.includes('notifications')) {
            const notifications = await sql`
              SELECT * FROM user_notifications 
              WHERE discord_id = ${discordId} 
              AND is_read = false 
              AND created_at > NOW() - INTERVAL '5 seconds'
              ORDER BY created_at DESC
              LIMIT 10
            `;
            if (notifications.length > 0) {
              updates.push({ type: 'notifications', data: notifications });
            }
          }

          // Check for cursor updates in this incident
          if (channels.includes('cursors') && incidentId) {
            const cursors = await sql`
              SELECT * FROM realtime_cursors 
              WHERE incident_id = ${incidentId}
              AND discord_id != ${discordId}
              AND updated_at > NOW() - INTERVAL '5 seconds'
            `;
            if (cursors.length > 0) {
              updates.push({ type: 'cursors', data: cursors });
            }
          }

          // Check for chat messages
          if (channels.includes('chat') && incidentId) {
            const messages = await sql`
              SELECT * FROM realtime_chat 
              WHERE incident_id = ${incidentId}
              AND created_at > NOW() - INTERVAL '3 seconds'
              AND sender_discord_id != ${discordId}
              ORDER BY created_at DESC
              LIMIT 20
            `;
            if (messages.length > 0) {
              updates.push({ type: 'chat', data: messages });
            }
          }

          // Check for presence updates
          if (channels.includes('presence') && incidentId) {
            const presence = await sql`
              SELECT * FROM eprf_presence 
              WHERE incident_id = ${incidentId}
              AND last_seen > NOW() - INTERVAL '30 seconds'
            `;
            updates.push({ type: 'presence', data: presence });
          }

          // Check for broadcasts
          if (channels.includes('broadcasts')) {
            const broadcast = await sql`
              SELECT * FROM broadcasts 
              WHERE is_active = true 
              AND (expires_at IS NULL OR expires_at > NOW())
              ORDER BY created_at DESC
              LIMIT 1
            `;
            if (broadcast.length > 0) {
              updates.push({ type: 'broadcast', data: broadcast[0] });
            }
          }

          // Send updates if any
          if (updates.length > 0) {
            const msg = `data: ${JSON.stringify({ type: 'updates', updates })}\n\n`;
            controller.enqueue(encoder.encode(msg));
          }

          // Send heartbeat every 30 seconds to keep connection alive
          const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));

        } catch (error) {
          console.error('SSE poll error:', error);
          // Tables might not exist, silently continue
        }
      }, 2000);
    },
    cancel() {
      isActive = false;
      if (intervalId) clearInterval(intervalId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
