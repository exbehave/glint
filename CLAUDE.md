# Glint — project guide

Glint is a music-visualizer design studio. You place **nodes** on a canvas, give them behaviors and personalities, and tune them with synth-style knobs until they dance to music. Owner: Kennedy. Personal launch first, built to scale to a public launch without a rewrite.

Full living spec: https://claude.ai/code/artifact/a483d844-f6de-483d-a87d-b19ce74aca4e

## Where things live
- **Repo:** `exbehave/glint` (private). Plain static files: `index.html`, `styles.css`, `app.js`, `forms.html`, icons, `manifest.webmanifest`. No build step.
- **Live site:** https://kennedy-glint.netlify.app (Netlify builds from `main` on every push; the project is public).
- No Supabase yet: designs save per device in localStorage `glint.studio.v2`. Add cloud sync with the `deploy-web-app` skill when designs need to follow Kennedy across devices.
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
- Mobile segments: Nodes, Shape, Tune, Mood.
- Saved per browser (localStorage `glint.studio.v2`). Up to 10 nodes. Adaptive quality lowers resolution if frames run slow.

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
