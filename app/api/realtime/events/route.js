import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

let _sql = null;
function getDb() {
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// POST endpoint for sending real-time events (cursors, chat, presence)
export async function POST(request) {
  try {
    const body = await request.json();
    const { type, discordId, callsign } = body;
    const sql = getDb();

    switch (type) {
      case 'cursor-update': {
        const { incidentId, patientLetter, field, position, color } = body;
        
        // Upsert cursor position
        await sql`
          INSERT INTO realtime_cursors (
            discord_id, callsign, incident_id, patient_letter, 
            field_name, cursor_position, cursor_color, updated_at
          ) VALUES (
            ${discordId}, ${callsign}, ${incidentId}, ${patientLetter || ''},
            ${field}, ${JSON.stringify(position)}, ${color || '#4a9eff'}, NOW()
          )
          ON CONFLICT (discord_id, incident_id, patient_letter) 
          DO UPDATE SET 
            field_name = ${field},
            cursor_position = ${JSON.stringify(position)},
            updated_at = NOW()
        `;
        
        return Response.json({ success: true });
      }

      case 'cursor-leave': {
        const { incidentId, patientLetter } = body;
        
        await sql`
          DELETE FROM realtime_cursors 
          WHERE discord_id = ${discordId} 
          AND incident_id = ${incidentId}
          AND patient_letter = ${patientLetter || ''}
        `;
        
        return Response.json({ success: true });
      }

      case 'chat-message': {
        const { incidentId, patientLetter, message, chatType } = body;
        
        // Parse mentions from message
        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let match;
        while ((match = mentionRegex.exec(message)) !== null) {
          mentions.push(match[1]);
        }
        
        // Insert chat message (ephemeral - will be auto-cleaned)
        await sql`
          INSERT INTO realtime_chat (
            incident_id, patient_letter, chat_type, sender_discord_id, 
            sender_callsign, message, mentions, created_at
          ) VALUES (
            ${incidentId}, ${patientLetter || ''}, ${chatType || 'incident'}, 
            ${discordId}, ${callsign}, ${message}, ${JSON.stringify(mentions)}, NOW()
          )
        `;
        
        // Create notifications for mentioned users
        if (mentions.length > 0) {
          // Get discord IDs for mentioned callsigns
          const mentionedUsers = await sql`
            SELECT discord_id FROM users 
            WHERE LOWER(callsign) = ANY(${mentions.map(m => m.toLowerCase())})
          `;
          
          for (const user of mentionedUsers) {
            if (user.discord_id !== discordId) {
              await sql`
                INSERT INTO user_notifications (
                  discord_id, type, title, message, 
                  incident_id, patient_letter, from_callsign, created_at
                ) VALUES (
                  ${user.discord_id}, 'mention', 'You were mentioned',
                  ${`${callsign} mentioned you in chat: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`},
                  ${incidentId}, ${patientLetter || ''}, ${callsign}, NOW()
                )
              `;
            }
          }
        }
        
        return Response.json({ success: true });
      }

      case 'presence-update': {
        const { incidentId, patientLetter, page } = body;
        
        await sql`
          INSERT INTO eprf_presence (
            discord_id, callsign, incident_id, patient_letter, 
            page_name, last_seen
          ) VALUES (
            ${discordId}, ${callsign}, ${incidentId}, ${patientLetter || ''},
            ${page}, NOW()
          )
          ON CONFLICT (discord_id, incident_id, patient_letter) 
          DO UPDATE SET 
            page_name = ${page},
            last_seen = NOW()
        `;
        
        return Response.json({ success: true });
      }

      case 'presence-leave': {
        const { incidentId, patientLetter } = body;
        
        await sql`
          DELETE FROM eprf_presence 
          WHERE discord_id = ${discordId} 
          AND incident_id = ${incidentId}
        `;
        
        // Also clean up cursor
        await sql`
          DELETE FROM realtime_cursors 
          WHERE discord_id = ${discordId} 
          AND incident_id = ${incidentId}
        `;
        
        return Response.json({ success: true });
      }

      default:
        return Response.json({ success: false, error: 'Unknown event type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Realtime POST error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET endpoint to fetch chat history (last 50 messages)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get('incidentId');
    const patientLetter = searchParams.get('patientLetter') || '';
    const chatType = searchParams.get('chatType') || 'incident';
    const sql = getDb();

    if (!incidentId) {
      return Response.json({ success: false, error: 'Missing incidentId' }, { status: 400 });
    }

    const messages = await sql`
      SELECT * FROM realtime_chat 
      WHERE incident_id = ${incidentId}
      AND chat_type = ${chatType}
      AND (${chatType} = 'incident' OR patient_letter = ${patientLetter})
      ORDER BY created_at ASC
      LIMIT 50
    `;

    return Response.json({ success: true, messages });
  } catch (error) {
    console.error('Chat GET error:', error);
    return Response.json({ success: true, messages: [] });
  }
}
