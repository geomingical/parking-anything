# Parking Anything Build Week Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a verified 120-second Build Week product film and a 20-second teaser from the Parking Anything v0.5 website.

**Architecture:** Keep main-film capture evidence, design reference, narrative documents, media, and composition in `video/parking-anything-build-week`; keep the teaser as a self-contained sibling project in `video/parking-anything-teaser`. Both standalone HyperFrames compositions use the same deterministic GSAP motion patterns and first-party visual language without cross-project asset traversal.

**Tech Stack:** HyperFrames HTML, GSAP 3.14.2, local PNG product captures, HyperFrames TTS/transcription, Playwright capture, FFmpeg-backed HyperFrames rendering.

---

### Task 1: Capture and brand reference

**Files:**
- Create: `video/parking-anything-build-week/capture/extracted/tokens.json`
- Create: `video/parking-anything-build-week/capture/extracted/visible-text.txt`
- Create: `video/parking-anything-build-week/capture/extracted/asset-descriptions.md`
- Create: `video/parking-anything-build-week/DESIGN.md`

- [x] Capture the 1920×1080 local hero and copy verified v0.5 state screenshots.
- [x] Record exact palette, typography, visible product copy, and animation names.
- [x] Verify every color in `DESIGN.md` matches `tokens.json` and every visual component exists in a capture.
- [x] Commit with `git commit -m "docs: define Build Week video identity"`.

### Task 2: Narration and timed storyboard

**Files:**
- Create: `video/parking-anything-build-week/SCRIPT.md`
- Create: `video/parking-anything-build-week/STORYBOARD.md`

- [x] Write an American-English narration of 255–285 words covering the pain, Tool capture, Idea capture, bounded Test Drive, evidence gates, Manager Patrol, local ownership, and closing thesis.
- [x] Assign eight contiguous beats totaling exactly 120 seconds and four teaser beats totaling exactly 20 seconds.
- [x] Audit every narrated claim against the v0.5 README and design spec.
- [x] Commit with `git commit -m "docs: script Parking Anything product story"`.

### Task 3: Voiceover and timestamps

**Files:**
- Create: `video/parking-anything-build-week/narration.txt`
- Create: `video/parking-anything-build-week/narration.wav`
- Create: `video/parking-anything-build-week/transcript.json`

- [x] Generate narration with the documented macOS Samantha fallback at 140 wpm after the remote TTS path was unavailable.
- [x] Transcribe with `npx hyperframes transcribe narration.wav --language en --model small.en`.
- [x] Replace planned beat boundaries in `STORYBOARD.md` with word-level timestamps while retaining exactly 120 seconds.
- [x] Commit with `git commit -m "feat: add timed Build Week narration"`.

### Task 4: Main composition

**Files:**
- Create: `video/parking-anything-build-week/index.html`
- Create: `video/parking-anything-build-week/styles.css`

- [x] Build the complete static hero frame for each beat before adding motion.
- [x] Register one paused GSAP timeline under `window.__timelines["parking-anything-main"]`.
- [x] Add deterministic entrances and road-line transitions without pre-transition exit tweens.
- [x] Keep narration as a separate audio clip; no muted product video was needed.
- [x] Verify the root composition is 1920×1080 and exactly 120 seconds.
- [x] Commit with `git commit -m "feat: build Parking Anything main film"`.

### Task 5: Teaser composition

**Files:**
- Create: `video/parking-anything-teaser/index.html`

- [x] Reuse the hook, unified Parkable, lifecycle, Patrol, and brand-close visual language.
- [x] Register a separate paused GSAP timeline under `window.__timelines["parking-anything-teaser"]`.
- [x] Verify the composition is 1920×1080 and exactly 20 seconds.
- [x] Commit with `git commit -m "feat: add Parking Anything teaser"`.

### Task 6: Validation and handoff

**Files:**
- Modify only files reported by validation.

- [x] Run `npx hyperframes lint` and confirm zero errors for both projects.
- [x] Run deprecated `npx hyperframes validate`, then the current `npx hyperframes check`; both projects pass the current check.
- [x] Run `npx hyperframes inspect --samples 24` on both projects and review all info diagnostics.
- [x] Launch the main Studio at `http://localhost:3027` and the teaser Studio at `http://localhost:3026`.
- [x] Do not render MP4 until the user explicitly approves the Studio preview.
