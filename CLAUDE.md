# Glint — project guide

Glint is a music-visualizer design studio. You place **nodes** on a canvas, give them behaviors and personalities, and tune them with synth-style knobs until they dance to music. Owner: Kennedy. Personal launch first, built to scale to a public launch without a rewrite.

Full living spec: https://claude.ai/code/artifact/a483d844-f6de-483d-a87d-b19ce74aca4e

## Where things live
- **Repo:** `exbehave/glint` (private). Plain static files: `index.html` + `glint.css` + `glint.js` + `engine/` (the app), `studio.html` + `studio.js` + `styles.css` (previous Studio), `casting/` (test bench source), `forms.html`, icons, `manifest.webmanifest`. No build step.
- **Live site:** https://kennedy-glint.netlify.app (Netlify builds from `main` on every push; the project is public).
- **Cloud sync (Oct 14, 2026):** saved designs sync through In the Loop's Supabase project (`lwbbkwftkxjmrpyalrwu`, table `kv`, row key `glint:designs`, row-level security per user). Same sign-in as In the Loop; sign-ups stay off. Sign-in sits in the My designs card (optional; without it designs stay on the device). Rules: first sign-in on a device merges local + cloud by name (newest wins); after that the cloud is the source of truth, except unsent local changes (`glint.sync.dirty`) win. Pulls again when the app comes back to the foreground. Only saved designs sync, not the current unsaved combo. Supabase library: jsdelivr `@supabase/supabase-js@2.117.2` UMD.
- Netlify's free plan charges credits per production deploy; if edits get frequent, adopt In the Loop's `preview` branch workflow.

## Ground rules for anyone building this
- Aesthetics come first. Sleek noir, grayscale UI; the visualization is the ONLY color on screen.
- Mobile gets as many features as feasible, but the interface must never feel crowded.
- Ask Kennedy before adding creative or design ideas that aren't in this file.
- Flag anything unverified or untested as such; don't present guesses as facts.

## Platforms and audio
One web app, desktop and mobile layouts, installed on iPhone as a home-screen icon.

| Source | Desktop | Mobile | Notes |
|---|---|---|---|
| System audio | Yes (Chrome 141+ on macOS 14.2+; Windows) | No | Full fidelity; covers Spotify/Apple Music desktop apps |
| Browser tab | Yes (Chrome) | No | DRM-protected tabs untested |
| Microphone | Yes | Yes | Approximate, mono; iOS may duck Spotify (untested) |
| Local/uploaded files | Yes | Yes | Full fidelity |
| Spotify / Apple Music link | Metadata only | Metadata only | Spotify removed audio analysis for new apps (Nov 2024); dev mode = 5 users |

## Tabs (both platforms)
Studio · Library · Sources · Gallery · Perform. Desktop: tabs across the top. Mobile: bottom tab bar.
- **Studio:** desktop = node list left, canvas center, grouped control deck right, personality cards below canvas, transport bar at bottom. Mobile = canvas top half, segmented control (Interactiveness / Motion / Reaction / Appearance), swipeable knob panels, personality cards, tab bar.
- **Library:** personalities, behaviors, patterns, palettes, shapes.
- **Sources:** input cards, spectrum analyzer, level meter, beat light, calibration knobs.
- **Gallery:** saved designs. **Perform:** full-screen playback with auto-hiding controls.
- **Aspect ratios:** 16:9, 9:16, 1:1, 4:5, 21:9, Fill.

## Nodes
- Placed by tapping/clicking the grid or typing X/Y/Z. Snap-to-grid works while dragging (adjustable spacing; hold Shift / toggle to drag freely).
- Direction: draggable heading arrow or exact angle.
- Start 1D; an oscillator on a second axis makes Lissajous 2D motion; a third adds depth.
- Behavior types: oscillator, emitter, attractor, LFO (idle breathing), envelope (ADSR).
- Life/interaction ideas: links, flocking, gravity/orbits, life cycle, metaballs, flow fields, growth, symmetry, shapes, edge behavior, Bézier motion paths.
- Behavior characters: Figure Skater, Slinky, Moth, Wallflower, Metronome, Jellyfish, Waltz Partners, Fireflies, Lava Lamp, Yo-yo, Conductor, Housecat.

## Rethink after Phase 1 (Oct 9, 2026)
Kennedy's feedback on the first Studio build: visuals were monotonous dot sprays, nodes didn't travel, all knobs were global, and the Nodes panel exposed math that didn't change the mood. Decisions:
- A node is four layers, biggest effect first: **Form** (what it draws), **Character** (how the node travels on its own), **Personalities**, then a few **fine-tune knobs**. Oscillator math goes under an "Advanced" fold.
- **Personalities apply to the whole design** (multi-select blend), not per node.
- Each node owns its own settings. Nodes can join a **bus** (mixing-desk style) whose knobs push all members; a **Master** strip holds Reaction.
- Layout: canvas dominant; slim node list with bus tags; right rack shows the selected node: Form, Character, then Fine tune. Personalities sit with the Master.
- Forms are chosen from a gallery first (`forms.html`): neon ribbon, whip strand, halo rings, wave line, aurora curtain, branching limbs, lightning, kaleidoscope, orbiters, dust spray. Many borrow from In the Loop's `viz.js` (repo exbehave/in-the-loop). Rebuild the Studio around the forms Kennedy picks.

## Studio v2 (built Oct 9, 2026) — `index.html`
- Kennedy kept 19 forms: neon ribbon, whip strand, halo rings, wave line, aurora curtain, branching limbs, lightning, kaleidoscope, orbiters, dust spray, tornado, filigree vine, tube dancer, fiddlehead, boiling doodle, lava blobs, spirograph, cat's cradle, seaweed (dropped inchworm, jellyfish). `forms.html` is the gallery.
- Each node: form, character (Planted, Wanderer, Figure Skater, Moth, Wallflower, Metronome, Slinky, Waltz, Shadow, Housecat, Custom path), color, level, listens-to band, bus, 9 fine-tune knobs (energy, tempo, grace, chaos, size, trails, roam, magnetism, social). Oscillators live under Advanced → Custom path.
- Each node draws into its own layer with its own trail fade; layers add together. Lava blobs share one metaball pass.
- Personalities (Hypnotic, Aggressive, Dreamy, Glitch, Electric, Fluid) apply to the whole design: each nudges every node's knobs and paints a treatment layer (feedback swirl, punch echo, soft bloom, RGB slice, overexposed flicker, liquid warp) mixed with its own opacity and blend mode.
- Buses A–C: level, mute, and push knobs. Master: Punch, Reaction, Decay in the transport.
- Scenes (presets): Night Drive, Neon Storm, Kelp Garden, Cartoon Party, Mandala, Lava Lounge, Neon Grove, Blank canvas.
- Each form has 3–5 **Shape knobs** (e.g. Tornado: Top width, Bottom width, Height, Twist, Strands), stored per node in `node.shape` and reset when the form changes. Forms read them through `E.k/E.L/E.I` in `draw`.
- Scenes are composed on purpose (symmetry, a focal point, one palette each); keep new presets to that standard.
- Mobile segments: Nodes, Shape, Tune, Mood. Personality label sits in the tools row under the canvas; nothing overlays the canvas.
- Saved per browser (localStorage `glint.studio.v2`). Up to 10 nodes. Adaptive quality lowers resolution if frames run slow.

## Casting and the first launched reworks (Oct 12–13, 2026)
- **Casting** is the test bench: one form or character at a time on a blank stage, every property on a slider, Keep / Rework / Cut verdict plus notes. Live page (private Claude artifact): https://claude.ai/artifact/ENcZAuj6ecQQW3D5xuStb8. Notes are in its database collection `reviews` (doc ids `form-<key>`, `char-<key>`, `rework-<key>`, `general`); each saved note also records the slider positions. Source: `casting/` (built by concatenating `mocap.js engine.js mocap-char.js rework.js rework2.js lab.js` into `shell.html`).
- Launched into the Studio as forms, listed first, each with Kennedy's chosen defaults (`def`, `hue`): **Graffiti** (neon pencil sketching doodles and an editable word list, retracing strokes 1–5 times), **Lightning trio** (three cells orbit and strike each other), **Cheshire** (two menacing cat eyes with spiral irises; halos start as copies of the eye outline, then warp and tear as they fade; kicks push Size/Trails/Roam toward 100% via `kickBoost`), **Nerve stems** (dense core plus 3–5 stems; loud parts grow up to 8 more into every quadrant), **Smooch** (aurora-curtain lips that pucker and curl on the beat; name chosen by Kennedy).
- The original forms they came from (Neon ribbon, Lightning, Halo rings, Branching limbs, Aurora curtain) are still in the Studio because scenes use them; Kennedy hasn't decided whether to retire them.
- Cut in Casting: Wave line, Swimmers (the Whip strand rework). Not launched: the mocap characters (Dancer, Tai chi; CMU motion capture, credit line required) are still under review.
- Kennedy's working defaults: music Reaction, Punch and Decay at 100% (now the Studio's fresh-start master settings), high energy and tempo, lots of chaos.
- Graffiti's default word list is deliberately cheeky and explicit (Kennedy's call). Swap it before any public launch or app store review.
- Text shape settings (`text: true`, e.g. Graffiti's word list) render as a text box under the Shape knobs.

## Glint v3: the stripped-down app (Oct 13, 2026) — `index.html`
Kennedy asked to overhaul the whole interface: combine up to three visuals, with only the sliders each one needs. Decisions:
- `index.html` + `glint.css` + `glint.js` are the app now. The engine is shared through `engine/core.js` (helpers, original forms, characters, travel), `engine/forms.js` (forms built in Casting) and `engine/moods.js` (personalities). Promote changes from `casting/` into `engine/` on purpose; the app does not load Casting's files.
- The picker only offers approved visuals (Kennedy's choice): Graffiti, Lightning trio, Cheshire, Nerve stems, Smooch, Cat's cradle, Boiling doodle (the 15-shape rework), Tube dancer, Tornado (slow rework with dancing silhouette), Filigree vine (color-cycling rework), Firework (added at Kennedy's request before a Casting verdict). Round-two reworks live in `engine/forms2.js` (copied from `casting/rework2.js`). Cut in round two: Seaweed rework, Fiddlehead animals, Lava blobs. Each starts from Kennedy's saved settings (`VISUALS` in glint.js). Add a visual there when Kennedy approves it in Casting.
- Per visual: color, opacity, its Shape sliders, a Movement picker only where movement matters (not for self-placing visuals), and Motion sliders folded away.
- Kept from the old app: personalities (with opacity and blend) and full-screen play. Dropped: nodes list, buses, scenes, aspect ratios, dragging, the knob deck. The current design autosaves on the device (localStorage `glint.v3`).
- **My designs** (added Oct 13 at Kennedy's request): name and save the whole combo with every setting, load or delete it; saved per device in localStorage `glint.designs.v3`. Saving under an existing name updates it.
- The previous Studio lives at `studio.html` / `studio.js` / `styles.css`, untouched.
- **Cycle my designs** (Oct 14, 2026): full-screen play that steps through saved designs every N seconds (slider, default 18 s, localStorage `glint.cycle`) with a 1.6 s crossfade and the design's name shown briefly; arrow keys skip; exiting restores the combo that was on screen before.
- **Desktop audio capture** (Oct 14, 2026, computers only; hidden on phones): **Tab or screen audio** uses `getDisplayMedia` with `systemAudio: "include"` (a tab plays its own sound; Entire screen captures apps like Spotify in Chrome 141+ on macOS 14.2+, or on Windows), and **Audio input…** lists every input device (mic, audio interface, loopback such as BlackHole, marked "loopback"), remembering the last pick in localStorage `glint.input`. Captured sound is never played back out (no echo). A level meter shows under the status line for live sources. Untested on Kennedy's own computer so far.
- Next after refining: more "paths" for the drawing visuals (Graffiti and similar), i.e. what they trace or sketch.

## Personalities
- Starting set: Hypnotic, Aggressive, Dreamy, Glitch, Electric, Fluid. Multiple can be active at once.
- Each has its own **opacity** (0–100%) and its own **blend mode** (independent).
- All share the same knob set with different defaults.

## Control groups
- **Interactiveness:** Magnetism (−repel / +attract), Social (imitation/sync), Range (influence distance), Contagion, Collision.
- **Motion:** Energy, Tempo, Grace, Chaos, Direction.
- **Reaction:** Reaction (0–100% music mix; 0% still idles — breathing, swaying, pulsing), Listens to (kick/snare/bass/vocals/hats/mix), Punch & Decay. The Reaction knob is pinned as a master control on every panel.
- **Appearance:** Opacity, Blend mode, Color, Glow, Size, Trails.

## Music links (mod matrix)
Any knob can link to a music quality, with depth and a **Band** filter (low-/high-/band-pass + cutoff).
Defaults: Tempo→BPM · Energy→loudness · Chaos→noisiness/highs · Grace→smoothness · Direction→stereo/melody (experimental) · Size→bass · Color→spectral brightness · Glow/Trails→sustain · Magnetism→build-up tension · Social→rhythmic steadiness · Contagion→hit strength · Opacity→section loudness.
Note: Range = influence distance; Band = frequency filter.

## Visual design (locked Oct 9, 2026)
Near-black graphite, charcoal, gunmetal, silver. Brushed/machined steel, smoked glass, soft rim light. Knurled steel knobs with thin silver-white arcs; Reaction knob larger. Faint dotted grid canvas. Black-and-white personality thumbnails. Thin refined sans-serif, spaced "Glint" wordmark, minimal text.

## Tech
- Rendering: Phase 1 uses 2D canvas with additive glow and feedback trails; Three.js (WebGL) added for 3D looks.
- Audio: Web Audio API (AnalyserNode), band energies + onset (kick) detection.
- Hosting: GitHub + Netlify; Supabase for accounts and synced designs.
- Licensing: Three.js, Paper.js, Butterchurn believed MIT (verify before reuse). GIMP/Krita/Inkscape/Blender are GPL — reimplement from math only. Shadertoy often NonCommercial.

## Build phases
1. **Core engine** — canvas, nodes, oscillators, mic/file input, Reaction knob, desktop Studio. ← current
2. **Character** — behavior characters, personalities with opacity/blend, all control groups, music links.
3. **Full app** — mobile polish, Library, Gallery, Perform, accounts + sync.
4. **Polish** — system/tab capture, presets, tutorial, curated 3D looks.

## Open questions
- Does tab capture work on the DRM Spotify web player?
- Does iOS duck Spotify while Glint's mic is on?
- Trademark check on "Glint" before any public launch.
- Which characters/presets ship first; final blend-mode list.
