// hb-leaders — BGC: Heartbreakers leaderboards (Kennedy, Nov 7, 2026).
// Any signed-in player may call it. It reads every FINISHED game in hb_games (with the service role, since each
// player can only read their own rows), works out each player's numbers with stats.js (the same code the game uses),
// and returns only the added-up numbers per player, never anyone's cards.
//   → { me, players: [{ id, name, games, sum }] }   sum = hbAddUp(...) (counts, picks, fav, best, worst)
// stats.js here is GENERATED from heartbreakers-src/stats.js by heartbreakers-src/make_leaders.py.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { hbGameStats, hbAddUp } from "./stats.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
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
  const games: { user_id: string; data: Record<string, unknown> }[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await admin.from("hb_games").select("user_id, data").eq("finished", true).range(from, from + 499);
    if (error) return json({ error: error.message }, 500);
    games.push(...(data || []));
    if (!data || data.length < 500) break;
  }
  const byUser = new Map<string, unknown[]>();
  for (const g of games) {
    try { (byUser.get(g.user_id) || byUser.set(g.user_id, []).get(g.user_id)!).push(hbGameStats(g.data)); } catch { /* skip a broken record */ }
  }
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const nameOf = new Map((list?.users || []).map((u) => [u.id, usernameOf(u)]));
  const players = [...byUser].map(([id, gs]) => ({ id, name: nameOf.get(id) || "player", games: gs.length, sum: hbAddUp(gs) }));
  return json({ me: me.user.id, players });
});
