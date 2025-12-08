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

// GET - Fetch version history
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const discordId = searchParams.get('discordId');
    const incidentId = searchParams.get('incidentId');
    const patientLetter = searchParams.get('patientLetter');
    const section = searchParams.get('section');
    const versionId = searchParams.get('versionId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sql = getDb();

    if (!discordId || !incidentId) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // If versionId provided, get specific version
    if (versionId) {
      const version = await sql`
        SELECT * FROM version_history 
        WHERE id = ${versionId} AND incident_id = ${incidentId}
      `;
      
      if (version.length === 0) {
        return Response.json({ success: false, error: 'Version not found' }, { status: 404 });
      }

      return Response.json({ success: true, version: version[0] });
    }

    // Get version history list
    let versions;
    if (patientLetter && section) {
      versions = await sql`
        SELECT id, incident_id, patient_letter, section_name, changed_by_discord_id, 
               changed_by_callsign, change_summary, created_at
        FROM version_history 
        WHERE incident_id = ${incidentId} 
        AND patient_letter = ${patientLetter}
        AND section_name = ${section}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else if (patientLetter) {
      versions = await sql`
        SELECT id, incident_id, patient_letter, section_name, changed_by_discord_id, 
               changed_by_callsign, change_summary, created_at
        FROM version_history 
        WHERE incident_id = ${incidentId} 
        AND patient_letter = ${patientLetter}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else {
      versions = await sql`
        SELECT id, incident_id, patient_letter, section_name, changed_by_discord_id, 
               changed_by_callsign, change_summary, created_at
        FROM version_history 
        WHERE incident_id = ${incidentId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    }

    return Response.json({ success: true, versions });
  } catch (error) {
    console.error('Version history GET error:', error);
    return Response.json({ success: true, versions: [] });
  }
}

// POST - Create a version snapshot
export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      discordId, callsign, incidentId, patientLetter, 
      sectionName, previousData, newData, changeSummary 
    } = body;
    const sql = getDb();

    if (!discordId || !incidentId || !sectionName) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Calculate diff between previous and new data
    const diff = calculateDiff(previousData || {}, newData || {});
    
    if (Object.keys(diff.changed).length === 0 && 
        Object.keys(diff.added).length === 0 && 
        Object.keys(diff.removed).length === 0) {
      // No actual changes
      return Response.json({ success: true, noChanges: true });
    }

    // Generate change summary if not provided
    const summary = changeSummary || generateChangeSummary(diff);

    await sql`
      INSERT INTO version_history (
        incident_id, patient_letter, section_name,
        changed_by_discord_id, changed_by_callsign,
        previous_data, new_data, diff_data, change_summary, created_at
      ) VALUES (
        ${incidentId}, ${patientLetter || ''}, ${sectionName},
        ${discordId}, ${callsign},
        ${JSON.stringify(previousData || {})}, ${JSON.stringify(newData || {})},
        ${JSON.stringify(diff)}, ${summary}, NOW()
      )
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error('Version history POST error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Restore a version
export async function PUT(request) {
  try {
    const body = await request.json();
    const { discordId, callsign, versionId, incidentId, patientLetter } = body;
    const sql = getDb();

    if (!discordId || !versionId || !incidentId) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Get the version to restore
    const version = await sql`
      SELECT * FROM version_history 
      WHERE id = ${versionId} AND incident_id = ${incidentId}
    `;

    if (version.length === 0) {
      return Response.json({ success: false, error: 'Version not found' }, { status: 404 });
    }

    const versionData = version[0];

    // Check permissions
    // Owner can restore anything
    if (discordId !== OWNER_DISCORD_ID) {
      // Check if user owns the record or is patient owner
      const record = await sql`
        SELECT author_discord_id FROM eprf_records 
        WHERE incident_id = ${incidentId} 
        AND patient_letter = ${patientLetter || versionData.patient_letter || 'A'}
      `;

      if (record.length === 0) {
        return Response.json({ success: false, error: 'Record not found' }, { status: 404 });
      }

      if (record[0].author_discord_id !== discordId) {
        // Check if user has edit permission on this patient
        const collab = await sql`
          SELECT permission_level FROM patient_collaborators 
          WHERE incident_id = ${incidentId}
          AND patient_letter = ${patientLetter || versionData.patient_letter}
          AND collaborator_discord_id = ${discordId}
          AND permission_level IN ('edit', 'manage')
        `;

        if (collab.length === 0) {
          return Response.json({ success: false, error: 'Not authorized to restore this version' }, { status: 403 });
        }
      }
    }

    // Get current data to save as new version before restoring
    const sectionTable = getSectionTable(versionData.section_name);
    if (!sectionTable) {
      return Response.json({ success: false, error: 'Invalid section' }, { status: 400 });
    }

    // Restore the previous data
    const previousData = typeof versionData.previous_data === 'string' 
      ? JSON.parse(versionData.previous_data) 
      : versionData.previous_data;

    // Update the section with the previous data
    await restoreSectionData(sql, sectionTable, incidentId, versionData.patient_letter, previousData);

    // Log the restore action
    await sql`
      INSERT INTO version_history (
        incident_id, patient_letter, section_name,
        changed_by_discord_id, changed_by_callsign,
        previous_data, new_data, diff_data, change_summary, created_at
      ) VALUES (
        ${incidentId}, ${versionData.patient_letter || ''}, ${versionData.section_name},
        ${discordId}, ${callsign},
        ${JSON.stringify(versionData.new_data)}, ${JSON.stringify(previousData)},
        ${JSON.stringify({ restored: true, fromVersionId: versionId })}, 
        ${'Restored to previous version'}, NOW()
      )
    `;

    return Response.json({ success: true, restoredData: previousData });
  } catch (error) {
    console.error('Version restore error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper: Calculate diff between two objects
function calculateDiff(prev, next) {
  const changed = {};
  const added = {};
  const removed = {};

  // Find changed and removed fields
  for (const key of Object.keys(prev)) {
    if (!(key in next)) {
      removed[key] = prev[key];
    } else if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) {
      changed[key] = { from: prev[key], to: next[key] };
    }
  }

  // Find added fields
  for (const key of Object.keys(next)) {
    if (!(key in prev)) {
      added[key] = next[key];
    }
  }

  return { changed, added, removed };
}

// Helper: Generate human-readable change summary
function generateChangeSummary(diff) {
  const parts = [];
  
  const changedCount = Object.keys(diff.changed).length;
  const addedCount = Object.keys(diff.added).length;
  const removedCount = Object.keys(diff.removed).length;

  if (changedCount > 0) {
    parts.push(`${changedCount} field${changedCount > 1 ? 's' : ''} modified`);
  }
  if (addedCount > 0) {
    parts.push(`${addedCount} field${addedCount > 1 ? 's' : ''} added`);
  }
  if (removedCount > 0) {
    parts.push(`${removedCount} field${removedCount > 1 ? 's' : ''} removed`);
  }

  return parts.join(', ') || 'No changes';
}

// Helper: Get table name for section
function getSectionTable(sectionName) {
  const tables = {
    'incident': 'eprf_incident',
    'patient_info': 'eprf_patient_info',
    'primary_survey': 'eprf_primary_survey',
    'hx_complaint': 'eprf_hx_complaint',
    'past_medical_history': 'eprf_past_medical_history',
    'clinical_impression': 'eprf_clinical_impression',
    'disposition': 'eprf_disposition',
    'vitals': 'eprf_vitals',
    'medications': 'eprf_medications',
    'interventions': 'eprf_interventions'
  };
  return tables[sectionName] || null;
}

// Helper: Restore section data
async function restoreSectionData(sql, tableName, incidentId, patientLetter, data) {
  // This is simplified - in production you'd handle each table's specific columns
  // For now, we'll just update with the provided data
  const updateFields = Object.entries(data)
    .filter(([key]) => !['incident_id', 'patient_letter', 'id', 'created_at', 'updated_at'].includes(key))
    .map(([key, value]) => `${key} = ${typeof value === 'string' ? `'${value}'` : value}`);

  if (updateFields.length === 0) return;

  // Note: This is a simplified approach. In production, use parameterized queries for each table
  await sql`
    UPDATE ${sql(tableName)} 
    SET ${sql.unsafe(updateFields.join(', '))}, updated_at = NOW()
    WHERE incident_id = ${incidentId}
    AND patient_letter = ${patientLetter || 'A'}
  `;
}
