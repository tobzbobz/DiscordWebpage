This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Discord OAuth (NextAuth) Setup

This project includes a sample Discord authentication setup using NextAuth.js.

- Guide page: `http://localhost:3000/auth-setup` — open this page for step-by-step setup and copyable code snippets.
- API route: `app/api/auth/[...nextauth]/route.ts` is included and handles the OAuth flow.
- Example .env file: `.env.local.example` contains required environment variables. Copy it to `.env.local` and set your Client ID/Secret from the Discord Developer Portal.

Install dependencies and run the app:
```bash
npm install
npm run dev
```

Add NextAuth-related dependencies and prepare env file:
```bash
npm install next-auth
cp .env.local.example .env.local
# Edit .env.local and add DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET
```

If you'd like session to be available app-wide, `app/providers.tsx` is included and `app/layout.tsx` is already configured to wrap your app with NextAuth's SessionProvider.

