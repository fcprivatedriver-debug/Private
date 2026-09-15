#!/usr/bin/env node
/**
 * Add ninapp.pt (+ www) to the Vercel project private-duur and print DNS records.
 *
 * Usage:
 *   VERCEL_TOKEN=… node scripts/configure-ninapp-domain.mjs
 *   # or NINA_VERCEL_TOKEN / VERCEL_API_TOKEN
 *
 * Requires a token with access to team `fc-private-driver` / project `private-duur`.
 */
const PROJECT = "prj_MIG6ve415nGmPL28QmqS1uwdyZ8q";
const TEAM = "fc-private-driver";
const APEX = "ninapp.pt";
const WWW = "www.ninapp.pt";

const token =
  process.env.VERCEL_TOKEN ||
  process.env.NINA_VERCEL_TOKEN ||
  process.env.VERCEL_API_TOKEN ||
  "";

if (!token) {
  console.error(`
[ninapp] Sem token Vercel neste ambiente.

Cria um token em https://vercel.com/account/tokens
depois corre:

  VERCEL_TOKEN=xxx node scripts/configure-ninapp-domain.mjs

Ou adiciona o domínio manualmente:
  https://vercel.com/fc-private-driver/private-duur/settings/domains
`);
  process.exit(1);
}

async function api(method, path, body) {
  const url = path.includes("?")
    ? `https://api.vercel.com${path}&teamId=${TEAM}`
    : `https://api.vercel.com${path}?teamId=${TEAM}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

async function addDomain(name, redirect = null) {
  const body = { name };
  if (redirect) body.redirect = redirect;
  const r = await api("POST", `/v10/projects/${PROJECT}/domains`, body);
  if (r.ok) return { created: true, ...r };
  // Already exists
  if (r.status === 409 || /already|exists|conflict/i.test(JSON.stringify(r.json))) {
    return { created: false, exists: true, ...r };
  }
  return { created: false, ...r };
}

async function getDomainConfig(name) {
  return api("GET", `/v6/domains/${name}/config`);
}

async function getProjectDomain(name) {
  return api("GET", `/v9/projects/${PROJECT}/domains/${name}`);
}

async function disableProtection() {
  return api("PATCH", `/v9/projects/${PROJECT}`, {
    ssoProtection: null,
    passwordProtection: null,
  });
}

function printDnsFromConfig(name, cfg) {
  console.log(`\n=== DNS para ${name} ===`);
  if (!cfg?.ok) {
    console.log("Não foi possível ler a config:", cfg?.status, JSON.stringify(cfg?.json).slice(0, 400));
    return;
  }
  const c = cfg.json;
  // Vercel returns recommendedCname / recommendedIPv4 depending on type
  if (Array.isArray(c.recommendedIPv4) && c.recommendedIPv4.length) {
    for (const ip of c.recommendedIPv4) {
      const value = typeof ip === "string" ? ip : ip?.value || ip?.rank;
      console.log(`Tipo: A`);
      console.log(`Nome/Host: @  (ou vazio / ninapp.pt)`);
      console.log(`Valor: ${value ?? "76.76.21.21"}`);
      console.log(`TTL: 300 (ou automático)`);
    }
  }
  if (Array.isArray(c.recommendedCNAME) && c.recommendedCNAME.length) {
    for (const cn of c.recommendedCNAME) {
      const value = typeof cn === "string" ? cn : cn?.value;
      console.log(`Tipo: CNAME`);
      console.log(`Nome/Host: ${name.startsWith("www.") ? "www" : name}`);
      console.log(`Valor: ${value ?? "cname.vercel-dns.com"}`);
      console.log(`TTL: 300 (ou automático)`);
    }
  }
  if (c.misconfigured) {
    console.log("(Vercel marca ainda como misconfigured — aguarda propagação DNS)");
  }
  console.log("Raw keys:", Object.keys(c).join(", "));
}

console.log("[ninapp] A adicionar domínios ao projeto private-duur…");

const apex = await addDomain(APEX);
console.log(
  `[ninapp] ${APEX}:`,
  apex.created ? "criado" : apex.exists ? "já existia" : `erro ${apex.status}`,
  apex.json?.error?.message || apex.json?.name || "",
);

const www = await addDomain(WWW, APEX); // www → redirect to apex
console.log(
  `[ninapp] ${WWW}:`,
  www.created ? "criado (redirect → apex)" : www.exists ? "já existia" : `erro ${www.status}`,
  www.json?.error?.message || www.json?.name || "",
);

const prot = await disableProtection();
console.log(
  "[ninapp] Deployment Protection (SSO):",
  prot.ok ? "desativado" : `falhou ${prot.status} ${JSON.stringify(prot.json).slice(0, 200)}`,
);

const apexCfg = await getDomainConfig(APEX);
const wwwCfg = await getDomainConfig(WWW);
const apexDom = await getProjectDomain(APEX);
const wwwDom = await getProjectDomain(WWW);

printDnsFromConfig(APEX, apexCfg);
printDnsFromConfig(WWW, wwwCfg);

console.log("\n=== Estado no projeto ===");
console.log(APEX, JSON.stringify({
  verified: apexDom.json?.verified,
  verification: apexDom.json?.verification,
  redirect: apexDom.json?.redirect,
}, null, 2).slice(0, 800));
console.log(WWW, JSON.stringify({
  verified: wwwDom.json?.verified,
  verification: wwwDom.json?.verification,
  redirect: wwwDom.json?.redirect,
}, null, 2).slice(0, 800));

console.log(`
=== Também no Vercel (Environment Variables → Production) ===
  AUTH_URL=https://ninapp.pt
  NEXT_PUBLIC_APP_URL=https://ninapp.pt   (se existir)

DNS actual de ninapp.pt (antes desta mudança): A → 193.29.59.104 (PTDNS).
Remove o A antigo e cria os registos que a Vercel indicou acima.
`);
