#!/usr/bin/env node
/**
 * Attempt to make Vercel deployments publicly accessible (disable SSO protection).
 * Runs during Vercel build when a token is available.
 *
 * Root cause of "URL doesn't open": team Deployment Protection (Vercel Authentication)
 * redirects anonymous users to vercel.com/login — not a Next.js crash.
 */
export async function tryMakeVercelPublic() {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  const token =
    process.env.VERCEL_TOKEN ||
    process.env.VERCEL_API_TOKEN ||
    process.env.NINA_VERCEL_TOKEN ||
    "";

  console.log(
    "[stable]",
    JSON.stringify({
      hasProjectId: Boolean(projectId),
      hasTeamId: Boolean(teamId),
      hasToken: Boolean(token),
      hasOidc: Boolean(process.env.VERCEL_OIDC_TOKEN),
      hasBypass: Boolean(process.env.VERCEL_AUTOMATION_BYPASS_SECRET),
      vercelEnv: process.env.VERCEL_ENV || null,
      vercelUrl: process.env.VERCEL_URL || null,
    }),
  );

  if (!projectId || !token) {
    console.log(
      "[stable] Cannot disable SSO from build (missing VERCEL_TOKEN / VERCEL_PROJECT_ID).",
    );
    console.log(
      "[stable] Set NINA_VERCEL_TOKEN (or VERCEL_TOKEN) in Vercel project env to auto-disable Authentication.",
    );
    return { ok: false, reason: "no_token" };
  }

  const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const url = `https://api.vercel.com/v9/projects/${projectId}${qs}`;

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ssoProtection: null }),
    });
    const text = await res.text();
    console.log("[stable] PATCH ssoProtection", res.status, text.slice(0, 400));
    return { ok: res.ok, status: res.status };
  } catch (e) {
    console.log("[stable] PATCH failed", String(e).slice(0, 200));
    return { ok: false, reason: String(e) };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  tryMakeVercelPublic().then((r) => {
    if (!r.ok) process.exitCode = 0; // never fail the build
  });
}
