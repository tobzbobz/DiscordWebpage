import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  // Read package.json at runtime to avoid bundler/module resolution issues during build
  let pkg = { name: null, version: null };
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const raw = fs.readFileSync(pkgPath, 'utf8');
    pkg = JSON.parse(raw);
  } catch (e) {
    // ignore — pkg will be empty
  }

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
