const express = require('express');
const fetch = require('node-fetch');
const btoa = require('btoa');
const { catchAsync } = require('../utils');

const router = express.Router();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
// Determine redirect URI dynamically: use Vercel URL in production, fall back to localhost in dev
const VEREL_URL = process.env.VERCEL_URL;
const PORT = process.env.PORT || 50451;

// Compute redirect per-request to avoid hardcoding hostnames or localhost IPs
function getRedirectUrl(req) {
  // If running on Vercel, use VERCEL_URL (it contains the deployment domain)
  if (VEREL_URL) return `https://${VEREL_URL}/api/discord/callback`;

  // Prefer headers in proxy environments (x-forwarded-proto/host) else fallback to host
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  const hostHeader = req.get('x-forwarded-host') || req.get('host') || `localhost:${PORT}`;
  return `${proto}://${hostHeader}/api/discord/callback`;
}

router.get('/login', (req, res) => {
  // If CLIENT_ID is missing, return a useful error instead of doing nothing
  if (!CLIENT_ID) {
    return res.status(500).json({ status: 'ERROR', error: 'CLIENT_ID_NOT_CONFIGURED' });
  }
  const redirectUrl = getRedirectUrl(req);
  console.info('Redirecting to Discord OAuth for CLIENT_ID:', CLIENT_ID);
  res.redirect(`https://discordapp.com/api/oauth2/authorize?client_id=${CLIENT_ID}&scope=identify&response_type=code&redirect_uri=${encodeURIComponent(redirectUrl)}`);
});

// Health check to debug Vercel routing
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    env: {
      VERCEL_URL: process.env.VERCEL_URL || null,
      VERCEL_ENV: process.env.VERCEL_ENV || null,
      host: req.get('host') || null,
      x_forwarded_host: req.get('x-forwarded-host') || null,
      protocol: req.get('x-forwarded-proto') || req.protocol || null,
      client_id_set: Boolean(CLIENT_ID),
      client_secret_set: Boolean(CLIENT_SECRET),
    },
  });
});

router.get('/callback', catchAsync(async (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('NotConfigured');
  if (!req.query.code) throw new Error('NoCodeProvided');
  const code = req.query.code;
  console.info('Received authorization code, exchanging token (not logging sensitive data)');
  const creds = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

  const redirectUrl = getRedirectUrl(req);
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUrl,
  }).toString();

  const response = await fetch('https://discordapp.com/api/oauth2/token', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${creds}`,
    },
  });

  if (!response.ok) throw new Error('TokenRequestFailed');
  const json = await response.json();
  res.redirect(`/?token=${json.access_token}`);
}));

// Router-level error handler
router.use((err, req, res, next) => {
  switch (err.message) {
    case 'NoCodeProvided':
      return res.status(400).json({ status: 'ERROR', error: err.message });
    case 'TokenRequestFailed':
      return res.status(502).json({ status: 'ERROR', error: err.message });
    default:
      return res.status(500).json({ status: 'ERROR', error: err.message || 'UnknownError' });
  }
});

module.exports = router;