/* ================= Rehearsal recorder (Oct 22, 2026, Kennedy's idea) =================
   Record a stretch of the Studio, then label the good and bad bits on rehearse.html so we can work out WHY.
   A recording has two parts:
   1. A video of the stage with the music (for watching back and labeling). MediaRecorder on the canvas stream plus the
      sound Glint hears (taken before the speakers, so captured tab/screen audio is included and nothing is played twice).
   2. A data log, sampled 15× a second: the music features the visuals read (bass, mid, highs, loudness, kick, hats, the
      learned beat gap), every automated slider's value, the dancer's own state for dancers that expose a probe (which
      dance, which pose, facing, hand speeds…), and every manual change made while recording. Plus the full design at the start.
   Saved on this device (IndexedDB) right away; when signed in as the admin it also uploads: the video to the private
   'rehearsals' bucket, the log and a thumbnail strip to the glint_rehearsals table. Loaded after glint.js (uses its globals). */
(() => {
  "use strict";
  const MAX_SECS = 6 * 60, RATE = 15, THUMB_EVERY = 2, VBPS = 1000000;
  // ---- dancer probes: read-only summaries of a dancer's internal state (no change to how it moves)
  const svProbe = st => { const yaw = st.yaw ? st.yaw.p : 0, hs = i => st.hands && st.hands[i] ? Math.hypot(st.hands[i].x.v, st.hands[i].y.v, st.hands[i].z.v) : 0, ha = i => st.ha && st.ha[i] ? Math.abs(st.ha[i].v) : 0;
    return { dance: st.dCur || 0, blend: +(st.dF ?? 1).toFixed(2), pose: st.pose ?? -1, mirror: st.poseMirror ? 1 : 0, facing: Math.round(((yaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) * 180 / Math.PI), moving: st.moving ? 1 : 0, cross: st.cross || 0,
      handL: +hs(0).toFixed(2), handR: +hs(1).toFixed(2), wristL: +ha(0).toFixed(1), wristR: +ha(1).toFixed(1), bendSide: +(st.bend ? st.bend.x.p : 0).toFixed(2), bendTwist: +(st.bend ? st.bend.y.p : 0).toFixed(2), bendFwd: +(st.bend ? st.bend.z.p : 0).toFixed(2), x: +(st.pos ? st.pos.x.p : 0).toFixed(2), z: +(st.pos ? st.pos.z.p : 0).toFixed(2), spinning: st.spin != null && (gtime - st.spin) < 1 ? 1 : 0, armsInFront: st.armSep ? (st.armSep[0] ? 1 : 0) + (st.armSep[1] ? 2 : 0) : 0, kneel: st.kn && st.kn.on ? 1 : 0, ddrop: st.dd ? 1 : 0, trans: st.tt || "", prance: st.pr && st.pr.on ? 1 : 0, hairflip: st.hf ? 1 : 0,
      // where each joint was on screen (0–1 across and down the stage = the video frame), so a drawing on a frame can be tied to a body part
      j: st.prev ? Object.fromEntries(Object.entries(st.prev).map(([k, q]) => [k, [+(q[0] / W).toFixed(3), +(q[1] / H).toFixed(3)]])) : null }; };
  ["serve", "servelet"].forEach(k => { if (FORM[k]) FORM[k].probe = svProbe; });

  // ---- local store (IndexedDB): recordings live here until (and after) they upload
  const DB = { db: null, open() { return this.db || (this.db = new Promise((res, rej) => { const r = indexedDB.open("glint-rehearsals", 1); r.onupgradeneeded = () => { r.result.createObjectStore("recs", { keyPath: "id" }); r.result.createObjectStore("videos"); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); },
    async put(store, val, key) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction(store, "readwrite"); key == null ? tx.objectStore(store).put(val) : tx.objectStore(store).put(val, key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); } };
  window.GlintRehearseDB = DB;

  let rec = null;
  const card = document.createElement("section"); card.className = "card"; card.id = "rehearse-card";
  card.innerHTML = `<h3>Rehearsal <span id="rh-sub">record, then label</span></h3>
    <p class="desc">Records the stage and the music, plus every setting, automation and the dancer's moves, so you can mark the good and bad stretches and we can find out why. Up to ${MAX_SECS / 60} minutes.</p>
    <div class="row"><button class="btn" type="button" id="rh-rec">● Record</button><a class="btn" id="rh-review" href="rehearse.html">Review and label</a></div>
    <div class="now" id="rh-msg" aria-live="polite"></div>`;
  const after = document.getElementById("designs-card"); if (after) after.after(card);
  const $r = s => card.querySelector(s), msg = t => { $r("#rh-msg").textContent = t; };

  function audioStream() {
    try { if (!au.ctx || au.mode === "none") return null; const dest = au.ctx.createMediaStreamDestination(); au.input.connect(dest); return { dest, tracks: dest.stream.getAudioTracks() }; } catch (_) { return null; }
  }
  const pickType = () => ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || "";
  const snapLayer = l => ({ id: l.id, form: l.form, on: l.on, level: l.level, hue: l.hue, shape: Object.assign({}, l.shape), p: Object.assign({}, l.p) });

  function start() {
    if (rec) return;
    const id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())), t0 = performance.now();
    const design = JSON.parse(stateJSON());
    const r = rec = { id, t0, rows: [], events: [], thumbs: [], chunks: [], last: state.layers.map(snapLayer), lastSample: -1, lastThumb: -9, design, autoKeys: {}, probeKeys: {} };
    // the columns: music first, then per trait its automated sliders and its probe
    state.layers.forEach(l => { r.autoKeys[l.id] = Object.keys(l.auto || {}); });
    r.music = au.mode === "file" ? (au.name || "a song") : au.mode === "demo" ? "Demo beat" : au.mode === "none" ? "Silence" : au.mode;
    // video
    // the stage canvas is transparent (its dark look is CSS), and video drops transparency, so frames are copied onto black first
    const rc = r.rc = document.createElement("canvas"), sc = Math.min(1, 1280 / cv.width); rc.width = Math.round(cv.width * sc / 2) * 2; rc.height = Math.round(cv.height * sc / 2) * 2; r.rx = rc.getContext("2d"); copyFrame(r);
    try { const vs = rc.captureStream(30), as = audioStream(), type = pickType();
      const stream = new MediaStream([...vs.getVideoTracks(), ...(as ? as.tracks : [])]); r.as = as;
      r.mr = new MediaRecorder(stream, Object.assign({ videoBitsPerSecond: VBPS, audioBitsPerSecond: 96000 }, type ? { mimeType: type } : {}));
      r.type = r.mr.mimeType || type || "video/webm"; r.mr.ondataavailable = e => { if (e.data && e.data.size) r.chunks.push(e.data); }; r.mr.start(1000);
    } catch (err) { r.mr = null; r.videoErr = String(err && err.message || err); }
    $r("#rh-rec").textContent = "■ Stop"; $r("#rh-rec").setAttribute("aria-pressed", "true");
    msg(r.mr ? `Recording · ${r.music}` : `Recording the data only (this browser can't record video: ${r.videoErr || "no MediaRecorder"})`);
    requestAnimationFrame(tick);
  }

  function copyFrame(r) { const x = r.rx; if (!x) return; x.fillStyle = "#050506"; x.fillRect(0, 0, r.rc.width, r.rc.height); x.drawImage(cv, 0, 0, r.rc.width, r.rc.height); }
  function tick(now) {
    const r = rec; if (!r) return; requestAnimationFrame(tick); copyFrame(r);
    const t = (now - r.t0) / 1000; if (t > MAX_SECS) { stop(); return; }
    if (t - r.lastSample >= 1 / RATE - 1e-3) { r.lastSample = t;
      const row = { t: +t.toFixed(3), m: [V.bass, V.mid, V.treble, V.rms, V.kick, V.hat].map(x => +(+x || 0).toFixed(3)).concat([+TEMPO.gap.toFixed(3)]), L: {} };
      state.layers.forEach(l => { const rt = RT.get(l.id), o = {}; if (rt && rt.av) { const keys = Object.keys(rt.av); if (keys.length) o.a = Object.fromEntries(keys.map(k => [k, +(+rt.av[k]).toFixed(3)])); }
        const f = FORM[l.form]; if (rt && f && f.probe) { try { o.d = f.probe(rt.st); } catch (_) {} } if (rt && rt.p) o.p = Object.fromEntries(Object.entries(rt.p).map(([k, v]) => [k, +(+v).toFixed(3)]));
        if (Object.keys(o).length) row.L[l.id] = o; });
      r.rows.push(row);
      // manual changes since the last sample (slider drags, picks, traits added or removed)
      const cur = state.layers.map(snapLayer), prev = Object.fromEntries(r.last.map(x => [x.id, x]));
      cur.forEach(c => { const p = prev[c.id]; if (!p) { r.events.push({ t: row.t, layer: c.id, form: c.form, what: "added", to: c }); return; }
        ["level", "hue", "on"].forEach(k => { if (p[k] !== c[k]) r.events.push({ t: row.t, layer: c.id, key: k, from: p[k], to: c[k] }); });
        for (const k in c.shape) if (p.shape[k] !== c.shape[k]) r.events.push({ t: row.t, layer: c.id, key: "sh." + k, from: p.shape[k], to: c.shape[k] });
        for (const k in c.p) if (p.p[k] !== c.p[k]) r.events.push({ t: row.t, layer: c.id, key: "p." + k, from: p.p[k], to: c.p[k] }); });
      r.last.forEach(p => { if (!cur.find(c => c.id === p.id)) r.events.push({ t: row.t, layer: p.id, form: p.form, what: "removed" }); });
      r.last = cur;
    }
    if (t - r.lastThumb >= THUMB_EVERY) { r.lastThumb = t; try { const w = 240, h = Math.round(w * cv.height / cv.width), c = r.tc || (r.tc = document.createElement("canvas")); c.width = w; c.height = h; const x = c.getContext("2d"); x.fillStyle = "#000"; x.fillRect(0, 0, w, h); x.drawImage(cv, 0, 0, w, h); r.thumbs.push({ t: +t.toFixed(2), img: c.toDataURL("image/jpeg", .6) }); } catch (_) {} }
    $r("#rh-sub").textContent = `● ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  }

  async function stop() {
    const r = rec; if (!r) return; rec = null;
    $r("#rh-rec").textContent = "● Record"; $r("#rh-rec").setAttribute("aria-pressed", "false"); $r("#rh-sub").textContent = "record, then label";
    const duration = +((performance.now() - r.t0) / 1000).toFixed(2);
    let blob = null;
    if (r.mr) { await new Promise(res => { r.mr.onstop = res; try { r.mr.stop(); } catch (_) { res(); } }); blob = new Blob(r.chunks, { type: r.type }); r.mr.stream.getTracks().forEach(tr => tr.stop()); }
    if (r.as) { try { au.input.disconnect(r.as.dest); } catch (_) {} }
    const names = Object.fromEntries(state.layers.map(l => [l.id, FORM[l.form] ? FORM[l.form].name : l.form]).concat(r.design.layers.map(l => [l.id, FORM[l.form] ? FORM[l.form].name : l.form])));
    const when = new Date(), name = `${r.design.layers.map(l => names[l.id]).join(" + ") || "Empty stage"} · ${when.toLocaleDateString([], { month: "short", day: "numeric" })} ${when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    const data = { v: 1, rate: RATE, music: r.music, offsetMs, mcols: ["bass", "mid", "treble", "rms", "kick", "hat", "beatGap"], design: r.design, names, rows: r.rows, events: r.events, reaction: state.music };
    const item = { id: r.id, name, created_at: when.toISOString(), duration, device: matchMedia("(pointer: coarse)").matches ? "phone" : "computer", video_type: blob ? blob.type : null, data, thumbs: r.thumbs, labels: [], uploaded: false };
    try { await DB.put("recs", item); if (blob) await DB.put("videos", blob, r.id); } catch (err) { msg("Couldn't save the recording on this device: " + (err && err.message || err)); return; }
    msg(`Saved ${Math.round(duration)} s on this device.` + (sb && user && role === "admin" ? " Uploading…" : " Sign in as the admin to sync it to your other devices."));
    if (sb && user && role === "admin") upload(item, blob);
  }

  async function upload(item, blob) {
    try {
      let video_path = null;
      if (blob) { const ext = /mp4/.test(blob.type) ? "mp4" : "webm"; video_path = `${user.id}/${item.id}.${ext}`;
        if (blob.size > 50 * 1024 * 1024) { msg("Saved on this device. The video is over 50 MB, so only the data and thumbnails sync; label it on this device."); video_path = null; }
        else { const { error } = await sb.storage.from("rehearsals").upload(video_path, blob, { contentType: blob.type, upsert: true }); if (error) throw error; } }
      const { error } = await sb.from("glint_rehearsals").upsert({ id: item.id, name: item.name, created_at: item.created_at, duration: item.duration, device: item.device, video_path, video_type: item.video_type, data: item.data, thumbs: item.thumbs, labels: item.labels });
      if (error) throw error;
      item.uploaded = true; item.video_path = video_path; await DB.put("recs", item);
      msg(`Saved and synced (${Math.round(item.duration)} s). Open Review and label on any device.`);
    } catch (err) { msg("Saved on this device, but the upload failed: " + (err && err.message || err)); }
  }

  $r("#rh-rec").addEventListener("click", () => rec ? stop() : start());
  window.GlintRehearse = { start, stop, get recording() { return !!rec; } };
})();
