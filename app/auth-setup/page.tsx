"use client";

import React, { useState } from "react";

const authRouteCode = `import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) session.user.id = token.sub!;
      return session;
    },
  },
});

export { handler as GET, handler as POST };`;

const pageCode = `"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { SessionProvider } from "next-auth/react";

function EPRFContent() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return (
      <div>
        <h1>Please sign in</h1>
        <button onClick={() => signIn("discord")}>Sign in</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome, {session.user?.name}</h1>
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  );
}

export default function Page() {
  return (
    <SessionProvider>
      <EPRFContent />
    </SessionProvider>
  );
}`;

const envCode = `DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_key_here`;

const packageCode = `npm install next-auth`;

const typesCode = `import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}`;

function CodeBlock({ code, filename }: { code: string; filename?: string }) {
  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden"> 
      {filename && (
        <div className="bg-gray-800 px-4 py-2 text-sm text-gray-300 border-b border-gray-700">{filename}</div>
      )}
      <div className="relative">
        <pre className="p-4 overflow-x-auto text-sm text-gray-100">{code}</pre>
      </div>
    </div>
  );
}

export default function AuthSetupPage() {
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState({ setup: true, route: false, page: false, env: false });

  function toggle(section: string) {
    setExpanded((s) => ({ ...s, [section]: !s[section as keyof typeof s] }));
  }

  function copy(text: string, id: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied((c) => ({ ...c, [id]: true }));
        setTimeout(() => setCopied((c) => ({ ...c, [id]: false })), 2000);
      });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-8 text-white">
          <h1 className="text-4xl font-bold mb-2">Discord Auth Setup</h1>
          <p className="text-indigo-100">Complete guide to add Discord authentication to your ePRF app</p>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <div className="flex items-start gap-3">
            <div>
              <p className="font-semibold text-blue-900">Before you start</p>
              <p className="text-blue-800 text-sm mt-1">You&apos;ll need to create a Discord application at the Discord Developer Portal.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <button onClick={() => toggle("setup")} className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 transition-colors">
            <h2 className="text-xl font-bold text-gray-800">Step 0: Install NextAuth</h2>
            <span>{expanded.setup ? "▲" : "▼"}</span>
          </button>
          {expanded.setup && (
            <div className="p-6 space-y-4">
              <p className="text-gray-700">First, install the NextAuth.js package:</p>
              <div className="flex items-center gap-4">
                <CodeBlock code={packageCode} filename={"Install"} />
                <button className="px-4 py-2 bg-gray-800 text-white rounded" onClick={() => copy(packageCode, "install")}>{copied["install"] ? "Copied" : "Copy"}</button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <button onClick={() => toggle("env")} className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 transition-colors">
            <h2 className="text-xl font-bold text-gray-800">Step 1: Environment Variables (.env.local)</h2>
            <span>{expanded.env ? "▲" : "▼"}</span>
          </button>
          {expanded.env && (
            <div className="p-6 space-y-4">
              <p className="text-gray-700">Create a <code className="bg-gray-100 px-2 py-1 rounded text-sm">.env.local</code> file in your project root:</p>
              <div className="flex items-center gap-4">
                <CodeBlock code={envCode} filename={".env.local.example"} />
                <button className="px-4 py-2 bg-gray-800 text-white rounded" onClick={() => copy(envCode, "env")}>{copied["env"] ? "Copied" : "Copy"}</button>
              </div>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <p className="font-semibold text-yellow-900 mb-2">How to get Discord credentials:</p>
                <ol className="text-sm text-yellow-800 space-y-2 list-decimal list-inside">
                  <li>Go to <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="underline">Discord Developer Portal</a></li>
                  <li>Create a new application and copy your Client ID and Secret</li>
                  <li>Set redirect URL <code className="bg-yellow-100 px-1">http://localhost:3000/api/auth/callback/discord</code></li>
                </ol>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <button onClick={() => toggle("route")} className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 transition-colors">
            <h2 className="text-xl font-bold text-gray-800">Step 2: Auth API Route</h2>
            <span>{expanded.route ? "▲" : "▼"}</span>
          </button>
          {expanded.route && (
            <div className="p-6 space-y-4">
              <p className="text-gray-700">Create the NextAuth route handler:</p>
              <div className="flex items-start gap-4">
                <CodeBlock code={authRouteCode} filename={"app/api/auth/[...nextauth]/route.ts"} />
                <div className="flex flex-col gap-2">
                  <button className="px-4 py-2 bg-gray-800 text-white rounded" onClick={() => copy(authRouteCode, "route")}>{copied["route"] ? "Copied" : "Copy"}</button>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700"><strong>What this does:</strong> Handles Discord OAuth flow, manages user sessions, and stores login state.</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <button onClick={() => toggle("page")} className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 transition-colors">
            <h2 className="text-xl font-bold text-gray-800">Step 3: Protected Page (app/page.tsx)</h2>
            <span>{expanded.page ? "▲" : "▼"}</span>
          </button>
          {expanded.page && (
            <div className="p-6 space-y-4">
              <p className="text-gray-700">Replace your main page or create a protected page with this auth-protected version:</p>
              <div className="flex items-start gap-4">
                <CodeBlock code={pageCode} filename={"app/page.tsx"} />
                <div className="flex flex-col gap-2">
                  <button className="px-4 py-2 bg-gray-800 text-white rounded" onClick={() => copy(pageCode, "page")}>{copied["page"] ? "Copied" : "Copy"}</button>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700"><strong>What this does:</strong> Shows login screen to guests, shows ePRF form to logged-in users, includes header with user info and logout button.</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
          <h3 className="font-bold text-green-900 text-lg mb-3">🎉 You&apos;re Done!</h3>
          <ol className="space-y-2 text-green-800 list-decimal list-inside">
            <li>Run <code className="bg-green-100 px-2 py-1 rounded">npm install</code> then <code className="bg-green-100 px-2 py-1 rounded">npm run dev</code></li>
            <li>Visit <code className="bg-green-100 px-2 py-1 rounded">http://localhost:3000</code></li>
            <li>Click &quot;Login with Discord&quot;</li>
            <li>Authorize your app</li>
            <li>You&apos;ll see your ePRF form!</li>
          </ol>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-bold text-gray-800 mb-3">📝 Optional: TypeScript Types</h3>
          <p className="text-gray-700 text-sm mb-3">If using TypeScript, create this file for proper types:</p>
          <div className="flex items-center gap-4">
            <CodeBlock code={typesCode} filename={"types/next-auth.d.ts"} />
            <button className="px-4 py-2 bg-gray-800 text-white rounded" onClick={() => copy(typesCode, "types")}>{copied["types"] ? "Copied" : "Copy"}</button>
          </div>
        </div>

      </div>
    </div>
  );
}
