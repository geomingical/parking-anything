# Parking Anything Future Vision Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the verified Parking Anything Build Week main film from 120 to exactly 150 seconds with an honestly labeled future-vision chapter for additional Parkable kinds and real-world Gather meetups, while leaving the 20-second teaser unchanged.

**Architecture:** Preserve scenes 1–7 and their measured timing. Insert a new scene 8 after the current product-boundary scene, rename the current closing scene to scene 9, and drive both new scene boundaries from the regenerated word-level transcript. Keep the Future chapter conceptual and non-interactive: local CSS/SVG geometry and existing vehicle art communicate the roadmap while a persistent `FUTURE · NOT YET BUILT` label prevents feature overclaiming.

**Tech Stack:** HyperFrames HTML composition, GSAP 3.14.2, macOS Samantha TTS, HyperFrames Whisper `small.en`, Node.js static/layout verification, Playwright, Vitest, Next.js.

---

### Task 1: Lock the 150-second editorial sources

**Files:**
- Modify: `video/parking-anything-build-week/SCRIPT.md`
- Modify: `video/parking-anything-build-week/narration.txt`
- Modify: `video/parking-anything-build-week/STORYBOARD.md`

- [ ] **Step 1: Record the teaser baseline before touching main-film files**

Run from the worktree root:

```bash
find video/parking-anything-teaser -type f -print0 | sort -z | xargs -0 shasum -a 256 > /tmp/parking-anything-teaser.before.sha256
```

Expected: `/tmp/parking-anything-teaser.before.sha256` contains one digest for every teaser file and no command error.

- [ ] **Step 2: Extend the approved main narration without changing the teaser**

Change the main-film heading to `Main film — 150 seconds`. Insert this exact paragraph between the bounded-product paragraph and the existing closing paragraph in both `SCRIPT.md` and `narration.txt`:

```text
Today, the lot holds tools and ideas. The road ahead is wider: trips, books, gear, side projects—anything asking for your time before it earns a commitment. And when a private decision becomes worth sharing, Gather could turn compatible Parkables into a real-world meetup: compare notes, test together, or meet the people behind the same curiosity. These controls are visible today, but honestly disabled. They are the road ahead—not features we're pretending already exist.
```

Keep the TTS spelling `G P T five point six` already used elsewhere in `narration.txt`. Do not edit any text under `## Teaser — 20 seconds`.

- [ ] **Step 3: Add the Future beat and preserve the existing close as beat 9**

In `STORYBOARD.md`:

```markdown
**Main duration:** 150 seconds

### BEAT 8 — THE ROAD AHEAD (approximately 108.70–140.00s)

**VO:** Use the approved 75-word Future paragraph verbatim.

**Concept:** The verified private decision system expands into two explicitly speculative directions: more kinds of Parkables and an eventual path from private evaluation to an in-person Gather meetup.

**Visual:** Begin from the real disabled Future controls. Expand the parking grid into TRIP, BOOK, GEAR, and SIDE PROJECT bays, then connect separate PERSONAL LOTS to one circular GATHER plaza. Keep FUTURE · NOT YET BUILT visible for the complete beat.

**Boundary:** No fabricated UI, pointer click, account flow, matching result, notification, loading state, success state, or cloud-sync behavior.

### BEAT 9 — DECIDE WHAT DESERVES YOUR TIME (approximately 140.00–150.00s)

Retain the existing closing VO, concept, visual, route, and thesis. Replace the approximate boundary with the measured paragraph boundary after transcription.
```

Renumber only the current closing beat; do not renumber or retime beats 1–7.

- [ ] **Step 4: Verify the editorial source contract**

Run:

```bash
node -e 'const fs=require("fs"); const s=fs.readFileSync("video/parking-anything-build-week/SCRIPT.md","utf8"); const n=fs.readFileSync("video/parking-anything-build-week/narration.txt","utf8"); if(!s.includes("Main film — 150 seconds")) throw new Error("150-second heading missing"); if(!n.includes("They are the road ahead—not features we\x27re pretending already exist.")) throw new Error("Future disclaimer missing"); if((n.match(/Today, the lot holds tools and ideas\./g)||[]).length!==1) throw new Error("Future paragraph must appear once"); console.log("Editorial source contract passed.");'
```

Expected: `Editorial source contract passed.`

- [ ] **Step 5: Commit the editorial sources**

```bash
git add video/parking-anything-build-week/SCRIPT.md video/parking-anything-build-week/narration.txt video/parking-anything-build-week/STORYBOARD.md
git commit -m "docs: script Build Week future vision"
```

### Task 2: Regenerate and verify the measured narration pipeline

**Files:**
- Create: `video/parking-anything-build-week/scripts/verify-transcript.mjs`
- Create: `video/parking-anything-build-week/scripts/build-transcript-meta.mjs`
- Regenerate: `video/parking-anything-build-week/narration.wav`
- Regenerate: `video/parking-anything-build-week/transcript.json`
- Modify: `video/parking-anything-build-week/transcript.meta.json`
- Regenerate: `video/parking-anything-build-week/captions.json`
- Regenerate: `video/parking-anything-build-week/captions.js`
- Modify: `video/parking-anything-build-week/scripts/build-provisional-transcript.mjs`

- [ ] **Step 1: Write a failing narration/transcript verifier**

Create `scripts/verify-transcript.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const narration = await readFile(resolve(root, "narration.txt"), "utf8");
const transcript = JSON.parse(await readFile(resolve(root, "transcript.json"), "utf8"));
const meta = JSON.parse(await readFile(resolve(root, "transcript.meta.json"), "utf8"));
const captions = JSON.parse(await readFile(resolve(root, "captions.json"), "utf8"));

assert.match(narration, /Today, the lot holds tools and ideas\./);
assert.match(narration, /FUTURE|road ahead—not features we're pretending already exist/i);
assert.equal(meta.provisional, false);
assert.equal(meta.engine, "whisper");
assert.equal(meta.model, "small.en");
assert.equal(meta.wordCount, transcript.length);
assert.equal(meta.beatBoundaries.length, 9);
assert.ok(meta.audioDurationSeconds <= 149.5, `audio ends at ${meta.audioDurationSeconds}s`);
assert.ok(meta.lastWordEndSeconds <= 149.5, `last word ends at ${meta.lastWordEndSeconds}s`);
assert.equal(meta.beatBoundaries.at(-1).end, meta.lastWordEndSeconds);
assert.ok(captions.some((cue) => /real-world meetup/i.test(cue.text)));
assert.ok(captions.some((cue) => /not features.*pretending/i.test(cue.text)));
captions.forEach((cue, index) => {
  assert.ok(cue.start >= 0 && cue.end > cue.start && cue.end <= 150, `invalid cue ${index}`);
  if (index > 0) assert.ok(cue.start >= captions[index - 1].end, `overlapping cue ${index}`);
});

console.log(`Verified ${meta.wordCount} words, ${captions.length} cues, final word ${meta.lastWordEndSeconds}s.`);
```

- [ ] **Step 2: Run the verifier and confirm the old 120-second transcript fails**

Run:

```bash
node video/parking-anything-build-week/scripts/verify-transcript.mjs
```

Expected: FAIL because the old metadata contains eight beat boundaries and the old captions do not contain the Future paragraph.

- [ ] **Step 3: Generate Samantha candidates and select the slowest valid rate**

Run macOS SpeechSynthesis outside the sandbox because sandboxed `say` can exit successfully while producing empty audio:

```bash
cd video/parking-anything-build-week
say -v Samantha -r 140 --data-format=LEI16@24000 -o /tmp/parking-anything-140.wav narration.txt
say -v Samantha -r 141 --data-format=LEI16@24000 -o /tmp/parking-anything-141.wav narration.txt
say -v Samantha -r 142 --data-format=LEI16@24000 -o /tmp/parking-anything-142.wav narration.txt
ffprobe -v error -show_entries format=duration -of default=nw=1 /tmp/parking-anything-140.wav
ffprobe -v error -show_entries format=duration -of default=nw=1 /tmp/parking-anything-141.wav
ffprobe -v error -show_entries format=duration -of default=nw=1 /tmp/parking-anything-142.wav
```

Choose the first candidate whose duration is at most `149.50` seconds and verify it is non-empty PCM s16le, 24000 Hz, mono:

```bash
ffprobe -v error -show_entries stream=codec_name,sample_rate,channels -of default=nw=1 /tmp/parking-anything-141.wav
cp /tmp/parking-anything-141.wav narration.wav
```

The example copy command assumes 141 wpm is the first valid candidate; use 140 or 142 instead if the measured durations require it. Do not choose a rate above 142 wpm.

- [ ] **Step 4: Transcribe the selected audio and rebuild captions**

Run from `video/parking-anything-build-week`:

```bash
npx --yes hyperframes transcribe narration.wav --engine whisper --model small.en --language en --timeout 300000
node scripts/build-captions.mjs
```

Expected: HyperFrames writes word-level `transcript.json`; the caption builder reports non-zero main cues and exactly nine unchanged teaser cues.

- [ ] **Step 5: Build timing metadata from exact transcript anchors**

Create `scripts/build-transcript-meta.mjs` so no measured value is copied by hand:

```js
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = resolve(new URL("..", import.meta.url).pathname);
const transcript = JSON.parse(await readFile(resolve(root, "transcript.json"), "utf8"));
const normalized = transcript.map((word) => word.text.toLowerCase().replace(/[^a-z0-9]+/g, ""));

function phraseStart(phrase) {
  const tokens = phrase.toLowerCase().split(/\s+/).map((token) => token.replace(/[^a-z0-9]+/g, ""));
  const index = normalized.findIndex((_, candidate) => tokens.every((token, offset) => normalized[candidate + offset] === token));
  if (index < 0) throw new Error(`Transcript anchor not found: ${phrase}`);
  return transcript[index].start;
}

const starts = [
  phraseStart("Saving a new tool"),
  phraseStart("Paste a public tool link"),
  phraseStart("Ideas enter the same lot"),
  phraseStart("Every Parkable begins"),
  phraseStart("Then make a deliberate call"),
  phraseStart("When the lot starts"),
  phraseStart("Codex built and tested"),
  phraseStart("Today the lot holds"),
  phraseStart("Parking Anything isn't another"),
];
const lastWordEndSeconds = transcript.at(-1).end;
const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", resolve(root, "narration.wav")]);
const audioDurationSeconds = Number(stdout.trim());
const beatBoundaries = starts.map((start, index) => ({
  start,
  end: starts[index + 1] ?? lastWordEndSeconds,
}));

await writeFile(resolve(root, "transcript.meta.json"), `${JSON.stringify({
  timingSource: "HyperFrames whisper small.en word-level transcription of narration.wav",
  provisional: false,
  engine: "whisper",
  model: "small.en",
  wordCount: transcript.length,
  audioDurationSeconds,
  lastWordEndSeconds,
  beatBoundaries,
}, null, 2)}\n`);

console.log(`Built 9 measured beats; Future ${starts[7]}–${starts[8]}s; final word ${lastWordEndSeconds}s.`);
```

Run:

```bash
node scripts/build-transcript-meta.mjs
```

Expected: output starts with `Built 9 measured beats; Future`, contains numeric Future boundaries, and reports a numeric final-word time no greater than 149.50 seconds.

Update the fallback beat contract in `scripts/build-provisional-transcript.mjs` to:

```js
const beats = [
  { paragraphCount: 2, start: 0, end: 19.4 },
  { paragraphCount: 1, start: 19.4, end: 36.04 },
  { paragraphCount: 1, start: 36.04, end: 48.84 },
  { paragraphCount: 1, start: 48.84, end: 58.68 },
  { paragraphCount: 1, start: 58.68, end: 72.44 },
  { paragraphCount: 1, start: 72.44, end: 92.12 },
  { paragraphCount: 1, start: 92.12, end: 108.7 },
  { paragraphCount: 1, start: 108.7, end: 140 },
  { paragraphCount: 2, start: 140, end: 149.5 },
];
```

Change its provisional timing source to `proportional alignment to the 149.5-second editorial target`; the measured `build-transcript-meta.mjs` output remains authoritative.

- [ ] **Step 6: Run the verifier until the measured pipeline passes**

```bash
node scripts/verify-transcript.mjs
```

Expected: output starts with `Verified 360 words`, reports a positive integer cue count, and reports a final-word time no greater than 149.50 seconds.

- [ ] **Step 7: Commit the narration pipeline**

```bash
git add video/parking-anything-build-week/narration.wav video/parking-anything-build-week/transcript.json video/parking-anything-build-week/transcript.meta.json video/parking-anything-build-week/captions.json video/parking-anything-build-week/captions.js video/parking-anything-build-week/scripts/build-provisional-transcript.mjs video/parking-anything-build-week/scripts/build-transcript-meta.mjs video/parking-anything-build-week/scripts/verify-transcript.mjs
git commit -m "feat: add timed Future narration"
```

### Task 3: Add the ninth scene with test-first composition boundaries

**Files:**
- Modify: `video/parking-anything-build-week/scripts/static-check.mjs`
- Modify: `video/parking-anything-build-week/index.html`
- Modify: `video/parking-anything-build-week/styles.css`

- [ ] **Step 1: Change static verification first so the 120-second composition fails**

Update the main composition contract:

```js
const compositions = [
  { file: "index.html", id: "parking-anything-main", duration: "150", scenes: 9 },
  { file: "../parking-anything-teaser/index.html", id: "parking-anything-teaser", duration: "20", scenes: 4 },
];
```

Inside the composition loop, add:

```js
if (composition.id === "parking-anything-main") {
  const future = document.querySelector("#scene-8");
  if (!future) errors.push("index.html: missing Future scene");
  if (!future?.textContent.includes("FUTURE · NOT YET BUILT")) errors.push("index.html: persistent Future disclosure missing");
  for (const label of ["TRIP", "BOOK", "GEAR", "SIDE PROJECT", "PERSONAL LOT", "GATHER"]) {
    if (!future?.textContent.includes(label)) errors.push(`index.html: Future label ${label} missing`);
  }
  if (future?.querySelector("button, input, select, textarea, a[href]")) errors.push("index.html: Future scene must not fabricate interactive UI");
  if (source.includes('enter("#s8-disclosure"')) errors.push("index.html: Future disclosure must not fade in after the scene starts");
  if (document.querySelector("#scene-9")?.getAttribute("aria-label") !== "Parking Anything closing thesis") {
    errors.push("index.html: closing thesis must be scene 9");
  }
}
```

Change the success message to `Static composition checks passed for 150-second main film and 20-second teaser.`

- [ ] **Step 2: Run the static check and verify RED**

```bash
cd video/parking-anything-build-week
node scripts/static-check.mjs
```

Expected: FAIL for the `120` duration, eight scenes, missing Future labels, and missing scene 9.

- [ ] **Step 3: Insert the conceptual Future scene and rename the close**

Set the main root to `data-duration="150"` and the audio `data-duration` to the measured `audioDurationSeconds`. Insert this semantic structure after scene 7:

```html
<section data-hf-id="hf-f800" id="scene-8" class="scene asphalt future-scene" aria-label="Future vision, not yet built">
  <div data-hf-id="hf-f801" id="s8-grid" class="future-grid" data-layout-ignore=""></div>
  <div data-hf-id="hf-f802" id="s8-disclosure" class="future-disclosure">FUTURE · NOT YET BUILT</div>
  <div data-hf-id="hf-f803" class="scene-content future-content">
    <p data-hf-id="hf-f804" id="s8-eyebrow" class="eyebrow">The road ahead</p>
    <h2 data-hf-id="hf-f805" id="s8-title" class="headline compact">Park more than tools. Gather beyond the screen.</h2>
    <div data-hf-id="hf-f806" id="s8-bays" class="future-bays">
      <div data-hf-id="hf-f807" class="future-bay">TRIP</div>
      <div data-hf-id="hf-f808" class="future-bay">BOOK</div>
      <div data-hf-id="hf-f809" class="future-bay">GEAR</div>
      <div data-hf-id="hf-f810" class="future-bay">SIDE PROJECT</div>
    </div>
    <div data-hf-id="hf-f811" id="s8-lots" class="personal-lots" aria-label="Separate conceptual personal lots">
      <div data-hf-id="hf-f812" class="personal-lot">PERSONAL LOT</div>
      <div data-hf-id="hf-f813" class="personal-lot">PERSONAL LOT</div>
      <div data-hf-id="hf-f814" class="personal-lot">PERSONAL LOT</div>
    </div>
    <div data-hf-id="hf-f815" id="s8-gather" class="gather-plaza">GATHER<span data-hf-id="hf-f816">COMPARE · TEST · MEET</span></div>
  </div>
  <svg data-hf-id="hf-f817" class="route-svg future-routes" viewBox="0 0 1920 1080" aria-hidden="true">
    <path data-hf-id="hf-f818" id="s8-route-a" class="route-path" d="M180 900 H620 V690 H960" />
    <path data-hf-id="hf-f819" id="s8-route-b" class="route-path" d="M960 960 V690" />
    <path data-hf-id="hf-f820" id="s8-route-c" class="route-path" d="M1740 900 H1300 V690 H960" />
  </svg>
  <img data-hf-id="hf-f821" id="s8-car-a" class="car-img future-car future-car-a" src="capture/assets/cars/quick-spin.png" alt="">
  <img data-hf-id="hf-f822" id="s8-car-b" class="car-img future-car future-car-b" src="capture/assets/cars/weekend-project.png" alt="">
  <img data-hf-id="hf-f823" id="s8-car-c" class="car-img future-car future-car-c" src="capture/assets/cars/focused-session.png" alt="">
</section>
```

Rename the current `scene-8` closing scene and every `s8-*` closing selector to `scene-9` / `s9-*`. Add `transition-8`; retain `transition-7` between scenes 7 and 8.

- [ ] **Step 4: Add bounded Future layout styles**

Add focused classes to `styles.css`:

```css
.future-scene { color: #fff; }
.future-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.12) 3px, transparent 3px), linear-gradient(90deg, rgba(255,255,255,.12) 3px, transparent 3px); background-size: 150px 150px; }
.future-disclosure { position: absolute; z-index: 80; top: 34px; right: 46px; border: 3px solid #171918; background: #f2c94c; color: #171918; padding: 13px 20px; font-size: 23px; font-weight: 900; letter-spacing: .12em; }
.future-content { justify-content: flex-start; padding-top: 110px; }
.future-bays { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; width: 100%; }
.future-bay { min-height: 112px; border: 4px solid #f7f7f2; display: grid; place-items: center; background: rgba(23,25,24,.78); color: #f2c94c; font-size: 30px; font-weight: 900; }
.personal-lots { position: absolute; left: 110px; right: 110px; bottom: 90px; display: flex; justify-content: space-between; }
.personal-lot { width: 280px; border: 3px solid #f7f7f2; padding: 18px; color: #f7f7f2; font-weight: 900; text-align: center; }
.gather-plaza { position: absolute; left: 50%; bottom: 150px; width: 280px; height: 280px; transform: translateX(-50%); border: 12px solid #f2c94c; border-radius: 50%; display: grid; place-content: center; gap: 12px; background: #2f7d5c; font-size: 50px; font-weight: 900; text-align: center; }
.gather-plaza span { display: block; font-size: 17px; letter-spacing: .12em; }
.future-car { position: absolute; z-index: 8; width: 76px; transform-origin: center; }
.future-car-a { left: 150px; bottom: 120px; }
.future-car-b { left: 922px; bottom: 36px; }
.future-car-c { right: 150px; bottom: 120px; }
```

Adjust dimensions only if the 1920×1080 layout check finds overlap. Do not hide overflow or reduce caption size to make a failing frame pass.

- [ ] **Step 5: Retime scenes 8 and 9 from measured metadata**

Read `futureStart = beatBoundaries[7].start`, `closingStart = beatBoundaries[8].start`, and `lastWordEndSeconds` from `transcript.meta.json`. Use these exact calculations:

```js
coverTransition("#scene-7", "#scene-8", "#transition-7", futureStart - 0.41);
enter("#s8-title", futureStart + 0.32, { x: -100 }, { x: 0, duration: 0.72 });
enter("#s8-bays .future-bay", futureStart + 1.0, { y: 70 }, { y: 0, stagger: 0.12, duration: 0.55 });
enter("#s8-lots .personal-lot", futureStart + 8.0, { y: 80 }, { y: 0, stagger: 0.14, duration: 0.6 });
enter("#s8-gather", futureStart + 13.0, { scale: 0.6 }, { scale: 1, duration: 0.7 });
tl.to("#s8-route-a, #s8-route-b, #s8-route-c", { strokeDashoffset: 0, duration: 4.2, stagger: 0.18 }, futureStart + 12.2);
tl.to("#s8-car-a", { x: 770, y: -200, duration: 4.4, ease: "power2.inOut" }, futureStart + 14.0);
tl.to("#s8-car-b", { y: -260, duration: 4.0, ease: "power2.inOut" }, futureStart + 14.2);
tl.to("#s8-car-c", { x: -770, y: -200, duration: 4.4, ease: "power2.inOut" }, futureStart + 14.0);
coverTransition("#scene-8", "#scene-9", "#transition-8", closingStart - 0.41);
```

Do not animate `#s8-disclosure`; it must be visible from the first frame on which scene 8 becomes visible until transition 8 covers the scene.

Shift the existing closing animations to offsets relative to `closingStart`; preserve their choreography and move the final car during the final sentence. Start `final-wash` at `149.50` with a `0.50`-second duration so it ends exactly at 150 seconds.

- [ ] **Step 6: Run the transcript and static gates**

```bash
node scripts/verify-transcript.mjs
node scripts/static-check.mjs
```

Expected: both exit 0; static output names the 150-second main film and 20-second teaser.

- [ ] **Step 7: Commit the composition**

```bash
git add video/parking-anything-build-week/index.html video/parking-anything-build-week/styles.css video/parking-anything-build-week/scripts/static-check.mjs
git commit -m "feat: add honest Future vision chapter"
```

### Task 4: Expand layout and visual verification

**Files:**
- Modify: `video/parking-anything-build-week/scripts/layout-check.mjs`
- Modify: `video/parking-anything-build-week/scripts/capture-hero-frames.mjs`
- Regenerate: `video/parking-anything-build-week/snapshots/*.png`
- Regenerate: `video/parking-anything-build-week/snapshots/contact-sheet.jpg`

- [ ] **Step 1: Add Future and shifted-close samples to local layout checks**

Set the main capture times to:

```js
[4, 23, 39, 53, 64, 80, 98, 110, 118, 128, 138, 142, 147, 149.4]
```

Add `.future-disclosure`, `.future-bay`, `.personal-lot`, and `.gather-plaza` to the text selector list. Leave teaser times unchanged.

- [ ] **Step 2: Update reproducible hero-frame capture times**

Use the same main-film times in `capture-hero-frames.mjs`; keep the four teaser capture times and teaser destination unchanged.

- [ ] **Step 3: Run local static and Playwright layout checks**

With `python3 -m http.server 3028 --bind 127.0.0.1` running from `video/`:

```bash
node scripts/static-check.mjs
node scripts/layout-check.mjs
node scripts/capture-hero-frames.mjs
```

Expected: no broken images, console errors, canvas escapes, or text overflow. If browser launch reports sandbox `EPERM`, rerun the identical commands with the local-browser restriction lifted.

- [ ] **Step 4: Run HyperFrames validation and 30-sample inspection**

From `video/parking-anything-build-week`:

```bash
npx --yes hyperframes check
npx --yes hyperframes inspect --samples 30
npx --yes hyperframes snapshot --at 4,23,39,53,64,80,98,110,118,128,138,142,147,149.4 --no-end --output snapshots
```

Expected: check and inspect report zero errors and zero warnings. Info-level cropped screenshot zooms and opaque outgoing-scene transition coverage are acceptable only when visually confirmed as intentional.

- [ ] **Step 5: Inspect the contact sheet and correct real visual defects**

Open `snapshots/contact-sheet.jpg` and verify:

- `FUTURE · NOT YET BUILT` is fully readable at every Future sample.
- All four category bays fit without caption collision.
- Three personal lots visibly connect to the Gather plaza.
- No visual resembles a clickable future application screen.
- The closing scene begins only after the Future narration and remains readable through 149.4 seconds.

After any correction, repeat steps 3–5 rather than accepting a stale contact sheet.

- [ ] **Step 6: Commit verification code and refreshed main snapshots**

```bash
git add video/parking-anything-build-week/scripts/layout-check.mjs video/parking-anything-build-week/scripts/capture-hero-frames.mjs video/parking-anything-build-week/snapshots
git commit -m "test: verify 150-second Future film"
```

### Task 5: Document and run the complete release gate

**Files:**
- Modify: `video/parking-anything-build-week/README.md`
- Modify: `docs/build-log.md`
- Modify: `docs/superpowers/plans/2026-07-21-parking-anything-future-vision-video.md`

- [ ] **Step 1: Update production documentation with measured facts**

In `README.md`, replace the 120-second main-film references with 150 seconds, record the selected Samantha rate and measured duration, update the snapshot command to the 14 main sample times, and keep both Studio endpoints and the MP4 human-approval gate unchanged.

Append a build-log section named `2026-07-21 — 150-second Future vision chapter` containing:

- the exact selected narration rate, audio duration, final-word time, word count, and caption count;
- the persistent Future disclosure and non-interactive roadmap boundary;
- the 30-sample HyperFrames, local layout, and contact-sheet results;
- the complete repository verification result;
- confirmation that the teaser hashes match and that no MP4, deployment, API request, secret, PR, or production state changed.

- [ ] **Step 2: Verify the teaser is byte-identical**

```bash
find video/parking-anything-teaser -type f -print0 | sort -z | xargs -0 shasum -a 256 > /tmp/parking-anything-teaser.after.sha256
diff -u /tmp/parking-anything-teaser.before.sha256 /tmp/parking-anything-teaser.after.sha256
```

Expected: `diff` exits 0 with no output.

- [ ] **Step 3: Run all main-film and repository gates fresh**

```bash
cd video/parking-anything-build-week
node scripts/verify-transcript.mjs
node scripts/static-check.mjs
node scripts/layout-check.mjs
npx --yes hyperframes check
npx --yes hyperframes inspect --samples 30
cd ../..
npm run check
git diff --check
```

Expected:

- transcript verifier confirms 360 words, final word at or before 149.50 seconds, and non-overlapping captions;
- static and layout checks pass;
- HyperFrames has zero errors and zero warnings, with WCAG AA text contrast passing;
- ESLint passes, all 23 Vitest files / 213 tests pass, and Next.js production build completes with both API routes;
- `git diff --check` prints nothing.

- [ ] **Step 4: Mark every completed plan step and commit the final evidence**

```bash
git add video/parking-anything-build-week/README.md docs/build-log.md docs/superpowers/plans/2026-07-21-parking-anything-future-vision-video.md
git commit -m "docs: record Future film verification"
```

- [ ] **Step 5: Verify Studio and hand off without rendering**

Confirm `http://127.0.0.1:3027` returns HTTP 200, then hand off:

```text
http://localhost:3027/#project/parking-anything-build-week?v=4&t=108&tab=renders&rc=1
```

Do not run `hyperframes render`, FFmpeg export, upload, deployment, push, or PR creation until the user explicitly approves the updated Studio preview.
