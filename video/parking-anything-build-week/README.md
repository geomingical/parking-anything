# Parking Anything Build Week Video

This directory contains the main production package and shared assets for:

- `index.html` — 120-second Build Week judge film.
- `../parking-anything-teaser/index.html` — separate 20-second product teaser project.

Both use the v0.5 product captures, the exact product palette, deterministic GSAP timelines, local narration, and the same lifecycle narrative.

## Editorial sources

- `DESIGN.md` — brand reference and visual guardrails.
- `SCRIPT.md` — approved main and teaser narration.
- `STORYBOARD.md` — beat timing, assets, motion, transitions, and sound direction.
- `transcript.json` — HyperFrames Whisper word-level alignment for the local 118.84-second fallback voice.
- `transcript.meta.json` — transcription provenance and measured beat boundaries.
- `captions.json` / `captions.js` — generated readable cues and timeline data; rebuild with `node scripts/build-captions.mjs`.

## Safe local review

Terminal 1, from `video/` (leave the server running):

```bash
python3 -m http.server 3028 --bind 127.0.0.1
```

Terminal 2, from `video/parking-anything-build-week/`:

```bash
node scripts/capture-hero-frames.mjs
node scripts/static-check.mjs
node scripts/layout-check.mjs
```

The inspected main hero frames are under `snapshots/`; teaser frames are under `../parking-anything-teaser/snapshots/`.

## HyperFrames completion gate

The installed skill requires the following commands before Studio handoff. Run the main-film commands from this directory, then repeat lint, check, inspect, snapshot, and preview from `../parking-anything-teaser` for the teaser:

```bash
npx hyperframes lint
npx hyperframes check
npx hyperframes inspect --samples 24
npx hyperframes snapshot . --at 4,23,39,53,64,80,98,113
npx hyperframes preview --port 3027
```

The main narration was transcribed with HyperFrames Whisper `small.en`; animation cuts are aligned to the measured paragraph boundaries in `transcript.meta.json`.

Current local Studio endpoints:

- Main film: `http://localhost:3027/#project/parking-anything-build-week`
- Teaser: `http://localhost:3026/#project/parking-anything-teaser`

The remaining lint warnings describe deliberate reuse of first-party screenshots/vehicle art; the main film also carries the non-blocking large-file maintainability warning. Both projects pass HyperFrames runtime, layout, motion, and WCAG AA contrast checks.

Do not render an MP4 until the Studio preview has been reviewed and the user explicitly requests export.
