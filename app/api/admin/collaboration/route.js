import { 
  getDb,
  getAllUsers,
  logActivity
} from '../../../../lib/db';

export const runtime = 'edge';

// Admin Discord IDs - owner has highest privilege
const OWNER_DISCORD_ID = '695765253612953651';
const ADMIN_DISCORD_IDS = [OWNER_DISCORD_ID]; // Add more admin IDs here

function isAdmin(discordId) {
  return ADMIN_DISCORD_IDS.includes(discordId);
}

function isOwner(discordId) {
  return discordId === OWNER_DISCORD_ID;
}

// Format admin action for display
function formatAdminActor(adminDiscordId, adminCallsign, forAdminView = false) {
  if (forAdminView) {
    return `ADMIN: ${adminCallsign}`;
  }
  return 'ADMIN';
}

// GET - Fetch collaboration data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const discordId = searchParams.get('discordId');
    const type = searchParams.get('type');
    
    if (!isAdmin(discordId)) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }
    
    const sql = getDb();
    
    switch (type) {
      case 'presence': {
        // Get all active presence (last 60 seconds for admin view)
        const presence = await sql`
          SELECT * FROM eprf_presence 
          WHERE last_seen > NOW() - INTERVAL '60 seconds'
          ORDER BY last_seen DESC
        `;
        return Response.json({ success: true, presence });
      }
      
      case 'activity': {
        const incidentId = searchParams.get('incidentId');
        const patientLetter = searchParams.get('patientLetter');
        const limit = parseInt(searchParams.get('limit') || '100');
        const offset = parseInt(searchParams.get('offset') || '0');
        const actionType = searchParams.get('actionType');
        
        let query;
        if (incidentId && patientLetter) {
          query = sql`
            SELECT * FROM eprf_activity_log 
            WHERE incident_id = ${incidentId} AND patient_letter = ${patientLetter}
            ${actionType ? sql`AND action_type = ${actionType}` : sql``}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset}
          `;
        } else {
          query = sql`
            SELECT * FROM eprf_activity_log 
            ${actionType ? sql`WHERE action_type = ${actionType}` : sql``}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset}
          `;
        }
        const activity = await query;
        
        // Get total count
        const countResult = await sql`SELECT COUNT(*) as total FROM eprf_activity_log`;
        const total = countResult[0]?.total || 0;
        
        return Response.json({ success: true, activity, total });
      }
      
      case 'access-requests': {
        const status = searchParams.get('status') || 'pending';
        const requests = await sql`
          SELECT * FROM eprf_access_requests 
          WHERE status = ${status}
          ORDER BY created_at DESC
        `;
        return Response.json({ success: true, requests });
      }
      
      case 'share-links': {
        const shareLinks = await sql`
          SELECT * FROM eprf_share_links 
          ORDER BY created_at DESC
        `;
        return Response.json({ success: true, shareLinks });
      }
      
      case 'section-locks': {
        const locks = await sql`
          SELECT * FROM eprf_section_locks 
          ORDER BY locked_at DESC
        `;
        return Response.json({ success: true, locks });
      }
      
      case 'collaborators': {
        const incidentId = searchParams.get('incidentId');
        if (incidentId) {
          const collaborators = await sql`
            SELECT * FROM eprf_collaborators 
            WHERE incident_id = ${incidentId}
            ORDER BY created_at DESC
          `;
          return Response.json({ success: true, collaborators });
        } else {
          // Get all collaborators grouped by incident
          const collaborators = await sql`
            SELECT * FROM eprf_collaborators 
            ORDER BY incident_id, created_at DESC
          `;
          return Response.json({ success: true, collaborators });
        }
      }
      
      case 'expired-access': {
        const expired = await sql`
          SELECT * FROM eprf_collaborators 
          WHERE expires_at IS NOT NULL AND expires_at < NOW()
          ORDER BY expires_at DESC
        `;
        return Response.json({ success: true, expired });
      }
      
      case 'notifications': {
        const limit = parseInt(searchParams.get('limit') || '100');
        const notifications = await sql`
          SELECT * FROM eprf_notifications 
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
        return Response.json({ success: true, notifications });
      }
      
      case 'stats': {
        // Get various statistics
        const [
          presenceCount,
          activityCount,
          pendingRequests,
          activeLocks,
          activeShareLinks,
          totalCollaborators,
          expiredCount
        ] = await Promise.all([
          sql`SELECT COUNT(*) as count FROM eprf_presence WHERE last_seen > NOW() - INTERVAL '60 seconds'`,
          sql`SELECT COUNT(*) as count FROM eprf_activity_log`,
          sql`SELECT COUNT(*) as count FROM eprf_access_requests WHERE status = 'pending'`,
          sql`SELECT COUNT(*) as count FROM eprf_section_locks`,
          sql`SELECT COUNT(*) as count FROM eprf_share_links WHERE (expires_at IS NULL OR expires_at > NOW()) AND (max_uses IS NULL OR uses_count < max_uses)`,
          sql`SELECT COUNT(*) as count FROM eprf_collaborators`,
          sql`SELECT COUNT(*) as count FROM eprf_collaborators WHERE expires_at IS NOT NULL AND expires_at < NOW()`
        ]);
        
        return Response.json({
          success: true,
          stats: {
            activeUsers: presenceCount[0]?.count || 0,
            totalActivityLogs: activityCount[0]?.count || 0,
            pendingAccessRequests: pendingRequests[0]?.count || 0,
            activeSectionLocks: activeLocks[0]?.count || 0,
            activeShareLinks: activeShareLinks[0]?.count || 0,
            totalCollaborators: totalCollaborators[0]?.count || 0,
            expiredAccess: expiredCount[0]?.count || 0
          }
        });
      }
      
      default:
        return Response.json({ success: false, error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin collaboration GET error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Admin actions
export async function POST(request) {
  try {
    const body = await request.json();
    const { discordId, callsign, action } = body;
    
    if (!isAdmin(discordId)) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }
    
    const sql = getDb();
    const adminLabel = formatAdminActor(discordId, callsign, true);
    const userViewLabel = 'ADMIN';
    
    switch (action) {
      case 'force-disconnect': {
        // Force disconnect a user from presence
        const { targetDiscordId, incidentId, patientLetter } = body;
        await sql`
          DELETE FROM eprf_presence 
          WHERE user_discord_id = ${targetDiscordId}
          ${incidentId ? sql`AND incident_id = ${incidentId}` : sql``}
          ${patientLetter ? sql`AND patient_letter = ${patientLetter}` : sql``}
        `;
        
        if (incidentId && patientLetter) {
          await logActivity(incidentId, patientLetter, discordId, userViewLabel, 'admin_force_disconnect', {
            description: `${adminLabel} force disconnected user ${targetDiscordId}`
          });
        }
        
        return Response.json({ success: true, message: 'User disconnected' });
      }
      
      case 'force-unlock': {
        // Force unlock a section
        const { incidentId, patientLetter, section } = body;
        await sql`
          DELETE FROM eprf_section_locks 
          WHERE incident_id = ${incidentId} 
          AND patient_letter = ${patientLetter}
          ${section ? sql`AND section = ${section}` : sql``}
        `;
        
        await logActivity(incidentId, patientLetter, discordId, userViewLabel, 'admin_force_unlock', {
          section,
          description: `${adminLabel} force unlocked ${section || 'all sections'}`
        });
        
        return Response.json({ success: true, message: 'Section unlocked' });
      }
      
      case 'approve-access': {
        // Approve access request
        const { requestId, permissionLevel } = body;
        
        const request = await sql`
          SELECT * FROM eprf_access_requests WHERE id = ${requestId}
        `;
        
        if (!request[0]) {
          return Response.json({ success: false, error: 'Request not found' }, { status: 404 });
        }
        
        const req = request[0];
        
        // Update request status
        await sql`
          UPDATE eprf_access_requests 
          SET status = 'approved', reviewed_by = ${discordId}, reviewed_at = NOW()
          WHERE id = ${requestId}
        `;
        
        // Add collaborator
        await sql`
          INSERT INTO eprf_collaborators (incident_id, user_discord_id, user_callsign, permission_level, added_by_discord_id)
          VALUES (${req.incident_id}, ${req.requester_discord_id}, ${req.requester_callsign}, ${permissionLevel || 'view'}, ${discordId})
          ON CONFLICT (incident_id, user_discord_id) 
          DO UPDATE SET permission_level = ${permissionLevel || 'view'}
        `;
        
        // Create notification for requester
        await sql`
          INSERT INTO eprf_notifications (user_discord_id, type, title, message, incident_id)
          VALUES (${req.requester_discord_id}, 'access_approved', 'Access Approved', 
                  ${`Your access request for ${req.incident_id} was approved by an admin`}, ${req.incident_id})
        `;
        
        await logActivity(req.incident_id, req.patient_letter || 'A', discordId, userViewLabel, 'admin_approve_access', {
          description: `${adminLabel} approved access for ${req.requester_callsign}`
        });
        
        return Response.json({ success: true, message: 'Access approved' });
      }
      
      case 'deny-access': {
        // Deny access request
        const { requestId, reason } = body;
        
        const request = await sql`
          SELECT * FROM eprf_access_requests WHERE id = ${requestId}
        `;
        
        if (!request[0]) {
          return Response.json({ success: false, error: 'Request not found' }, { status: 404 });
        }
        
        const req = request[0];
        
        await sql`
          UPDATE eprf_access_requests 
          SET status = 'denied', reviewed_by = ${discordId}, reviewed_at = NOW()
          WHERE id = ${requestId}
        `;
        
        // Create notification for requester
        await sql`
          INSERT INTO eprf_notifications (user_discord_id, type, title, message, incident_id)
          VALUES (${req.requester_discord_id}, 'access_denied', 'Access Denied', 
                  ${`Your access request for ${req.incident_id} was denied by an admin${reason ? ': ' + reason : ''}`}, ${req.incident_id})
        `;
        
        return Response.json({ success: true, message: 'Access denied' });
      }
      
      case 'revoke-share-link': {
        // Revoke a share link
        const { linkId } = body;
        
        const link = await sql`SELECT * FROM eprf_share_links WHERE id = ${linkId}`;
        if (link[0]) {
          await sql`DELETE FROM eprf_share_links WHERE id = ${linkId}`;
          
          await logActivity(link[0].incident_id, link[0].patient_letter || 'A', discordId, userViewLabel, 'admin_revoke_share_link', {
            description: `${adminLabel} revoked share link`
          });
        }
        
        return Response.json({ success: true, message: 'Share link revoked' });
      }
      
      case 'add-collaborator': {
        // Admin add collaborator to any ePRF
        const { incidentId, targetDiscordId, targetCallsign, permissionLevel, expiresAt } = body;
        
        await sql`
          INSERT INTO eprf_collaborators (incident_id, user_discord_id, user_callsign, permission_level, added_by_discord_id, expires_at)
          VALUES (${incidentId}, ${targetDiscordId}, ${targetCallsign}, ${permissionLevel}, ${discordId}, ${expiresAt || null})
          ON CONFLICT (incident_id, user_discord_id) 
          DO UPDATE SET permission_level = ${permissionLevel}, expires_at = ${expiresAt || null}
        `;
        
        // Create notification for target user
        await sql`
          INSERT INTO eprf_notifications (user_discord_id, type, title, message, incident_id)
          VALUES (${targetDiscordId}, 'collaborator_added', 'Access Granted', 
                  ${`An admin granted you ${permissionLevel} access to ${incidentId}`}, ${incidentId})
        `;
        
        await logActivity(incidentId, 'A', discordId, userViewLabel, 'admin_add_collaborator', {
          description: `${adminLabel} added ${targetCallsign} as ${permissionLevel}`
        });
        
        return Response.json({ success: true, message: 'Collaborator added' });
      }
      
      case 'remove-collaborator': {
        // Admin remove collaborator
        const { incidentId, targetDiscordId } = body;
        
        const collab = await sql`
          SELECT * FROM eprf_collaborators 
          WHERE incident_id = ${incidentId} AND user_discord_id = ${targetDiscordId}
        `;
        
        if (collab[0]) {
          await sql`
            DELETE FROM eprf_collaborators 
            WHERE incident_id = ${incidentId} AND user_discord_id = ${targetDiscordId}
          `;
          
          // Create notification
          await sql`
            INSERT INTO eprf_notifications (user_discord_id, type, title, message, incident_id)
            VALUES (${targetDiscordId}, 'access_revoked', 'Access Revoked', 
                    ${`An admin revoked your access to ${incidentId}`}, ${incidentId})
          `;
          
          await logActivity(incidentId, 'A', discordId, userViewLabel, 'admin_remove_collaborator', {
            description: `${adminLabel} removed ${collab[0].user_callsign}`
          });
        }
        
        return Response.json({ success: true, message: 'Collaborator removed' });
      }
      
      case 'update-permission': {
        // Admin update collaborator permission
        const { incidentId, targetDiscordId, newPermissionLevel } = body;
        
        await sql`
          UPDATE eprf_collaborators 
          SET permission_level = ${newPermissionLevel}
          WHERE incident_id = ${incidentId} AND user_discord_id = ${targetDiscordId}
        `;
        
        // Create notification
        await sql`
          INSERT INTO eprf_notifications (user_discord_id, type, title, message, incident_id)
          VALUES (${targetDiscordId}, 'permission_changed', 'Permission Changed', 
                  ${`An admin changed your permission to ${newPermissionLevel} for ${incidentId}`}, ${incidentId})
        `;
        
        await logActivity(incidentId, 'A', discordId, userViewLabel, 'admin_update_permission', {
          description: `${adminLabel} changed permission to ${newPermissionLevel}`
        });
        
        return Response.json({ success: true, message: 'Permission updated' });
      }
      
      case 'send-notification': {
        // Send system-wide or targeted notification
        const { targetDiscordId, title, message, notificationType } = body;
        
        if (targetDiscordId) {
          // Single user notification
          await sql`
            INSERT INTO eprf_notifications (user_discord_id, type, title, message)
            VALUES (${targetDiscordId}, ${notificationType || 'system'}, ${title}, ${message})
          `;
        } else {
          // System-wide notification - send to all users
          const users = await getAllUsers();
          for (const user of users) {
            await sql`
              INSERT INTO eprf_notifications (user_discord_id, type, title, message)
              VALUES (${user.discord_id}, ${notificationType || 'system'}, ${title}, ${message})
            `;
          }
        }
        
        return Response.json({ success: true, message: 'Notification sent' });
      }
      
      case 'cleanup-expired': {
        // Cleanup expired collaborators older than 7 days
        const deleted = await sql`
          DELETE FROM eprf_collaborators 
          WHERE expires_at IS NOT NULL 
          AND expires_at < NOW() - INTERVAL '7 days'
          RETURNING *
        `;
        
        return Response.json({ success: true, deleted: deleted.length, message: `Cleaned up ${deleted.length} expired entries` });
      }
      
      case 'cleanup-old-logs': {
        // Cleanup activity logs older than 90 days
        const deleted = await sql`
          DELETE FROM eprf_activity_log 
          WHERE created_at < NOW() - INTERVAL '90 days'
          RETURNING *
        `;
        
        return Response.json({ success: true, deleted: deleted.length, message: `Cleaned up ${deleted.length} old log entries` });
      }
      
      case 'restore-collaborator': {
        // Restore expired collaborator
        const { incidentId, targetDiscordId, newExpiresAt } = body;
        
        await sql`
          UPDATE eprf_collaborators 
          SET expires_at = ${newExpiresAt || null}
          WHERE incident_id = ${incidentId} AND user_discord_id = ${targetDiscordId}
        `;
        
        // Notify user
        await sql`
          INSERT INTO eprf_notifications (user_discord_id, type, title, message, incident_id)
          VALUES (${targetDiscordId}, 'access_restored', 'Access Restored', 
                  ${`An admin restored your access to ${incidentId}`}, ${incidentId})
        `;
        
        return Response.json({ success: true, message: 'Access restored' });
      }
      
      default:
        return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin collaboration POST error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
