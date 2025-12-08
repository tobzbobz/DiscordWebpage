import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

let _sql = null;
function getDb() {
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

const OWNER_DISCORD_ID = '695765253612953651';

// Rate limit configuration
const RATE_LIMITS = {
  owner: null, // No limits
  admin: { requests: 500, windowMs: 60000 }, // 500/min
  user: { requests: 100, windowMs: 60000 }, // 100/min
  login: { requests: 5, windowMs: 60000 }, // 5/min for everyone
  sensitive: { requests: 20, windowMs: 60000 }, // 20/min for delete/transfer
};

// Check rate limit for a user (private helper function)
async function checkRateLimitInternal(discordId, action = 'default') {
  // Owner is exempt from all rate limits
  if (discordId === OWNER_DISCORD_ID) {
    return { allowed: true };
  }

  const sql = getDb();
  const now = Date.now();

  try {
    // Get user role
    const adminCheck = await sql`
      SELECT 1 FROM access_lists 
      WHERE list_type = 'admin' 
      AND user_discord_id = ${discordId}
      AND is_active = true
    `;
    const isAdmin = adminCheck.length > 0;

    // Determine rate limit based on action and role
    let limit;
    if (action === 'login') {
      limit = RATE_LIMITS.login;
    } else if (action === 'sensitive') {
      limit = RATE_LIMITS.sensitive;
    } else if (isAdmin) {
      limit = RATE_LIMITS.admin;
    } else {
      limit = RATE_LIMITS.user;
    }

    // Get request count in current window
    const windowStart = now - limit.windowMs;
    const key = `${discordId}:${action}`;

    const counts = await sql`
      SELECT COUNT(*) as count FROM rate_limit_log
      WHERE rate_key = ${key}
      AND timestamp > ${windowStart}
    `;

    const currentCount = parseInt(counts[0]?.count || 0);

    if (currentCount >= limit.requests) {
      const resetTime = Math.ceil((windowStart + limit.windowMs - now) / 1000);
      return { 
        allowed: false, 
        remaining: 0, 
        resetIn: resetTime,
        message: `Rate limit exceeded. Try again in ${resetTime} seconds.`
      };
    }

    // Log this request
    await sql`
      INSERT INTO rate_limit_log (rate_key, timestamp)
      VALUES (${key}, ${now})
    `;

    // Cleanup old entries (older than 2 minutes)
    await sql`
      DELETE FROM rate_limit_log 
      WHERE timestamp < ${now - 120000}
    `;

    return { 
      allowed: true, 
      remaining: limit.requests - currentCount - 1,
      resetIn: Math.ceil(limit.windowMs / 1000)
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request but log it
    return { allowed: true, error: true };
  }
}

// GET endpoint to check rate limit status
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const discordId = searchParams.get('discordId');
  const action = searchParams.get('action') || 'default';

  if (!discordId) {
    return Response.json({ success: false, error: 'Missing discordId' }, { status: 400 });
  }

  const result = await checkRateLimitInternal(discordId, action);
  return Response.json({ success: true, ...result });
}

// POST endpoint for recording a rate-limited action
export async function POST(request) {
  try {
    const body = await request.json();
    const { discordId, action } = body;

    if (!discordId) {
      return Response.json({ success: false, error: 'Missing discordId' }, { status: 400 });
    }

    const result = await checkRateLimitInternal(discordId, action || 'default');
    
    if (!result.allowed) {
      return Response.json({ success: false, ...result }, { status: 429 });
    }

    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error('Rate limit POST error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
