import { neon } from '@neondatabase/serverless';

// Get the database connection
export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(process.env.DATABASE_URL);
}

// Initialize database tables
export async function initializeDatabase() {
  const sql = getDb();
  
  // Create users table
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      discord_id VARCHAR(255) UNIQUE NOT NULL,
      discord_username VARCHAR(255),
      callsign VARCHAR(100),
      vehicle VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  // Create eprf_records table (main ePRF tracking)
  await sql`
    CREATE TABLE IF NOT EXISTS eprf_records (
      id SERIAL PRIMARY KEY,
      incident_id VARCHAR(255) NOT NULL,
      patient_letter CHAR(1) NOT NULL,
      status VARCHAR(20) DEFAULT 'incomplete',
      author_discord_id VARCHAR(255) NOT NULL,
      author_callsign VARCHAR(100),
      fleet_id VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      submitted_at TIMESTAMP,
      UNIQUE(incident_id, patient_letter)
    )
  `;
  
  // Create eprf_data table (stores all form data as JSON)
  await sql`
    CREATE TABLE IF NOT EXISTS eprf_data (
      id SERIAL PRIMARY KEY,
      incident_id VARCHAR(255) NOT NULL,
      patient_letter CHAR(1) NOT NULL,
      section VARCHAR(50) NOT NULL,
      data JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(incident_id, patient_letter, section)
    )
  `;
  
  // Create indexes for faster queries
  await sql`CREATE INDEX IF NOT EXISTS idx_eprf_records_author ON eprf_records(author_discord_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_eprf_records_status ON eprf_records(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_eprf_data_incident ON eprf_data(incident_id, patient_letter)`;
  
  // Create eprf_collaborators table for collaboration
  await sql`
    CREATE TABLE IF NOT EXISTS eprf_collaborators (
      id SERIAL PRIMARY KEY,
      incident_id VARCHAR(255) NOT NULL,
      user_discord_id VARCHAR(255) NOT NULL,
      user_callsign VARCHAR(100),
      permission_level VARCHAR(20) NOT NULL DEFAULT 'view',
      added_by_discord_id VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(incident_id, user_discord_id)
    )
  `;
  
  // Create index for collaborator lookups
  await sql`CREATE INDEX IF NOT EXISTS idx_eprf_collaborators_user ON eprf_collaborators(user_discord_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_eprf_collaborators_incident ON eprf_collaborators(incident_id)`;
  
  // Create per-patient collaborators table
  await sql`
    CREATE TABLE IF NOT EXISTS eprf_patient_collaborators (
      id SERIAL PRIMARY KEY,
      incident_id VARCHAR(255) NOT NULL,
      patient_letter CHAR(1) NOT NULL,
      user_discord_id VARCHAR(255) NOT NULL,
      user_callsign VARCHAR(100),
      permission_level VARCHAR(20) NOT NULL DEFAULT 'view',
      added_by_discord_id VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(incident_id, patient_letter, user_discord_id)
    )
  `;
  
  // Create indexes for patient-level collaborator lookups
  await sql`CREATE INDEX IF NOT EXISTS idx_eprf_patient_collaborators_user ON eprf_patient_collaborators(user_discord_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_eprf_patient_collaborators_patient ON eprf_patient_collaborators(incident_id, patient_letter)`;
  
  // Create notifications table for in-app notifications
  await sql`
    CREATE TABLE IF NOT EXISTS eprf_notifications (
      id SERIAL PRIMARY KEY,
      user_discord_id VARCHAR(255) NOT NULL,
      incident_id VARCHAR(255),
      patient_letter CHAR(1),
      notification_type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      from_user_discord_id VARCHAR(255),
      from_user_callsign VARCHAR(100),
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_eprf_notifications_user ON eprf_notifications(user_discord_id, read)`;
  
  // Create presence table for live users viewing ePRFs
  await sql`
    CREATE TABLE IF NOT EXISTS eprf_presence (
      id SERIAL PRIMARY KEY,
      incident_id VARCHAR(255) NOT NULL,
      patient_letter CHAR(1) NOT NULL,
      user_discord_id VARCHAR(255) NOT NULL,
      user_callsign VARCHAR(100),
      page_name VARCHAR(50),
      last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(incident_id, patient_letter, user_discord_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_eprf_presence_incident ON eprf_presence(incident_id, patient_letter)`;
  
  // Create activity log table for change history
  await sql`
    CREATE TABLE IF NOT EXISTS eprf_activity_log (
      id SERIAL PRIMARY KEY,
      incident_id VARCHAR(255) NOT NULL,
      patient_letter CHAR(1) NOT NULL,
      user_discord_id VARCHAR(255) NOT NULL,
      user_callsign VARCHAR(100),
      action_type VARCHAR(50) NOT NULL,
      section VARCHAR(50),
      field_name VARCHAR(100),
      old_value TEXT,
      new_value TEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_eprf_activity_log_incident ON eprf_activity_log(incident_id, patient_letter)`;
  
  // Create access request table
  await sql`
    CREATE TABLE IF NOT EXISTS eprf_access_requests (
      id SERIAL PRIMARY KEY,
      incident_id VARCHAR(255) NOT NULL,
      patient_letter CHAR(1),
      requester_discord_id VARCHAR(255) NOT NULL,
      requester_callsign VARCHAR(100),
      requested_permission VARCHAR(20) DEFAULT 'view',
      status VARCHAR(20) DEFAULT 'pending',
      reviewed_by_discord_id VARCHAR(255),
      reviewed_at TIMESTAMP,
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(incident_id, requester_discord_id, status)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_eprf_access_requests_incident ON eprf_access_requests(incident_id, status)`;
  
  // Create section locks table
  await sql`
    CREATE TABLE IF NOT EXISTS eprf_section_locks (
      id SERIAL PRIMARY KEY,
      incident_id VARCHAR(255) NOT NULL,
      patient_letter CHAR(1) NOT NULL,
      section VARCHAR(50) NOT NULL,
      locked_to_level VARCHAR(20) NOT NULL,
      locked_by_discord_id VARCHAR(255) NOT NULL,
      locked_by_callsign VARCHAR(100),
      locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(incident_id, patient_letter, section)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_eprf_section_locks_patient ON eprf_section_locks(incident_id, patient_letter)`;
  
  // Create share links table
  await sql`
    CREATE TABLE IF NOT EXISTS eprf_share_links (
      id SERIAL PRIMARY KEY,
      link_code VARCHAR(64) UNIQUE NOT NULL,
      incident_id VARCHAR(255) NOT NULL,
      patient_letter CHAR(1),
      permission_level VARCHAR(20) DEFAULT 'view',
      created_by_discord_id VARCHAR(255) NOT NULL,
      used_by_discord_id VARCHAR(255),
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_eprf_share_links_code ON eprf_share_links(link_code)`;
  
  // Add expires_at column to eprf_collaborators if it doesn't exist (for time-limited access)
  await sql`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eprf_collaborators' AND column_name='expires_at') THEN
        ALTER TABLE eprf_collaborators ADD COLUMN expires_at TIMESTAMP;
      END IF;
    END $$
  `;
  
  // Add expires_at column to eprf_patient_collaborators if it doesn't exist
  await sql`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eprf_patient_collaborators' AND column_name='expires_at') THEN
        ALTER TABLE eprf_patient_collaborators ADD COLUMN expires_at TIMESTAMP;
      END IF;
    END $$
  `;
  
  return { success: true };
}

// ePRF Record operations
export async function createEPRFRecord(
  incidentId: string,
  patientLetter: string,
  authorDiscordId: string,
  authorCallsign: string,
  fleetId: string
) {
  const sql = getDb();
  
  const result = await sql`
    INSERT INTO eprf_records (incident_id, patient_letter, author_discord_id, author_callsign, fleet_id)
    VALUES (${incidentId}, ${patientLetter}, ${authorDiscordId}, ${authorCallsign}, ${fleetId})
    ON CONFLICT (incident_id, patient_letter) 
    DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  
  return result[0];
}

export async function getEPRFRecord(incidentId: string, patientLetter: string) {
  const sql = getDb();
  
  const result = await sql`
    SELECT * FROM eprf_records 
    WHERE incident_id = ${incidentId} AND patient_letter = ${patientLetter}
  `;
  
  return result[0] || null;
}

export async function getEPRFRecordsByUser(discordId: string) {
  const sql = getDb();
  
  const result = await sql`
    SELECT * FROM eprf_records 
    WHERE author_discord_id = ${discordId}
    ORDER BY created_at DESC
  `;
  
  return result;
}

export async function getEPRFRecordsByStatus(discordId: string, status: string) {
  const sql = getDb();
  
  const result = await sql`
    SELECT * FROM eprf_records 
    WHERE author_discord_id = ${discordId} AND status = ${status}
    ORDER BY created_at DESC
  `;
  
  return result;
}

export async function markEPRFComplete(incidentId: string, patientLetter: string) {
  const sql = getDb();
  
  const result = await sql`
    UPDATE eprf_records 
    SET status = 'complete', submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE incident_id = ${incidentId} AND patient_letter = ${patientLetter}
    RETURNING *
  `;
  
  return result[0];
}

export async function deleteEPRFRecord(incidentId: string, patientLetter: string) {
  const sql = getDb();
  
  // Delete data first (foreign key would normally handle this)
  await sql`
    DELETE FROM eprf_data 
    WHERE incident_id = ${incidentId} AND patient_letter = ${patientLetter}
  `;
  
  // Then delete the record
  const result = await sql`
    DELETE FROM eprf_records 
    WHERE incident_id = ${incidentId} AND patient_letter = ${patientLetter}
    AND status = 'incomplete'
    RETURNING *
  `;
  
  return result[0] || null;
}

export async function transferEPRF(
  incidentId: string,
  patientLetter: string,
  newAuthorDiscordId: string,
  newAuthorCallsign: string
) {
  const sql = getDb();
  
  const result = await sql`
    UPDATE eprf_records 
    SET author_discord_id = ${newAuthorDiscordId}, 
        author_callsign = ${newAuthorCallsign},
        updated_at = CURRENT_TIMESTAMP
    WHERE incident_id = ${incidentId} AND patient_letter = ${patientLetter}
    RETURNING *
  `;
  
  return result[0];
}

// ePRF Data operations (form data)
export async function saveEPRFData(
  incidentId: string,
  patientLetter: string,
  section: string,
  data: any
) {
  const sql = getDb();
  
  const result = await sql`
    INSERT INTO eprf_data (incident_id, patient_letter, section, data)
    VALUES (${incidentId}, ${patientLetter}, ${section}, ${JSON.stringify(data)})
    ON CONFLICT (incident_id, patient_letter, section) 
    DO UPDATE SET data = ${JSON.stringify(data)}, updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  
  return result[0];
}

export async function getEPRFData(incidentId: string, patientLetter: string, section: string) {
  const sql = getDb();
  
  const result = await sql`
    SELECT data FROM eprf_data 
    WHERE incident_id = ${incidentId} 
    AND patient_letter = ${patientLetter} 
    AND section = ${section}
  `;
  
  return result[0]?.data || null;
}

export async function getAllEPRFData(incidentId: string, patientLetter: string) {
  const sql = getDb();
  
  const result = await sql`
    SELECT section, data FROM eprf_data 
    WHERE incident_id = ${incidentId} AND patient_letter = ${patientLetter}
  `;
  
  // Convert to object with section names as keys
  const dataObj: { [key: string]: any } = {};
  for (const row of result) {
    dataObj[row.section] = row.data;
  }
  
  return dataObj;
}

// User operations
export async function upsertUser(
  discordId: string,
  discordUsername: string,
  callsign: string,
  vehicle: string
) {
  const sql = getDb();
  
  const result = await sql`
    INSERT INTO users (discord_id, discord_username, callsign, vehicle, last_login)
    VALUES (${discordId}, ${discordUsername}, ${callsign}, ${vehicle}, CURRENT_TIMESTAMP)
    ON CONFLICT (discord_id) 
    DO UPDATE SET 
      discord_username = ${discordUsername},
      callsign = ${callsign},
      vehicle = ${vehicle},
      last_login = CURRENT_TIMESTAMP
    RETURNING *
  `;
  
  return result[0];
}

export async function getActiveUsers() {
  const sql = getDb();
  
  // Get users who logged in within the last 24 hours
  const result = await sql`
    SELECT * FROM users 
    WHERE last_login > NOW() - INTERVAL '24 hours'
    ORDER BY last_login DESC
  `;
  
  return result;
}

export async function getUser(discordId: string) {
  const sql = getDb();
  
  const result = await sql`
    SELECT * FROM users WHERE discord_id = ${discordId}
  `;
  
  return result[0] || null;
}

// Search and filter ePRFs
export async function searchEPRFs(
  discordId: string,
  query?: string,
  status?: string,
  dateFrom?: string,
  dateTo?: string
) {
  const sql = getDb();
  
  let result;
  
  if (status && status !== 'all') {
    if (query) {
      result = await sql`
        SELECT * FROM eprf_records 
        WHERE author_discord_id = ${discordId}
        AND status = ${status}
        AND (incident_id ILIKE ${'%' + query + '%'} OR patient_letter ILIKE ${'%' + query + '%'})
        ORDER BY created_at DESC
      `;
    } else {
      result = await sql`
        SELECT * FROM eprf_records 
        WHERE author_discord_id = ${discordId}
        AND status = ${status}
        ORDER BY created_at DESC
      `;
    }
  } else {
    if (query) {
      result = await sql`
        SELECT * FROM eprf_records 
        WHERE author_discord_id = ${discordId}
        AND (incident_id ILIKE ${'%' + query + '%'} OR patient_letter ILIKE ${'%' + query + '%'})
        ORDER BY created_at DESC
      `;
    } else {
      result = await sql`
        SELECT * FROM eprf_records 
        WHERE author_discord_id = ${discordId}
        ORDER BY created_at DESC
      `;
    }
  }
  
  return result;
}

// Admin functions - get ALL ePRF records
export async function getAllEPRFRecords(
  query?: string,
  status?: string,
  authorId?: string
) {
  const sql = getDb();
  
  let result;
  
  // Build query based on filters
  if (authorId && status && status !== 'all') {
    if (query) {
      result = await sql`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.author_discord_id = ${authorId}
        AND r.status = ${status}
        AND (r.incident_id ILIKE ${'%' + query + '%'} OR r.patient_letter ILIKE ${'%' + query + '%'} OR r.author_callsign ILIKE ${'%' + query + '%'})
        ORDER BY r.created_at DESC
      `;
    } else {
      result = await sql`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.author_discord_id = ${authorId}
        AND r.status = ${status}
        ORDER BY r.created_at DESC
      `;
    }
  } else if (authorId) {
    if (query) {
      result = await sql`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.author_discord_id = ${authorId}
        AND (r.incident_id ILIKE ${'%' + query + '%'} OR r.patient_letter ILIKE ${'%' + query + '%'} OR r.author_callsign ILIKE ${'%' + query + '%'})
        ORDER BY r.created_at DESC
      `;
    } else {
      result = await sql`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.author_discord_id = ${authorId}
        ORDER BY r.created_at DESC
      `;
    }
  } else if (status && status !== 'all') {
    if (query) {
      result = await sql`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.status = ${status}
        AND (r.incident_id ILIKE ${'%' + query + '%'} OR r.patient_letter ILIKE ${'%' + query + '%'} OR r.author_callsign ILIKE ${'%' + query + '%'})
        ORDER BY r.created_at DESC
      `;
    } else {
      result = await sql`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.status = ${status}
        ORDER BY r.created_at DESC
      `;
    }
  } else {
    if (query) {
      result = await sql`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.incident_id ILIKE ${'%' + query + '%'} OR r.patient_letter ILIKE ${'%' + query + '%'} OR r.author_callsign ILIKE ${'%' + query + '%'}
        ORDER BY r.created_at DESC
      `;
    } else {
      result = await sql`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        ORDER BY r.created_at DESC
      `;
    }
  }
  
  return result;
}

// Admin: Get all users
export async function getAllUsers() {
  const sql = getDb();
  
  const result = await sql`
    SELECT * FROM users 
    ORDER BY last_login DESC
  `;
  
  return result;
}

// Admin: Force delete any ePRF (even complete ones)
export async function adminDeleteEPRFRecord(incidentId: string, patientLetter: string) {
  const sql = getDb();
  
  // Delete data first
  await sql`
    DELETE FROM eprf_data 
    WHERE incident_id = ${incidentId} AND patient_letter = ${patientLetter}
  `;
  
  // Then delete the record (no status check)
  const result = await sql`
    DELETE FROM eprf_records 
    WHERE incident_id = ${incidentId} AND patient_letter = ${patientLetter}
    RETURNING *
  `;
  
  return result[0] || null;
}

// Admin: Update ePRF record
export async function adminUpdateEPRFRecord(
  incidentId: string, 
  patientLetter: string,
  updates: {
    status?: string;
    author_discord_id?: string;
    author_callsign?: string;
  }
) {
  const sql = getDb();
  
  const result = await sql`
    UPDATE eprf_records 
    SET 
      status = COALESCE(${updates.status}, status),
      author_discord_id = COALESCE(${updates.author_discord_id}, author_discord_id),
      author_callsign = COALESCE(${updates.author_callsign}, author_callsign),
      updated_at = CURRENT_TIMESTAMP
    WHERE incident_id = ${incidentId} AND patient_letter = ${patientLetter}
    RETURNING *
  `;
  
  return result[0];
}

// ==========================================
// COLLABORATION FUNCTIONS
// ==========================================

export type PermissionLevel = 'owner' | 'manage' | 'edit' | 'view';

export interface Collaborator {
  id: number;
  incident_id: string;
  user_discord_id: string;
  user_callsign: string;
  permission_level: PermissionLevel;
  added_by_discord_id: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

// Add a collaborator to an ePRF
export async function addCollaborator(
  incidentId: string,
  userDiscordId: string,
  userCallsign: string,
  permissionLevel: PermissionLevel,
  addedByDiscordId: string
): Promise<Collaborator | null> {
  const sql = getDb();
  
  const result = await sql`
    INSERT INTO eprf_collaborators (incident_id, user_discord_id, user_callsign, permission_level, added_by_discord_id)
    VALUES (${incidentId}, ${userDiscordId}, ${userCallsign}, ${permissionLevel}, ${addedByDiscordId})
    ON CONFLICT (incident_id, user_discord_id) 
    DO UPDATE SET 
      permission_level = ${permissionLevel},
      user_callsign = ${userCallsign},
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  
  return (result[0] as Collaborator) || null;
}

// Remove a collaborator from an ePRF
export async function removeCollaborator(
  incidentId: string,
  userDiscordId: string
): Promise<boolean> {
  const sql = getDb();
  
  const result = await sql`
    DELETE FROM eprf_collaborators 
    WHERE incident_id = ${incidentId} AND user_discord_id = ${userDiscordId}
    RETURNING *
  `;
  
  return result.length > 0;
}

// Get all collaborators for an ePRF
export async function getCollaborators(incidentId: string): Promise<Collaborator[]> {
  const sql = getDb();
  
  const result = await sql`
    SELECT c.*, u.discord_username 
    FROM eprf_collaborators c
    LEFT JOIN users u ON c.user_discord_id = u.discord_id
    WHERE c.incident_id = ${incidentId}
    ORDER BY 
      CASE c.permission_level 
        WHEN 'owner' THEN 1 
        WHEN 'manage' THEN 2 
        WHEN 'edit' THEN 3 
        WHEN 'view' THEN 4 
      END
  `;
  
  return result as Collaborator[];
}

// Get a user's permission level for an ePRF
export async function getCollaboratorPermission(
  incidentId: string,
  userDiscordId: string
): Promise<PermissionLevel | null> {
  const sql = getDb();
  
  // First check if user is the owner (author)
  const ownerCheck = await sql`
    SELECT author_discord_id FROM eprf_records 
    WHERE incident_id = ${incidentId}
    LIMIT 1
  `;
  
  if (ownerCheck[0]?.author_discord_id === userDiscordId) {
    return 'owner';
  }
  
  // Then check collaborators table
  const result = await sql`
    SELECT permission_level FROM eprf_collaborators 
    WHERE incident_id = ${incidentId} AND user_discord_id = ${userDiscordId}
  `;
  
  return result[0]?.permission_level || null;
}

// Update collaborator permission level
export async function updateCollaboratorPermission(
  incidentId: string,
  userDiscordId: string,
  newPermissionLevel: PermissionLevel
): Promise<Collaborator | null> {
  const sql = getDb();
  
  const result = await sql`
    UPDATE eprf_collaborators 
    SET permission_level = ${newPermissionLevel}, updated_at = CURRENT_TIMESTAMP
    WHERE incident_id = ${incidentId} AND user_discord_id = ${userDiscordId}
    RETURNING *
  `;
  
  return (result[0] as Collaborator) || null;
}

// Get all ePRFs shared with a user (for dashboard) with detailed permission info
export async function getSharedEPRFs(userDiscordId: string): Promise<any[]> {
  const sql = getDb();
  
  // Get incident-level collaborations
  const incidentCollabs = await sql`
    SELECT DISTINCT r.incident_id, r.patient_letter, r.status, r.author_discord_id, 
           r.author_callsign, r.fleet_id, r.created_at, r.updated_at,
           c.permission_level as incident_permission
    FROM eprf_records r
    INNER JOIN eprf_collaborators c ON r.incident_id = c.incident_id
    WHERE c.user_discord_id = ${userDiscordId}
    ORDER BY r.updated_at DESC
  `;
  
  // Get patient-level collaborations (where user has access to specific patients only)
  const patientCollabs = await sql`
    SELECT DISTINCT r.incident_id, r.patient_letter, r.status, r.author_discord_id, 
           r.author_callsign, r.fleet_id, r.created_at, r.updated_at,
           pc.permission_level as patient_permission
    FROM eprf_records r
    INNER JOIN eprf_patient_collaborators pc ON r.incident_id = pc.incident_id AND r.patient_letter = pc.patient_letter
    WHERE pc.user_discord_id = ${userDiscordId}
      AND NOT EXISTS (
        SELECT 1 FROM eprf_collaborators c 
        WHERE c.incident_id = r.incident_id AND c.user_discord_id = ${userDiscordId}
      )
    ORDER BY r.updated_at DESC
  `;
  
  // Combine and dedupe results
  const combined = [
    ...incidentCollabs.map((r: any) => ({ ...r, permission_level: r.incident_permission, access_type: 'incident' })),
    ...patientCollabs.map((r: any) => ({ ...r, permission_level: r.patient_permission, access_type: 'patient' }))
  ];
  
  return combined;
}

// Sync high-level permissions across all patients in an incident
export async function syncHighLevelPermissions(
  incidentId: string,
  userDiscordId: string,
  userCallsign: string,
  permissionLevel: PermissionLevel,
  addedByDiscordId: string
): Promise<void> {
  const sql = getDb();
  
  // Only sync for owner or manage permissions
  if (permissionLevel !== 'owner' && permissionLevel !== 'manage') {
    return;
  }
  
  // Get all patients for this incident
  const patients = await sql`
    SELECT patient_letter FROM eprf_records WHERE incident_id = ${incidentId}
  `;
  
  // Add the user to all patient collaborators with manage permission
  for (const patient of patients) {
    await sql`
      INSERT INTO eprf_patient_collaborators 
        (incident_id, patient_letter, user_discord_id, user_callsign, permission_level, added_by_discord_id)
      VALUES 
        (${incidentId}, ${patient.patient_letter}, ${userDiscordId}, ${userCallsign}, 'manage', ${addedByDiscordId})
      ON CONFLICT (incident_id, patient_letter, user_discord_id) 
      DO UPDATE SET permission_level = 'manage', updated_at = CURRENT_TIMESTAMP
    `;
  }
}

// Transfer ownership (current owner becomes view collaborator, new user becomes owner)
export async function transferOwnership(
  incidentId: string,
  currentOwnerDiscordId: string,
  currentOwnerCallsign: string,
  newOwnerDiscordId: string,
  newOwnerCallsign: string
): Promise<boolean> {
  const sql = getDb();
  
  try {
    // Update the record to new owner
    await sql`
      UPDATE eprf_records 
      SET author_discord_id = ${newOwnerDiscordId}, 
          author_callsign = ${newOwnerCallsign},
          updated_at = CURRENT_TIMESTAMP
      WHERE incident_id = ${incidentId}
    `;
    
    // Remove new owner from collaborators if they were there
    await sql`
      DELETE FROM eprf_collaborators 
      WHERE incident_id = ${incidentId} AND user_discord_id = ${newOwnerDiscordId}
    `;
    
    // Add previous owner as view collaborator
    await sql`
      INSERT INTO eprf_collaborators (incident_id, user_discord_id, user_callsign, permission_level, added_by_discord_id)
      VALUES (${incidentId}, ${currentOwnerDiscordId}, ${currentOwnerCallsign}, 'view', ${newOwnerDiscordId})
      ON CONFLICT (incident_id, user_discord_id) 
      DO UPDATE SET permission_level = 'view', updated_at = CURRENT_TIMESTAMP
    `;
    
    return true;
  } catch (error) {
    console.error('Transfer ownership error:', error);
    return false;
  }
}

// ==========================================
// PER-PATIENT COLLABORATION FUNCTIONS
// ==========================================

export interface PatientCollaborator {
  id: number;
  incident_id: string;
  patient_letter: string;
  user_discord_id: string;
  user_callsign: string;
  permission_level: PermissionLevel;
  added_by_discord_id: string;
  created_at: string;
  updated_at: string;
}

// Add a collaborator to a specific patient
export async function addPatientCollaborator(
  incidentId: string,
  patientLetter: string,
  userDiscordId: string,
  userCallsign: string,
  permissionLevel: PermissionLevel,
  addedByDiscordId: string
): Promise<PatientCollaborator | null> {
  const sql = getDb();
  
  const result = await sql`
    INSERT INTO eprf_patient_collaborators (incident_id, patient_letter, user_discord_id, user_callsign, permission_level, added_by_discord_id)
    VALUES (${incidentId}, ${patientLetter}, ${userDiscordId}, ${userCallsign}, ${permissionLevel}, ${addedByDiscordId})
    ON CONFLICT (incident_id, patient_letter, user_discord_id) 
    DO UPDATE SET 
      permission_level = ${permissionLevel},
      user_callsign = ${userCallsign},
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  
  return (result[0] as PatientCollaborator) || null;
}

// Remove a collaborator from a specific patient
export async function removePatientCollaborator(
  incidentId: string,
  patientLetter: string,
  userDiscordId: string
): Promise<boolean> {
  const sql = getDb();
  
  const result = await sql`
    DELETE FROM eprf_patient_collaborators 
    WHERE incident_id = ${incidentId} 
      AND patient_letter = ${patientLetter} 
      AND user_discord_id = ${userDiscordId}
    RETURNING *
  `;
  
  return result.length > 0;
}

// Get all collaborators for a specific patient
export async function getPatientCollaborators(
  incidentId: string,
  patientLetter: string
): Promise<PatientCollaborator[]> {
  const sql = getDb();
  
  const result = await sql`
    SELECT pc.*, u.discord_username 
    FROM eprf_patient_collaborators pc
    LEFT JOIN users u ON pc.user_discord_id = u.discord_id
    WHERE pc.incident_id = ${incidentId} AND pc.patient_letter = ${patientLetter}
    ORDER BY 
      CASE pc.permission_level 
        WHEN 'owner' THEN 1 
        WHEN 'manage' THEN 2 
        WHEN 'edit' THEN 3 
        WHEN 'view' THEN 4 
      END
  `;
  
  return result as PatientCollaborator[];
}

// Get a user's permission level for a specific patient
// Permission hierarchy: incident owner > incident manager > patient owner > patient permissions
export async function getPatientPermission(
  incidentId: string,
  patientLetter: string,
  userDiscordId: string
): Promise<PermissionLevel | null> {
  const sql = getDb();
  
  // First check if user is the overall incident owner (author of first patient)
  const incidentOwnerCheck = await sql`
    SELECT author_discord_id FROM eprf_records 
    WHERE incident_id = ${incidentId}
    ORDER BY patient_letter ASC
    LIMIT 1
  `;
  
  if (incidentOwnerCheck[0]?.author_discord_id === userDiscordId) {
    return 'owner';
  }
  
  // Check if user is an incident-level collaborator with manage+ permission
  const incidentCollab = await sql`
    SELECT permission_level FROM eprf_collaborators 
    WHERE incident_id = ${incidentId} AND user_discord_id = ${userDiscordId}
  `;
  
  const incidentPermission = incidentCollab[0]?.permission_level as PermissionLevel | undefined;
  if (incidentPermission === 'owner' || incidentPermission === 'manage') {
    // Incident managers have manage access to all patients
    return incidentPermission;
  }
  
  // Check if user is the patient owner (author_discord_id for this specific patient)
  const patientOwnerCheck = await sql`
    SELECT author_discord_id FROM eprf_records 
    WHERE incident_id = ${incidentId} AND patient_letter = ${patientLetter}
  `;
  
  if (patientOwnerCheck[0]?.author_discord_id === userDiscordId) {
    return 'owner';
  }
  
  // Check patient-level collaborators
  const patientCollab = await sql`
    SELECT permission_level FROM eprf_patient_collaborators 
    WHERE incident_id = ${incidentId} 
      AND patient_letter = ${patientLetter} 
      AND user_discord_id = ${userDiscordId}
  `;
  
  if (patientCollab[0]?.permission_level) {
    return patientCollab[0].permission_level as PermissionLevel;
  }
  
  // Fall back to incident-level permission (for edit/view users)
  return incidentPermission || null;
}

// Check if user can transfer a patient (must be incident owner or patient owner)
export async function canTransferPatient(
  incidentId: string,
  patientLetter: string,
  userDiscordId: string
): Promise<boolean> {
  const sql = getDb();
  
  // Check if user is the overall incident owner
  const incidentOwnerCheck = await sql`
    SELECT author_discord_id FROM eprf_records 
    WHERE incident_id = ${incidentId}
    ORDER BY patient_letter ASC
    LIMIT 1
  `;
  
  if (incidentOwnerCheck[0]?.author_discord_id === userDiscordId) {
    return true;
  }
  
  // Check if user is the patient owner
  const patientOwnerCheck = await sql`
    SELECT author_discord_id FROM eprf_records 
    WHERE incident_id = ${incidentId} AND patient_letter = ${patientLetter}
  `;
  
  if (patientOwnerCheck[0]?.author_discord_id === userDiscordId) {
    return true;
  }
  
  return false;
}

// Update patient collaborator permission level
export async function updatePatientCollaboratorPermission(
  incidentId: string,
  patientLetter: string,
  userDiscordId: string,
  newPermissionLevel: PermissionLevel
): Promise<PatientCollaborator | null> {
  const sql = getDb();
  
  const result = await sql`
    UPDATE eprf_patient_collaborators 
    SET permission_level = ${newPermissionLevel}, updated_at = CURRENT_TIMESTAMP
    WHERE incident_id = ${incidentId} 
      AND patient_letter = ${patientLetter}
      AND user_discord_id = ${userDiscordId}
    RETURNING *
  `;
  
  return (result[0] as PatientCollaborator) || null;
}

// Auto-add incident managers to a new patient
export async function addManagersToPatient(
  incidentId: string,
  patientLetter: string,
  addedByDiscordId: string
): Promise<void> {
  const sql = getDb();
  
  // Get all incident-level collaborators with manage or owner permissions
  const managers = await sql`
    SELECT user_discord_id, user_callsign, permission_level 
    FROM eprf_collaborators 
    WHERE incident_id = ${incidentId} 
      AND (permission_level = 'owner' OR permission_level = 'manage')
  `;
  
  // Add each manager to the patient with manage permission
  for (const manager of managers) {
    await sql`
      INSERT INTO eprf_patient_collaborators 
        (incident_id, patient_letter, user_discord_id, user_callsign, permission_level, added_by_discord_id)
      VALUES 
        (${incidentId}, ${patientLetter}, ${manager.user_discord_id}, ${manager.user_callsign}, 'manage', ${addedByDiscordId})
      ON CONFLICT (incident_id, patient_letter, user_discord_id) DO NOTHING
    `;
  }
}

// Transfer patient ownership to another user
export async function transferPatientOwnership(
  incidentId: string,
  patientLetter: string,
  currentOwnerDiscordId: string,
  currentOwnerCallsign: string,
  newOwnerDiscordId: string,
  newOwnerCallsign: string
): Promise<boolean> {
  const sql = getDb();
  
  try {
    // Update the patient record to new owner
    await sql`
      UPDATE eprf_records 
      SET author_discord_id = ${newOwnerDiscordId}, 
          author_callsign = ${newOwnerCallsign},
          updated_at = CURRENT_TIMESTAMP
      WHERE incident_id = ${incidentId} AND patient_letter = ${patientLetter}
    `;
    
    // Remove new owner from patient collaborators if they were there
    await sql`
      DELETE FROM eprf_patient_collaborators 
      WHERE incident_id = ${incidentId} 
        AND patient_letter = ${patientLetter} 
        AND user_discord_id = ${newOwnerDiscordId}
    `;
    
    // Add previous owner as edit collaborator for this patient
    await sql`
      INSERT INTO eprf_patient_collaborators 
        (incident_id, patient_letter, user_discord_id, user_callsign, permission_level, added_by_discord_id)
      VALUES 
        (${incidentId}, ${patientLetter}, ${currentOwnerDiscordId}, ${currentOwnerCallsign}, 'edit', ${newOwnerDiscordId})
      ON CONFLICT (incident_id, patient_letter, user_discord_id) 
      DO UPDATE SET permission_level = 'edit', updated_at = CURRENT_TIMESTAMP
    `;
    
    return true;
  } catch (error) {
    console.error('Transfer patient ownership error:', error);
    return false;
  }
}

// ==========================================
// NOTIFICATION FUNCTIONS
// ==========================================

export interface Notification {
  id: number;
  user_discord_id: string;
  incident_id?: string;
  patient_letter?: string;
  notification_type: string;
  title: string;
  message: string;
  from_user_discord_id?: string;
  from_user_callsign?: string;
  read: boolean;
  created_at: string;
}

export async function createNotification(
  userDiscordId: string,
  notificationType: string,
  title: string,
  message: string,
  options?: {
    incidentId?: string;
    patientLetter?: string;
    fromUserDiscordId?: string;
    fromUserCallsign?: string;
  }
): Promise<Notification | null> {
  const sql = getDb();
  
  const result = await sql`
    INSERT INTO eprf_notifications 
      (user_discord_id, incident_id, patient_letter, notification_type, title, message, from_user_discord_id, from_user_callsign)
    VALUES 
      (${userDiscordId}, ${options?.incidentId || null}, ${options?.patientLetter || null}, 
       ${notificationType}, ${title}, ${message}, 
       ${options?.fromUserDiscordId || null}, ${options?.fromUserCallsign || null})
    RETURNING *
  `;
  
  return (result[0] as Notification) || null;
}

export async function getNotifications(userDiscordId: string, unreadOnly: boolean = false): Promise<Notification[]> {
  const sql = getDb();
  
  let result;
  if (unreadOnly) {
    result = await sql`
      SELECT * FROM eprf_notifications 
      WHERE user_discord_id = ${userDiscordId} AND read = false
      ORDER BY created_at DESC
      LIMIT 50
    `;
  } else {
    result = await sql`
      SELECT * FROM eprf_notifications 
      WHERE user_discord_id = ${userDiscordId}
      ORDER BY created_at DESC
      LIMIT 100
    `;
  }
  
  return result as Notification[];
}

export async function markNotificationRead(notificationId: number, userDiscordId: string): Promise<boolean> {
  const sql = getDb();
  
  const result = await sql`
    UPDATE eprf_notifications 
    SET read = true 
    WHERE id = ${notificationId} AND user_discord_id = ${userDiscordId}
    RETURNING id
  `;
  
  return result.length > 0;
}

export async function markAllNotificationsRead(userDiscordId: string): Promise<boolean> {
  const sql = getDb();
  
  await sql`
    UPDATE eprf_notifications 
    SET read = true 
    WHERE user_discord_id = ${userDiscordId} AND read = false
  `;
  
  return true;
}

export async function getUnreadNotificationCount(userDiscordId: string): Promise<number> {
  const sql = getDb();
  
  const result = await sql`
    SELECT COUNT(*) as count FROM eprf_notifications 
    WHERE user_discord_id = ${userDiscordId} AND read = false
  `;
  
  return parseInt(result[0]?.count || '0');
}

// ==========================================
// PRESENCE FUNCTIONS (Live users viewing)
// ==========================================

export interface Presence {
  id: number;
  incident_id: string;
  patient_letter: string;
  user_discord_id: string;
  user_callsign: string;
  page_name: string;
  last_seen: string;
}

export async function updatePresence(
  incidentId: string,
  patientLetter: string,
  userDiscordId: string,
  userCallsign: string,
  pageName: string
): Promise<Presence | null> {
  const sql = getDb();
  
  const result = await sql`
    INSERT INTO eprf_presence (incident_id, patient_letter, user_discord_id, user_callsign, page_name, last_seen)
    VALUES (${incidentId}, ${patientLetter}, ${userDiscordId}, ${userCallsign}, ${pageName}, CURRENT_TIMESTAMP)
    ON CONFLICT (incident_id, patient_letter, user_discord_id)
    DO UPDATE SET page_name = ${pageName}, last_seen = CURRENT_TIMESTAMP
    RETURNING *
  `;
  
  return (result[0] as Presence) || null;
}

export async function getActivePresence(incidentId: string, patientLetter: string): Promise<Presence[]> {
  const sql = getDb();
  
  // Get users active in last 30 seconds
  const result = await sql`
    SELECT * FROM eprf_presence 
    WHERE incident_id = ${incidentId} 
      AND patient_letter = ${patientLetter}
      AND last_seen > NOW() - INTERVAL '30 seconds'
    ORDER BY last_seen DESC
  `;
  
  return result as Presence[];
}

export async function removePresence(incidentId: string, patientLetter: string, userDiscordId: string): Promise<boolean> {
  const sql = getDb();
  
  const result = await sql`
    DELETE FROM eprf_presence 
    WHERE incident_id = ${incidentId} 
      AND patient_letter = ${patientLetter}
      AND user_discord_id = ${userDiscordId}
    RETURNING id
  `;
  
  return result.length > 0;
}

export async function cleanupStalePresence(): Promise<number> {
  const sql = getDb();
  
  // Remove presence older than 1 minute
  const result = await sql`
    DELETE FROM eprf_presence 
    WHERE last_seen < NOW() - INTERVAL '1 minute'
    RETURNING id
  `;
  
  return result.length;
}

// ==========================================
// ACTIVITY LOG FUNCTIONS
// ==========================================

export interface ActivityLogEntry {
  id: number;
  incident_id: string;
  patient_letter: string;
  user_discord_id: string;
  user_callsign: string;
  action_type: string;
  section?: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  description?: string;
  created_at: string;
}

export async function logActivity(
  incidentId: string,
  patientLetter: string,
  userDiscordId: string,
  userCallsign: string,
  actionType: string,
  options?: {
    section?: string;
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    description?: string;
  }
): Promise<ActivityLogEntry | null> {
  const sql = getDb();
  
  const result = await sql`
    INSERT INTO eprf_activity_log 
      (incident_id, patient_letter, user_discord_id, user_callsign, action_type, section, field_name, old_value, new_value, description)
    VALUES 
      (${incidentId}, ${patientLetter}, ${userDiscordId}, ${userCallsign}, ${actionType},
       ${options?.section || null}, ${options?.fieldName || null}, 
       ${options?.oldValue || null}, ${options?.newValue || null}, ${options?.description || null})
    RETURNING *
  `;
  
  return (result[0] as ActivityLogEntry) || null;
}

export async function getActivityLog(
  incidentId: string, 
  patientLetter: string,
  limit: number = 50
): Promise<ActivityLogEntry[]> {
  const sql = getDb();
  
  const result = await sql`
    SELECT * FROM eprf_activity_log 
    WHERE incident_id = ${incidentId} AND patient_letter = ${patientLetter}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  
  return result as ActivityLogEntry[];
}

// ==========================================
// ACCESS REQUEST FUNCTIONS
// ==========================================

export interface AccessRequest {
  id: number;
  incident_id: string;
  patient_letter?: string;
  requester_discord_id: string;
  requester_callsign: string;
  requested_permission: PermissionLevel;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by_discord_id?: string;
  reviewed_at?: string;
  message?: string;
  created_at: string;
}

export async function createAccessRequest(
  incidentId: string,
  requesterDiscordId: string,
  requesterCallsign: string,
  requestedPermission: PermissionLevel = 'view',
  options?: {
    patientLetter?: string;
    message?: string;
  }
): Promise<AccessRequest | null> {
  const sql = getDb();
  
  const result = await sql`
    INSERT INTO eprf_access_requests 
      (incident_id, patient_letter, requester_discord_id, requester_callsign, requested_permission, message)
    VALUES 
      (${incidentId}, ${options?.patientLetter || null}, ${requesterDiscordId}, ${requesterCallsign}, ${requestedPermission}, ${options?.message || null})
    ON CONFLICT (incident_id, requester_discord_id, status) WHERE status = 'pending'
    DO NOTHING
    RETURNING *
  `;
  
  return (result[0] as AccessRequest) || null;
}

export async function getPendingAccessRequests(incidentId: string): Promise<AccessRequest[]> {
  const sql = getDb();
  
  const result = await sql`
    SELECT * FROM eprf_access_requests 
    WHERE incident_id = ${incidentId} AND status = 'pending'
    ORDER BY created_at DESC
  `;
  
  return result as AccessRequest[];
}

export async function reviewAccessRequest(
  requestId: number,
  reviewerDiscordId: string,
  approved: boolean
): Promise<AccessRequest | null> {
  const sql = getDb();
  
  const result = await sql`
    UPDATE eprf_access_requests 
    SET status = ${approved ? 'approved' : 'rejected'},
        reviewed_by_discord_id = ${reviewerDiscordId},
        reviewed_at = CURRENT_TIMESTAMP
    WHERE id = ${requestId}
    RETURNING *
  `;
  
  return (result[0] as AccessRequest) || null;
}

// ==========================================
// SECTION LOCK FUNCTIONS
// ==========================================

export interface SectionLock {
  id: number;
  incident_id: string;
  patient_letter: string;
  section: string;
  locked_to_level: PermissionLevel;
  locked_by_discord_id: string;
  locked_by_callsign: string;
  locked_at: string;
}

// Lock a section - permission hierarchy for locking:
// manage can lock to edit (edit users can't modify)
// owner can lock to manage (managers can't modify)
// patient_owner can lock to manage (for their patient only)
// incident_owner can lock to owner (only they can edit)
export async function lockSection(
  incidentId: string,
  patientLetter: string,
  section: string,
  lockedToLevel: PermissionLevel,
  lockerDiscordId: string,
  lockerCallsign: string
): Promise<SectionLock | null> {
  const sql = getDb();
  
  const result = await sql`
    INSERT INTO eprf_section_locks 
      (incident_id, patient_letter, section, locked_to_level, locked_by_discord_id, locked_by_callsign)
    VALUES 
      (${incidentId}, ${patientLetter}, ${section}, ${lockedToLevel}, ${lockerDiscordId}, ${lockerCallsign})
    ON CONFLICT (incident_id, patient_letter, section)
    DO UPDATE SET locked_to_level = ${lockedToLevel}, locked_by_discord_id = ${lockerDiscordId}, 
                  locked_by_callsign = ${lockerCallsign}, locked_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  
  return (result[0] as SectionLock) || null;
}

export async function unlockSection(
  incidentId: string,
  patientLetter: string,
  section: string
): Promise<boolean> {
  const sql = getDb();
  
  const result = await sql`
    DELETE FROM eprf_section_locks 
    WHERE incident_id = ${incidentId} 
      AND patient_letter = ${patientLetter}
      AND section = ${section}
    RETURNING id
  `;
  
  return result.length > 0;
}

export async function getSectionLocks(incidentId: string, patientLetter: string): Promise<SectionLock[]> {
  const sql = getDb();
  
  const result = await sql`
    SELECT * FROM eprf_section_locks 
    WHERE incident_id = ${incidentId} AND patient_letter = ${patientLetter}
  `;
  
  return result as SectionLock[];
}

export async function getSectionLock(
  incidentId: string, 
  patientLetter: string, 
  section: string
): Promise<SectionLock | null> {
  const sql = getDb();
  
  const result = await sql`
    SELECT * FROM eprf_section_locks 
    WHERE incident_id = ${incidentId} 
      AND patient_letter = ${patientLetter}
      AND section = ${section}
  `;
  
  return (result[0] as SectionLock) || null;
}

// Check if a user can edit a section based on lock status and their permission
export async function canEditSection(
  incidentId: string,
  patientLetter: string,
  section: string,
  userPermission: PermissionLevel
): Promise<boolean> {
  const lock = await getSectionLock(incidentId, patientLetter, section);
  
  if (!lock) {
    // No lock, normal permission rules apply
    return userPermission === 'owner' || userPermission === 'manage' || userPermission === 'edit';
  }
  
  // Permission hierarchy: owner > manage > edit > view
  const permissionOrder: Record<PermissionLevel, number> = {
    'owner': 4,
    'manage': 3,
    'edit': 2,
    'view': 1
  };
  
  // User can edit if their permission is higher than the lock level
  return permissionOrder[userPermission] > permissionOrder[lock.locked_to_level];
}

// Check if user can lock a section to a given level
export function canLockToLevel(userPermission: PermissionLevel, targetLevel: PermissionLevel): boolean {
  // Permission hierarchy for locking:
  // - manage can lock to edit
  // - owner can lock to manage or edit
  // - incident owner can lock to owner, manage, or edit
  
  const permissionOrder: Record<PermissionLevel, number> = {
    'owner': 4,
    'manage': 3,
    'edit': 2,
    'view': 1
  };
  
  // User must have higher permission than the target lock level
  return permissionOrder[userPermission] > permissionOrder[targetLevel];
}

// ==========================================
// SHARE LINK FUNCTIONS
// ==========================================

export interface ShareLink {
  id: number;
  link_code: string;
  incident_id: string;
  patient_letter?: string;
  permission_level: PermissionLevel;
  created_by_discord_id: string;
  used_by_discord_id?: string;
  expires_at?: string;
  created_at: string;
}

export async function createShareLink(
  incidentId: string,
  permissionLevel: PermissionLevel,
  createdByDiscordId: string,
  options?: {
    patientLetter?: string;
    expiresInHours?: number;
  }
): Promise<ShareLink | null> {
  const sql = getDb();
  
  // Generate a random 32-character code
  const linkCode = Array.from({ length: 32 }, () => 
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
  ).join('');
  
  const expiresAt = options?.expiresInHours 
    ? new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000).toISOString()
    : null;
  
  const result = await sql`
    INSERT INTO eprf_share_links 
      (link_code, incident_id, patient_letter, permission_level, created_by_discord_id, expires_at)
    VALUES 
      (${linkCode}, ${incidentId}, ${options?.patientLetter || null}, ${permissionLevel}, ${createdByDiscordId}, ${expiresAt})
    RETURNING *
  `;
  
  return (result[0] as ShareLink) || null;
}

export async function getShareLink(linkCode: string): Promise<ShareLink | null> {
  const sql = getDb();
  
  const result = await sql`
    SELECT * FROM eprf_share_links 
    WHERE link_code = ${linkCode}
  `;
  
  return (result[0] as ShareLink) || null;
}

export async function useShareLink(
  linkCode: string,
  userDiscordId: string,
  userCallsign: string
): Promise<{ success: boolean; message: string; incidentId?: string }> {
  const sql = getDb();
  
  const link = await getShareLink(linkCode);
  
  if (!link) {
    return { success: false, message: 'Share link not found' };
  }
  
  // Check if expired
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return { success: false, message: 'Share link has expired' };
  }
  
  // Check if already used by a different user
  if (link.used_by_discord_id && link.used_by_discord_id !== userDiscordId) {
    return { success: false, message: 'This share link has already been used by another user' };
  }
  
  // Mark the link as used by this user
  if (!link.used_by_discord_id) {
    await sql`
      UPDATE eprf_share_links 
      SET used_by_discord_id = ${userDiscordId}
      WHERE id = ${link.id}
    `;
  }
  
  // Add user as collaborator
  if (link.patient_letter) {
    // Patient-level access
    await addPatientCollaborator(
      link.incident_id,
      link.patient_letter,
      userDiscordId,
      userCallsign,
      link.permission_level,
      link.created_by_discord_id
    );
  } else {
    // Incident-level access
    await addCollaborator(
      link.incident_id,
      userDiscordId,
      userCallsign,
      link.permission_level,
      link.created_by_discord_id
    );
  }
  
  return { success: true, message: 'Access granted', incidentId: link.incident_id };
}

// ==========================================
// TIME-LIMITED ACCESS FUNCTIONS
// ==========================================

export async function addCollaboratorWithExpiry(
  incidentId: string,
  userDiscordId: string,
  userCallsign: string,
  permissionLevel: PermissionLevel,
  addedByDiscordId: string,
  expiresInHours: number
): Promise<Collaborator | null> {
  const sql = getDb();
  
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
  
  const result = await sql`
    INSERT INTO eprf_collaborators (incident_id, user_discord_id, user_callsign, permission_level, added_by_discord_id, expires_at)
    VALUES (${incidentId}, ${userDiscordId}, ${userCallsign}, ${permissionLevel}, ${addedByDiscordId}, ${expiresAt})
    ON CONFLICT (incident_id, user_discord_id) 
    DO UPDATE SET 
      permission_level = ${permissionLevel},
      user_callsign = ${userCallsign},
      expires_at = ${expiresAt},
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  
  return (result[0] as Collaborator) || null;
}

export async function getCollaboratorWithExpiry(
  incidentId: string,
  userDiscordId: string
): Promise<{ collaborator: Collaborator | null; expired: boolean }> {
  const sql = getDb();
  
  const result = await sql`
    SELECT * FROM eprf_collaborators 
    WHERE incident_id = ${incidentId} AND user_discord_id = ${userDiscordId}
  `;
  
  const collaborator = result[0] as Collaborator | undefined;
  
  if (!collaborator) {
    return { collaborator: null, expired: false };
  }
  
  const expired = collaborator.expires_at ? new Date(collaborator.expires_at) < new Date() : false;
  
  return { collaborator, expired };
}

// Check and clean up expired collaborators
export async function cleanupExpiredCollaborators(): Promise<number> {
  const sql = getDb();
  
  // Don't delete, just mark as expired (keep for audit)
  // For now we just return count of expired
  const result = await sql`
    SELECT COUNT(*) as count FROM eprf_collaborators 
    WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP
  `;
  
  return parseInt(result[0]?.count || '0');
}

// ==========================================
// CONFLICT RESOLUTION - Last write wins with warning
// ==========================================

export interface DataConflict {
  section: string;
  lastSavedBy: string;
  lastSavedAt: string;
  yourData: any;
  serverData: any;
}

export async function checkDataConflict(
  incidentId: string,
  patientLetter: string,
  section: string,
  lastKnownUpdate: string
): Promise<{ hasConflict: boolean; serverData?: any; serverUpdatedAt?: string }> {
  const sql = getDb();
  
  const result = await sql`
    SELECT data, updated_at FROM eprf_data 
    WHERE incident_id = ${incidentId} 
      AND patient_letter = ${patientLetter}
      AND section = ${section}
  `;
  
  if (!result[0]) {
    return { hasConflict: false };
  }
  
  const serverUpdatedAt = new Date(result[0].updated_at).getTime();
  const clientLastKnown = new Date(lastKnownUpdate).getTime();
  
  if (serverUpdatedAt > clientLastKnown) {
    return { 
      hasConflict: true, 
      serverData: result[0].data,
      serverUpdatedAt: result[0].updated_at
    };
  }
  
  return { hasConflict: false };
}
