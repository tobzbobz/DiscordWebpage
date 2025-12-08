import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

let _sql = null;
function getDb() {
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// GET user preferences
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const discordId = url.searchParams.get('discordId');
    
    if (!discordId) {
      return Response.json({ success: false, error: 'Discord ID required' }, { status: 400 });
    }

    const sql = getDb();
    
    const rows = await sql`
      SELECT 
        dashboard_layout,
        quick_filters,
        shortcuts_enabled,
        fab_enabled,
        created_at,
        updated_at
      FROM user_preferences
      WHERE discord_id = ${discordId}
    `;

    if (rows.length === 0) {
      // Return default preferences if none exist
      return Response.json({
        success: true,
        preferences: {
          dashboardLayout: [
            { id: 'recent-records', type: 'recent-records', position: 0, enabled: true },
            { id: 'shared-with-me', type: 'shared-with-me', position: 1, enabled: true },
            { id: 'quick-stats', type: 'quick-stats', position: 2, enabled: true },
            { id: 'activity-feed', type: 'activity-feed', position: 3, enabled: true }
          ],
          quickFilters: {
            showMyRecords: true,
            showSharedWithMe: true,
            showIncomplete: true,
            showComplete: false
          },
          shortcutsEnabled: true,
          fabEnabled: true
        }
      });
    }

    const prefs = rows[0];
    return Response.json({
      success: true,
      preferences: {
        dashboardLayout: prefs.dashboard_layout || [],
        quickFilters: prefs.quick_filters || {},
        shortcutsEnabled: prefs.shortcuts_enabled ?? true,
        fabEnabled: prefs.fab_enabled ?? true
      }
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST update user preferences
export async function POST(request) {
  try {
    const body = await request.json();
    const { discordId, dashboardLayout, quickFilters, shortcutsEnabled, fabEnabled } = body;

    if (!discordId) {
      return Response.json({ success: false, error: 'Discord ID required' }, { status: 400 });
    }

    const sql = getDb();

    // Check if preferences exist
    const existing = await sql`
      SELECT id FROM user_preferences WHERE discord_id = ${discordId}
    `;

    if (existing.length === 0) {
      // Create new preferences
      await sql`
        INSERT INTO user_preferences (
          discord_id,
          dashboard_layout,
          quick_filters,
          shortcuts_enabled,
          fab_enabled
        ) VALUES (
          ${discordId},
          ${JSON.stringify(dashboardLayout || [])},
          ${JSON.stringify(quickFilters || {})},
          ${shortcutsEnabled !== undefined ? shortcutsEnabled : true},
          ${fabEnabled !== undefined ? fabEnabled : true}
        )
      `;
    } else {
      // Update existing preferences - only update fields that are provided
      const updates = [];
      const values = [];
      
      if (dashboardLayout !== undefined) {
        await sql`
          UPDATE user_preferences 
          SET dashboard_layout = ${JSON.stringify(dashboardLayout)}, updated_at = CURRENT_TIMESTAMP
          WHERE discord_id = ${discordId}
        `;
      }
      
      if (quickFilters !== undefined) {
        await sql`
          UPDATE user_preferences 
          SET quick_filters = ${JSON.stringify(quickFilters)}, updated_at = CURRENT_TIMESTAMP
          WHERE discord_id = ${discordId}
        `;
      }
      
      if (shortcutsEnabled !== undefined) {
        await sql`
          UPDATE user_preferences 
          SET shortcuts_enabled = ${shortcutsEnabled}, updated_at = CURRENT_TIMESTAMP
          WHERE discord_id = ${discordId}
        `;
      }
      
      if (fabEnabled !== undefined) {
        await sql`
          UPDATE user_preferences 
          SET fab_enabled = ${fabEnabled}, updated_at = CURRENT_TIMESTAMP
          WHERE discord_id = ${discordId}
        `;
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Update preferences error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
