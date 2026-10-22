/* ---------- Glint Remote (Oct 21, 2026) ----------
   A phone controller for a Theater on a computer. Enter the Theater's four-letter code; commands go out as Realtime broadcasts on
   "glint-room-<CODE>" and the Theater answers with its state (the Lineup with thumbnails, what's on, the slideshow settings).
   No sign-in needed: knowing the code is the key, and the code changes every time the Theater reloads. Nothing is rendered here. */
const $ = s => document.querySelector(s), esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t, pct = v => Math.round(v * 100) + "%";
const SUPA_URL = "https://lwbbkwftkxjmrpyalrwu.supabase.co", SUPA_KEY = "sb_publishable_j4FskQJtwZnxNBZXH61QJQ_U62I-eaY";
const sb = window.supabase ? window.supabase.createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
let room = null, code = null, S = null, waitT = 0, user = null, sendT = {};
function msg(t) { $("#join-msg").textContent = t; }
function send(cmd) { if (room) room.send({ type: "broadcast", event: "cmd", payload: cmd }); }
// slider moves stream while dragging, at most ~12 a second per control
function sendLive(key, cmd) { const now = Date.now(); if (sendT[key] && now - sendT[key] < 80) { clearTimeout(sendT[key + ":t"]); sendT[key + ":t"] = setTimeout(() => { sendT[key] = Date.now(); send(cmd); }, 80); return; } sendT[key] = now; send(cmd); }
function slider(id, label, hint, min, max, step, val, fmt, onInput) {
  const row = document.createElement("div"); row.className = "ctl";
  row.innerHTML = `<div class="ctl-top"><label for="${id}">${esc(label)}</label><output>${fmt(val)}</output></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}">`;
  const inp = row.querySelector("input"), out = row.querySelector("output"), paint = () => inp.style.setProperty("--p", ((inp.value - min) / (max - min) * 100) + "%"); paint();
  inp.addEventListener("input", () => { const v = parseFloat(inp.value); out.textContent = fmt(v); paint(); if (row.live) onInput(v); }); inp.addEventListener("change", () => onInput(parseFloat(inp.value)));
  return row;
}
const liveSlider = (...a) => { const r = slider(...a); r.live = true; return r; };
function render() {
  if (!S) return; const on = S.lineup.find(p => p.id === S.nowId), th = S.page !== "studio";
  ["#r-shuffle", "#r-favs", "#r-fade"].forEach(id => { $(id).hidden = !th; });
  $("#admin-card").hidden = !S.admin; $("#lens-card").hidden = !S.admin; if (S.admin) renderAdmin();
  $("#now-line").textContent = on ? on.name + (S.cycling ? " · slideshow" : "") + (S.playing ? "" : " · not full screen") : S.playing ? "Playing" : "Idle";
  $("#r-shuffle").setAttribute("aria-pressed", S.shuffle); $("#r-favs").setAttribute("aria-pressed", S.favsOnly);
  const ctl = $("#r-ctl"); if (!ctl.querySelector("input") || +ctl.querySelector("input").value !== S.secs) { ctl.innerHTML = ""; ctl.append(slider("r-secs", "Each persona plays for", "", 5, 90, 1, S.secs, v => Math.round(v) + " s", v => send({ cmd: "secs", secs: v }))); }
  const f = $("#r-fade"); f.innerHTML = ""; if (th) [["cross", "Crossfade"], ["cut", "Hard cut"]].forEach(([k, n]) => { const c = document.createElement("button"); c.className = "chip"; c.type = "button"; c.textContent = n; c.setAttribute("aria-pressed", S.fade === k); c.addEventListener("click", () => send({ cmd: "fade", fade: k })); f.append(c); });
  const box = $("#r-list"); box.innerHTML = ""; const favs = new Set(S.favs || []), tops = S.lineup.filter(p => !p.parent_id);
  $("#r-sub").textContent = tops.length ? `${tops.length} persona${tops.length === 1 ? "" : "s"}` : "nothing posted yet";
  tops.forEach(p => { const w = document.createElement("div"); w.className = "persona" + (p.id === S.nowId ? " now" : ""), moods = S.lineup.filter(q => q.parent_id === p.id);
    w.innerHTML = `<button class="load" type="button" aria-label="Play ${esc(p.name)}">${p.thumb ? `<img src="${p.thumb}" alt="">` : "<i></i>"}<span>${esc(p.name)}</span></button>` + (th ? `<button class="fav" type="button" aria-pressed="${favs.has(p.id)}" aria-label="Favorite ${esc(p.name)}">★</button>` : S.admin ? `<button class="fav" type="button" aria-label="Remove ${esc(p.name)}">×</button>` : "");
    w.querySelector(".load").addEventListener("click", () => send({ cmd: "play", id: p.id })); const fb = w.querySelector(".fav"); if (fb) fb.addEventListener("click", () => { if (th) send({ cmd: "fav", id: p.id, on: !favs.has(p.id) }); else if (confirm(`Take "${p.name}" off the Lineup?`)) send({ cmd: "remove", id: p.id }); });
    if (moods.length) { const mb = document.createElement("div"); mb.className = "moods"; moods.forEach(m => { const c = document.createElement("button"); c.className = "chip"; c.type = "button"; c.textContent = m.name; c.setAttribute("aria-pressed", m.id === S.nowId); c.addEventListener("click", () => send({ cmd: "play", id: m.id })); mb.append(c); }); w.append(mb); }
    box.append(w); });
}
function join(c) {
  if (!sb) { msg("Can't reach the connection service."); return; } c = (c || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); if (c.length !== 4) { msg("The code is four letters."); return; }
  if (room) { try { sb.removeChannel(room); } catch (_) {} room = null; } code = c; msg("Connecting…"); $("#join").disabled = true;
  room = sb.channel("glint-room-" + code, { config: { broadcast: { self: false } } });
  room.on("broadcast", { event: "state" }, ({ payload }) => { clearTimeout(waitT); S = payload; $("#join-card").hidden = true; $("#auth-card").hidden = true; $("#ctl-card").hidden = false; $("#list-card").hidden = false; $("#leave").hidden = false; $("#link-state").textContent = "Connected · " + code; try { localStorage.setItem("glint.remote.code", code); } catch (_) {} render(); });
  room.subscribe(status => { if (status === "SUBSCRIBED") { send({ cmd: "hello" }); waitT = setTimeout(() => { if (!S) { msg("No Theater answered on " + code + ". Check the code on the computer's screen, and that it's signed in."); $("#join").disabled = false; } }, 4000); } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { msg("Couldn't connect. Try again."); $("#join").disabled = false; } });
}
function leave() { if (room) { try { sb.removeChannel(room); } catch (_) {} } room = null; S = null; adminSig = ""; $("#join-card").hidden = false; $("#auth-card").hidden = false; $("#admin-card").hidden = true; $("#lens-card").hidden = true; $("#ctl-card").hidden = true; $("#list-card").hidden = true; $("#leave").hidden = true; $("#link-state").textContent = "Not connected"; $("#join").disabled = false; msg(""); }
$("#join").addEventListener("click", () => join($("#code").value));
$("#code").addEventListener("keydown", e => { if (e.key === "Enter") join($("#code").value); });
$("#leave").addEventListener("click", leave);
$("#r-prev").addEventListener("click", () => send({ cmd: "prev" })); $("#r-next").addEventListener("click", () => send({ cmd: "next" })); $("#r-playall").addEventListener("click", () => send({ cmd: "playAll" }));
$("#r-shuffle").addEventListener("click", () => send({ cmd: "shuffle", on: !(S && S.shuffle) })); $("#r-favs").addEventListener("click", () => send({ cmd: "favsOnly", on: !(S && S.favsOnly) }));
$("#r-fs").addEventListener("click", () => send({ cmd: "fullscreen" })); $("#r-stop").addEventListener("click", () => send({ cmd: "stop" }));
try { const last = localStorage.getItem("glint.remote.code"); if (last) $("#code").value = last; } catch (_) {}
const q = new URLSearchParams(location.search).get("code"); if (q) { $("#code").value = q; join(q); }

/* ---------- admin: the Studio's controls, mirrored; every move streams to the computer ---------- */
let adminSig = "";
function renderAdmin() {
  const sig = JSON.stringify(S.design.map(l => [l.form, l.on, l.shape.map(x => x.key).join()])) + S.lenses.map(l => l.key + l.on).join();
  const box = $("#a-layers"); if (sig === adminSig && box.children.length) { syncAdmin(); return; } adminSig = sig; box.innerHTML = "";
  S.design.forEach(l => { const w = document.createElement("div"); w.className = "a-layer"; w.innerHTML = `<h4><span>${esc(l.name)}</span>${l.on ? "" : "<span>hidden</span>"}</h4>`;
    w.append(liveSlider(`a-lv-${l.i}`, "Opacity", "", 0, 1, .01, l.level, pct, v => sendLive("lv" + l.i, { cmd: "set", i: l.i, path: "level", v })));
    if (l.colorMode === "one") w.append(liveSlider(`a-hue-${l.i}`, "Hue", "", 0, 1, .003, l.hue / 359, v => Math.round(v * 359) + "°", v => sendLive("hue" + l.i, { cmd: "set", i: l.i, path: "hue", v })));
    const groups = new Map(); l.shape.forEach(sh => { const g = sh.grp || "Shape"; if (!groups.has(g)) { const d = document.createElement("div"); d.className = "grp"; const t = document.createElement("div"); t.className = "meta"; t.textContent = g.toUpperCase(); d.append(t); groups.set(g, d); w.append(d); } const d = groups.get(g);
      if (sh.opts) { const row = document.createElement("div"); row.className = "ctl"; row.innerHTML = `<div class="ctl-top"><label>${esc(sh.label)}</label></div><div class="chips seg"></div>`; const cur = Math.round(sh.v * sh.steps); sh.opts.forEach((n, q) => { const c = document.createElement("button"); c.className = "chip"; c.type = "button"; c.textContent = n; c.setAttribute("aria-pressed", q === cur); c.addEventListener("click", () => send({ cmd: "set", i: l.i, path: "sh." + sh.key, v: q / sh.steps })); row.querySelector(".chips").append(c); }); d.append(row); return; }
      const fmt = v => sh.steps ? String(Math.round(v * sh.steps)) : pct(v), r = liveSlider(`a-sh-${l.i}-${sh.key}`, sh.label, "", 0, 1, sh.steps ? 1 / sh.steps : .01, sh.v, fmt, v => sendLive("sh" + l.i + sh.key, { cmd: "set", i: l.i, path: "sh." + sh.key, v })); if (sh.auto) { r.classList.add("auto"); r.title = "Automated on the computer"; } d.append(r); });
    const det = document.createElement("details"); det.innerHTML = "<summary>Position and motion</summary>"; const dd = document.createElement("div"); dd.className = "grp"; dd.style.marginTop = "8px";
    dd.append(liveSlider(`a-hx-${l.i}`, "Across", "", 0, 1, .01, l.hx, pct, v => sendLive("hx" + l.i, { cmd: "set", i: l.i, path: "hx", v }))); dd.append(liveSlider(`a-hy-${l.i}`, "Down", "", 0, 1, .01, l.hy, pct, v => sendLive("hy" + l.i, { cmd: "set", i: l.i, path: "hy", v })));
    l.p.forEach(kn => { const r = liveSlider(`a-p-${l.i}-${kn.key}`, kn.label, "", 0, 1, .01, kn.v, pct, v => sendLive("p" + l.i + kn.key, { cmd: "set", i: l.i, path: "p." + kn.key, v })); if (kn.auto) r.classList.add("auto"); dd.append(r); }); det.append(dd); w.append(det); box.append(w); });
  const lb = $("#a-lenses"), lc = $("#a-lens-ctl"); lb.innerHTML = ""; lc.innerHTML = "";
  S.lenses.forEach(m => { const c = document.createElement("button"); c.className = "chip"; c.type = "button"; c.textContent = m.name; c.setAttribute("aria-pressed", m.on); c.addEventListener("click", () => send({ cmd: "lens", key: m.key, on: !m.on })); lb.append(c); if (m.on) lc.append(liveSlider("a-lo-" + m.key, m.name, "", 0, 1, .01, m.op, pct, v => sendLive("lo" + m.key, { cmd: "lens", key: m.key, op: v }))); });
}
// the computer's state changed (automation, a slider moved there): nudge the mirrored sliders without rebuilding
function syncAdmin() { const set = (id, v, fmt) => { const inp = document.getElementById(id); if (!inp || inp === document.activeElement || inp.matches(":active")) return; inp.value = v; inp.style.setProperty("--p", ((inp.value - inp.min) / (inp.max - inp.min) * 100) + "%"); const out = inp.parentElement.querySelector("output"); if (out) out.textContent = fmt(v); };
  S.design.forEach(l => { set(`a-lv-${l.i}`, l.level, pct); set(`a-hue-${l.i}`, l.hue / 359, v => Math.round(v * 359) + "°"); set(`a-hx-${l.i}`, l.hx, pct); set(`a-hy-${l.i}`, l.hy, pct); l.shape.forEach(sh => { if (!sh.opts) set(`a-sh-${l.i}-${sh.key}`, sh.v, v => sh.steps ? String(Math.round(v * sh.steps)) : pct(v)); }); l.p.forEach(kn => set(`a-p-${l.i}-${kn.key}`, kn.v, pct)); });
  S.lenses.forEach(m => set("a-lo-" + m.key, m.op, pct)); }
$("#a-post").addEventListener("click", () => { const n = $("#a-name").value.trim(); if (!n) { $("#a-name").focus(); return; } send({ cmd: "post", name: n }); $("#a-name").value = ""; });

/* ---------- account pairing: sign in here, and the phone finds the computer this account has open ---------- */
function authUI(m) { $("#auth-msg").textContent = m || ""; $("#auth-form").hidden = !!user; $("#auth-find").hidden = !user; $("#auth-out").hidden = !user; $("#auth-sub").textContent = user ? GlintAccount.name(user) : ""; GlintAccount.gate(sb, user); $("#auth-help").hidden = !!user; checkAdmin(); }
// The admin can also run the full Studio right here, computer or not.
let adminFor = null;
async function checkAdmin() { const b = $("#auth-studio"); if (!user) { b.hidden = true; adminFor = null; return; } if (adminFor === user.id) return; adminFor = user.id; try { const { data } = await sb.from("glint_roles").select("role").eq("user_id", user.id).maybeSingle(); b.hidden = !(data && data.role === "admin"); } catch (_) { b.hidden = true; } }
async function findRoom(quiet) {
  if (!sb || !user) return; if (!quiet) authUI("Looking for your computer…");
  const { data } = await sb.from("glint_rooms").select("code,page,seen_at").eq("user_id", user.id).maybeSingle();
  if (!data || Date.now() - new Date(data.seen_at).getTime() > 120000) { authUI(quiet ? "" : "Nothing open. Open Glint on your computer, then tap Find my computer."); return false; }
  authUI("Found your " + (data.page === "studio" ? "Studio" : "Theater") + " · " + data.code); join(data.code); return true;
}
$("#auth-form").addEventListener("submit", async e => { e.preventDefault(); const email = GlintAccount.email($("#auth-user").value), password = $("#auth-pass").value; if (!email || !password) return; $("#auth-go").disabled = true; authUI("Signing in…");
  const { error } = await sb.auth.signInWithPassword({ email, password }); $("#auth-go").disabled = false; if (error) authUI(/invalid/i.test(error.message) ? "That username and password don't match." : "Couldn't sign in: " + error.message); else $("#auth-pass").value = ""; });
$("#auth-find").addEventListener("click", () => findRoom(false));
$("#auth-out").addEventListener("click", async () => { await sb.auth.signOut(); user = null; authUI("Signed out."); leave(); });
if (sb) { sb.auth.onAuthStateChange((ev, session) => { user = session ? session.user : null; authUI(); if (user && !room) findRoom(true); }); sb.auth.getSession().then(({ data }) => { user = data && data.session ? data.session.user : null; authUI(); if (user && !room) findRoom(true); }); }
document.addEventListener("visibilitychange", () => { if (!document.hidden && user && !room) findRoom(true); });
