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
    <main>
      <div className="center-card" role="main">
        <div className="card-title">Site Access</div>
        <div className="card-subtext">Sign in to continue</div>

        <a
          href={enabled ? '/api/discord/login' : '#'}
          className="discord-btn"
          aria-disabled={!enabled}
        >
          <span className="discord-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
              <path d="M20.317 4.369A19.791 19.791 0 0016.783 3c-.263.44-.558 1.016-.766 1.465-2.297-.34-4.59-.34-6.864 0-.208-.45-.503-1.026-.766-1.466A19.736 19.736 0 003.683 4.37C.535 9.026-.351 13.523.099 17.943a20.16 20.16 0 006.038 3.09c.48-.66.909-1.36 1.285-2.094a13.538 13.538 0 01-2.14-.995c.18-.129.357-.263.53-.402 4.172 1.92 8.68 1.92 12.85 0 .173.14.35.275.53.404-.683.385-1.394.726-2.14.995.377.735.806 1.433 1.285 2.094a20.12 20.12 0 006.038-3.09c.61-4.478-.79-8.974-3.936-13.573z" fill="#fff" opacity=".95"/>
            </svg>
          </span>
          <span>Login with Discord</span>
        </a>

        <div className="legal">You will be redirected to Discord to continue.</div>
      </div>
    </main>
  )
}
