export default function handler(req, res) {
  res.json({
    status: 'OK',
    env: {
      VERCEL_URL: process.env.VERCEL_URL || null,
      VERCEL_ENV: process.env.VERCEL_ENV || null,
      // Support both DEPLOYMENT VAR names: preferred DISCORD_* and legacy CLIENT_*
      client_id_set: Boolean(process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID),
      client_secret_set: Boolean(process.env.DISCORD_CLIENT_SECRET || process.env.CLIENT_SECRET),
      host: req.headers.host || null,
      forwarded_proto: req.headers['x-forwarded-proto'] || null,
      forwarded_host: req.headers['x-forwarded-host'] || null
    }
  });
}
