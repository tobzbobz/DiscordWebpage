import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

let _sql = null;
function getDb() {
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// Initialize all new tables for real-time, notifications, version history, etc.
export async function GET(request) {
  try {
    const sql = getDb();

    // User notifications table
    await sql`
      CREATE TABLE IF NOT EXISTS user_notifications (
        id SERIAL PRIMARY KEY,
        discord_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255),
        message TEXT NOT NULL,
        incident_id VARCHAR(255),
        patient_letter VARCHAR(10),
        from_callsign VARCHAR(100),
        link VARCHAR(500),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user ON user_notifications(discord_id, is_read)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_created ON user_notifications(created_at)`;

    // Real-time cursors table (ephemeral)
    await sql`
      CREATE TABLE IF NOT EXISTS realtime_cursors (
        id SERIAL PRIMARY KEY,
        discord_id VARCHAR(255) NOT NULL,
        callsign VARCHAR(100),
        incident_id VARCHAR(255) NOT NULL,
        patient_letter VARCHAR(10) DEFAULT '',
        field_name VARCHAR(100),
        cursor_position JSONB,
        cursor_color VARCHAR(20) DEFAULT '#4a9eff',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(discord_id, incident_id, patient_letter)
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_cursors_incident ON realtime_cursors(incident_id)`;

    // Real-time chat table (ephemeral)
    await sql`
      CREATE TABLE IF NOT EXISTS realtime_chat (
        id SERIAL PRIMARY KEY,
        incident_id VARCHAR(255) NOT NULL,
        patient_letter VARCHAR(10) DEFAULT '',
        chat_type VARCHAR(20) DEFAULT 'incident',
        sender_discord_id VARCHAR(255) NOT NULL,
        sender_callsign VARCHAR(100),
        message TEXT NOT NULL,
        mentions JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_incident ON realtime_chat(incident_id, chat_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_created ON realtime_chat(created_at)`;

    // Version history table
    await sql`
      CREATE TABLE IF NOT EXISTS version_history (
        id SERIAL PRIMARY KEY,
        incident_id VARCHAR(255) NOT NULL,
        patient_letter VARCHAR(10) DEFAULT '',
        section_name VARCHAR(50) NOT NULL,
        changed_by_discord_id VARCHAR(255) NOT NULL,
        changed_by_callsign VARCHAR(100),
        previous_data JSONB,
        new_data JSONB,
        diff_data JSONB,
        change_summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_version_incident ON version_history(incident_id, patient_letter)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_version_section ON version_history(incident_id, section_name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_version_created ON version_history(created_at)`;

    // Rate limiting log table (ephemeral)
    await sql`
      CREATE TABLE IF NOT EXISTS rate_limit_log (
        id SERIAL PRIMARY KEY,
        rate_key VARCHAR(255) NOT NULL,
        timestamp BIGINT NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_rate_key ON rate_limit_log(rate_key, timestamp)`;

    // User preferences table (for dashboard layout, shortcuts, etc.)
    await sql`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id SERIAL PRIMARY KEY,
        discord_id VARCHAR(255) UNIQUE NOT NULL,
        dashboard_layout JSONB DEFAULT '[]',
        quick_filters JSONB DEFAULT '{}',
        shortcuts_enabled BOOLEAN DEFAULT true,
        fab_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Cleanup function for ephemeral data (chat older than 1 hour, cursors older than 5 min)
    // This should be called periodically or use pg_cron
    await sql`
      DELETE FROM realtime_chat WHERE created_at < NOW() - INTERVAL '1 hour'
    `;
    await sql`
      DELETE FROM realtime_cursors WHERE updated_at < NOW() - INTERVAL '5 minutes'
    `;
    await sql`
      DELETE FROM rate_limit_log WHERE timestamp < ${Date.now() - 120000}
    `;

    // Cleanup old notifications (older than 30 days)
    await sql`
      DELETE FROM user_notifications WHERE created_at < NOW() - INTERVAL '30 days'
    `;

    // Cleanup old version history (older than 90 days)
    await sql`
      DELETE FROM version_history WHERE created_at < NOW() - INTERVAL '90 days'
    `;

    return Response.json({ 
      success: true, 
      message: 'Extended tables initialized successfully',
      tables: [
        'user_notifications',
        'realtime_cursors', 
        'realtime_chat',
        'version_history',
        'rate_limit_log',
        'user_preferences'
      ]
    });
  } catch (error) {
    console.error('Extended init error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
