export default async function handler(req, res) {
  // Prefer DISCORD_CLIENT_* env names, but fall back to legacy names
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID;
  const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || process.env.CLIENT_SECRET;
  if (!CLIENT_ID || !CLIENT_SECRET) return res.status(500).json({ status: 'ERROR', error: 'NotConfigured' });
  const code = req.query.code;
  if (!code) return res.status(400).json({ status: 'ERROR', error: 'NoCodeProvided' });
  const host = req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const redirect_uri = `${proto}://${host}/api/discord/callback`;
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri
  }).toString();
  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${creds}`
    },
    body
  });
  if (!response.ok) return res.status(502).json({ status: 'ERROR', error: 'TokenRequestFailed' });
  const json = await response.json();
  res.redirect(`/?token=${json.access_token}`);
}
