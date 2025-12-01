# app123

Minimal Express app with Discord OAuth example. This app serves `index.html` and provides `/api/discord/login` and `/api/discord/callback` endpoints for Discord OAuth.

## Getting started

1. Install dependencies

```powershell
npm ci
```

2. Create `.env` from `.env.example` and fill in `CLIENT_ID` and `CLIENT_SECRET`

3. Run locally

```powershell
npm run dev
# or
npm start
```

4. Visit `http://localhost:50451` or your specified `PORT`.

## Docker

Build and run:

```powershell
docker build -t app123 .
docker run -p 50451:50451 --env-file .env app123
```

## Vercel Deployment notes

- If your project is in a subfolder (e.g., `app123`), set the Project Root in Vercel to that folder.
- Routes: the project uses `api/index.js` as a serverless wrapper for Express; /api/* endpoints are handled by the serverless function. Non-API routes are served as `index.html`.
- Test the health endpoint after deployment to verify routing:

```text
GET https://<your-app>.vercel.app/api/discord/health
```

If it returns JSON with `status: 'OK'`, the serverless function is reachable.

### DNS_HOSTNAME_RESOLVED_PRIVATE troubleshooting ⚠️

If you see the error `DNS_HOSTNAME_RESOLVED_PRIVATE` or 404 in your Vercel deployment, that means the hostname resolved to a private IP (e.g., 10.x.x.x, 192.168.x.x, 127.x.x.x). Vercel does not allow resolving DNS to private addresses for security reasons.

Steps to diagnose:

- Verify your custom domain DNS: use `Resolve-DnsName <domain>` on PowerShell or `nslookup <domain>` and ensure it resolves to a public IP or CNAME, not a private IP.
- Confirm your Vercel Project settings: if your app is in a subfolder (like `app123`), set the Project Root accordingly so Vercel uses the correct `package.json` and `vercel.json`.
- Check that you don't have redirects or environment variables that point to `localhost` or internal IPs. OAuth redirect URIs should be public (not 127.0.0.1).

Fixes:

- If using a custom domain, remove any A records that point to private IP addresses and use Vercel's recommended DNS (A/ ALIAS/ CNAME) records instead (see Vercel docs).
- If using Cloudflare or similar, ensure the DNS is proxied properly and still resolves to Vercel's expected records.
- In OAuth providers (Discord), ensure the redirect is a public URL like `https://<your-app>.vercel.app/api/discord/callback` or your custom domain.

If you want, I can help run local DNS checks and/or update the code further to rely completely on request headers for redirect URIs (done), and add a test script to verify DNS resolution and environment variables in the deployment phase.

### Configure the Discord environment variables

On Vercel:
- Open Project Settings → Environment Variables and add `CLIENT_ID` and `CLIENT_SECRET`. Add them to the Production and Preview environments if needed.
- After adding environment variables, trigger a redeploy in Vercel (or push a new commit).

Local development:
- Copy `.env.example` to `.env` and fill `CLIENT_ID`, `CLIENT_SECRET`, and `PORT`.
- Run `npm ci` and `npm start` or `npm run dev`, then visit `http://localhost:50451`

Checklist to verify OAuth flow:
- Confirm `GET /api/discord/health` returns `client_id_set: true` and `client_secret_set: true`.
- Confirm `GET /api/discord/login` redirects to Discord OAuth with a valid `client_id`.
- Make sure the Discord Developer Portal has `https://<your-domain>/api/discord/callback` configured as an OAuth redirect.

## Notes
- `node-fetch@2` is used to keep CommonJS require compatibility.
- The app is minimal — feel free to add more robust error handling or middleware.
