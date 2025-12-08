import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

let _sql = null;
function getDb() {
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

const OWNER_DISCORD_ID = '695765253612953651';

// GET - Advanced search across records
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const discordId = searchParams.get('discordId');
    const query = searchParams.get('q') || '';
    const isAdminSearch = searchParams.get('admin') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Filters
    const status = searchParams.get('status'); // incomplete, complete
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const author = searchParams.get('author');
    
    const sql = getDb();

    if (!discordId) {
      return Response.json({ success: false, error: 'Missing discordId' }, { status: 400 });
    }

    // Check if user is admin (for admin panel search)
    let isAdmin = false;
    if (isAdminSearch) {
      if (discordId === OWNER_DISCORD_ID) {
        isAdmin = true;
      } else {
        const adminCheck = await sql`
          SELECT 1 FROM access_lists 
          WHERE list_type = 'admin' 
          AND user_discord_id = ${discordId}
          AND is_active = true
        `;
        isAdmin = adminCheck.length > 0;
      }

      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }
    }

    // Build the search query
    const searchTerm = `%${query.toLowerCase()}%`;
    
    let results;
    let totalCount;

    if (isAdmin) {
      // Admin search - all records
      const countResult = await sql`
        SELECT COUNT(DISTINCT r.id) as total
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        LEFT JOIN eprf_patient_info pi ON r.incident_id = pi.incident_id AND r.patient_letter = pi.patient_letter
        LEFT JOIN eprf_clinical_impression ci ON r.incident_id = ci.incident_id AND r.patient_letter = ci.patient_letter
        WHERE (
          LOWER(r.incident_id) LIKE ${searchTerm}
          OR LOWER(r.patient_letter) LIKE ${searchTerm}
          OR LOWER(u.callsign) LIKE ${searchTerm}
          OR LOWER(COALESCE(pi.first_name, '') || ' ' || COALESCE(pi.last_name, '')) LIKE ${searchTerm}
          OR LOWER(COALESCE(ci.impression, '')) LIKE ${searchTerm}
          OR LOWER(COALESCE(ci.notes, '')) LIKE ${searchTerm}
        )
        ${status ? sql`AND r.status = ${status}` : sql``}
        ${author ? sql`AND r.author_discord_id = ${author}` : sql``}
        ${dateFrom ? sql`AND r.created_at >= ${dateFrom}` : sql``}
        ${dateTo ? sql`AND r.created_at <= ${dateTo}` : sql``}
      `;
      totalCount = parseInt(countResult[0]?.total || 0);

      results = await sql`
        SELECT DISTINCT ON (r.incident_id, r.patient_letter)
          r.*,
          u.callsign as author_callsign,
          u.discord_username as author_username,
          pi.first_name as patient_first_name,
          pi.last_name as patient_last_name,
          ci.impression as clinical_impression
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        LEFT JOIN eprf_patient_info pi ON r.incident_id = pi.incident_id AND r.patient_letter = pi.patient_letter
        LEFT JOIN eprf_clinical_impression ci ON r.incident_id = ci.incident_id AND r.patient_letter = ci.patient_letter
        WHERE (
          LOWER(r.incident_id) LIKE ${searchTerm}
          OR LOWER(r.patient_letter) LIKE ${searchTerm}
          OR LOWER(u.callsign) LIKE ${searchTerm}
          OR LOWER(COALESCE(pi.first_name, '') || ' ' || COALESCE(pi.last_name, '')) LIKE ${searchTerm}
          OR LOWER(COALESCE(ci.impression, '')) LIKE ${searchTerm}
          OR LOWER(COALESCE(ci.notes, '')) LIKE ${searchTerm}
        )
        ${status ? sql`AND r.status = ${status}` : sql``}
        ${author ? sql`AND r.author_discord_id = ${author}` : sql``}
        ${dateFrom ? sql`AND r.created_at >= ${dateFrom}` : sql``}
        ${dateTo ? sql`AND r.created_at <= ${dateTo}` : sql``}
        ORDER BY r.incident_id, r.patient_letter, r.updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      // Regular user search - owned and shared records
      const countResult = await sql`
        SELECT COUNT(DISTINCT r.id) as total
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        LEFT JOIN eprf_patient_info pi ON r.incident_id = pi.incident_id AND r.patient_letter = pi.patient_letter
        LEFT JOIN eprf_clinical_impression ci ON r.incident_id = ci.incident_id AND r.patient_letter = ci.patient_letter
        LEFT JOIN eprf_collaborators c ON r.incident_id = c.incident_id AND c.collaborator_discord_id = ${discordId}
        LEFT JOIN patient_collaborators pc ON r.incident_id = pc.incident_id AND r.patient_letter = pc.patient_letter AND pc.collaborator_discord_id = ${discordId}
        WHERE (
          r.author_discord_id = ${discordId}
          OR c.collaborator_discord_id IS NOT NULL
          OR pc.collaborator_discord_id IS NOT NULL
        )
        AND (
          LOWER(r.incident_id) LIKE ${searchTerm}
          OR LOWER(r.patient_letter) LIKE ${searchTerm}
          OR LOWER(u.callsign) LIKE ${searchTerm}
          OR LOWER(COALESCE(pi.first_name, '') || ' ' || COALESCE(pi.last_name, '')) LIKE ${searchTerm}
          OR LOWER(COALESCE(ci.impression, '')) LIKE ${searchTerm}
        )
        ${status ? sql`AND r.status = ${status}` : sql``}
        ${dateFrom ? sql`AND r.created_at >= ${dateFrom}` : sql``}
        ${dateTo ? sql`AND r.created_at <= ${dateTo}` : sql``}
      `;
      totalCount = parseInt(countResult[0]?.total || 0);

      results = await sql`
        SELECT DISTINCT ON (r.incident_id, r.patient_letter)
          r.*,
          u.callsign as author_callsign,
          u.discord_username as author_username,
          pi.first_name as patient_first_name,
          pi.last_name as patient_last_name,
          ci.impression as clinical_impression,
          CASE 
            WHEN r.author_discord_id = ${discordId} THEN 'owner'
            WHEN c.permission_level IS NOT NULL THEN c.permission_level
            WHEN pc.permission_level IS NOT NULL THEN pc.permission_level
            ELSE 'view'
          END as access_level
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        LEFT JOIN eprf_patient_info pi ON r.incident_id = pi.incident_id AND r.patient_letter = pi.patient_letter
        LEFT JOIN eprf_clinical_impression ci ON r.incident_id = ci.incident_id AND r.patient_letter = ci.patient_letter
        LEFT JOIN eprf_collaborators c ON r.incident_id = c.incident_id AND c.collaborator_discord_id = ${discordId}
        LEFT JOIN patient_collaborators pc ON r.incident_id = pc.incident_id AND r.patient_letter = pc.patient_letter AND pc.collaborator_discord_id = ${discordId}
        WHERE (
          r.author_discord_id = ${discordId}
          OR c.collaborator_discord_id IS NOT NULL
          OR pc.collaborator_discord_id IS NOT NULL
        )
        AND (
          LOWER(r.incident_id) LIKE ${searchTerm}
          OR LOWER(r.patient_letter) LIKE ${searchTerm}
          OR LOWER(u.callsign) LIKE ${searchTerm}
          OR LOWER(COALESCE(pi.first_name, '') || ' ' || COALESCE(pi.last_name, '')) LIKE ${searchTerm}
          OR LOWER(COALESCE(ci.impression, '')) LIKE ${searchTerm}
        )
        ${status ? sql`AND r.status = ${status}` : sql``}
        ${dateFrom ? sql`AND r.created_at >= ${dateFrom}` : sql``}
        ${dateTo ? sql`AND r.created_at <= ${dateTo}` : sql``}
        ORDER BY r.incident_id, r.patient_letter, r.updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    return Response.json({ 
      success: true, 
      results,
      total: totalCount,
      limit,
      offset,
      hasMore: offset + results.length < totalCount
    });
  } catch (error) {
    console.error('Search error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
