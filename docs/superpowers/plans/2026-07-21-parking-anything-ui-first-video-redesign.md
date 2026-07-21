# Parking Anything UI-First Video Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the typography-heavy main-film visual hierarchy with a 150-second UI-first cinematic product film while preserving the approved narration, transcript, captions, timing, teaser, and factual product boundaries.

**Architecture:** Treat the current uncommitted Task 3 changes as an interrupted draft, not accepted output. Reuse only their measured nine-scene timing and structural work, then enforce the approved visual ratio of approximately 70% real product UI, 20% vehicle/road motion, and 10% typography. Reshape every shipped-product scene around one dominant real capture, reduce text to one headline and at most two evidence labels, and use vehicles/roads only for state changes. Verify the redesign with test-first static contracts, browser area checks, HyperFrames inspection, contact-sheet review, and the unchanged application test suite.

**Tech Stack:** HyperFrames HTML composition, GSAP 3.14.2, local first-party PNG captures, Node.js/JSDOM static checks, Playwright layout checks, HyperFrames CLI, Vitest, Next.js.

---

### Task 1: Replace the main-film hierarchy with UI-first scenes

**Files:**
- Modify: `video/parking-anything-build-week/scripts/static-check.mjs`
- Modify: `video/parking-anything-build-week/index.html`
- Modify: `video/parking-anything-build-week/styles.css`
- Modify: `video/parking-anything-build-week/STORYBOARD.md`

- [x] **Step 1: Record protected baselines**

Run from the worktree root:

```bash
find video/parking-anything-teaser -type f -print0 | sort -z | xargs -0 shasum -a 256 > /tmp/parking-anything-ui-first-teaser.before.sha256
shasum -a 256 video/parking-anything-build-week/narration.wav video/parking-anything-build-week/transcript.json video/parking-anything-build-week/transcript.meta.json video/parking-anything-build-week/captions.json video/parking-anything-build-week/captions.js > /tmp/parking-anything-ui-first-audio.before.sha256
```

Expected: both digest files are non-empty. The worktree contains only the interrupted draft modifications in `STORYBOARD.md`, `index.html`, `scripts/static-check.mjs`, and `styles.css`.

- [x] **Step 2: Add the UI-first static contract before changing the draft**

Keep the existing 150-second, nine-scene, eight-transition, local-asset, deterministic-timeline, and caption checks. Add this main-film contract inside the composition loop:

```js
if (composition.id === "parking-anything-main") {
  const shippedScenes = [1, 2, 3, 4, 5, 6, 7].map((number) => document.querySelector(`#scene-${number}`));
  shippedScenes.forEach((scene, index) => {
    if (!scene) {
      errors.push(`index.html: missing shipped scene ${index + 1}`);
      return;
    }
    const primaryEvidence = scene.querySelectorAll('[data-visual-role="product-primary"]');
    if (primaryEvidence.length !== 1) errors.push(`index.html: scene ${index + 1} must have exactly one product-primary region`);
    if (scene.querySelectorAll(".headline").length > 1) errors.push(`index.html: scene ${index + 1} has more than one headline`);
    if (scene.querySelectorAll('[data-visual-role="evidence-label"]').length > 2) errors.push(`index.html: scene ${index + 1} has more than two evidence labels`);
    if (scene.querySelectorAll(".stamp").length > 2) errors.push(`index.html: scene ${index + 1} has a stamp cluster larger than two`);
  });

  for (const selector of [".sign-grid", ".boundary-sign", ".ghost-word"]) {
    if (document.querySelector(selector)) errors.push(`index.html: rejected typography-wall selector remains: ${selector}`);
  }

  for (const element of document.querySelectorAll("#parking-anything-main .car-wrap, #parking-anything-main .future-car, #parking-anything-main .route-svg")) {
    if (!element.hasAttribute("data-motion-purpose")) errors.push(`index.html: ${element.id || element.className} lacks data-motion-purpose`);
  }

  const future = document.querySelector("#scene-8");
  if (!future?.querySelector('[data-visual-role="future-source"]')) errors.push("index.html: Future scene must begin from real disabled-control evidence");
  if (!future?.querySelector('[data-visual-role="future-roadmap"]')) errors.push("index.html: Future scene needs one minimal roadmap");
  if (!future?.textContent.includes("FUTURE · NOT YET BUILT")) errors.push("index.html: persistent Future disclosure missing");
  if (future?.querySelector("button, input, select, textarea, a[href]")) errors.push("index.html: Future scene must not fabricate interactive UI");
  if (source.includes('enter("#s8-disclosure"')) errors.push("index.html: Future disclosure must not animate in late");
}
```

Run:

```bash
cd video/parking-anything-build-week
node scripts/static-check.mjs
```

Expected RED: the interrupted draft fails for missing `product-primary` regions, rejected sign/ghost selectors, excessive stamps, missing motion-purpose attributes, or missing real Future source evidence.

- [x] **Step 3: Rebuild scenes 1–7 around the exact capture matrix**

Keep the existing narration-driven scene boundaries and factual assets. Each scene receives exactly one wrapper with `data-visual-role="product-primary"`; a purposeful two-capture comparison counts as one wrapper.

| Scene | Primary capture region | Headline | Optional evidence labels | Vehicle/road purpose |
|---|---|---|---|---|
| 1 | `scroll-000.png`, at least 62% canvas width | `Saved it. Forgot it.` | none | one car enters the product lot |
| 2 | large top crop of `scroll-000.png` showing Tool capture | `Paste. Analyze. Test.` | `GPT-5.6 prepares the ticket` | one route points into the captured result |
| 3 | one comparison wrapper containing `mixed-lot.png` and `planned-inspector.png` | `Different inputs. One lifecycle.` | `TOOL`, `IDEA` | two cars merge into one lane |
| 4 | `planned-inspector.png`, at least 58% canvas width | `Run one bounded test.` | `PLAN`, `EVIDENCE` | one car moves from Parked to Test Drive |
| 5 | one split comparison wrapper containing `garage.png` and `scrapyard.png` | `Evidence decides the destination.` | `GARAGE`, `SCRAPYARD` | two route branches terminate at the captures |
| 6 | `mixed-patrol.png`, at least 62% canvas width | `Facts and advice stay separate.` | `OBSERVED`, `GPT-5.6` | one patrol car scans without selecting an action |
| 7 | `scroll-000.png`, at least 58% canvas width | `Built by Codex. Advised by GPT-5.6.` | `23 FILES · 213 TESTS`, `BROWSER-LOCAL` | one car parks; no decorative travel loop |

Use this semantic pattern for each primary region:

```html
<div class="product-primary" data-visual-role="product-primary">
  <div class="browser-shell product-frame">
    <div class="browser-bar"><span>Parking Anything</span><span>Verified product</span></div>
    <div class="browser-shot-wrap"><img class="browser-shot" src="capture/screenshots/scroll-000.png" alt="Parking Anything product interface"></div>
  </div>
</div>
```

Use `data-visual-role="evidence-label"` only on the labels listed in the matrix. Remove ticket walls, ghost words, 2×2 sign grids, four-item stamp rows, reconstructed Patrol cards, and static decorative vehicles. Add a concise `data-motion-purpose` value to every remaining `.car-wrap` and `.route-svg`, such as `enter-product-lot`, `merge-tool-and-idea`, `branch-to-evidence-outcomes`, or `scan-without-auto-action`.

- [x] **Step 4: Rebuild scene 8 as real evidence plus one minimal roadmap**

The Future scene must use two sequential visual states inside one scene, not a card wall:

```html
<section id="scene-8" class="scene asphalt future-scene" aria-label="Future vision, not yet built">
  <div id="s8-disclosure" class="future-disclosure">FUTURE · NOT YET BUILT</div>
  <div id="s8-source" class="future-source" data-visual-role="future-source">
    <div class="browser-shell product-frame">
      <div class="browser-bar"><span>Current product</span><span>Disabled extension points</span></div>
      <div class="browser-shot-wrap"><img class="browser-shot contain" src="capture/screenshots/scroll-000.png" alt="Current disabled Future controls"></div>
    </div>
  </div>
  <div id="s8-roadmap" class="future-roadmap" data-visual-role="future-roadmap">
    <span class="road-sign">TRIP</span><span class="road-sign">BOOK</span>
    <span class="road-sign">GEAR</span><span class="road-sign">SIDE PROJECT</span>
    <div class="gather-plaza">GATHER<small>COMPARE · TEST · MEET</small></div>
  </div>
</section>
```

Add unique `data-hf-id` attributes and the existing three local cars. Roads and cars receive `data-motion-purpose="converge-private-interests-at-gather"`. Keep the disclosure small in the upper-right corner and visible for the complete `107.48–138.84s` scene; never tween its opacity.

Timeline sequence:

- `107.48–116.50s`: dominant real disabled-control capture, slow push-in.
- `116.50–120.00s`: product frame pulls back and dissolves into one road line.
- `120.00–138.43s`: minimal map occupies the canvas; small roadside signs appear, then three cars converge at Gather.
- Transition to scene 9 starts at `138.43s`.

- [x] **Step 5: Keep scene 9 as a quiet product close**

Use `scroll-000.png` as the dominant product frame and one concise closing copy block. Preserve the measured `138.84–150.00s` timing, final car move at `145.68s`, and final wash at `149.50s`. Remove any extra stamp row beyond the four lifecycle words already integrated into the route; do not add evidence labels.

- [x] **Step 6: Replace the typography-heavy CSS hierarchy**

Add or revise focused layout primitives:

```css
.ui-first-layout { display: grid; grid-template-columns: minmax(0, 0.36fr) minmax(0, 0.64fr); gap: 56px; align-items: center; }
.product-primary { position: relative; min-width: 0; min-height: 0; }
.product-primary .product-frame { width: 100%; height: min(760px, 72vh); }
.scene-copy { max-width: 600px; }
.scene-copy .headline { max-width: 600px; font-size: clamp(64px, 5.4vw, 104px); line-height: 0.94; }
.evidence-label { display: inline-flex; border-left: 8px solid #f2c94c; padding: 10px 14px; font-size: 20px; font-weight: 900; }
.future-source { position: absolute; inset: 100px 120px 120px; }
.future-roadmap { position: absolute; inset: 110px 80px 80px; opacity: 0; }
.future-disclosure { position: absolute; z-index: 85; top: 34px; right: 44px; padding: 10px 16px; background: #f2c94c; color: #171918; font-size: 18px; font-weight: 900; letter-spacing: .12em; }
.road-sign { position: absolute; border-left: 6px solid #f2c94c; padding: 8px 12px; font-size: 22px; font-weight: 900; }
.gather-plaza { position: absolute; left: 50%; top: 52%; width: 270px; height: 270px; transform: translate(-50%, -50%); border: 10px solid #f2c94c; border-radius: 50%; display: grid; place-content: center; background: #2f7d5c; text-align: center; font-size: 46px; font-weight: 900; }
.gather-plaza small { display: block; margin-top: 10px; font-size: 15px; letter-spacing: .12em; }
```

Delete unused typography-wall rules instead of overriding them invisibly. Preserve caption safe-area styles and local product palette. Do not reduce caption size, hide overflow, or blur screenshots to conceal layout problems.

- [x] **Step 7: Align the storyboard and deterministic timeline**

Update each beat's Visual and Choreography paragraphs to match the capture matrix and UI-first motion. Keep narration and exact measured headings unchanged. Preserve these transition starts:

```js
const transitions = [18.75, 35.23, 47.87, 57.59, 71.17, 90.71, 107.07, 138.43];
```

Keep the paused registered GSAP timeline, local assets, no randomness, no infinite repeat, and no fake Future interaction.

- [x] **Step 8: Run GREEN checks and commit**

```bash
node scripts/verify-transcript.mjs
node scripts/static-check.mjs
git diff --check
```

Expected: transcript verifier reports 362 words / 60 cues / final word 149.2s; static check reports the 150-second main and 20-second teaser with no UI-first contract errors.

Verify protected files remain byte-identical:

```bash
shasum -a 256 video/parking-anything-build-week/narration.wav video/parking-anything-build-week/transcript.json video/parking-anything-build-week/transcript.meta.json video/parking-anything-build-week/captions.json video/parking-anything-build-week/captions.js > /tmp/parking-anything-ui-first-audio.after-task1.sha256
diff -u /tmp/parking-anything-ui-first-audio.before.sha256 /tmp/parking-anything-ui-first-audio.after-task1.sha256
```

Expected: no diff.

Commit:

```bash
git add video/parking-anything-build-week/index.html video/parking-anything-build-week/styles.css video/parking-anything-build-week/STORYBOARD.md video/parking-anything-build-week/scripts/static-check.mjs
git commit -m "feat: redesign Build Week film around product UI"
```

### Task 2: Visual QA, documentation, and Studio handoff

**Files:**
- Modify: `video/parking-anything-build-week/index.html`
- Modify: `video/parking-anything-build-week/styles.css`
- Modify: `video/parking-anything-build-week/scripts/static-check.mjs`
- Modify: `video/parking-anything-build-week/scripts/layout-check.mjs`
- Modify: `video/parking-anything-build-week/scripts/capture-hero-frames.mjs`
- Add: `video/parking-anything-build-week/scripts/capture-hero-frames-contract.mjs`
- Add: `video/parking-anything-build-week/scripts/capture-hero-frames.test.mjs`
- Add: `video/parking-anything-build-week/scripts/capture-hero-frames.integration.mjs`
- Regenerate: `video/parking-anything-build-week/snapshots/*.png`
- Regenerate: `video/parking-anything-build-week/snapshots/contact-sheet.jpg`
- Modify: `video/parking-anything-build-week/README.md`
- Modify: `docs/build-log.md`
- Modify: `docs/superpowers/plans/2026-07-21-parking-anything-ui-first-video-redesign.md`

- [x] **Step 1: Add browser-verifiable UI-first area checks**

Use main sample times:

```js
[4, 23, 39, 53, 64, 80, 98, 110, 118, 128, 138, 142, 147, 149.4]
```

At each visible shipped-product sample, find `[data-visual-role="product-primary"]`, sum the visible region rectangles, and require the union area to cover at least 45% of the 1920×1080 canvas. The 45% automated floor allows browser chrome and negative space while enforcing the design's approximately half-canvas requirement. Report the measured percentage in failures.

Add `.evidence-label`, `.future-disclosure`, `.road-sign`, and `.gather-plaza` to text-overflow selectors. Require the Future disclosure to be visible at 110, 118, 128, and 138 seconds. Leave teaser sample times unchanged.

- [x] **Step 2: Update reproducible capture times and run local checks**

Use the same 14 main sample times in `capture-hero-frames.mjs`. Generate only canonical main artifacts; do not read or write the protected teaser capture tree.

With `python3 -m http.server 3028 --bind 127.0.0.1` running from `video/`, run:

```bash
node scripts/static-check.mjs
node scripts/layout-check.mjs
node scripts/capture-hero-frames.mjs
```

Expected: no broken images, console errors, canvas escapes, text overflow, missing Future disclosure, or undersized primary UI regions.

- [x] **Step 3: Run HyperFrames and generate the review contact sheet**

```bash
npx --yes hyperframes check
npx --yes hyperframes inspect --samples 30
npx --yes hyperframes snapshot --at 4,23,39,53,64,80,98,110,118,128,138,138.4,142,147,149.4 --no-end --output /private/tmp/parking-anything-hf-review
```

Expected: zero errors and zero warnings; intentional screenshot crop or transition coverage may remain info-level only.

The HyperFrames output is temporary renderer evidence. `capture-hero-frames.mjs` is the canonical generator for the 14 indexed committed frames and singular contact sheet.

- [x] **Step 4: Visually inspect and correct only demonstrated defects**

Open `snapshots/contact-sheet.jpg` and reject the result if any condition is true:

- a scene reads as a text slide before it reads as a product demonstration;
- a real product capture is a small decorative thumbnail;
- more than one headline or two evidence labels are visible;
- the same card/stamp/grid layout repeats across adjacent scenes;
- a car is static without explaining entry, merge, branch, scan, park, or convergence;
- Future becomes a fake application screen or the disclosure is missing;
- captions collide with product evidence or become the primary visual hierarchy.

Fix only observed failures in `index.html` or `styles.css`, then rerun steps 2–4 and regenerate the contact sheet.

- [x] **Step 5: Update documentation and verify protected assets**

Update `README.md` to state 150 seconds, 149.2445-second audio, 362 words, 60 cues, 14 snapshot times, and the UI-first review contract. Append `2026-07-21 — UI-first film redesign` to `docs/build-log.md` with the rejected typography-wall issue, capture/vehicle/text ratio, exact visual checks, and no-export boundary.

Verify teaser and audio artifacts:

```bash
find video/parking-anything-teaser -type f -print0 | sort -z | xargs -0 shasum -a 256 > /tmp/parking-anything-ui-first-teaser.after.sha256
diff -u /tmp/parking-anything-ui-first-teaser.before.sha256 /tmp/parking-anything-ui-first-teaser.after.sha256
shasum -a 256 video/parking-anything-build-week/narration.wav video/parking-anything-build-week/transcript.json video/parking-anything-build-week/transcript.meta.json video/parking-anything-build-week/captions.json video/parking-anything-build-week/captions.js > /tmp/parking-anything-ui-first-audio.after-task2.sha256
diff -u /tmp/parking-anything-ui-first-audio.before.sha256 /tmp/parking-anything-ui-first-audio.after-task2.sha256
```

Expected: both diffs have no output.

- [x] **Step 6: Run the complete release gate**

```bash
cd video/parking-anything-build-week
node --test scripts/transcript-contract.test.mjs
node scripts/verify-transcript.mjs
node scripts/static-check.mjs
node scripts/layout-check.mjs
node --test scripts/capture-hero-frames.integration.mjs
npx --yes hyperframes check
npx --yes hyperframes inspect --samples 30
cd ../..
npm run check
git diff --check
```

Expected: 7 transcript contract fixtures pass; artifact verifier reports 362 words/60 cues/final 149.2s; the standalone capture integration contract passes two-run artifact and teaser-tree hashes; static/layout/HyperFrames checks pass; ESLint, 25 Vitest files / 216 tests, TypeScript, and Next.js production build pass.

- [x] **Step 7: Complete the plan, commit evidence, and hand off Studio**

Mark all plan checkboxes complete. Commit:

```bash
git add video/parking-anything-build-week/index.html video/parking-anything-build-week/styles.css video/parking-anything-build-week/scripts/static-check.mjs video/parking-anything-build-week/scripts/layout-check.mjs video/parking-anything-build-week/scripts/capture-hero-frames.mjs video/parking-anything-build-week/scripts/capture-hero-frames-contract.mjs video/parking-anything-build-week/scripts/capture-hero-frames.test.mjs video/parking-anything-build-week/scripts/capture-hero-frames.integration.mjs video/parking-anything-build-week/snapshots video/parking-anything-build-week/README.md docs/build-log.md docs/superpowers/plans/2026-07-21-parking-anything-ui-first-video-redesign.md
git commit -m "test: verify UI-first Build Week film"
```

Confirm `http://127.0.0.1:3027` returns HTTP 200 and hand off:

```text
http://localhost:3027/#project/parking-anything-build-week?v=5&t=0&tab=renders&rc=1
```

Do not render MP4, alter product runtime, deploy, push, or create a PR without explicit user approval after Studio review.
