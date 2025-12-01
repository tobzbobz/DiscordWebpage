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

## Notes
- `node-fetch@2` is used to keep CommonJS require compatibility.
- The app is minimal — feel free to add more robust error handling or middleware.
