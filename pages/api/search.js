// Advanced search API for ePRF records
import { getEPRFRecordsByUser } from '../../../app/utils/apiClient';

export default async function handler(req, res) {
  const { discordId, query = '', status, dateFrom, dateTo, limit = 50 } = req.query;
  if (!discordId) return res.status(400).json({ success: false, error: 'Missing discordId' });

  // Fetch all records for user
  let records = await getEPRFRecordsByUser(discordId);

  // Filter by status
  if (status && status !== 'all') {
    records = records.filter(r => r.status === status);
  }
  // Filter by date
  if (dateFrom) {
    const fromDate = new Date(dateFrom).getTime();
    records = records.filter(r => new Date(r.created_at).getTime() >= fromDate);
  }
  if (dateTo) {
    const toDate = new Date(dateTo).getTime() + (24 * 60 * 60 * 1000);
    records = records.filter(r => new Date(r.created_at).getTime() <= toDate);
  }
  // Filter by query
  if (query.trim()) {
    const q = query.toLowerCase();
    records = records.filter(r => {
      const patientName = '';
      // Optionally, fetch patient name from localStorage if available
      return (
        r.incident_id.toLowerCase().includes(q) ||
        r.patient_letter.toLowerCase().includes(q) ||
        r.author_callsign.toLowerCase().includes(q) ||
        patientName.includes(q)
      );
    });
  }
  // Limit results
  records = records.slice(0, Number(limit));

  // Format for frontend
  const results = records.map(r => ({
    incidentId: r.incident_id,
    patientLetter: r.patient_letter,
    authorCallsign: r.author_callsign,
    status: r.status,
    matchType: 'incident',
    createdAt: r.created_at
  }));

  res.status(200).json({ success: true, results });
}
