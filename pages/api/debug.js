import fs from 'fs';
import path from 'path';

// Admin-only debug endpoint
const ADMIN_DISCORD_ID = '695765253612953651';

export default function handler(req, res) {
  // Verify admin access via query param (basic protection)
  const adminId = req.query.adminId;
  if (adminId !== ADMIN_DISCORD_ID) {
    return res.status(403).json({ error: 'Unauthorized - Admin access required' });
  }

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
    // Don't expose sensitive env info
    env: {
      vercel_env: process.env.VERCEL_ENV || null
    }
  });
}
