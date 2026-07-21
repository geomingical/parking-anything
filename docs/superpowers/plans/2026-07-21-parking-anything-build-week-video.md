# Parking Anything Build Week Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a verified 120-second Build Week product film and a 20-second teaser from the Parking Anything v0.5 website.

**Architecture:** Keep capture evidence, design reference, narrative documents, media, and compositions in `video/parking-anything-build-week`. The main and teaser files are standalone HyperFrames compositions that share local CSS, image assets, narration, and deterministic GSAP motion patterns.

**Tech Stack:** HyperFrames HTML, GSAP 3.14.2, local PNG product captures, HyperFrames TTS/transcription, Playwright capture, FFmpeg-backed HyperFrames rendering.

---

### Task 1: Capture and brand reference

**Files:**
- Create: `video/parking-anything-build-week/capture/extracted/tokens.json`
- Create: `video/parking-anything-build-week/capture/extracted/visible-text.txt`
- Create: `video/parking-anything-build-week/capture/extracted/asset-descriptions.md`
- Create: `video/parking-anything-build-week/DESIGN.md`

- [ ] Capture the 1920×1080 local hero and copy verified v0.5 state screenshots.
- [ ] Record exact palette, typography, visible product copy, and animation names.
- [ ] Verify every color in `DESIGN.md` matches `tokens.json` and every visual component exists in a capture.
- [ ] Commit with `git commit -m "docs: define Build Week video identity"`.

### Task 2: Narration and timed storyboard

**Files:**
- Create: `video/parking-anything-build-week/SCRIPT.md`
- Create: `video/parking-anything-build-week/STORYBOARD.md`

- [ ] Write an American-English narration of 255–285 words covering the pain, Tool capture, Idea capture, bounded Test Drive, evidence gates, Manager Patrol, local ownership, and closing thesis.
- [ ] Assign eight contiguous beats totaling exactly 120 seconds and four teaser beats totaling exactly 20 seconds.
- [ ] Audit every narrated claim against the v0.5 README and design spec.
- [ ] Commit with `git commit -m "docs: script Parking Anything product story"`.

### Task 3: Voiceover and timestamps

**Files:**
- Create: `video/parking-anything-build-week/narration.txt`
- Create: `video/parking-anything-build-week/narration.wav`
- Create: `video/parking-anything-build-week/transcript.json`

- [ ] Generate narration with `npx hyperframes tts narration.txt --voice af_nova --output narration.wav`.
- [ ] Transcribe with `npx hyperframes transcribe narration.wav`.
- [ ] Replace planned beat boundaries in `STORYBOARD.md` with word-level timestamps while retaining exactly 120 seconds.
- [ ] Commit with `git commit -m "feat: add timed Build Week narration"`.

### Task 4: Main composition

**Files:**
- Create: `video/parking-anything-build-week/index.html`
- Create: `video/parking-anything-build-week/styles.css`

- [ ] Build the complete static hero frame for each beat before adding motion.
- [ ] Register one paused GSAP timeline under `window.__timelines["parking-anything-main"]`.
- [ ] Add deterministic entrances and road-line transitions without pre-transition exit tweens.
- [ ] Add muted product video only if captured later; keep narration as a separate audio clip.
- [ ] Verify the root composition is 1920×1080 and exactly 120 seconds.
- [ ] Commit with `git commit -m "feat: build Parking Anything main film"`.

### Task 5: Teaser composition

**Files:**
- Create: `video/parking-anything-build-week/teaser.html`

- [ ] Reuse the hook, unified Parkable, lifecycle, Patrol, and brand-close visual language.
- [ ] Register a separate paused GSAP timeline under `window.__timelines["parking-anything-teaser"]`.
- [ ] Verify the composition is 1920×1080 and exactly 20 seconds.
- [ ] Commit with `git commit -m "feat: add Parking Anything teaser"`.

### Task 6: Validation and handoff

**Files:**
- Modify only files reported by validation.

- [ ] Run `npx hyperframes lint` and expect zero errors.
- [ ] Run `npx hyperframes validate` and expect zero errors.
- [ ] Run `npx hyperframes inspect --samples 24` and review all warnings.
- [ ] Launch `npx hyperframes preview --port 3027` and hand off `http://localhost:3027/#project/parking-anything-build-week`.
- [ ] Do not render MP4 until the user explicitly approves the Studio preview.
