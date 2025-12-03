export default function handler(req, res) {
  // Prefer DISCORD_CLIENT_ID but fall back to legacy CLIENT_ID
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID;
  if (!CLIENT_ID) return res.status(500).json({ status: 'ERROR', error: 'CLIENT_ID_NOT_CONFIGURED' });
  const host = req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || (req.socket && req.socket.encrypted ? 'https' : 'http') || 'https';
  const origin = `https://${host}`;
  const redirectUrl = `${origin}/api/discord/callback`;
  const scopes = 'identify guilds guilds.members.read';
  const redirectTo = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&scope=${encodeURIComponent(scopes)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUrl)}`;
  res.redirect(redirectTo);
}
