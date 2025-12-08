import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

// Lazy initialization of database connection
let _sql = null;
function getDb() {
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// Owner-only Discord ID (you)
const OWNER_DISCORD_ID = '695765253612953651';

// Check if user is the owner (for owner-only features)
function isOwner(discordId) {
  return discordId === OWNER_DISCORD_ID;
}

// Check if user is an admin (dynamically from database)
async function isAdmin(discordId) {
  if (discordId === OWNER_DISCORD_ID) return true;
  
  const sql = getDb();
  const result = await getDb()`
    SELECT 1 FROM access_lists 
    WHERE list_type = 'admin' 
    AND user_discord_id = ${discordId}
    AND is_active = true
  `;
  return result.length > 0;
}

// Initialize moderation tables
async function initModerationTables() {
  // Access lists table (blacklist, whitelist, admin list)
  await getDb()`
    CREATE TABLE IF NOT EXISTS access_lists (
      id SERIAL PRIMARY KEY,
      list_type VARCHAR(20) NOT NULL, -- 'blacklist', 'whitelist', 'admin'
      user_discord_id VARCHAR(50) NOT NULL,
      user_callsign VARCHAR(100),
      reason TEXT,
      is_hard_ban BOOLEAN DEFAULT false, -- For blacklist: strips all access vs edit-only
      added_by_discord_id VARCHAR(50) NOT NULL,
      added_by_callsign VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(list_type, user_discord_id)
    )
  `;

  // System settings table (for toggles like blacklist/whitelist enabled, maintenance mode)
  await getDb()`
    CREATE TABLE IF NOT EXISTS system_settings (
      id SERIAL PRIMARY KEY,
      setting_key VARCHAR(100) UNIQUE NOT NULL,
      setting_value TEXT,
      updated_by_discord_id VARCHAR(50),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // User kicks table
  await getDb()`
    CREATE TABLE IF NOT EXISTS user_kicks (
      id SERIAL PRIMARY KEY,
      user_discord_id VARCHAR(50) NOT NULL,
      user_callsign VARCHAR(100),
      kicked_by_discord_id VARCHAR(50) NOT NULL,
      kicked_by_callsign VARCHAR(100),
      reason TEXT,
      duration_minutes INTEGER, -- NULL = until they re-login, number = minutes
      expires_at TIMESTAMP,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Broadcasts table (scrolling bar messages)
  await getDb()`
    CREATE TABLE IF NOT EXISTS broadcasts (
      id SERIAL PRIMARY KEY,
      message TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_by_discord_id VARCHAR(50) NOT NULL,
      created_by_callsign VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP
    )
  `;

  // Announcements table (popup notifications)
  await getDb()`
    CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200),
      message TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_by_discord_id VARCHAR(50) NOT NULL,
      created_by_callsign VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP
    )
  `;

  // Initialize default settings if not exist
  const defaultSettings = [
    { key: 'blacklist_enabled', value: 'false' },
    { key: 'whitelist_enabled', value: 'false' },
    { key: 'maintenance_mode', value: 'false' },
    { key: 'serious_maintenance_mode', value: 'false' }
  ];

  for (const setting of defaultSettings) {
    await getDb()`
      INSERT INTO system_settings (setting_key, setting_value)
      VALUES (${setting.key}, ${setting.value})
      ON CONFLICT (setting_key) DO NOTHING
    `;
  }
}

// GET - Fetch moderation data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const discordId = searchParams.get('discordId');
    const type = searchParams.get('type');

    // Public endpoints (for checking user access status)
    if (type === 'check-access') {
      const targetDiscordId = searchParams.get('targetDiscordId');
      return await checkUserAccess(targetDiscordId);
    }

    if (type === 'active-broadcast') {
      return await getActiveBroadcast();
    }

    if (type === 'active-announcements') {
      return await getActiveAnnouncements();
    }

    if (type === 'system-status') {
      return await getSystemStatus();
    }

    // Admin-only endpoints
    const adminCheck = await isAdmin(discordId);
    if (!adminCheck) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    switch (type) {
      case 'kicks':
        return await getKicks();
      case 'broadcasts':
        return await getBroadcasts();
      case 'announcements':
        return await getAnnouncements();
      case 'user-activity':
        const targetUser = searchParams.get('targetDiscordId');
        const limit = parseInt(searchParams.get('limit') || '100');
        return await getUserActivity(targetUser, limit);
      case 'user-stats':
        const statsUser = searchParams.get('targetDiscordId');
        return await getUserStats(statsUser);
      case 'export-logs':
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const format = searchParams.get('format') || 'json';
        return await exportAuditLogs(startDate, endDate, format);
      default:
        break;
    }

    // Owner-only endpoints
    if (!isOwner(discordId)) {
      return new Response(JSON.stringify({ success: false, error: 'Owner access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    switch (type) {
      case 'blacklist':
        return await getAccessList('blacklist');
      case 'whitelist':
        return await getAccessList('whitelist');
      case 'admin-list':
        return await getAccessList('admin');
      case 'settings':
        return await getSettings();
      default:
        return new Response(JSON.stringify({ success: false, error: 'Invalid type' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Moderation GET error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST - Create moderation actions
export async function POST(request) {
  try {
    const body = await request.json();
    const { discordId, callsign, action } = body;

    // Init tables action (owner only)
    if (action === 'init-tables') {
      if (!isOwner(discordId)) {
        return new Response(JSON.stringify({ success: false, error: 'Owner access required' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      await initModerationTables();
      return new Response(JSON.stringify({ success: true, message: 'Moderation tables initialized' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Admin-only actions
    const adminCheck = await isAdmin(discordId);
    if (!adminCheck) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    switch (action) {
      case 'kick':
        return await kickUser(body, discordId, callsign);
      case 'create-broadcast':
        return await createBroadcast(body, discordId, callsign);
      case 'create-announcement':
        return await createAnnouncement(body, discordId, callsign);
      default:
        break;
    }

    // Owner-only actions
    if (!isOwner(discordId)) {
      return new Response(JSON.stringify({ success: false, error: 'Owner access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    switch (action) {
      case 'add-to-blacklist':
        return await addToAccessList('blacklist', body, discordId, callsign);
      case 'add-to-whitelist':
        return await addToAccessList('whitelist', body, discordId, callsign);
      case 'add-admin':
        return await addToAccessList('admin', body, discordId, callsign);
      case 'ban-user':
        return await banUser(body, discordId, callsign);
      case 'update-setting':
        return await updateSetting(body, discordId);
      default:
        return new Response(JSON.stringify({ success: false, error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Moderation POST error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// PUT - Update moderation actions
export async function PUT(request) {
  try {
    const body = await request.json();
    const { discordId, action } = body;

    // Admin-only actions
    const adminCheck = await isAdmin(discordId);
    if (!adminCheck) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    switch (action) {
      case 'unkick':
        return await unkickUser(body);
      case 'toggle-broadcast':
        return await toggleBroadcast(body);
      case 'toggle-announcement':
        return await toggleAnnouncement(body);
      default:
        break;
    }

    // Owner-only actions
    if (!isOwner(discordId)) {
      return new Response(JSON.stringify({ success: false, error: 'Owner access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    switch (action) {
      case 'toggle-hard-ban':
        return await toggleHardBan(body);
      case 'unban-user':
        return await unbanUser(body);
      default:
        return new Response(JSON.stringify({ success: false, error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Moderation PUT error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE - Remove moderation entries
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const discordId = searchParams.get('discordId');
    const action = searchParams.get('action');

    // Owner-only for list management
    if (!isOwner(discordId)) {
      return new Response(JSON.stringify({ success: false, error: 'Owner access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    switch (action) {
      case 'remove-from-blacklist':
        const blacklistTarget = searchParams.get('targetDiscordId');
        return await removeFromAccessList('blacklist', blacklistTarget);
      case 'remove-from-whitelist':
        const whitelistTarget = searchParams.get('targetDiscordId');
        return await removeFromAccessList('whitelist', whitelistTarget);
      case 'remove-admin':
        const adminTarget = searchParams.get('targetDiscordId');
        if (adminTarget === OWNER_DISCORD_ID) {
          return new Response(JSON.stringify({ success: false, error: 'Cannot remove owner from admin list' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return await removeFromAccessList('admin', adminTarget);
      case 'delete-broadcast':
        const broadcastId = searchParams.get('id');
        return await deleteBroadcast(broadcastId);
      case 'delete-announcement':
        const announcementId = searchParams.get('id');
        return await deleteAnnouncement(announcementId);
      default:
        return new Response(JSON.stringify({ success: false, error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Moderation DELETE error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// === Helper Functions ===

async function checkUserAccess(targetDiscordId) {
  if (!targetDiscordId) {
    return new Response(JSON.stringify({ success: false, error: 'Missing targetDiscordId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Owner always has full access
  if (targetDiscordId === OWNER_DISCORD_ID) {
    return new Response(JSON.stringify({ 
      success: true, 
      access: { canView: true, canEdit: true, isAdmin: true, isOwner: true }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check if admin
  const adminCheck = await isAdmin(targetDiscordId);

  // Get system settings
  const settings = await getDb()`SELECT setting_key, setting_value FROM system_settings`;
  const settingsMap = {};
  settings.forEach(s => settingsMap[s.setting_key] = s.setting_value === 'true');

  // Serious maintenance mode blocks all non-admin access
  if (settingsMap.serious_maintenance_mode && !adminCheck) {
    return new Response(JSON.stringify({ 
      success: true, 
      access: { canView: false, canEdit: false, isAdmin: false, isOwner: false, blocked: true, reason: 'System under maintenance' }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check if user is kicked
  const kickCheck = await getDb()`
    SELECT * FROM user_kicks 
    WHERE user_discord_id = ${targetDiscordId} 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > NOW())
  `;
  const isKicked = kickCheck.length > 0;

  // Check blacklist
  let isBlacklisted = false;
  let isHardBanned = false;
  if (settingsMap.blacklist_enabled) {
    const blacklistCheck = await getDb()`
      SELECT is_hard_ban FROM access_lists 
      WHERE list_type = 'blacklist' 
      AND user_discord_id = ${targetDiscordId}
    `;
    if (blacklistCheck.length > 0) {
      isBlacklisted = true;
      isHardBanned = blacklistCheck[0].is_hard_ban;
    }
  }

  // Check whitelist (if enabled and user not on it, deny access)
  let whitelistDenied = false;
  if (settingsMap.whitelist_enabled) {
    const whitelistCheck = await getDb()`
      SELECT 1 FROM access_lists 
      WHERE list_type = 'whitelist' 
      AND user_discord_id = ${targetDiscordId}
    `;
    if (whitelistCheck.length === 0) {
      whitelistDenied = true;
    }
  }

  // Determine access
  let canView = true;
  let canEdit = true;
  let blocked = false;
  let reason = null;

  if (isHardBanned) {
    canView = false;
    canEdit = false;
    blocked = true;
    reason = 'Access denied';
  } else if (whitelistDenied && !adminCheck) {
    canView = false;
    canEdit = false;
    blocked = true;
    reason = 'Access restricted';
  } else if (isBlacklisted || isKicked) {
    canView = true;
    canEdit = false;
    reason = isKicked ? 'Temporarily restricted' : 'Edit access revoked';
  } else if (settingsMap.maintenance_mode && !adminCheck) {
    canView = true;
    canEdit = false;
    reason = 'System in maintenance mode';
  }

  return new Response(JSON.stringify({ 
    success: true, 
    access: { canView, canEdit, isAdmin: adminCheck, isOwner: false, blocked, reason }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getSystemStatus() {
  try {
    const settings = await getDb()`SELECT setting_key, setting_value FROM system_settings`;
    const settingsMap = {};
    settings.forEach(s => settingsMap[s.setting_key] = s.setting_value === 'true');
    
    return new Response(JSON.stringify({ 
      success: true, 
      settings: settingsMap
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // Tables might not exist yet
    return new Response(JSON.stringify({ 
      success: true, 
      settings: {
        blacklist_enabled: false,
        whitelist_enabled: false,
        maintenance_mode: false,
        serious_maintenance_mode: false
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getActiveBroadcast() {
  try {
    const broadcasts = await getDb()`
      SELECT * FROM broadcasts 
      WHERE is_active = true 
      AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return new Response(JSON.stringify({ 
      success: true, 
      broadcast: broadcasts[0] || null
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: true, broadcast: null }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getActiveAnnouncements() {
  try {
    const announcements = await getDb()`
      SELECT * FROM announcements 
      WHERE is_active = true 
      AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
    `;
    return new Response(JSON.stringify({ success: true, announcements }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: true, announcements: [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getAccessList(listType) {
  const list = await getDb()`
    SELECT * FROM access_lists 
    WHERE list_type = ${listType}
    ORDER BY created_at DESC
  `;
  return new Response(JSON.stringify({ success: true, list }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getSettings() {
  const settings = await getDb()`SELECT * FROM system_settings ORDER BY setting_key`;
  return new Response(JSON.stringify({ success: true, settings }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getKicks() {
  const kicks = await getDb()`
    SELECT * FROM user_kicks 
    WHERE is_active = true
    ORDER BY created_at DESC
  `;
  return new Response(JSON.stringify({ success: true, kicks }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getBroadcasts() {
  const broadcasts = await getDb()`SELECT * FROM broadcasts ORDER BY created_at DESC LIMIT 50`;
  return new Response(JSON.stringify({ success: true, broadcasts }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getAnnouncements() {
  const announcements = await getDb()`SELECT * FROM announcements ORDER BY created_at DESC LIMIT 50`;
  return new Response(JSON.stringify({ success: true, announcements }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getUserActivity(targetDiscordId, limit) {
  const activity = await getDb()`
    SELECT * FROM eprf_activity 
    WHERE user_discord_id = ${targetDiscordId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return new Response(JSON.stringify({ success: true, activity }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getUserStats(targetDiscordId) {
  // Get user info
  const userInfo = await getDb()`
    SELECT * FROM users WHERE discord_id = ${targetDiscordId}
  `;

  // Get ePRF counts
  const eprfStats = await getDb()`
    SELECT 
      COUNT(*) as total_eprfs,
      COUNT(*) FILTER (WHERE status = 'complete') as completed_eprfs,
      COUNT(*) FILTER (WHERE status = 'incomplete') as incomplete_eprfs
    FROM eprf_records 
    WHERE author_discord_id = ${targetDiscordId}
  `;

  // Get collaboration count
  const collabStats = await getDb()`
    SELECT COUNT(*) as collaborations
    FROM eprf_collaborators 
    WHERE user_discord_id = ${targetDiscordId}
  `;

  // Get activity count
  const activityStats = await getDb()`
    SELECT COUNT(*) as total_actions
    FROM eprf_activity 
    WHERE user_discord_id = ${targetDiscordId}
  `;

  // Get recent login info from kicks table or users table
  const loginInfo = userInfo[0] || {};

  return new Response(JSON.stringify({ 
    success: true, 
    stats: {
      user: loginInfo,
      eprfs: eprfStats[0],
      collaborations: collabStats[0]?.collaborations || 0,
      totalActions: activityStats[0]?.total_actions || 0
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function exportAuditLogs(startDate, endDate, format) {
  let query;
  if (startDate && endDate) {
    query = await getDb()`
      SELECT * FROM eprf_activity 
      WHERE created_at >= ${startDate}::timestamp 
      AND created_at <= ${endDate}::timestamp
      ORDER BY created_at DESC
    `;
  } else {
    query = await getDb()`
      SELECT * FROM eprf_activity 
      ORDER BY created_at DESC
      LIMIT 1000
    `;
  }

  if (format === 'csv') {
    // Convert to CSV
    if (query.length === 0) {
      return new Response('No data', { headers: { 'Content-Type': 'text/csv' } });
    }
    const headers = Object.keys(query[0]).join(',');
    const rows = query.map(row => Object.values(row).map(v => `"${v || ''}"`).join(',')).join('\n');
    const csv = headers + '\n' + rows;
    
    return new Response(csv, {
      headers: { 
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="audit_logs.csv"'
      }
    });
  }

  return new Response(JSON.stringify({ success: true, logs: query }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function kickUser(body, adminDiscordId, adminCallsign) {
  const { targetDiscordId, targetCallsign, reason, durationMinutes } = body;
  
  let expiresAt = null;
  if (durationMinutes) {
    expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
  }

  await getDb()`
    INSERT INTO user_kicks (user_discord_id, user_callsign, kicked_by_discord_id, kicked_by_callsign, reason, duration_minutes, expires_at)
    VALUES (${targetDiscordId}, ${targetCallsign}, ${adminDiscordId}, ${adminCallsign}, ${reason}, ${durationMinutes}, ${expiresAt})
  `;

  // Log the action
  await getDb()`
    INSERT INTO eprf_activity (incident_id, patient_letter, user_discord_id, user_callsign, action_type, description, created_at)
    VALUES ('SYSTEM', 'A', ${adminDiscordId}, ${'ADMIN: ' + adminCallsign}, 'kick_user', ${`Kicked ${targetCallsign || targetDiscordId} for: ${reason || 'No reason'}`}, NOW())
  `;

  return new Response(JSON.stringify({ success: true, message: 'User kicked' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function unkickUser(body) {
  const { targetDiscordId } = body;
  
  await getDb()`
    UPDATE user_kicks 
    SET is_active = false 
    WHERE user_discord_id = ${targetDiscordId} AND is_active = true
  `;

  return new Response(JSON.stringify({ success: true, message: 'User unkicked' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function banUser(body, adminDiscordId, adminCallsign) {
  const { targetDiscordId, targetCallsign, reason, isHardBan } = body;
  
  // Add to blacklist
  await getDb()`
    INSERT INTO access_lists (list_type, user_discord_id, user_callsign, reason, is_hard_ban, added_by_discord_id, added_by_callsign)
    VALUES ('blacklist', ${targetDiscordId}, ${targetCallsign}, ${reason}, ${isHardBan || false}, ${adminDiscordId}, ${adminCallsign})
    ON CONFLICT (list_type, user_discord_id) DO UPDATE SET
      reason = ${reason},
      is_hard_ban = ${isHardBan || false},
      added_by_discord_id = ${adminDiscordId},
      added_by_callsign = ${adminCallsign}
  `;

  // Enable blacklist if not already
  await getDb()`
    UPDATE system_settings 
    SET setting_value = 'true', updated_by_discord_id = ${adminDiscordId}, updated_at = NOW()
    WHERE setting_key = 'blacklist_enabled'
  `;

  // Log the action
  await getDb()`
    INSERT INTO eprf_activity (incident_id, patient_letter, user_discord_id, user_callsign, action_type, description, created_at)
    VALUES ('SYSTEM', 'A', ${adminDiscordId}, ${'ADMIN: ' + adminCallsign}, 'ban_user', ${`Banned ${targetCallsign || targetDiscordId}${isHardBan ? ' (HARD BAN)' : ''}: ${reason || 'No reason'}`}, NOW())
  `;

  return new Response(JSON.stringify({ success: true, message: 'User banned' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function unbanUser(body) {
  const { targetDiscordId } = body;
  
  await getDb()`
    DELETE FROM access_lists 
    WHERE list_type = 'blacklist' AND user_discord_id = ${targetDiscordId}
  `;

  return new Response(JSON.stringify({ success: true, message: 'User unbanned' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function toggleHardBan(body) {
  const { targetDiscordId, isHardBan } = body;
  
  await getDb()`
    UPDATE access_lists 
    SET is_hard_ban = ${isHardBan}
    WHERE list_type = 'blacklist' AND user_discord_id = ${targetDiscordId}
  `;

  return new Response(JSON.stringify({ success: true, message: 'Hard ban toggled' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function addToAccessList(listType, body, adminDiscordId, adminCallsign) {
  const { targetDiscordId, targetCallsign, reason, isHardBan } = body;
  
  await getDb()`
    INSERT INTO access_lists (list_type, user_discord_id, user_callsign, reason, is_hard_ban, added_by_discord_id, added_by_callsign)
    VALUES (${listType}, ${targetDiscordId}, ${targetCallsign}, ${reason}, ${isHardBan || false}, ${adminDiscordId}, ${adminCallsign})
    ON CONFLICT (list_type, user_discord_id) DO NOTHING
  `;

  return new Response(JSON.stringify({ success: true, message: `Added to ${listType}` }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function removeFromAccessList(listType, targetDiscordId) {
  await getDb()`
    DELETE FROM access_lists 
    WHERE list_type = ${listType} AND user_discord_id = ${targetDiscordId}
  `;

  return new Response(JSON.stringify({ success: true, message: `Removed from ${listType}` }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function updateSetting(body, adminDiscordId) {
  const { settingKey, settingValue } = body;
  
  await getDb()`
    UPDATE system_settings 
    SET setting_value = ${settingValue}, updated_by_discord_id = ${adminDiscordId}, updated_at = NOW()
    WHERE setting_key = ${settingKey}
  `;

  return new Response(JSON.stringify({ success: true, message: 'Setting updated' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function createBroadcast(body, adminDiscordId, adminCallsign) {
  const { message, expiresAt } = body;
  
  // Deactivate other broadcasts
  await getDb()`UPDATE broadcasts SET is_active = false`;
  
  await getDb()`
    INSERT INTO broadcasts (message, created_by_discord_id, created_by_callsign, expires_at)
    VALUES (${message}, ${adminDiscordId}, ${adminCallsign}, ${expiresAt || null})
  `;

  return new Response(JSON.stringify({ success: true, message: 'Broadcast created' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function toggleBroadcast(body) {
  const { id, isActive } = body;
  
  if (isActive) {
    // Deactivate others first
    await getDb()`UPDATE broadcasts SET is_active = false`;
  }
  
  await getDb()`
    UPDATE broadcasts 
    SET is_active = ${isActive}
    WHERE id = ${id}
  `;

  return new Response(JSON.stringify({ success: true, message: 'Broadcast toggled' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function deleteBroadcast(id) {
  await getDb()`DELETE FROM broadcasts WHERE id = ${id}`;
  return new Response(JSON.stringify({ success: true, message: 'Broadcast deleted' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function createAnnouncement(body, adminDiscordId, adminCallsign) {
  const { title, message, expiresAt } = body;
  
  await getDb()`
    INSERT INTO announcements (title, message, created_by_discord_id, created_by_callsign, expires_at)
    VALUES (${title}, ${message}, ${adminDiscordId}, ${adminCallsign}, ${expiresAt || null})
  `;

  return new Response(JSON.stringify({ success: true, message: 'Announcement created' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function toggleAnnouncement(body) {
  const { id, isActive } = body;
  
  await getDb()`
    UPDATE announcements 
    SET is_active = ${isActive}
    WHERE id = ${id}
  `;

  return new Response(JSON.stringify({ success: true, message: 'Announcement toggled' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function deleteAnnouncement(id) {
  await getDb()`DELETE FROM announcements WHERE id = ${id}`;
  return new Response(JSON.stringify({ success: true, message: 'Announcement deleted' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
