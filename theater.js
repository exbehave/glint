/* ---------- Theater: the member player (Oct 21, 2026) ----------
   Loads after glint.js on theater.html. Members sign in, see the Lineup, tap a persona to play it, or play the whole Lineup as a
   slideshow (order, seconds, crossfade or cut, shuffle, favorites only). Desktop audio capture is the point; the Studio knobs are hidden.
   The Theater also hosts a remote session: it shows a join code and listens on Supabase Realtime for phone commands (see remote.js). */
const TH = { shuffle: false, favsOnly: false, fade: "cross", secs: 18, favs: new Set() };
try { Object.assign(TH, JSON.parse(localStorage.getItem("glint.theater") || "{}"), { favs: new Set(JSON.parse(localStorage.getItem("glint.favs") || "[]")) }); } catch (_) {}
function thSave() { try { localStorage.setItem("glint.theater", JSON.stringify({ shuffle: TH.shuffle, favsOnly: TH.favsOnly, fade: TH.fade, secs: TH.secs })); localStorage.setItem("glint.favs", JSON.stringify([...TH.favs])); } catch (_) {} }
cycleSecs = TH.secs;

// which personas play: the Lineup in posted order (moods right after their persona), favorites only if asked, shuffled if asked
function thList() {
  const tops = lineup.filter(p => !p.parent_id || !lineup.some(q => q.id === p.parent_id)), ordered = [];
  tops.forEach(p => { ordered.push(p); lineup.filter(q => q.parent_id === p.id).forEach(m => ordered.push(m)); });
  let list = TH.favsOnly ? ordered.filter(p => TH.favs.has(p.id)) : ordered;
  if (TH.shuffle) { list = list.slice(); for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } }
  return list;
}
function thPlayAll() {
  const list = thList(); if (!list.length) { lineupMsg(TH.favsOnly ? "No favorites yet. Tap the star on a persona." : "Nothing on the Lineup yet."); return; }
  if (list.length === 1) { thPlayOne(list[0]); return; }
  cyc = { list, i: -1, pre: snapshot(), timer: 0 }; cycleStep(1); restartTimer(); setPlaying(true);
}
function thPlayOne(p) { stopCycle(); if (!applyDesign(p)) { lineupMsg("That persona's traits aren't available anymore."); return; } TH.nowId = p.id; renderLineup(); setPlaying(true); }
// crossfade or hard cut: the shared cycleStep always sets fadeA = 1; a cut just clears it
const _cycleStep = cycleStep; cycleStep = function (dir) { _cycleStep(dir); if (TH.fade === "cut") fadeA = 0; if (cyc) { TH.nowId = cyc.list[cyc.i] && cyc.list[cyc.i].id; renderLineup(); } };

function renderTheater() {
  $("#th-shuffle").setAttribute("aria-pressed", TH.shuffle); $("#th-favs").setAttribute("aria-pressed", TH.favsOnly);
  const ctl = $("#th-ctl"); ctl.innerHTML = ""; ctl.append(slider("th-secs", "Each persona plays for", "", 5, 90, 1, TH.secs, v => Math.round(v) + " s", v => { TH.secs = v; cycleSecs = v; thSave(); if (cyc) restartTimer(); }));
  const f = $("#th-fade"); f.innerHTML = ""; [["cross", "Crossfade"], ["cut", "Hard cut"]].forEach(([k, n]) => { const c = document.createElement("button"); c.className = "chip"; c.type = "button"; c.textContent = n; c.setAttribute("aria-pressed", TH.fade === k); c.addEventListener("click", () => { TH.fade = k; thSave(); renderTheater(); }); f.append(c); });
  const n = thList().length; $("#th-play").textContent = n > 1 ? `Play the Lineup (${n})` : "Play the Lineup";
}
$("#th-play").addEventListener("click", thPlayAll);
$("#th-shuffle").addEventListener("click", () => { TH.shuffle = !TH.shuffle; thSave(); renderTheater(); });
$("#th-favs").addEventListener("click", () => { TH.favsOnly = !TH.favsOnly; thSave(); renderTheater(); });
$("#play").addEventListener("click", () => { if (!lineup.length) return; }, true);

// the Lineup card, Theater flavor: tap plays; a star marks a favorite; the one on screen is outlined
const _renderLineup = renderLineup; renderLineup = function () {
  _renderLineup(); const card = $("#lineup-card"); card.hidden = !user; $("#theater-card").hidden = !user;
  if (!user) { if (!$("#sign-gate")) { const g = document.createElement("section"); g.className = "card"; g.id = "sign-gate"; g.innerHTML = `<h3>Glint</h3><p class="desc">Sign in to see what's on the Lineup.</p>`; $(".rack").prepend(g); const sy = $("#sync"); sy.hidden = false; g.append(sy); $("#sync-form").hidden = false; } return; }
  const gate = $("#sign-gate"); if (gate) { $("#designs-card").append($("#sync")); gate.remove(); }
  document.querySelectorAll("#lineup-list .persona").forEach(w => { const name = w.querySelector(".load span").firstChild.textContent.trim(), p = lineup.find(q => q.name === name); if (!p) return; w.classList.toggle("now", p.id === TH.nowId); w.querySelector(".load").dataset.id = p.id;
    const fv = document.createElement("button"); fv.className = "fav"; fv.type = "button"; fv.textContent = "★"; fv.setAttribute("aria-pressed", TH.favs.has(p.id)); fv.setAttribute("aria-label", "Favorite " + p.name); fv.dataset.fav = p.id; w.append(fv);
    w.querySelectorAll(".mood").forEach(mw => { const mn = mw.querySelector(".chip").textContent, m = lineup.find(q => q.name === mn && q.parent_id === p.id); if (m) mw.querySelector(".chip").dataset.id = m.id; }); });
  renderTheater();
};
// in the Theater a tap plays, and the Studio's own load handlers never run: handled in the capture phase, then the event stops
$("#lineup-list").addEventListener("click", e => {
  const fv = e.target.closest(".fav"); if (fv) { const id = fv.dataset.fav; TH.favs.has(id) ? TH.favs.delete(id) : TH.favs.add(id); thSave(); renderLineup(); e.stopPropagation(); return; }
  const el = e.target.closest(".load, .mood .chip"); if (!el || !el.dataset.id) return; e.stopPropagation(); const p = lineup.find(q => q.id === el.dataset.id); if (p) thPlayOne(p);
}, true);
$("#lineup-sub").textContent = "what's showing";
renderLineup();
