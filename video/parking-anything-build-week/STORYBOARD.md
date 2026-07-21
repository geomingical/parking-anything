# Parking Anything — Build Week Storyboard

**Format:** 1920×1080, 30 fps, landscape
**Studio audio:** HyperFrames-aligned voiceover only; synchronized English captions remain visible with sound off
**Post-approval export audio:** restrained mechanical underscore + sparse interface SFX, added only after a licensed/local source is approved
**VO direction:** American female voice, calm and decisive, product-builder register; conversational contractions, visible pauses after short thesis lines, never breathless
**Style basis:** `DESIGN.md`
**Main duration:** 150 seconds
**Measured audio:** 149.2445 seconds; final spoken word ends at 149.20 seconds
**Measured beat boundaries:** 0.12, 19.16, 35.64, 48.28, 58.00, 71.58, 91.12, 107.48, 138.84, 149.20 seconds; Scene 1 remains visible from composition time 0
**Teaser duration:** 20 seconds

## Global Direction

The film behaves like a clean municipal wayfinding system coming alive. Paper-white editorial scenes establish the argument; asphalt scenes carry product motion; safety yellow guides attention; garage green and scrapyard red communicate decisions. Every beat has a clear foreground, product-evidence midground, and moving road-grid background. No abstract AI particles, neon gradients, glass cards, or invented interfaces.

Transitions are physical: a road stripe draws across the frame, a parking gate closes, or a browser frame drives past camera. The outgoing beat remains fully visible until the transition layer covers it; there are no pre-transition exit fades. Every new beat enters with distinct movement. The final beat alone may fade to ink.

Export-pass sound design: low, warm mechanical pulse at roughly 92 BPM, soft rubber-and-asphalt texture, and a restrained sustained pad. It rises at the first Test Drive, drops underneath the responsible-AI statement, and resolves with one clean parking-meter chime. Interface clicks and a quiet ignition accent reinforce actions without becoming literal car advertising. These elements are intentionally absent from the Studio source until the user approves the visual cut and a licensed/local audio source.

## Asset Audit

| Asset | Type | Assign to Beat | Role |
| --- | --- | --- | --- |
| `capture/screenshots/scroll-000.png` | Product screenshot | 1, 9 | Recognizable full product surface and brand bookends |
| `capture/screenshots/mixed-lot.png` | Product screenshot | 3, 4 | Unified Tool and Idea proof |
| `capture/screenshots/planned-inspector.png` | Product screenshot | 3, 4 | Planning and evidence workflow |
| `capture/screenshots/garage.png` | Product screenshot | 5 | Evidence-backed adoption destination |
| `capture/screenshots/scrapyard.png` | Product screenshot | 5 | Deliberate-exit destination |
| `capture/screenshots/mixed-patrol.png` | Product screenshot | 6 | Observed Fact versus GPT-5.6 Recommendation |
| `capture/assets/cars/quick-spin.png` | Transparent vehicle | 1–9 | Primary Parkable moving through the lifecycle |
| `capture/assets/cars/focused-session.png` | Transparent vehicle | 2, 4, 6 | Second effort tier and supporting depth |
| `capture/assets/cars/weekend-project.png` | Transparent vehicle | 3, 5, 7 | Third effort tier and supporting depth |
| Typographic `Parking Anything` wordmark | Brand mark | 1, 9 | Opening and closing identity; no separate logo exists |

All six captured product states and all three vehicle assets appear. The full product surface opens and closes the film.

## Main Film

### BEAT 1 — THE BACKLOG BECOMES A LOT (0.00–19.40s)

**VO:** “Saving a new tool feels productive. So does writing down a good idea. But weeks later, the links are still untouched, the ideas are still vague, and collecting has quietly replaced deciding. Parking Anything turns that backlog into a decision system. Stop collecting. Start test-driving.”

**Concept:** The viewer begins above a vast parking lot filled with anonymous saved items. The collection initially feels orderly, then the camera reveals that every bay is occupied and nothing is moving. One yellow route line breaks the grid and leads into the real product.

**Visual:** The real `scroll-000.png` product capture occupies more than 62% of the canvas and is the first sustained focal point. A compact “Saved it. Forgot it.” headline sits above the interface while one yellow route and one quick-spin car connect the backlog metaphor directly to the visible product lot. There are no evidence labels or decorative text walls.

**Mood:** Editorial opening credits crossed with public-wayfinding graphics; tense but not dystopian.

**Assets:** `scroll-000.png`, all three car PNGs, typographic wordmark.

**Techniques:** Deterministic Canvas 2D parking-grid drift; per-word kinetic typography; SVG route-line drawing; shallow CSS 3D browser-frame settle.

**Choreography:** The headline enters first, the large product frame settles into its hero position, and the yellow route draws toward it. One car enters from off-canvas and parks beside the product lot while the screenshot receives only a restrained slow push.

**Transition:** A two-line yellow parking gate SWEEPS downward over the fully visible product frame, covering the screen before Beat 2 enters.

**Depth:** BG drifting grid and ghost text; MG backlog tickets and vehicles; FG product frame, route, and thesis.

**SFX:** Paper-ticket ticks, soft accumulation clicks, then one low ignition pulse on “Start test-driving.”

### BEAT 2 — PARK A TOOL (19.40–36.04s)

**VO:** “Paste a public tool link, and GPT-5.6 analyzes what it appears to do, proposes a usefulness hypothesis, estimates the trial effort, and gives you one concrete first task. The model prepares the ticket. It doesn't own the decision.”

**Concept:** A raw URL enters a processing lane and exits as a bounded test ticket. The transformation feels transparent and mechanical, not magical.

**Visual:** A dominant top crop of the real `scroll-000.png` capture emphasizes Tool input and the generated ticket. The only supporting copy is “Paste. Analyze. Test.” and one evidence label, “GPT-5.6 prepares the ticket.” A green route points from the paste area into the visible result.

**Mood:** Precise workshop diagram; responsible AI made legible.

**Assets:** Crop of `scroll-000.png`, `quick-spin.png`, `focused-session.png` as a distant supporting vehicle.

**Techniques:** Character-by-character URL typing; SVG connector paths; per-word label choreography; CSS 3D ticket assembly.

**Choreography:** The headline and single evidence label establish the reading order, then the product capture enters as one coherent UI object. The route draws into the result while a slow crop push keeps the Tool workflow readable; no detached field cards compete with the interface.

**Transition:** A black browser-frame edge WHIP-PANS right-to-left as an opaque transition layer; Beat 3 enters behind it.

**Depth:** BG paper grid; MG capture field and generated rows; FG car, green ownership annotation, passing browser edge.

**SFX:** Key taps, one confirmation clack, quiet servo glide.

### BEAT 3 — ONE LOT, TWO INPUTS (36.04–48.84s)

**VO:** “Ideas enter the same lot. Capture the thought in seconds, then add an effort tier and a first test task when you're ready. Tools and ideas become Parkables: different inputs, one shared lifecycle.”

**Concept:** Two lanes—Tool and Idea—merge into one parking route. The merge is the product insight, so the screen treats it as infrastructure rather than a feature list.

**Visual:** One comparison wrapper contains `mixed-lot.png` and `planned-inspector.png` as a single product-primary composition. “Different inputs. One lifecycle.” is paired only with TOOL and IDEA evidence labels while two route arms and two cars make the merge visible.

**Mood:** Transit map clarity; satisfying convergence.

**Assets:** `mixed-lot.png`, `planned-inspector.png`, `quick-spin.png`, `weekend-project.png`.

**Techniques:** SVG path drawing; MotionPath-style route animation implemented with deterministic x/y keyframes; CSS 3D screenshot tilt; kinetic merge typography.

**Choreography:** The comparison wrapper assembles from opposite sides, then the two route arms draw and the Tool and Idea cars converge on the shared center lane. The captures hold long enough to compare without a separate destination card.

**Transition:** The central dashed lane EXPANDS into an opaque paper-white stripe that covers the frame vertically; Beat 4 builds on the stripe.

**Depth:** BG junction and moving lane texture; MG screenshots; FG cars, labels, and destination marker.

**SFX:** Two indicator clicks from opposite stereo sides, resolving into one centered lock sound.

### BEAT 4 — BOUNDED TEST DRIVE (48.84–58.68s)

**VO:** “Every Parkable begins in the Parking Lot. Start a bounded Test Drive. Record what happened, attach a result, and turn curiosity into evidence.”

**Concept:** The lifecycle becomes a short, finite road—not an endless productivity system. A timer, task, and evidence slot travel with the car.

**Visual:** `planned-inspector.png` fills more than 58% of the canvas, showing plan and evidence in the real inspector. “Run one bounded test.” and the two labels PLAN and EVIDENCE form the entire copy layer. One focused-session car and a single route express Parked → Test Drive.

**Mood:** Focused pit-lane sequence; momentum with clear boundaries.

**Assets:** `planned-inspector.png`, `mixed-lot.png`, `focused-session.png`.

**Techniques:** SVG route drawing; numeric counter animation; CSS 3D screenshot push-in; staggered evidence-card choreography.

**Choreography:** The product frame enters intact, the route draws only toward Test Drive, and the car accelerates then brakes at the bounded destination. A slow inspector push emphasizes the result area without adding synthetic task or timer cards.

**Transition:** A green evidence receipt SCALES forward until its solid surface fills the frame; Beat 5 enters from its far side.

**Depth:** BG lifecycle roadway; MG inspector crop; FG moving car, timer, task, and evidence receipt.

**SFX:** Short ignition, low rolling texture, parking brake click, receipt tear.

### BEAT 5 — EVIDENCE OR EXIT (58.68–72.44s)

**VO:** “Then make a deliberate call. Evidence earns a place in the Garage. A clear reason sends the item to the Scrapyard. Nothing disappears just because an algorithm said so, and nothing reaches the Garage without proof.”

**Concept:** The road forks. Both destinations are valid decisions; the emotional contrast is not success versus failure, but proof versus release.

**Visual:** One split product-primary wrapper gives `garage.png` and `scrapyard.png` equal weight. “Evidence decides the destination.” is supported only by GARAGE and SCRAPYARD labels, while the green and red branches end directly at the corresponding real captures.

**Mood:** Deliberate courtroom clarity with vehicle-language warmth; negative results are treated as useful closure.

**Assets:** `garage.png`, `scrapyard.png`, `quick-spin.png`, `weekend-project.png`.

**Techniques:** SVG fork drawing; CSS 3D matched screenshot reveal; per-word kinetic contrast; deterministic vehicle path animation.

**Choreography:** The matched terminal captures enter from opposite sides, the fork draws from one center line, and two cars follow their evidence-owned branches until each terminates at the relevant capture. No permit card or algorithmic selection appears.

**Transition:** Green and red gate arms SWING inward together, forming a full black frame that opens onto Beat 6.

**Depth:** BG route fork; MG terminal-state screenshots; FG permits, gates, cars, and typographic verdicts.

**SFX:** Two distinct gate lifts, pen stroke on the reason, warm chime for Garage, grounded metal click for Scrapyard.

### BEAT 6 — MANAGER PATROL (72.44–92.12s)

**VO:** “When the lot starts going stale, Manager Patrol reviews up to three active Parkables that need attention. It keeps observed facts separate from GPT-5.6 recommendations, and it never changes status automatically. Review the car, plan the missing test, or take the next action yourself.”

**Concept:** The product's AI boundary becomes the centerpiece. A patrol spotlight inspects stale cars, but the screen visibly separates what the system observed from what the model recommends.

**Visual:** `mixed-patrol.png` occupies more than 62% of the frame as the scene’s sole product-primary visual. “Facts and advice stay separate.” is paired only with OBSERVED and GPT-5.6 labels. A restrained scan band crosses the real Patrol output without highlighting or choosing an action.

**Mood:** Calm operational control room; trustworthy rather than futuristic.

**Assets:** `mixed-patrol.png`, `quick-spin.png`, `focused-session.png`.

**Techniques:** Deterministic Canvas 2D spotlight sweep; CSS 3D screenshot flattening; SVG separation rule; per-word kinetic action labels.

**Choreography:** The copy and labels establish the boundary, the product frame settles straight-on, and the real screenshot slowly pushes forward. One scan passes across the Patrol surface and ends with every action still unselected.

**Transition:** The spotlight cones CONVERGE into one paper-white circle that expands beyond the frame; Beat 7 enters on paper.

**Depth:** BG patrol field and cones; MG product screenshot; FG separated labels, divider, car, and action markers.

**SFX:** Soft scan pulse, two dry label clicks, deliberate half-second music drop on “never changes status automatically”.

### BEAT 7 — CODEX BUILD · GPT-5.6 RUNTIME (92.12–108.70s)

**VO:** “Codex built and tested this bounded product: one user, browser-local persistence, no login, and collaboration honestly out of scope. Inside it, GPT-5.6 advises; deterministic rules and visible provenance stay in control.”

**Concept:** Build evidence and runtime responsibility share one frame. Codex's implementation/test role is explicit; GPT-5.6 remains advisory inside a bounded running product.

**Visual:** A crisp `scroll-000.png` product frame occupies more than 58% of the canvas. “Built by Codex. Advised by GPT-5.6.” is supported only by “23 FILES · 213 TESTS” and “BROWSER-LOCAL”; one weekend-project car parks beside the running product.

**Mood:** Engineering candor; sharp, minimal, self-assured.

**Assets:** `scroll-000.png`, `weekend-project.png`; disabled Future control crop from the same screenshot.

**Techniques:** Per-word kinetic typography; SVG signpost assembly; CSS 3D layered product crop; deterministic grid drift.

**Choreography:** The compact build/runtime statement enters, followed by the two evidence labels and the large real product capture. One car glides into a final parked position while the browser-local UI holds readable; there is no boundary-sign wall.

**Transition:** The four sign backs FLIP to asphalt and tile the screen; their seams become the opening parking grid of Beat 8.

**Depth:** BG grid and product crop; MG vehicle and disabled control; FG boundary signs and inspection stamps.

**SFX:** Four muted sign impacts, inspection stamp, steady pulse returning.

### BEAT 8 — THE ROAD AHEAD (approximately 108.70–140.00s)

**VO:** “Today, the lot holds tools and ideas. The road ahead is wider: trips, books, gear, side projects—anything asking for your time before it earns a commitment. And when a private decision becomes worth sharing, Gather could turn compatible Parkables into a real-world meetup: compare notes, test together, or meet the people behind the same curiosity. These controls are visible today, but honestly disabled. They are the road ahead—not features we're pretending already exist.”

**Concept:** The verified private decision system expands into two explicitly speculative directions: more kinds of Parkables and a path from private evaluation to an in-person Gather meetup.

**Visual:** Two sequential states share the scene. From 107.48–116.50, a slow push holds on the real `scroll-000.png` crop with disabled Future controls. From 116.50–120.00, it pulls and dissolves into a minimal road map; from 120.00–138.43, small TRIP, BOOK, GEAR, and SIDE PROJECT signs frame a GATHER plaza as three existing car PNGs converge. A small upper-right “FUTURE · NOT YET BUILT” disclosure stays visible throughout.

**Boundary:** No fabricated UI, pointer click, account flow, matching result, notification, loading state, success state, or cloud-sync behavior.

**Mood:** Honest horizon line; the product’s real boundary remains visible while the next questions widen.

**Assets:** Disabled Future control crop from `scroll-000.png`, `quick-spin.png`, `focused-session.png`, `weekend-project.png`.

**Techniques:** Deterministic Canvas 2D grid expansion; SVG route drawing; per-word kinetic typography; CSS 3D disabled-control crop.

**Choreography:** The real disabled controls hold under a slow push through 116.50. The source then pulls back and dissolves into the road by 120.00. Four small signs, three routes, and the Gather plaza enter with minimal motion; three local cars converge without clicks, controls, matching results, or fake present-day feature UI. The disclosure receives no opacity tween.

**Transition:** The circular GATHER plaza contracts into a single yellow route line; Beat 9 enters only after the line covers the full frame.

**Depth:** BG expanding parking grid; MG disabled controls and personal lots; FG labeled bays, connecting routes, persistent boundary label, and vehicles.

**SFX:** Low road-grid pulse, four restrained bay markers, no interface-confirmation sound.

### BEAT 9 — DECIDE WHAT DESERVES YOUR TIME (approximately 140.00–150.00s)

**VO:** “Parking Anything isn't another place to save everything. It's a place to decide what deserves your time. Park it. Test-drive it. Keep the evidence—or make the exit.”

**Concept:** The full product compresses into one clear choice and one memorable line. The last car completes its route and the brand becomes the final parking sign.

**Visual:** `scroll-000.png` returns as the dominant quiet close, with one concise Parking Anything statement and no lifecycle card stack. A single yellow route and quick-spin car complete the visual argument inside the existing asphalt palette.

**Mood:** Resolved product manifesto; earned confidence, not hype.

**Assets:** `scroll-000.png`, `quick-spin.png`, typographic wordmark.

**Techniques:** SVG route drawing; deterministic car path; per-word closing typography; CSS 3D product-frame settle.

**Choreography:** The product frame and concise closing copy settle from 138.84, then hold under a restrained inward push. The car makes its final move at 145.68. After the product remains readable, the final ink wash begins at 149.50.

**Transition:** Final fade to `#171918` after the wordmark and thesis hold for at least 2.5 seconds.

**Depth:** BG transforming grid; MG full product frame; FG route, moving car, lifecycle words, wordmark.

**SFX:** Four quiet route ticks, one parking stop, resolved meter chime, underscore tail.

## Teaser Cut

### TEASER 1 — SAVED IT. FORGOT IT. (0.00–3.68s)

Use Beat 1's crowded grid, ticket cascade, quick-spin car, and per-word typography. The expanded hook names the growing digital backlog; an opaque yellow gate covers the scene at 3.37 seconds.

### TEASER 2 — ONE BOUNDED TEST (3.68–7.50s)

Merge Beats 3 and 4: Tool and Idea routes join, one car accelerates into Test Driving, and “ONE BOUNDED TEST” draws along the lane. A white road stripe covers the frame at 7.19 seconds.

### TEASER 3 — GARAGE OR SCRAPYARD (7.50–12.13s)

Use Beat 5's green/red fork, evidence receipt, written reason, and two destination frames. Gate arms close over the fully visible fork at 11.82 seconds.

### TEASER 4 — AI ADVISES. YOU DECIDE. (12.13–20.00s; final word ends 18.26s)

Use the separated Patrol labels for two seconds, then return to the wordmark, quick-spin car, and “Stop collecting. Start test-driving.” Final fade begins only after a 2.2-second readable hold.

## Production Architecture

```text
video/parking-anything-build-week/
├── index.html
├── ../parking-anything-teaser/index.html
├── styles.css
├── DESIGN.md
├── SCRIPT.md
├── STORYBOARD.md
├── narration.txt
├── narration.wav
├── transcript.json
├── capture/
│   ├── screenshots/
│   ├── assets/
│   │   └── cars/
│   └── extracted/
└── renders/
```

The main and teaser remain standalone compositions so each can open directly in HyperFrames Studio. Both reuse `styles.css`, capture assets, deterministic motion helpers, and the same visual identity.
