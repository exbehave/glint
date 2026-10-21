/* ---------- Glint Remote (Oct 21, 2026) ----------
   A phone controller for a Theater on a computer. Enter the Theater's four-letter code; commands go out as Realtime broadcasts on
   "glint-room-<CODE>" and the Theater answers with its state (the Lineup with thumbnails, what's on, the slideshow settings).
   No sign-in needed: knowing the code is the key, and the code changes every time the Theater reloads. Nothing is rendered here. */
const $ = s => document.querySelector(s), esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t, pct = v => Math.round(v * 100) + "%";
const SUPA_URL = "https://lwbbkwftkxjmrpyalrwu.supabase.co", SUPA_KEY = "sb_publishable_j4FskQJtwZnxNBZXH61QJQ_U62I-eaY";
const sb = window.supabase ? window.supabase.createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } }) : null;
let room = null, code = null, S = null, waitT = 0;
function msg(t) { $("#join-msg").textContent = t; }
function send(cmd) { if (room) room.send({ type: "broadcast", event: "cmd", payload: cmd }); }
function slider(id, label, hint, min, max, step, val, fmt, onInput) {
  const row = document.createElement("div"); row.className = "ctl";
  row.innerHTML = `<div class="ctl-top"><label for="${id}">${esc(label)}</label><output>${fmt(val)}</output></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}">`;
  const inp = row.querySelector("input"), out = row.querySelector("output"), paint = () => inp.style.setProperty("--p", ((inp.value - min) / (max - min) * 100) + "%"); paint();
  inp.addEventListener("input", () => { const v = parseFloat(inp.value); out.textContent = fmt(v); paint(); }); inp.addEventListener("change", () => onInput(parseFloat(inp.value)));
  return row;
}
function render() {
  if (!S) return; const on = S.lineup.find(p => p.id === S.nowId);
  $("#now-line").textContent = on ? on.name + (S.cycling ? " · slideshow" : "") + (S.playing ? "" : " · not full screen") : S.playing ? "Playing" : "Idle";
  $("#r-shuffle").setAttribute("aria-pressed", S.shuffle); $("#r-favs").setAttribute("aria-pressed", S.favsOnly);
  const ctl = $("#r-ctl"); if (!ctl.querySelector("input") || +ctl.querySelector("input").value !== S.secs) { ctl.innerHTML = ""; ctl.append(slider("r-secs", "Each persona plays for", "", 5, 90, 1, S.secs, v => Math.round(v) + " s", v => send({ cmd: "secs", secs: v }))); }
  const f = $("#r-fade"); f.innerHTML = ""; [["cross", "Crossfade"], ["cut", "Hard cut"]].forEach(([k, n]) => { const c = document.createElement("button"); c.className = "chip"; c.type = "button"; c.textContent = n; c.setAttribute("aria-pressed", S.fade === k); c.addEventListener("click", () => send({ cmd: "fade", fade: k })); f.append(c); });
  const box = $("#r-list"); box.innerHTML = ""; const favs = new Set(S.favs || []), tops = S.lineup.filter(p => !p.parent_id);
  $("#r-sub").textContent = tops.length ? `${tops.length} persona${tops.length === 1 ? "" : "s"}` : "nothing posted yet";
  tops.forEach(p => { const w = document.createElement("div"); w.className = "persona" + (p.id === S.nowId ? " now" : ""), moods = S.lineup.filter(q => q.parent_id === p.id);
    w.innerHTML = `<button class="load" type="button" aria-label="Play ${esc(p.name)}">${p.thumb ? `<img src="${p.thumb}" alt="">` : "<i></i>"}<span>${esc(p.name)}</span></button><button class="fav" type="button" aria-pressed="${favs.has(p.id)}" aria-label="Favorite ${esc(p.name)}">★</button>`;
    w.querySelector(".load").addEventListener("click", () => send({ cmd: "play", id: p.id })); w.querySelector(".fav").addEventListener("click", () => send({ cmd: "fav", id: p.id, on: !favs.has(p.id) }));
    if (moods.length) { const mb = document.createElement("div"); mb.className = "moods"; moods.forEach(m => { const c = document.createElement("button"); c.className = "chip"; c.type = "button"; c.textContent = m.name; c.setAttribute("aria-pressed", m.id === S.nowId); c.addEventListener("click", () => send({ cmd: "play", id: m.id })); mb.append(c); }); w.append(mb); }
    box.append(w); });
}
function join(c) {
  if (!sb) { msg("Can't reach the connection service."); return; } c = (c || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); if (c.length !== 4) { msg("The code is four letters."); return; }
  if (room) { try { sb.removeChannel(room); } catch (_) {} room = null; } code = c; msg("Connecting…"); $("#join").disabled = true;
  room = sb.channel("glint-room-" + code, { config: { broadcast: { self: false } } });
  room.on("broadcast", { event: "state" }, ({ payload }) => { clearTimeout(waitT); S = payload; $("#join-card").hidden = true; $("#ctl-card").hidden = false; $("#list-card").hidden = false; $("#leave").hidden = false; $("#link-state").textContent = "Connected · " + code; try { localStorage.setItem("glint.remote.code", code); } catch (_) {} render(); });
  room.subscribe(status => { if (status === "SUBSCRIBED") { send({ cmd: "hello" }); waitT = setTimeout(() => { if (!S) { msg("No Theater answered on " + code + ". Check the code on the computer's screen, and that it's signed in."); $("#join").disabled = false; } }, 4000); } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { msg("Couldn't connect. Try again."); $("#join").disabled = false; } });
}
function leave() { if (room) { try { sb.removeChannel(room); } catch (_) {} } room = null; S = null; $("#join-card").hidden = false; $("#ctl-card").hidden = true; $("#list-card").hidden = true; $("#leave").hidden = true; $("#link-state").textContent = "Not connected"; $("#join").disabled = false; msg(""); }
$("#join").addEventListener("click", () => join($("#code").value));
$("#code").addEventListener("keydown", e => { if (e.key === "Enter") join($("#code").value); });
$("#leave").addEventListener("click", leave);
$("#r-prev").addEventListener("click", () => send({ cmd: "prev" })); $("#r-next").addEventListener("click", () => send({ cmd: "next" })); $("#r-playall").addEventListener("click", () => send({ cmd: "playAll" }));
$("#r-shuffle").addEventListener("click", () => send({ cmd: "shuffle", on: !(S && S.shuffle) })); $("#r-favs").addEventListener("click", () => send({ cmd: "favsOnly", on: !(S && S.favsOnly) }));
$("#r-fs").addEventListener("click", () => send({ cmd: "fullscreen" })); $("#r-stop").addEventListener("click", () => send({ cmd: "stop" }));
try { const last = localStorage.getItem("glint.remote.code"); if (last) $("#code").value = last; } catch (_) {}
const q = new URLSearchParams(location.search).get("code"); if (q) { $("#code").value = q; join(q); }
