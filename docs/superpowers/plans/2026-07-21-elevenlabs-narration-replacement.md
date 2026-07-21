# ElevenLabs Narration Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Samantha narration with the user-approved ElevenLabs IVC take, preserve the 150-second composition, and realign captions and scene choreography to the new spoken timings.

**Architecture:** Keep `narration.wav` as the composition's stable audio entry point. Normalize the approved 142.419563-second ElevenLabs MP3 with pitch-preserving `atempo=0.9542700937052958`, match the legacy narration within `0.5 LU` while holding peaks near `-1.5 dBTP`, resample to 48 kHz PCM, and pad the tail to 149.3 seconds. Regenerate the word transcript, caption cues, provenance metadata, and nine beat anchors; express scene choreography relative to the new beat starts so future narration changes are auditable.

**Tech Stack:** FFmpeg/ffprobe, whisper.cpp `small.en` with DTW word timing, HyperFrames transcript importer, Node.js test runner, JSDOM static checks, GSAP, HyperFrames CLI.

---

### Task 1: Migrate narration provenance contracts

**Files:**
- Modify: `video/parking-anything-build-week/scripts/transcript-contract.test.mjs`
- Modify: `video/parking-anything-build-week/scripts/transcript-contract.mjs`
- Modify: `video/parking-anything-build-week/scripts/build-transcript-meta.mjs`

- [x] **Step 1: Write the failing ElevenLabs provenance test**

Replace the Samantha fixture with this approved provenance payload and add assertions that a wrong provider and wrong tempo factor are rejected:

```js
const validAudioProvenance = {
  provider: "ElevenLabs",
  voice: "Park anything",
  model: "Eleven Multilingual v2",
  speed: 1.08,
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0,
  speakerBoost: true,
  sourceDurationSeconds: 142.419563,
  tempoFactor: 0.9542700937052958,
  transform: "ffmpeg atempo (pitch-preserving), EBU R128 loudness normalization, 48 kHz PCM, padded tail",
  finalDurationSeconds: 3.1,
};
```

- [x] **Step 2: Run the contract test and verify red**

Run: `node --test video/parking-anything-build-week/scripts/transcript-contract.test.mjs`

Expected: FAIL because `validateAudioProvenance` still requires `macOS say` and `Samantha`.

- [x] **Step 3: Implement the ElevenLabs contract**

Require the exact provider, voice, model, generation settings, source duration, tempo factor, transform description, and equality between `finalDurationSeconds` and the probed narration duration. Preserve the existing finite-number and duration-coverage checks.

- [x] **Step 4: Update metadata generation**

Set `build-transcript-meta.mjs` to emit the approved ElevenLabs payload, with `finalDurationSeconds` populated from `ffprobe`.

- [x] **Step 5: Run the focused contract test and verify green**

Run: `node --test video/parking-anything-build-week/scripts/transcript-contract.test.mjs`

Expected: all transcript contract tests pass.

### Task 2: Install the approved narration and regenerate timing artifacts

**Files:**
- Modify: `video/parking-anything-build-week/narration.wav`
- Modify: `video/parking-anything-build-week/transcript.json`
- Modify: `video/parking-anything-build-week/transcript.meta.json`
- Modify: `video/parking-anything-build-week/captions.json`
- Modify: `video/parking-anything-build-week/captions.js`

- [x] **Step 1: Build the final narration asset**

Run:

```bash
ffmpeg -hide_banner -y \
  -i video/parking-anything-build-week/narration-elevenlabs-retimed.wav \
  -af "loudnorm=I=-16:LRA=7:TP=-1.5,volume=1.7dB,alimiter=limit=0.841395:attack=5:release=50:level=false,asetpts=N/SR/TB,apad=whole_dur=149.3,atrim=duration=149.3" \
  -ar 48000 -ac 1 -c:a pcm_s16le \
  video/parking-anything-build-week/narration.wav
```

Expected: a 149.3-second, 48 kHz, mono PCM WAV around `-17.23 LUFS / -1.49 dBTP`, within `0.5 LU` of the legacy narration's `-16.77 LUFS`, with the original candidate unchanged.

- [x] **Step 2: Import the verified word transcript**

Copy `/private/tmp/transcript.json`, produced from the retimed WAV by whisper.cpp `small.en` with DTW, to `video/parking-anything-build-week/transcript.json`. It must contain 361 non-overlapping words, start at 0.13 seconds, and end with `exit.` at 149.26 seconds.

- [x] **Step 3: Rebuild metadata and captions**

Run:

```bash
node video/parking-anything-build-week/scripts/build-transcript-meta.mjs
node video/parking-anything-build-week/scripts/build-captions.mjs
node video/parking-anything-build-week/scripts/verify-transcript.mjs
```

Expected: nine canonical beat boundaries `[0.13, 19.69, 36.35, 49.49, 59.13, 72.61, 93.33, 109.83, 139.65, 149.26]`, synchronized non-overlapping captions, and a passing verification command.

### Task 3: Realign scene choreography and documentation

**Files:**
- Modify: `video/parking-anything-build-week/index.html`
- Modify: `video/parking-anything-build-week/scripts/static-check.mjs`
- Modify: `video/parking-anything-build-week/README.md`
- Modify: `video/parking-anything-build-week/STORYBOARD.md`
- Do not modify: `video/parking-anything-build-week/SCRIPT.md`

- [x] **Step 1: Add a failing static timing contract**

Update the narration duration expectation to `149.3` and require this exact static timing map in `index.html`:

```js
const beatStarts = Object.freeze({
  scene1: 0.13,
  scene2: 19.69,
  scene3: 36.35,
  scene4: 49.49,
  scene5: 59.13,
  scene6: 72.61,
  scene7: 93.33,
  scene8: 109.83,
  scene9: 139.65,
});
```

Run: `node video/parking-anything-build-week/scripts/static-check.mjs`

Expected: FAIL until `index.html` adopts the new duration and timing map.

- [x] **Step 2: Express scene entrances relative to beat starts**

Replace absolute scene-entry timestamps with `beatStarts.sceneN + offset`, and schedule each transition at the next beat start minus `0.41`. Preserve animation durations and unrelated visual properties.

- [x] **Step 3: Align semantic Future and closing moments**

Use these transcript-derived cue times:

```js
const futureCues = Object.freeze({
  privateDecision: 119.83,
  gather: 122.74,
});
const closingCues = Object.freeze({ parkIt: 145.43 });
```

Start the Future crossfade 2.14 seconds before `privateDecision`, stage signs/routes/cars relative to `gather`, and start the final parking move 0.68 seconds after `parkIt`. Keep `final-wash` at 149.5 seconds.

- [x] **Step 4: Update durable documentation**

Record the 149.3-second ElevenLabs IVC narration, 361-word transcript, last word at 149.26 seconds, and the nine measured beat boundaries in `README.md` and `STORYBOARD.md`. Preserve all product and Future disclosure language.

- [x] **Step 5: Run static and transcript checks**

Run:

```bash
node video/parking-anything-build-week/scripts/static-check.mjs
node video/parking-anything-build-week/scripts/verify-transcript.mjs
```

Expected: both commands pass.

### Task 4: Validate and render the replacement film

**Files:**
- Create: `video/parking-anything-build-week/renders/parking-anything-build-week-elevenlabs-150s.mp4`

- [x] **Step 1: Run the complete local test and composition gates**

Run:

```bash
npm test
node video/parking-anything-build-week/scripts/static-check.mjs
node video/parking-anything-build-week/scripts/layout-check.mjs
npx hyperframes check --at 4,23,39,53,64,80,98,110,118,128,138,142,147,149.4
```

Expected: repository tests pass; static, layout, runtime, motion, and contrast checks report no blocking errors.

- [x] **Step 2: Render the final MP4**

From `video/parking-anything-build-week`, run:

```bash
npx hyperframes render \
  --output renders/parking-anything-build-week-elevenlabs-150s.mp4 \
  --fps 30 --quality standard --strict
```

Expected: a 150-second 1920×1080 H.264 MP4 with one AAC audio stream.

- [x] **Step 3: Verify media delivery**

Run `ffprobe` to confirm duration, resolution, frame rate, codecs, and audio channels; run `ffmpeg -af volumedetect` to confirm non-silent audio without clipping; retain the original MP4 and narration assets for rollback.
