"use client"

import { useEffect, useState } from 'react'

export default function HomePageClient() {
  const [status, setStatus] = useState('Loading...')
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    let mounted = true
    fetch('/api/discord/health')
      .then(r => r.json())
      .then(json => {
        if (!mounted) return
        const cid = json?.env?.client_id_set
        const csecret = json?.env?.client_secret_set
        setEnabled(Boolean(cid && csecret))
        if (!cid) setStatus('CLIENT_ID not configured on server')
        else if (!csecret) setStatus('CLIENT_SECRET not configured on server')
        else setStatus('Ready — click Sign in with Discord')
      })
      .catch(err => {
        if (!mounted) return
        setStatus('Health check failed: ' + (err.message || err))
      })
    return () => { mounted = false }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome</h1>
          <p className="mt-2 text-gray-600">{status}</p>
        </div>

        <div className="mt-8">
          <a
            href={enabled ? '/api/discord/login' : '#'}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            style={{ pointerEvents: enabled ? 'auto' : 'none', opacity: enabled ? 1 : 0.5 }}
          >
            Sign in with Discord
          </a>
        </div>
      </div>
    </div>
  )
}
