// hb-leaders — BGC: Heartbreakers leaderboards (Kennedy, Nov 7, 2026).
// Any signed-in player may call it. It reads every FINISHED game in hb_games (with the service role, since each
// player can only read their own rows), works out each player's numbers with stats.js (the same code the game uses),
// and returns only the added-up numbers per player, never anyone's cards.
//   → { me, players: [{ id, name, games, sum }], girls: [{ name, games, sum }] }
//   sum = hbAddUp(...) (counts, picks, fav, best, worst) + unfinished + nemesis {name, girl, n} + rating, peak, last (hbRate over every finished game, oldest first)
// Practice games (data.practice) are skipped entirely.
// Unfinished = exited (data.quit, set by Exit game) or left behind when the player started a newer game: counted as a game played and a loss (Kennedy, Nov 8).
// stats.js here is GENERATED from heartbreakers-src/stats.js by heartbreakers-src/make_leaders.py.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { hbGameStats, hbAddUp, hbRate, HB_MIN_GAMES } from "./stats.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
// deno-lint-ignore-file no-explicit-any
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const usernameOf = (user: { email?: string; user_metadata?: Record<string, unknown> }) =>
  (user.user_metadata?.username as string) || (user.email || "").replace(/@.*$/, "");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = Deno.env.get("SUPABASE_URL")!, key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Sign in first." }, 401);
  const { data: me, error: meErr } = await admin.auth.getUser(token);
  if (meErr || !me?.user) return json({ error: "Sign in first." }, 401);

  // every finished game, a page at a time
  const games: { user_id: string; started_at: string; data: Record<string, any> }[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await admin.from("hb_games").select("user_id, started_at, data").eq("finished", true).range(from, from + 499);
    if (error) return json({ error: error.message }, 500);
    games.push(...(data || []).filter((g) => !g.data?.practice));   // practice games don't count
    if (!data || data.length < 500) break;
  }
  const when = (g: { started_at: string; data: Record<string, any> }) => Date.parse(g.data?.started || g.started_at) || 0;
  games.sort((a, b) => when(a) - when(b));
  // Quits (Kennedy, Nov 8): an unfinished rated game counts as a game played and a loss once it's over for good:
  // the player tapped Exit game (data.quit), or started a newer game (rated or practice) without finishing it.
  // Their newest game, if unfinished, is the one in progress and doesn't count yet. Quits feed the rating in order.
  const newest = new Map<string, number>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from("hb_games").select("user_id, started_at").range(from, from + 999);
    if (error) return json({ error: error.message }, 500);
    for (const r of data || []) newest.set(r.user_id, Math.max(newest.get(r.user_id) || 0, Date.parse(r.started_at) || 0));
    if (!data || data.length < 1000) break;
  }
  const quit = new Map<string, number>();
  const quits: { user_id: string; started_at: string; data: Record<string, any> }[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await admin.from("hb_games").select("user_id, started_at, data").eq("finished", false).range(from, from + 499);
    if (error) return json({ error: error.message }, 500);
    for (const r of data || []) {
      if (r.data?.practice) continue;
      const over = r.data?.quit || (Date.parse(r.started_at) || 0) < (newest.get(r.user_id) || 0);
      if (!over) continue;
      quit.set(r.user_id, (quit.get(r.user_id) || 0) + 1); quits.push(r);
    }
    if (!data || data.length < 500) break;
  }
  const byUser = new Map<string, unknown[]>(), byGirl = new Map<string, unknown[]>();
  const add = (m: Map<string, unknown[]>, k: string, v: unknown) => (m.get(k) || m.set(k, []).get(k)!).push(v);
  const rated: { at: number; keys: string[]; totals: number[]; quit?: boolean }[] = [];
  for (const g of games) {
    try {
      const names = (g.data?.names || []) as string[];
      add(byUser, g.user_id, hbGameStats(g.data, 0));
      for (let s = 1; s < 4; s++) if (names[s]) add(byGirl, names[s], hbGameStats(g.data, s));
      rated.push({ at: when(g), keys: ["u:" + g.user_id, "g:" + names[1], "g:" + names[2], "g:" + names[3]], totals: g.data?.totals || [] });
    } catch { /* skip a broken record */ }
  }
  for (const g of quits) {
    const names = (g.data?.names || []) as string[];
    if (names.length < 4) continue;
    const hands = (g.data?.hands || []) as Record<string, any>[];
    const lastTot = [...hands].reverse().find((h) => Array.isArray(h.totals))?.totals;
    rated.push({ at: when(g), keys: ["u:" + g.user_id, "g:" + names[1], "g:" + names[2], "g:" + names[3]], totals: g.data?.totals || lastTot || [0, 0, 0, 0], quit: true });
  }
  rated.sort((a, b) => a.at - b.at);
  const R = hbRate(rated);
  // Nemesis (Kennedy, Nov 8): whoever beat this player the most — the winner(s) of every game they lost, quits included
  // (a tie for first credits each winner). Works for girls or, later, humans at the same table.
  const beatBy = new Map<string, Map<string, number>>();
  for (const g of rated) {
    const t = g.totals;
    if (!t || t.length !== 4) continue;
    let win: number[];
    if (g.quit) { const lo = Math.min(t[1], t[2], t[3]); win = [1, 2, 3].filter((i) => t[i] === lo); }
    else { const lo = Math.min(...t); win = [0, 1, 2, 3].filter((i) => t[i] === lo); }
    if (win.includes(0)) continue;
    const who = g.keys[0], m = beatBy.get(who) || beatBy.set(who, new Map()).get(who)!;
    for (const w of win) m.set(g.keys[w], (m.get(g.keys[w]) || 0) + 1);
  }
  // deno-lint-ignore no-explicit-any
  // Provisional players (fewer than HB_MIN_GAMES rated games) get no rating shown; the board puts them last, newest first.
  const withRating = (sum: any, key: string) => {
    const r = R[key];
    if (!r) return sum;
    Object.assign(sum, { rated: r.rated, lastAt: r.lastAt || 0 });
    if (r.rated >= HB_MIN_GAMES) Object.assign(sum, { rating: r.rating, peak: r.peak, last: r.last });
    else sum.provisional = true;
    return sum;
  };
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const nameOf = new Map((list?.users || []).map((u) => [u.id, usernameOf(u)]));
  for (const id of quit.keys()) if (!byUser.has(id)) byUser.set(id, []);
  const label = (k: string) => k.startsWith("g:") ? k.slice(2) : (nameOf.get(k.slice(2)) || "player");
  const nemesisOf = (key: string) => {
    const m = beatBy.get(key);
    if (!m || !m.size) return null;
    const [k, n] = [...m].sort((a, b) => b[1] - a[1] || label(a[0]).localeCompare(label(b[0])))[0];
    return { name: label(k), girl: k.startsWith("g:"), n };
  };
  const players = [...byUser].map(([id, gs]) => {
    // deno-lint-ignore no-explicit-any
    const sum: any = gs.length ? hbAddUp(gs) : { picks: {}, fav: null, games: 0 };
    sum.unfinished = quit.get(id) || 0;
    sum.finished = gs.length;
    sum.games = gs.length + sum.unfinished;          // a quit counts as a game played (and a loss)
    sum.nemesis = nemesisOf("u:" + id);
    return { id, name: nameOf.get(id) || "player", games: sum.games, sum: withRating(sum, "u:" + id) };
  });
  const girls = [...byGirl].map(([name, gs]) => ({ name, games: gs.length, sum: withRating(hbAddUp(gs), "g:" + name) }));
  return json({ me: me.user.id, players, girls });
});
