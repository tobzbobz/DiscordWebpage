export default function handler(req, res) {
  const pkg = require('../../../package.json');
  res.json({
    ok: true,
    name: pkg.name,
    version: pkg.version,
    node: process.version,
    platform: process.platform,
    env: {
      client_id_set: Boolean(process.env.CLIENT_ID),
      client_secret_set: Boolean(process.env.CLIENT_SECRET),
      vercel_url: process.env.VERCEL_URL || null,
      vercel_env: process.env.VERCEL_ENV || null
    }
  });
}
