"use client"

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { setCurrentUserAsync } from '../utils/userService'

export const runtime = 'edge'

const VALID_CALLSIGNS = [
  /^HAM-([1-9]|10)$/i,
  /^HAM[1-9]$/i,
  /^HAM-0\d{2}$/i,
  /^MKE-30$/i,
  /^OSC-(1|2|3|30|31|32)$/i,
]

const VEHICLES = [
  'Frontline Ambulance',
  'Events Vehicle',
  'Echo Unit',
  'SERT truck',
  'Manager SUV',
  'StJ | Support Unit',
  '4 WD Unit',
  'MIST',
]

export default function LogonPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [discordId, setDiscordId] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [callsign, setCallsign] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [errors, setErrors] = useState<{discordId?: string, callsign?: string, vehicle?: string}>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Always prompt for fleet ID and vehicle type, even for returning users
    const token = searchParams?.get('token');
    if (token) {
      fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(user => {
          setDiscordId(user.id || '');
          setDiscordUsername(user.username || '');
          setLoading(false);
        })
        .catch(() => {
          setErrors({ discordId: 'Failed to fetch Discord user info' });
          setLoading(false);
        });
    } else {
      setLoading(false);
      setErrors({ discordId: 'No authentication token found. Please log in first.' });
    }
  }, [searchParams]);

  const validateCallsign = (value: string): boolean => {
    return VALID_CALLSIGNS.some(pattern => pattern.test(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: {discordId?: string, callsign?: string, vehicle?: string} = {}

    // Validate Discord ID
    if (!discordId) {
      newErrors.discordId = 'Discord ID is required'
    }

    // Validate Callsign
    if (!callsign) {
      newErrors.callsign = 'Callsign is required'
    } else if (!validateCallsign(callsign)) {
      newErrors.callsign = 'Invalid callsign format. Valid formats: HAM-1 to HAM-10, HAM1-HAM9, HAM-001 to HAM-099, MKE-30, OSC-1, OSC-2, OSC-3, OSC-30, OSC-31, OSC-32'
    }

    // Validate Vehicle
    if (!vehicle) {
      newErrors.vehicle = 'Vehicle type is required'
    }

    setErrors(newErrors)

    // If no errors, proceed
    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true)
      try {
        // Save user to localStorage and database
        await setCurrentUserAsync({
          discordId,
          discordUsername,
          callsign,
          vehicle,
          loginTime: new Date().toISOString()
        })
        // Redirect to dashboard with callsign as fleet ID
        router.push(`/dashboard?fleetId=${encodeURIComponent(callsign)}`)
      } catch (error) {
        console.error('Login error:', error)
        setIsSubmitting(false)
      }
    }
  }

  if (loading) {
    return (
      <div className="eprf-container">
        <div className="eprf-header">
          <h1>Loading...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="eprf-container">
      <div className="eprf-header">
        <h1>Logon Form</h1>
      </div>

      <div className="eprf-content">
        <form onSubmit={handleSubmit} className="eprf-form">
          <div className="form-group">
            <label htmlFor="discordId">Discord ID:</label>
            <input
              type="text"
              id="discordId"
              value={discordId}
              onChange={(e) => setDiscordId(e.target.value)}
              readOnly
              disabled
              className={`form-input readonly ${errors.discordId ? 'error' : ''}`}
            />
            {errors.discordId && <div className="field-error">{errors.discordId}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="callsign">Callsign:</label>
            <input
              type="text"
              id="callsign"
              value={callsign}
              onChange={(e) => {
                setCallsign(e.target.value.toUpperCase())
                // Clear error when user starts typing
                if (errors.callsign) {
                  setErrors({...errors, callsign: undefined})
                }
              }}
              placeholder="e.g., HAM-1, MKE-30, OSC-32"
              className={`form-input ${errors.callsign ? 'error' : ''}`}
            />
            {errors.callsign && <div className="field-error">{errors.callsign}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="vehicle">Vehicle Type:</label>
            <select
              id="vehicle"
              value={vehicle}
              onChange={(e) => {
                setVehicle(e.target.value)
                // Clear error when user selects
                if (errors.vehicle) {
                  setErrors({...errors, vehicle: undefined})
                }
              }}
              className={`form-select ${errors.vehicle ? 'error' : ''}`}
            >
              <option value="">-- Select Vehicle --</option>
              {VEHICLES.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            {errors.vehicle && <div className="field-error">{errors.vehicle}</div>}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
