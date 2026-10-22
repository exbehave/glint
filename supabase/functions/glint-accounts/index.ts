// glint-accounts — the admin's member manager (Glint and In the Loop share these accounts).
// Accounts are username-only: a username "sam" is the auth email sam@glint.haus behind the scenes.
// Only an admin (glint_roles.role = 'admin') may call this. Actions:
//   list                      → [{ id, username, role, created_at, last_sign_in_at, must_change }]
//   create { username, role } → { id, username, password }   (temporary password; the member sets their own on first sign-in)
//   reset  { id }             → { id, username, password }   (new temporary password)
//   remove { id }             → { ok }                       (an admin can't remove themself)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided to every function automatically.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const DOMAIN = "glint.haus";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Temporary passwords: 10 characters, no look-alikes (0/O, 1/l/I), easy to read off a phone.
function tempPassword(): string {
  const alpha = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => alpha[b % alpha.length]).join("");
}
const cleanUsername = (u: unknown) => String(u ?? "").trim().toLowerCase();
const validUsername = (u: string) => /^[a-z0-9][a-z0-9._-]{1,23}$/.test(u);
const usernameOf = (user: { email?: string; user_metadata?: Record<string, unknown> }) =>
  (user.user_metadata?.username as string) || (user.email || "").replace(/@.*$/, "");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!, key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key, { auth: { persistSession: false } });

  // Who is calling? Verify their token ourselves.
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Sign in first." }, 401);
  const { data: me, error: meErr } = await admin.auth.getUser(token);
  if (meErr || !me?.user) return json({ error: "Sign in first." }, 401);
  const { data: roleRow } = await admin.from("glint_roles").select("role").eq("user_id", me.user.id).maybeSingle();
  if (!roleRow || roleRow.role !== "admin") return json({ error: "Only the admin can manage members." }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body */ }
  const action = String(body.action || "");

  if (action === "list") {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return json({ error: error.message }, 500);
    const { data: roles } = await admin.from("glint_roles").select("user_id, role");
    const roleOf = new Map((roles || []).map((r: { user_id: string; role: string }) => [r.user_id, r.role]));
    const users = data.users
      .map((u) => ({
        id: u.id,
        username: usernameOf(u),
        role: roleOf.get(u.id) || "member",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        must_change: !!u.user_metadata?.must_change,
      }))
      .sort((a, b) => (a.role === b.role ? a.username.localeCompare(b.username) : a.role === "admin" ? -1 : 1));
    return json({ users });
  }

  if (action === "create") {
    const username = cleanUsername(body.username);
    if (!validUsername(username)) return json({ error: "Usernames are 2–24 letters, numbers, dots, dashes or underscores." }, 400);
    const role = body.role === "admin" ? "admin" : "member";
    const password = tempPassword();
    const { data, error } = await admin.auth.admin.createUser({
      email: `${username}@${DOMAIN}`,
      password,
      email_confirm: true,
      user_metadata: { username, must_change: true },
    });
    if (error) return json({ error: /already/i.test(error.message) ? `"${username}" is taken.` : error.message }, 400);
    await admin.from("glint_roles").upsert({ user_id: data.user.id, role });
    return json({ id: data.user.id, username, password });
  }

  if (action === "reset") {
    const id = String(body.id || "");
    const { data: target } = await admin.auth.admin.getUserById(id);
    if (!target?.user) return json({ error: "No such member." }, 404);
    const password = tempPassword();
    const { error } = await admin.auth.admin.updateUserById(id, {
      password,
      user_metadata: { ...(target.user.user_metadata || {}), must_change: true },
    });
    if (error) return json({ error: error.message }, 500);
    return json({ id, username: usernameOf(target.user), password });
  }

  if (action === "remove") {
    const id = String(body.id || "");
    if (id === me.user.id) return json({ error: "You can't remove yourself." }, 400);
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return json({ error: error.message }, 500);
    await admin.from("glint_roles").delete().eq("user_id", id);
    return json({ ok: true });
  }

  return json({ error: "Unknown action." }, 400);
});
