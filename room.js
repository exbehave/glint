/* ---------- Room: the computer hosts a remote session (Oct 21, 2026) ----------
   Loaded by both the Theater and the Studio, after their own scripts. When signed in, the page opens a Supabase Realtime channel
   "glint-room-<CODE>", shows the code in the top bar, and records the code in glint_rooms under the account, so a phone signed in
   as the same person pairs without typing. Phones broadcast "cmd"; the host answers "state".
   Member commands work on both pages. Admin commands (live slider changes, post, remove) work only when the host is the Studio. */
let room = null, roomCode = null, roomT = 0, roomHeart = 0;
const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", IS_STUDIO = typeof TH === "undefined";
const nowId = () => IS_STUDIO ? (window.studioNowId || null) : (TH.nowId || null);

// what the phone needs to draw: the Lineup, what's on, slideshow settings, and (Studio only) the current design's controls
function roomState() {
  const st = { page: IS_STUDIO ? "studio" : "theater", admin: IS_STUDIO && role === "admin", nowId: nowId(), playing: document.body.classList.contains("playing"), cycling: !!cyc,
    lineup: lineup.map(p => ({ id: p.id, name: p.name, thumb: p.thumb, parent_id: p.parent_id || null })) };
  if (!IS_STUDIO) Object.assign(st, { shuffle: TH.shuffle, favsOnly: TH.favsOnly, fade: TH.fade, secs: TH.secs, favs: [...TH.favs] });
  else { st.secs = cycleSecs; st.design = state.layers.map((l, i) => { const f = FORM[l.form], all = f.shape || [], pick = key => { const it = all.find(x => x.key === key) || {}; return Math.round(lerp(it.min ?? 0, it.max ?? 1, l.shape[key] ?? it.def ?? .5)); }, items = all.filter(sh => !sh.text && !sh.button && !(sh.when && !sh.when(pick)));
      return { i, form: l.form, name: f.name, on: l.on, level: l.level, hue: l.hue, colorMode: (l.color || {}).mode || "one", hx: l.hx ?? .5, hy: l.hy ?? .52,
        shape: items.map(sh => { const mn = sh.min ?? 0, mx = sh.max ?? 1, steps = mn === 0 && mx === 1 && !sh.fmt ? 0 : mx - mn, v = l.shape[sh.key] ?? sh.def ?? .5, opts = sh.fmt && !sh.slide && steps ? Array.from({ length: steps + 1 }, (_, q) => sh.fmt(mn + q)) : null; return { key: sh.key, label: sh.label, v, steps, opts, grp: sh.grp || null, auto: !!(l.auto && l.auto["sh." + sh.key]) }; }),
        p: MOTION.map(kn => ({ key: kn.key, label: kn.label, v: l.p[kn.key], auto: !!(l.auto && l.auto["p." + kn.key]) })) }; });
    st.lenses = MOODS.map(m => { const s = state.moods[m.key]; return { key: m.key, name: m.name, on: s.on, op: s.op }; }); }
  return st;
}
function roomSend() { clearTimeout(roomT); roomT = setTimeout(() => { if (room) room.send({ type: "broadcast", event: "state", payload: roomState() }); }, 60); }

// playing from the Studio: load the persona and go full screen (the Theater has its own richer version)
function studioPlay(p) { stopCycle(); if (!applyDesign(p)) return; window.studioNowId = p.id; setPlaying(true); }
function studioPlayAll() { const list = lineup.slice(); if (list.length < 2) { if (list[0]) studioPlay(list[0]); return; } cyc = { list, i: -1, pre: snapshot(), timer: 0 }; cycleStep(1); restartTimer(); setPlaying(true); }

async function roomHandle(c) {
  const p = c.id && lineup.find(q => q.id === c.id), th = !IS_STUDIO;
  switch (c.cmd) {
    case "play": if (p) th ? thPlayOne(p) : studioPlay(p); break;
    case "playAll": th ? thPlayAll() : studioPlayAll(); break;
    case "next": if (cyc) { cycleStep(1); restartTimer(); } else th ? thPlayAll() : studioPlayAll(); break;
    case "prev": if (cyc) { cycleStep(-1); restartTimer(); } break;
    case "stop": setPlaying(false); break;
    case "fullscreen": setPlaying(true); break;
    case "secs": { const v = clamp(+c.secs || 18, 5, 90); cycleSecs = v; if (th) { TH.secs = v; thSave(); renderTheater(); } if (cyc) restartTimer(); break; }
    case "shuffle": if (th) { TH.shuffle = !!c.on; thSave(); renderTheater(); if (cyc) cyc.list = thList(); } break;
    case "favsOnly": if (th) { TH.favsOnly = !!c.on; thSave(); renderTheater(); if (cyc) { cyc.list = thList(); cyc.i = Math.min(cyc.i, cyc.list.length - 1); } } break;
    case "fade": if (th) { TH.fade = c.fade === "cut" ? "cut" : "cross"; thSave(); renderTheater(); } break;
    case "fav": if (th && c.id) { c.on ? TH.favs.add(c.id) : TH.favs.delete(c.id); thSave(); renderLineup(); } break;
    // admin, Studio only: live edits to the design on screen
    case "set": if (IS_STUDIO && role === "admin") { const l = state.layers[c.i | 0]; if (!l) break; const v = clamp(+c.v, 0, 1);
      if (c.path === "level") l.level = v; else if (c.path === "hue") l.hue = v * 359; else if (c.path === "hx") l.hx = v; else if (c.path === "hy") l.hy = v; else if (c.path.startsWith("sh.")) l.shape[c.path.slice(3)] = v; else if (c.path.startsWith("p.")) l.p[c.path.slice(2)] = v;
      save(); if (!document.body.classList.contains("playing")) renderLayer(); } break;
    case "lens": if (IS_STUDIO && role === "admin") { const s = state.moods[c.key]; if (!s) break; if (c.on != null) s.on = !!c.on; if (c.op != null) s.op = clamp(+c.op, 0, 1); save(); if (!document.body.classList.contains("playing")) renderMoods(); } break;
    case "post": if (IS_STUDIO && role === "admin" && c.name) { $("#design-name").value = c.name; $("#post-design").click(); } break;
    case "remove": if (IS_STUDIO && role === "admin" && p) { const { error } = await sb.from("glint_lineup").delete().eq("id", p.id); if (!error) { lineup = lineup.filter(q => q.id !== p.id && q.parent_id !== p.id); renderLineup(); } } break;
    case "hello": break;
  }
  roomSend();
}
async function roomRegister() { if (!sb || !user || !roomCode) return; try { await sb.from("glint_rooms").upsert({ user_id: user.id, code: roomCode, page: IS_STUDIO ? "studio" : "theater", seen_at: new Date().toISOString() }); } catch (_) {} }
function openRoom() {
  if (!sb || !user) return; if (room) { try { sb.removeChannel(room); } catch (_) {} }
  roomCode = Array.from({ length: 4 }, () => ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)]).join("");
  room = sb.channel("glint-room-" + roomCode, { config: { broadcast: { self: false } } });
  room.on("broadcast", { event: "cmd" }, ({ payload }) => { try { roomHandle(payload || {}); } catch (err) { console.error(err); } });
  room.subscribe(status => { const el = $("#remote-code"); if (el) { el.hidden = status !== "SUBSCRIBED"; el.innerHTML = `Remote code <b>${roomCode}</b>`; } if (status === "SUBSCRIBED") { roomSend(); roomRegister(); clearInterval(roomHeart); roomHeart = setInterval(roomRegister, 30000); } });
}
const _setPlayingR = setPlaying; setPlaying = function (on) { _setPlayingR(on); roomSend(); };
const _pullLineupR = pullLineup; pullLineup = async function () { await _pullLineupR(); roomSend(); };
if (IS_STUDIO) { const _save = save; save = function () { _save(); roomSend(); }; const _apply = applyDesign; applyDesign = function (d) { const ok = _apply(d); if (ok && d && d.id) window.studioNowId = d.id; roomSend(); return ok; }; }
window.addEventListener("pagehide", () => { if (sb && user && roomCode) { try { sb.from("glint_rooms").delete().eq("user_id", user.id).then(() => {}); } catch (_) {} } });
if (sb) { sb.auth.onAuthStateChange((ev, session) => { if (session && !room) setTimeout(openRoom, 800); }); sb.auth.getSession().then(({ data }) => { if (data && data.session) setTimeout(openRoom, 800); }); }
