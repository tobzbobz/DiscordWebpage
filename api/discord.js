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
const origin = VEREL_URL ? `https://${VEREL_URL}` : `http://localhost:${PORT}`;
const redirect = `${origin}/api/discord/callback`;

router.get('/login', (req, res) => {
  res.redirect(`https://discordapp.com/api/oauth2/authorize?client_id=${CLIENT_ID}&scope=identify&response_type=code&redirect_uri=${encodeURIComponent(redirect)}`);
});

// Health check to debug Vercel routing
router.get('/health', (req, res) => {
  res.json({ status: 'OK', env: { VERCEL_URL: process.env.VERCEL_URL || null } });
});

router.get('/callback', catchAsync(async (req, res) => {
  if (!req.query.code) throw new Error('NoCodeProvided');
  const code = req.query.code;
  const creds = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirect,
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