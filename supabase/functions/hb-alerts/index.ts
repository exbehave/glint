// BGC: Heartbreakers — admin alerts (Supabase Edge Function "hb-alerts"). Kennedy, Nov 9, 2026.
// Runs every minute (pg_cron job "hb-alerts") and pushes a notification to the admin's devices when a human
// player other than an admin shoots the moon or pulls a Queen's Gambit (leads the Q♠ and someone else takes her).
// The notification opens that game's Highlights in the game (?replay=<game id>).
// Also: { test: true } with an admin's token sends a test alert to that admin's devices.
// Reuses In the Loop's push keys (secret ITL_PUSH: {pub, priv, cron, site}); subscriptions live in hb_push_subs.
// Push encryption and VAPID helpers below are copied from In the Loop's "notify" function.

// ---------- encoding helpers ----------
const enc = new TextEncoder();
function b64u(bytes) {
  let s = ""; const b = new Uint8Array(bytes);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64u(str) {
  const s = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const bin = atob(s); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function concat(...parts) {
  const len = parts.reduce((n, p) => n + p.length, 0); const out = new Uint8Array(len); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function hmac(key, data) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

// ---------- VAPID (who is sending) ----------
async function vapidHeader(endpoint, vapid) {
  const aud = new URL(endpoint).origin;
  const header = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: vapid.subject })));
  const key = await crypto.subtle.importKey("jwk", vapid.privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(header + "." + claims));
  return "vapid t=" + header + "." + claims + "." + b64u(sig) + ", k=" + vapid.publicKey;
}

// ---------- payload encryption (only the phone can read it) ----------
async function encryptPayload(sub, plaintext) {
  const uaPublic = unb64u(sub.keys.p256dh);
  const authSecret = unb64u(sub.keys.auth);
  const local = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));
  const prkKey = await hmac(authSecret, ecdh);
  const ikm = await hmac(prkKey, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const aes = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, concat(enc.encode(plaintext), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // record size 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, ct);
}

// Returns "ok", "gone" (subscription no longer valid; delete it) or an error string.
async function sendPush(sub, message, vapid) {
  const body = await encryptPayload(sub, JSON.stringify(message));
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidHeader(sub.endpoint, vapid),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "43200",
      Urgency: "high",
    },
    body,
  });
  if (res.status === 404 || res.status === 410) return "gone";
  if (!res.ok) return "error " + res.status + " " + (await res.text()).slice(0, 200);
  return "ok";
}


// ---------- database (REST, service role) ----------
function db() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
  const headers = { apikey: key, "Content-Type": "application/json" };
  if (key && !key.startsWith("sb_")) headers.Authorization = "Bearer " + key;
  const q = async (path, opts = {}) => {
    const r = await fetch(url + "/rest/v1/" + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
    if (!r.ok) throw new Error(path.split("?")[0] + ": " + r.status + " " + (await r.text()).slice(0, 200));
    return r.status === 204 ? null : r.json().catch(() => null);
  };
  return { url, key, headers, q };
}
const inList = (ids) => "(" + ids.map((x) => '"' + x + '"').join(",") + ")";
function config() {
  const c = JSON.parse(Deno.env.get("ITL_PUSH") || "{}");
  return { vapid: { publicKey: c.pub, privateJwk: c.priv, subject: c.site || "https://glint.haus" }, cron: c.cron };
}

// ---------- what happened in a game ----------
const QS = 36;   // Q♠ (suit 2, rank 12), same numbering as the game's engine.js
const suit = (c) => Math.floor(c / 13), rank = (c) => (c % 13) + 2;
const SYM = ["♣", "♦", "♠", "♥"], RL = (r) => ({ 11: "J", 12: "Q", 13: "K", 14: "A" })[r] || String(r);
function winner(cards) {   // cards: [[seat, card], ...] in play order
  const ls = suit(cards[0][1]); let w = cards[0];
  for (const x of cards) if (suit(x[1]) === ls && rank(x[1]) > rank(w[1])) w = x;
  return w;
}
// Events for seat 0 (the human) in one game record: {key, kind, hand, trick?, by?}
function events(d) {
  const out = [];
  (d.hands || []).forEach((h, hi) => {
    const P = h.plays || [];
    for (let i = 0; i + 3 < P.length; i += 4) {
      const t = P.slice(i, i + 4);
      if (t[0][0] === 0 && t[0][1] === QS) {
        const w = winner(t);
        if (w[0] !== 0) out.push({ key: "gambit:" + hi + ":" + i / 4, kind: "gambit", hand: hi, trick: i / 4, by: w[0], card: w[1] });
      }
    }
    if (h.moon === 0) out.push({ key: "moon:" + hi, kind: "moon", hand: hi, choice: h.choice });
  });
  return out;
}
function message(d, name, e) {
  const girl = d.me || "her girl", names = d.names || [];
  const round = "round " + (e.hand + 1);
  if (e.kind === "moon") {
    const how = e.choice === "down" ? "took 26 off her own score" : e.choice === "up" ? "gave everyone else 26" : "";
    return { title: name + " shot the moon 🌙", body: "As " + girl + ", " + round + (how ? ", and " + how : "") + ". Tap to watch the replay.", tag: "hb-" + e.key };
  }
  const who = names[e.by] || "a girl";
  return { title: name + " pulled a Queen’s Gambit 👑", body: "As " + girl + ": led the Q♠ and " + who + " took her with the " + RL(rank(e.card)) + SYM[suit(e.card)] + ", " + round + ". Tap to watch the replay.", tag: "hb-" + e.key };
}

async function sendAll(d, subs, msg, gameId, vapid) {
  const results = [];
  for (const s of subs) {
    const url = (s.origin || "https://glint.haus") + "/heartbreakers/?replay=" + encodeURIComponent(gameId);
    const r = await sendPush(s.sub, { ...msg, url }, vapid).catch((e) => "error " + e.message);
    if (r === "gone") await d.q("hb_push_subs?endpoint=eq." + encodeURIComponent(s.endpoint), { method: "DELETE" });
    results.push(r);
  }
  return results;
}

async function runAll(dry) {
  const { vapid } = config();
  const d = db();
  const admins = (await d.q("glint_roles?select=user_id&role=eq.admin")).map((r) => r.user_id);
  const subs = await d.q("hb_push_subs?select=endpoint,user_id,sub,origin");
  if (!admins.length || (!subs.length && !dry)) return { subs: 0 };
  const since = new Date(Date.now() - (dry ? 7 * 864e5 : 10 * 60e3)).toISOString();
  const games = await d.q("hb_games?select=id,user_id,data&updated_at=gte." + since + "&user_id=not.in." + inList(admins));
  const report = [];
  for (const recip of admins) {
    const mine = subs.filter((s) => s.user_id === recip);
    if (!mine.length && !dry) continue;
    const sent = new Set((await d.q("push_sent?select=key&user_id=eq." + recip + "&key=like.hb:*")).map((r) => r.key));
    for (const g of games) {
      const data = g.data || {};
      if (data.debug) continue;
      let name = data.handle;
      for (const e of events(data)) {
        const key = "hb:" + g.id + ":" + e.key;
        if (sent.has(key)) continue;
        if (!name) {
          const u = await fetch(d.url + "/auth/v1/admin/users/" + g.user_id, { headers: d.headers }).then((r) => r.json()).catch(() => ({}));
          name = (u.user_metadata && u.user_metadata.username) || "Someone";
          name = name.replace(/^./, (c) => c.toUpperCase());
        }
        const msg = message(data, name, e);
        if (dry) { report.push({ game: g.id, key, ...msg }); continue; }
        await d.q("push_sent", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify([{ user_id: recip, key }]) });
        sent.add(key);
        report.push({ key, title: msg.title, results: await sendAll(d, mine, msg, g.id, vapid) });
      }
    }
  }
  return { games: games.length, sent: report };
}

async function runTest(req) {
  const { vapid } = config();
  const d = db();
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const who = await fetch(d.url + "/auth/v1/user", { headers: { apikey: d.key, Authorization: "Bearer " + token } });
  if (!who.ok) return { status: 401, body: { error: "Sign in first." } };
  const user = await who.json();
  const role = await d.q("glint_roles?select=role&user_id=eq." + user.id);
  if (!role.length || role[0].role !== "admin") return { status: 403, body: { error: "Admins only." } };
  const subs = await d.q("hb_push_subs?select=endpoint,user_id,sub,origin&user_id=eq." + user.id);
  if (!subs.length) return { status: 404, body: { error: "Alerts aren’t on for any of your devices." } };
  const last = await d.q("hb_games?select=id&order=updated_at.desc&limit=1");
  const results = await sendAll(d, subs, { title: "Heartbreakers alerts are on", body: "You’ll hear about friends’ moons and Queen’s Gambits. Tap to open the latest game’s replay.", tag: "hb-test" }, last.length ? last[0].id : "", vapid);
  return { status: 200, body: { results } };
}

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
function json(status, body) { return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } }); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    let body = {}; try { body = await req.json(); } catch { /* empty body */ }
    if (body.test) { const r = await runTest(req); return json(r.status, r.body); }
    if (req.headers.get("x-cron-secret") !== config().cron) return json(401, { error: "unauthorized" });
    return json(200, await runAll(!!body.dry));
  } catch (e) {
    return json(500, { error: String((e && e.message) || e) });
  }
});
