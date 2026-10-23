/* ================= Rehearsal review (Oct 22, 2026) =================
   Lists rehearsals recorded in the Studio (this device's copies from IndexedDB, plus synced ones when signed in as the
   admin), plays one back, and lets Kennedy mark stretches Good or Bad with a note. Marks save to this device and,
   when signed in, to glint_rehearsals.labels — where Claude reads them alongside the data log. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s), esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SUPA_URL = "https://lwbbkwftkxjmrpyalrwu.supabase.co", SUPA_KEY = "sb_publishable_j4FskQJtwZnxNBZXH61QJQ_U62I-eaY";
  let sb = null; try { if (window.supabase) sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: true, autoRefreshToken: true } }); } catch (_) {}
  let user = null, admin = false, items = [], cur = null, videoURL = null;
  const fmt = s => { s = Math.max(0, s || 0); return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`; };

  // ---- this device's store (same as the recorder's)
  const DB = { db: null, open() { return this.db || (this.db = new Promise((res, rej) => { const r = indexedDB.open("glint-rehearsals", 1); r.onupgradeneeded = () => { r.result.createObjectStore("recs", { keyPath: "id" }); r.result.createObjectStore("videos"); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); },
    async req(store, mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction(store, mode), q = fn(tx.objectStore(store)); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); }); },
    all() { return this.req("recs", "readonly", s => s.getAll()); }, get(store, k) { return this.req(store, "readonly", s => s.get(k)); },
    put(v) { return this.req("recs", "readwrite", s => s.put(v)); }, del(store, k) { return this.req(store, "readwrite", s => s.delete(k)); } };

  async function signedIn() {
    if (!sb) return; const { data } = await sb.auth.getSession(); user = data && data.session ? data.session.user : null;
    if (user) { try { const { data: r } = await sb.from("glint_roles").select("role").eq("user_id", user.id).maybeSingle(); admin = !!(r && r.role === "admin"); } catch (_) { admin = false; } }
    $("#gate").hidden = !!user || !sb;
  }
  $("#signin").addEventListener("submit", async e => { e.preventDefault(); if (!sb) return; $("#si-msg").textContent = "Signing in…";
    const { error } = await sb.auth.signInWithPassword({ email: window.GlintAccount ? GlintAccount.email($("#si-user").value.trim()) : $("#si-user").value.trim(), password: $("#si-pass").value });
    if (error) { $("#si-msg").textContent = "That didn't work: " + error.message; return; } $("#si-msg").textContent = ""; await signedIn(); loadList(); });

  async function loadList() {
    let local = []; try { local = await DB.all(); } catch (_) {}
    const map = new Map(local.map(x => [x.id, Object.assign({ local: true }, x)]));
    if (sb && user && admin) { try { const { data, error } = await sb.from("glint_rehearsals").select("id,name,created_at,duration,device,video_path,video_type,labels,thumb0:thumbs->0").order("created_at", { ascending: false }).limit(100); if (error) throw error;
      (data || []).forEach(r => { const m = map.get(r.id); if (m) Object.assign(m, { cloud: true, video_path: r.video_path, labels: m.labels && m.labels.length >= (r.labels || []).length ? m.labels : r.labels }); else map.set(r.id, Object.assign({ cloud: true, thumb0: r.thumb0 || null }, r)); }); } catch (err) { $("#pick-sub").textContent = "Couldn't reach the synced list: " + (err.message || err); } }
    items = [...map.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const list = $("#list"); list.innerHTML = "";
    if (!items.length) { list.innerHTML = `<span class="desc">No rehearsals yet. In the Studio, tap ● Record in the Rehearsal card, let it dance, then Stop.</span>`; return; }
    items.forEach(it => { const b = document.createElement("button"); b.type = "button"; b.className = "rec";
      const th = it.thumbs && it.thumbs.length ? it.thumbs[Math.min(it.thumbs.length - 1, 2)].img : it.thumb0 && it.thumb0.img ? it.thumb0.img : "";
      const g = (it.labels || []).filter(l => l.kind === "good").length, bd = (it.labels || []).filter(l => l.kind === "bad").length;
      b.innerHTML = `${th ? `<img src="${esc(th)}" alt="">` : `<img alt="">`}<div><b>${esc(it.name)}</b><small>${fmt(it.duration)} · ${esc(it.device || "")}${it.local ? " · on this device" : ""}${it.cloud ? " · synced" : ""}</small></div><div class="tags">${g ? `<span class="tag g">${g} good</span>` : ""}${bd ? `<span class="tag b">${bd} bad</span>` : ""}${!g && !bd ? `<span class="tag">unlabeled</span>` : ""}</div>`;
      b.addEventListener("click", () => open(it)); list.append(b); });
  }

  // ---- the player: the real video when we have it, otherwise the thumbnail strip stepped by a clock
  const v = $("#video"), clock = { t: 0, playing: false, last: 0 };
  const dur = () => cur ? cur.duration : 0, now = () => cur && cur.hasVideo ? v.currentTime : clock.t;
  function seek(t) { t = Math.max(0, Math.min(dur(), t)); if (cur.hasVideo) v.currentTime = t; else { clock.t = t; showStill(); } draw(); }
  function showStill() { const th = cur.thumbs || []; let pick = th[0]; for (const x of th) if (x.t <= clock.t) pick = x; if (pick) $("#still").src = pick.img; }
  let speed = 1;
  function playing() { return cur && (cur.hasVideo ? !v.paused : clock.playing); }
  function setPlay(on) { if (!cur) return; if (cur.hasVideo) { on ? v.play().catch(() => {}) : v.pause(); } else { clock.playing = on; clock.last = performance.now(); } $("#play").textContent = on ? "Pause" : "Play"; }
  $("#play").addEventListener("click", () => setPlay(!playing()));
  $("#back5").addEventListener("click", () => seek(now() - 5)); $("#fwd5").addEventListener("click", () => seek(now() + 5));
  $("#speed").addEventListener("click", () => { speed = speed === 1 ? .5 : speed === .5 ? .25 : 1; v.playbackRate = speed; $("#speed").textContent = speed + "×"; });
  v.addEventListener("ended", () => { $("#play").textContent = "Play"; }); v.addEventListener("pause", () => { $("#play").textContent = "Play"; }); v.addEventListener("play", () => { $("#play").textContent = "Pause"; });
  (function loop(t) { requestAnimationFrame(loop); if (!cur) return; if (!cur.hasVideo && clock.playing) { clock.t += (t - clock.last) / 1000 * speed; clock.last = t; if (clock.t >= dur()) { clock.t = dur(); setPlay(false); } showStill(); } draw(); })(performance.now());

  // ---- timeline
  const tl = $("#tl"); let dragging = false;
  const tAt = e => { const r = tl.getBoundingClientRect(); return (Math.max(0, Math.min(r.width, e.clientX - r.left)) / r.width) * dur(); };
  tl.addEventListener("pointerdown", e => { if (!cur) return; dragging = true; tl.setPointerCapture(e.pointerId); seek(tAt(e)); });
  tl.addEventListener("pointermove", e => { if (dragging) seek(tAt(e)); }); tl.addEventListener("pointerup", () => { dragging = false; }); tl.addEventListener("pointercancel", () => { dragging = false; });
  let open_ = null; // the mark being made: { a }
  function draw() {
    if (!cur) return; const d = dur() || 1, t = now(); $("#head").style.left = (t / d * 100) + "%"; $("#t-now").textContent = fmt(t); $("#t-end").textContent = fmt(d);
    const bands = $("#bands"), want = JSON.stringify([cur.labels, open_ && open_.a, open_ ? Math.round(t * 10) : 0]); if (bands.dataset.k === want) return; bands.dataset.k = want; bands.innerHTML = "";
    (cur.labels || []).forEach(l => { const e = document.createElement("div"); e.className = "band " + l.kind; e.style.left = (l.a / d * 100) + "%"; e.style.width = (Math.max(.002, (l.b - l.a) / d) * 100) + "%"; bands.append(e); });
    if (open_) { const a = Math.min(open_.a, t), b = Math.max(open_.a, t), e = document.createElement("div"); e.className = "band open"; e.style.left = (a / d * 100) + "%"; e.style.width = (Math.max(.002, (b - a) / d) * 100) + "%"; bands.append(e); }
  }

  // ---- marking
  function markUI() { const on = !!open_; $("#mark").hidden = on; $("#good").hidden = !on; $("#bad").hidden = !on; $("#cancel").hidden = !on; $("#marking").hidden = !on; $("#note-row").hidden = !on; if (on) $("#marking").textContent = "MARKING FROM " + fmt(open_.a); }
  $("#mark").addEventListener("click", () => { open_ = { a: now() }; markUI(); });
  $("#cancel").addEventListener("click", () => { open_ = null; $("#note").value = ""; markUI(); draw(); });
  const finish = kind => { if (!open_) return; const t = now(), a = Math.min(open_.a, t), b = Math.max(open_.a, t);
    cur.labels = (cur.labels || []).concat([{ a: +a.toFixed(2), b: +Math.max(b, a + .5).toFixed(2), kind, note: $("#note").value.trim(), at: new Date().toISOString() }]).sort((x, y) => x.a - y.a);
    open_ = null; $("#note").value = ""; markUI(); renderMarks(); saveLabels(); };
  $("#good").addEventListener("click", () => finish("good")); $("#bad").addEventListener("click", () => finish("bad"));
  function renderMarks() {
    const box = $("#marks"); box.innerHTML = ""; draw();
    if (!(cur.labels || []).length) { box.innerHTML = `<span class="desc">No marks yet. Play it, tap Start a mark here where a stretch begins, then End here: Good or Bad where it ends. Overlapping marks are fine.</span>`; return; }
    cur.labels.forEach((l, i) => { const r = document.createElement("div"); r.className = "mark-row";
      r.innerHTML = `<button class="when" type="button">${fmt(l.a)}–${fmt(l.b)}</button><div><span class="kind ${l.kind}">${l.kind}</span> <span class="txt">${esc(l.note)}</span></div><button class="x" type="button" aria-label="Remove this mark">×</button>`;
      r.querySelector(".when").addEventListener("click", () => seek(l.a));
      r.querySelector(".x").addEventListener("click", () => { if (!confirm("Remove this mark?")) return; cur.labels.splice(i, 1); renderMarks(); saveLabels(); });
      box.append(r); });
  }
  async function saveLabels() {
    const m = $("#v-msg"); m.textContent = "Saving…"; let where = [];
    try { const local = await DB.get("recs", cur.id); if (local) { local.labels = cur.labels; await DB.put(local); where.push("this device"); } } catch (_) {}
    if (sb && user && admin && cur.cloud) { const { error } = await sb.from("glint_rehearsals").update({ labels: cur.labels, updated_at: new Date().toISOString() }).eq("id", cur.id); if (error) m.textContent = "Saved on this device; sync failed: " + error.message; else where.push("synced"); }
    if (!m.textContent.startsWith("Saved on this device; sync")) m.textContent = where.length ? "Saved (" + where.join(", ") + ")." : "Couldn't save.";
  }

  async function open(it) {
    $("#pick").hidden = true; $("#view").hidden = false; $("#v-name").textContent = it.name; $("#v-msg").textContent = "Loading…"; window.scrollTo(0, 0);
    let full = it.local ? await DB.get("recs", it.id) : null;
    if (!full && sb && user) { const { data } = await sb.from("glint_rehearsals").select("*").eq("id", it.id).maybeSingle(); full = data; }
    if (!full) { $("#v-msg").textContent = "Couldn't load this rehearsal."; return; }
    cur = Object.assign({}, full, { labels: it.labels || full.labels || [], cloud: !!it.cloud, local: !!it.local, video_path: it.video_path || full.video_path });
    if (videoURL) { URL.revokeObjectURL(videoURL); videoURL = null; }
    let src = null, from = "";
    try { const blob = it.local ? await DB.get("videos", it.id) : null; if (blob) { videoURL = src = URL.createObjectURL(blob); from = "video on this device"; } } catch (_) {}
    if (!src && cur.video_path && sb && user) { const { data, error } = await sb.storage.from("rehearsals").createSignedUrl(cur.video_path, 3600); if (!error && data) { src = data.signedUrl; from = "synced video"; } }
    cur.hasVideo = !!src; v.hidden = !src; $("#still").hidden = !!src;
    if (src) { v.src = src; v.playbackRate = speed;
      // recordings in WebM often report no duration until the end has been reached once; nudge it so seeking works
      v.onloadedmetadata = () => { if (!isFinite(v.duration)) { v.currentTime = 1e7; v.ontimeupdate = () => { v.ontimeupdate = null; v.currentTime = 0; }; } }; }
    else { from = "thumbnails only (the video stayed on the device that recorded it)"; clock.t = 0; showStill(); }
    $("#t-src").textContent = from;
    $("#strip").innerHTML = (cur.thumbs || []).filter((_, i, a) => a.length <= 24 || i % Math.ceil(a.length / 24) === 0).map(x => `<img src="${esc(x.img)}" alt="">`).join("");
    open_ = null; markUI(); renderMarks(); $("#v-msg").textContent = "";
  }
  $("#v-back").addEventListener("click", () => { setPlay(false); cur = null; $("#view").hidden = true; $("#pick").hidden = false; loadList(); });
  $("#del").addEventListener("click", async () => { if (!cur || !confirm("Delete this rehearsal, its video and its marks, everywhere?")) return;
    try { await DB.del("recs", cur.id); await DB.del("videos", cur.id); } catch (_) {}
    if (sb && user && admin && cur.cloud) { if (cur.video_path) await sb.storage.from("rehearsals").remove([cur.video_path]); await sb.from("glint_rehearsals").delete().eq("id", cur.id); }
    $("#v-back").click(); });
  document.addEventListener("keydown", e => { if (!cur || e.target.closest("input")) return; if (e.code === "Space") { e.preventDefault(); setPlay(!playing()); } if (e.key === "ArrowLeft") seek(now() - 2); if (e.key === "ArrowRight") seek(now() + 2); });

  (async () => { await signedIn(); loadList(); })();
})();
