# Parking Anything Brand Intro Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 0.00–2.80-second Parking Anything brand overlay to the existing 150-second Build Week film without changing narration, captions, scene timing, later visuals, or the teaser.

**Architecture:** Add one non-interactive overlay directly under the main composition root, above Scene 1 and below the existing caption layer. Reuse the current GSAP timeline and established asphalt/white/safety-yellow design tokens. Extend the existing static and browser-layout contracts before implementation so the intro text, timing, audio metadata, safe area, and reveal state are regression-tested.

**Tech Stack:** HyperFrames HTML composition, GSAP 3, CSS, Node.js, JSDOM, Playwright.

---

## File Structure

- Modify `video/parking-anything-build-week/scripts/static-check.mjs`: enforce one exact brand overlay, unchanged audio metadata, and exact intro choreography.
- Modify `video/parking-anything-build-week/scripts/layout-check.mjs`: sample the four approved intro moments and verify visibility, canvas fit, caption separation, and the 2.80-second reveal.
- Modify `video/parking-anything-build-week/index.html`: add the two-tier brand overlay and deterministic GSAP entrances/reveal.
- Modify `video/parking-anything-build-week/styles.css`: place the overlay above Scene 1 but below captions, using only the established design tokens.

No media, captions, transcript, storyboard, Future scene, later scene, teaser, dependency, or canonical snapshot file changes are required.

### Task 1: Add the brand intro contract and minimal overlay

**Files:**
- Modify: `video/parking-anything-build-week/scripts/static-check.mjs`
- Modify: `video/parking-anything-build-week/scripts/layout-check.mjs`
- Modify: `video/parking-anything-build-week/index.html`
- Modify: `video/parking-anything-build-week/styles.css`

- [ ] **Step 1: Write the failing static contract**

Inside the `parking-anything-main` branch in `static-check.mjs`, add these checks:

```js
const brandIntro = document.querySelector("#brand-intro");
if (document.querySelectorAll("#brand-intro").length !== 1) {
  errors.push(`${composition.file}: expected one brand intro overlay`);
}
if (brandIntro?.querySelector("#brand-intro-title")?.textContent.trim() !== "PARKING ANYTHING") {
  errors.push(`${composition.file}: brand intro title must be PARKING ANYTHING`);
}
if (brandIntro?.querySelector("#brand-intro-thesis")?.textContent.trim() !== "DECIDE WHAT DESERVES YOUR TIME") {
  errors.push(`${composition.file}: brand intro thesis mismatch`);
}
if (brandIntro?.querySelectorAll('[data-brand-tier="true"]').length !== 2) {
  errors.push(`${composition.file}: brand intro must contain exactly two text tiers`);
}
if (brandIntro?.querySelector("button, input, select, textarea, a[href]")) {
  errors.push(`${composition.file}: brand intro must remain noninteractive`);
}
for (const selector of ["#s1-copy", "#s1-product"]) {
  if (!document.querySelector(selector)?.hasAttribute("data-layout-allow-occlusion")) {
    errors.push(`${composition.file}: ${selector} must declare intentional brand-intro occlusion`);
  }
}

const narrationContract = {
  src: [narration?.getAttribute("src"), "narration.wav"],
  start: [narration?.dataset.start, "0"],
  duration: [narration?.dataset.duration, "149.2445"],
  trackIndex: [narration?.dataset.trackIndex, "0"],
  volume: [narration?.dataset.volume, "1"],
};
for (const [key, [actual, expected]] of Object.entries(narrationContract)) {
  if (actual !== expected) {
    errors.push(`${composition.file}: narration ${key} must remain ${expected}`);
  }
}

for (const timingContract of [
  'enter("#brand-intro-title", 0.18',
  'enter("#brand-intro-thesis", 0.55',
  'enter("#brand-intro-route", 0.32',
  'tl.to("#brand-intro", { xPercent: 100, duration: 0.55, ease: "power3.inOut" }, 2.25)',
  'tl.set("#brand-intro", { opacity: 0 }, 2.8)',
]) {
  if (!source.includes(timingContract)) {
    errors.push(`${composition.file}: missing brand intro choreography ${timingContract}`);
  }
}
```

- [ ] **Step 2: Write the failing layout contract**

Add `0.4`, `1.2`, `2.4`, and `2.9` to the main film's `contractTimes`. Inside the main-timeline contract evaluator, add:

```js
if ([0.4, 1.2, 2.4, 2.9].includes(time)) {
  const intro = document.querySelector("#brand-intro");
  const title = document.querySelector("#brand-intro-title");
  const thesis = document.querySelector("#brand-intro-thesis");
  if (!intro || !title || !thesis) {
    findings.push("brand intro overlay and both text tiers must exist");
  } else {
    const introOpacity = elementOpacity(intro);
    const introRect = intro.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const thesisRect = thesis.getBoundingClientRect();
    const activeCaption = [...document.querySelectorAll(".caption-line")]
      .find((element) => elementOpacity(element) > 0.05);

    if (time <= 2.4 && introOpacity <= 0.95) {
      findings.push(`brand intro must cover Scene 1 at ${time}s`);
    }
    if (time === 1.2 && (elementOpacity(title) <= 0.95 || elementOpacity(thesis) <= 0.95)) {
      findings.push("both brand tiers must be fully visible at 1.2s");
    }
    for (const [label, rect] of [["title", titleRect], ["thesis", thesisRect]]) {
      if (rect.left < 0 || rect.top < 0 || rect.right > 1920 || rect.bottom > 1080) {
        findings.push(`brand intro ${label} leaves the canvas`);
      }
    }
    if (activeCaption && thesisRect.bottom > activeCaption.getBoundingClientRect().top) {
      findings.push("brand intro thesis collides with the caption safe area");
    }
    if (time === 2.9 && introRect.left < 1919) {
      findings.push(`brand intro must be fully off-canvas by 2.9s; left=${introRect.left.toFixed(1)}`);
    }
    if (time === 2.9 && introOpacity > 0.01) {
      findings.push(`brand intro must be hidden after its reveal; opacity=${introOpacity.toFixed(3)}`);
    }
  }
}
```

At `2.9s`, also assert that `#s1-copy` and `#s1-product` each have effective opacity above `0.95`, proving the overlay reveals the existing hook rather than a blank frame.

- [ ] **Step 3: Run the checks and verify RED**

Run:

```bash
node video/parking-anything-build-week/scripts/static-check.mjs
```

Expected: FAIL with `expected one brand intro overlay`, title/thesis, and choreography messages.

Start a read-only static server if port 3028 is not already serving the worktree:

```bash
python3 -m http.server 3028 --directory video
```

Then run:

```bash
node video/parking-anything-build-week/scripts/layout-check.mjs
```

Expected: FAIL at the four intro contract times because `#brand-intro` and its two text tiers do not exist.

- [ ] **Step 4: Implement the static hero frame**

Add this overlay as a direct child of `#parking-anything-main`, immediately after the narration element and before Scene 1:

```html
<div id="brand-intro" class="brand-intro" aria-label="Parking Anything introduction">
  <div class="brand-intro-wipe" aria-hidden="true"></div>
  <div class="brand-intro-copy">
    <p id="brand-intro-title" class="brand-intro-title" data-brand-tier="true">PARKING ANYTHING</p>
    <div id="brand-intro-route" class="brand-intro-route" aria-hidden="true"></div>
    <p id="brand-intro-thesis" class="brand-intro-thesis" data-brand-tier="true">DECIDE WHAT DESERVES YOUR TIME</p>
  </div>
</div>
```

Add CSS using the existing palette values and a final-layout-first flex container:

```css
.brand-intro {
  position: absolute;
  inset: 0;
  z-index: 80;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  padding: 120px 150px 180px;
  overflow: hidden;
  background-color: #303331;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.12) 2px, transparent 2px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.12) 2px, transparent 2px);
  background-size: 190px 160px;
  color: #ffffff;
  will-change: transform;
}

.brand-intro-wipe {
  position: absolute;
  inset: 0 auto 0 0;
  width: 44px;
  background: #f2c94c;
}

.brand-intro-copy {
  display: flex;
  width: 100%;
  max-width: 1480px;
  flex-direction: column;
  gap: 28px;
}

.brand-intro-title,
.brand-intro-thesis {
  margin: 0;
  opacity: 0;
}

.brand-intro-title {
  font-size: 146px;
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 0.92;
}

.brand-intro-route {
  width: 460px;
  height: 14px;
  background: #f2c94c;
  opacity: 0;
  transform-origin: left center;
}

.brand-intro-thesis {
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 0.18em;
  line-height: 1.2;
}
```

The caption layer remains at `z-index: 90`, so the first caption stays above the intro. Do not change the caption CSS.

- [ ] **Step 5: Add the deterministic intro choreography**

Insert these calls immediately before the existing Scene 1 entrances:

```js
enter("#brand-intro-title", 0.18, { x: -64 }, { x: 0, duration: 0.52, ease: "expo.out" });
enter("#brand-intro-route", 0.32, { scaleX: 0 }, { scaleX: 1, duration: 0.68, ease: "power3.out" });
enter("#brand-intro-thesis", 0.55, { y: 28 }, { y: 0, duration: 0.55, ease: "sine.out" });
tl.to("#brand-intro", { xPercent: 100, duration: 0.55, ease: "power3.inOut" }, 2.25);
tl.set("#brand-intro", { opacity: 0 }, 2.8);
```

Add `data-layout-allow-occlusion=""` to `#s1-copy` and `#s1-product`, the two text-bearing Scene 1 regions intentionally covered by the brand overlay. Do not place the escape hatch on the entire composition or any later scene.

Do not alter the four existing Scene 1 entrances, any `coverTransition` call, root `data-duration`, narration element, captions, or later timeline statement.

- [ ] **Step 6: Run the focused checks and verify GREEN**

Run:

```bash
node video/parking-anything-build-week/scripts/static-check.mjs
node video/parking-anything-build-week/scripts/layout-check.mjs
```

Expected: both exit `0`; static output ends with `Static composition checks passed for 150-second main film and 20-second teaser.` and layout output ends with `Layout checks passed.`

- [ ] **Step 7: Commit the focused change**

Stage only the plan, two checks, HTML, and CSS; exclude any unrelated Studio-generated `data-hf-id` churn:

```bash
git add docs/superpowers/plans/2026-07-21-parking-anything-brand-intro-overlay.md \
  video/parking-anything-build-week/scripts/static-check.mjs \
  video/parking-anything-build-week/scripts/layout-check.mjs \
  video/parking-anything-build-week/index.html \
  video/parking-anything-build-week/styles.css
git diff --cached --check
git commit -m "feat: add minimal branded film opening"
```

### Task 2: Run full HyperFrames and project verification

**Files:**
- Verify only; no planned file changes.

- [ ] **Step 1: Verify source and audio integrity**

Run:

```bash
shasum -a 256 video/parking-anything-build-week/narration.wav
node video/parking-anything-build-week/scripts/static-check.mjs
```

Expected narration SHA-256: `c240002f984acce69a535eb23713c85bfb417693e0e9f1abf7118793425816ae`.

- [ ] **Step 2: Run HyperFrames checks**

From `video/parking-anything-build-week`, run:

```bash
npx hyperframes lint
npx hyperframes inspect --at 0.4,1.2,2.4,2.9,4
```

Expected: no errors. Existing accepted lint warnings may remain unchanged; do not claim they were introduced or fixed by this patch.

- [ ] **Step 3: Run regression tests**

Run:

```bash
npm test
node video/parking-anything-build-week/scripts/capture-hero-frames.integration.mjs
```

Expected: all Vitest files and capture integration pass. Canonical 14-frame evidence and teaser outputs remain byte-stable because their source times and files were not changed.

- [ ] **Step 4: Inspect Studio playback**

Open the existing Studio project at the first frame and confirm the main narration track is listed, the UI mute control is off, and playback shows the brand overlay before revealing `Saved it. Forgot it.`. Ask the user to confirm audible output on the active Mac device; do not infer audibility from the native `<audio muted>` state because HyperFrames Web Audio owns preview playback.

- [ ] **Step 5: Verify final scope**

Run:

```bash
git status --short
git show --stat --oneline HEAD
```

Expected: the feature commit contains only the approved plan, main composition HTML/CSS, and focused checks. No narration, caption, transcript, Future, later-scene, teaser, package, or snapshot file appears in the commit.
