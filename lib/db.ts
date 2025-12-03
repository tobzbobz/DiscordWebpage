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
