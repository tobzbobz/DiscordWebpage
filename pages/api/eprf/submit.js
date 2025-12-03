// API endpoint for submitting ePRF data
// This saves the ePRF to a local JSON file as a simple database

import fs from 'fs'
import path from 'path'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { incidentId, fleetId, patientLetter, data, submittedAt } = req.body

    if (!incidentId || !data) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data', 'eprfs')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    // Create a unique filename
    const filename = `eprf_${incidentId}_${patientLetter}_${Date.now()}.json`
    const filepath = path.join(dataDir, filename)

    // Prepare the record
    const record = {
      id: `${incidentId}-${patientLetter}-${Date.now()}`,
      incidentId,
      fleetId,
      patientLetter,
      submittedAt,
      data
    }

    // Write to file
    fs.writeFileSync(filepath, JSON.stringify(record, null, 2))

    // Also append to an index file for easy lookup
    const indexPath = path.join(dataDir, 'index.json')
    let index = []
    if (fs.existsSync(indexPath)) {
      try {
        index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
      } catch {
        index = []
      }
    }

    index.push({
      id: record.id,
      incidentId,
      fleetId,
      patientLetter,
      submittedAt,
      filename
    })

    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2))

    return res.status(200).json({ 
      success: true, 
      message: 'ePRF saved successfully',
      id: record.id
    })
  } catch (error) {
    console.error('Error saving ePRF:', error)
    return res.status(500).json({ error: 'Failed to save ePRF' })
  }
}
