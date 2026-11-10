// hb-leaders — BGC: Heartbreakers leaderboards (Kennedy, Nov 7, 2026).
// Any signed-in player may call it. It reads every FINISHED game in hb_games (with the service role, since each
// player can only read their own rows), works out each player's numbers with stats.js (the same code the game uses),
// and returns only the added-up numbers per player, never anyone's cards.
//   → { me, players: [{ id, name, games, sum }], girls: [{ name, games, sum }] }
//   sum = hbAddUp(...) (counts, picks, fav, best, worst) + unfinished + nemesis {name, girl, n} + rating, peak, last (hbRate over every finished game, oldest first)
// Practice games (data.practice) are skipped entirely.
// Unfinished = exited with Exit game (data.quit): counted as a game played and a loss (Kennedy, Nov 8). A game you leave open is
// just paused (it resumes on any device), so it never counts.
// Theater games (Kennedy, Nov 9): four girls, no human, in their own table hb_theater_games. Every finished one counts
// toward the girls' ratings and the Girls board (all four seats); none touch any player's numbers or nemesis.
// Fresh start (Kennedy, Nov 8, 00:59): only games started on or after SINCE count; older records are kept but ignored.
const SINCE = "2026-11-08T07:00:00Z";
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
    const { data, error } = await admin.from("hb_games").select("user_id, started_at, data").eq("finished", true).gte("started_at", SINCE).range(from, from + 499);
    if (error) return json({ error: error.message }, 500);
    games.push(...(data || []).filter((g) => !g.data?.practice));   // practice games don't count
    if (!data || data.length < 500) break;
  }
  const when = (g: { started_at: string; data: Record<string, any> }) => Date.parse(g.data?.started || g.started_at) || 0;
  games.sort((a, b) => when(a) - when(b));
  const quit = new Map<string, number>();
  const quits: { user_id: string; started_at: string; data: Record<string, any> }[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await admin.from("hb_games").select("user_id, started_at, data").eq("finished", false).gte("started_at", SINCE).range(from, from + 499);
    if (error) return json({ error: error.message }, 500);
    for (const r of data || []) {
      if (r.data?.practice) continue;
      if (!r.data?.quit) continue;
      quit.set(r.user_id, (quit.get(r.user_id) || 0) + 1); quits.push(r);
    }
    if (!data || data.length < 500) break;
  }
  const byUser = new Map<string, unknown[]>(), byGirl = new Map<string, unknown[]>();
  const add = (m: Map<string, unknown[]>, k: string, v: unknown) => (m.get(k) || m.set(k, []).get(k)!).push(v);
  const rated: { at: number; keys: string[]; totals: number[]; quit?: boolean; theater?: boolean }[] = [];
  for (const g of games) {
    try {
      const names = (g.data?.names || []) as string[];
      add(byUser, g.user_id, hbGameStats(g.data, 0));
      for (let s = 1; s < 4; s++) if (names[s]) add(byGirl, names[s], hbGameStats(g.data, s));
      rated.push({ at: when(g), keys: ["u:" + g.user_id, "g:" + names[1], "g:" + names[2], "g:" + names[3]], totals: g.data?.totals || [] });
    } catch { /* skip a broken record */ }
  }
  // theater games: every seat is a girl, so all four seats are rated and get girl stats
  for (let from = 0; ; from += 500) {
    const { data, error } = await admin.from("hb_theater_games").select("started_at, data").eq("finished", true).gte("started_at", SINCE).range(from, from + 499);
    if (error) break;   // the girls' boards still work from regular games
    for (const g of data || []) {
      try {
        const names = (g.data?.names || []) as string[];
        if (names.length !== 4 || names.some((n) => !n)) continue;
        for (let s = 0; s < 4; s++) add(byGirl, names[s], hbGameStats(g.data, s));
        rated.push({ at: when(g), keys: names.map((n) => "g:" + n), totals: g.data?.totals || [], theater: true });
      } catch { /* skip a broken record */ }
    }
    if (!data || data.length < 500) break;
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
    if (g.theater || win.includes(0)) continue;   // nemesis is for players; theater tables have none
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
    // Kennedy, Nov 8: whoever beat you most. Two tied → both; three or more tied → too close to call (who: []).
    const top = [...m].sort((a, b) => b[1] - a[1]);
    const n = top[0][1], tied = top.filter((x) => x[1] === n);
    const who = tied.length > 2 ? [] : tied.map(([k]) => ({ name: label(k), girl: k.startsWith("g:") }));
    return { who, n, tied: tied.length };
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
