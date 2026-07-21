# Parking Anything Build Week Video

This directory contains one shared production package for:

- `index.html` — 120-second Build Week judge film.
- `teaser.html` — 20-second product teaser.

Both use the v0.5 product captures, the exact product palette, deterministic GSAP timelines, local narration, and the same lifecycle narrative.

## Editorial sources

- `DESIGN.md` — brand reference and visual guardrails.
- `SCRIPT.md` — approved main and teaser narration.
- `STORYBOARD.md` — beat timing, assets, motion, transitions, and sound direction.
- `transcript.json` — provisional deterministic word alignment for the local 118.12-second fallback voice.
- `transcript.meta.json` — provenance and replacement command for the provisional timing.

## Safe local review

From this directory:

```bash
python3 -m http.server 3028 --bind 127.0.0.1
node scripts/capture-hero-frames.mjs
node scripts/static-check.mjs
node scripts/layout-check.mjs
```

The inspected main and teaser hero frames are under `snapshots/`.

## HyperFrames completion gate

The installed skill requires the following commands before Studio handoff:

```bash
npx hyperframes transcribe narration.wav
npx hyperframes lint
npx hyperframes validate
npx hyperframes inspect --samples 24
npx hyperframes snapshot . --at 4,23,39,53,64,80,98,113
npx hyperframes preview --port 3027
```

The CLI package download and execution requires explicit user approval because it is third-party code running against the local worktree. Until that approval is granted, local static, runtime, asset, and hero-frame layout checks are the verified fallback—not a substitute claim for HyperFrames validation.

Do not render an MP4 until the Studio preview has been reviewed and the user explicitly requests export.
