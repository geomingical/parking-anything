# Parking Anything Build Week Video

This directory contains the main production package and shared assets for:

- `index.html` — 150-second Build Week judge film.
- `../parking-anything-teaser/index.html` — separate 20-second product teaser project.

Both use the v0.5 product captures, the exact product palette, deterministic GSAP timelines, local narration, and the same lifecycle narrative.

## Editorial sources

- `DESIGN.md` — brand reference and visual guardrails.
- `SCRIPT.md` — approved main and teaser narration.
- `STORYBOARD.md` — beat timing, assets, motion, transitions, and sound direction.
- `narration.wav` — 149.2445-second local voiceover.
- `transcript.json` — HyperFrames Whisper word-level alignment for the 362-word narration.
- `transcript.meta.json` — transcription provenance and measured beat boundaries.
- `captions.json` / `captions.js` — 60 readable cues and timeline data; rebuild with `node scripts/build-captions.mjs`.

## Safe local review

Terminal 1, from `video/` (leave the server running):

```bash
python3 -m http.server 3028 --bind 127.0.0.1
```

Terminal 2, from `video/parking-anything-build-week/`:

```bash
node scripts/capture-hero-frames.mjs
node --test scripts/capture-hero-frames.integration.mjs
node scripts/static-check.mjs
node scripts/layout-check.mjs
```

The generator writes exactly 14 indexed 1920×1080 main frames (`frame-00-at-4s.png` through `frame-13-at-149.4s.png`) and one deterministic 4×4 `snapshots/contact-sheet.jpg`. It safely removes only known main-generator artifacts, validates image dimensions, full rendered Future-disclosure foreground/background pixel geometry, and nonblank Future scenes, and never reads or writes the protected teaser project. It uses only the local page, Playwright, and the already installed `sharp` package; it makes no network request. The ordered sample times are `4, 23, 39, 53, 64, 80, 98, 110, 118, 128, 138, 142, 147, 149.4` seconds.

The standalone integration contract owns an ephemeral local server and temporary output directory, executes the real generator twice, requires byte-identical hashes for all 15 artifacts at 1920×1080, and proves the complete teaser tree is byte-identical before and after. `PARKING_ANYTHING_CAPTURE_SERVER_URL` and `PARKING_ANYTHING_CAPTURE_OUTPUT_DIR` exist for that isolated contract; ordinary canonical generation keeps the documented defaults.

The UI-first review contract requires real shipped-product captures to occupy at least 45% of the 1920×1080 frame at every tagged product sample. It also verifies the exact `FUTURE · NOT YET BUILT` text, DOM box/text geometry, clipping, foreground/background pixels, and a nonblank scene through 138.4 seconds. It rejects text-first slides, decorative thumbnail UI, more than one headline or two evidence labels, repeated card/stamp/grid layouts, purposeless vehicles, fabricated Future application states, and captions that collide with or outrank product evidence.

## HyperFrames completion gate

The installed skill requires the following main-film commands before Studio handoff:

```bash
npx --yes hyperframes check
npx --yes hyperframes inspect --samples 30
npx --yes hyperframes snapshot --at 4,23,39,53,64,80,98,110,118,128,138,138.4,142,147,149.4 --no-end --output /private/tmp/parking-anything-hf-review
npx --yes hyperframes preview --port 3027
```

In the restricted QA environment, registry resolution for `npx --yes` was unavailable. The exact equivalent commands were executed with the already cached and pinned `hyperframes@0.7.65` entry point:

```bash
node /Users/ming/.npm/_npx/702923228c2ce1e6/node_modules/hyperframes/bin/hyperframes.mjs check
node /Users/ming/.npm/_npx/702923228c2ce1e6/node_modules/hyperframes/bin/hyperframes.mjs inspect --samples 30
node /Users/ming/.npm/_npx/702923228c2ce1e6/node_modules/hyperframes/bin/hyperframes.mjs snapshot --at 4,23,39,53,64,80,98,110,118,128,138,138.4,142,147,149.4 --no-end --output /private/tmp/parking-anything-hf-review
```

HyperFrames snapshots are renderer-verification artifacts in a temporary directory. Run `node scripts/capture-hero-frames.mjs` to reproduce the committed canonical names and singular contact sheet.

The main narration was transcribed with HyperFrames Whisper `small.en`; animation cuts are aligned to the measured paragraph boundaries in `transcript.meta.json`.

Current local Studio endpoints:

- Main film: `http://localhost:3027/#project/parking-anything-build-week?v=5&t=0&tab=renders&rc=1`
- Teaser: `http://localhost:3026/#project/parking-anything-teaser`

HyperFrames `check` passes runtime, layout, motion, and 22/22 WCAG AA contrast checks. HyperFrames 0.7.65 still reports four non-blocking lint warnings: three for intentional reuse of first-party screenshot/vehicle sources and one for the 390-line composition. The 30-sample `inspect` reports zero errors and zero warnings; its remaining info items are intentional screenshot crops and transition coverage.

Do not render an MP4 until the Studio preview has been reviewed and the user explicitly requests export.
