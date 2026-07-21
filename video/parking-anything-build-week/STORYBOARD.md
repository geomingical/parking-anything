# Parking Anything — Build Week Storyboard

**Format:** 1920×1080, 30 fps, landscape
**Studio audio:** HyperFrames-aligned voiceover only; synchronized English captions remain visible with sound off
**Post-approval export audio:** restrained mechanical underscore + sparse interface SFX, added only after a licensed/local source is approved
**VO direction:** American female voice, calm and decisive, product-builder register; conversational contractions, visible pauses after short thesis lines, never breathless
**Style basis:** `DESIGN.md`
**Main duration:** 150 seconds
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

**Visual:** BG uses deep asphalt, fine parking lines, deterministic paper-ticket labels, and oversized ghost words “SAVED”, “LATER”, and “SOMEDAY”. MG has twelve small rectangular ticket silhouettes and three top-down cars parked at different angles. FG introduces the typographic wordmark and the real `scroll-000.png` browser frame, which settles into the center on the thesis. “Stop collecting.” stamps in black; “Start test-driving.” draws underneath in safety yellow.

**Mood:** Editorial opening credits crossed with public-wayfinding graphics; tense but not dystopian.

**Assets:** `scroll-000.png`, all three car PNGs, typographic wordmark.

**Techniques:** Deterministic Canvas 2D parking-grid drift; per-word kinetic typography; SVG route-line drawing; shallow CSS 3D browser-frame settle.

**Choreography:** Ticket labels CASCADE into bays. Cars DROP into still positions. Ghost words DRIFT beneath the grid. A yellow route DRAWS around stalled objects. The product frame RISES from the route and SETTLES. Thesis words STAMP and DRAW in sequence.

**Transition:** A two-line yellow parking gate SWEEPS downward over the fully visible product frame, covering the screen before Beat 2 enters.

**Depth:** BG drifting grid and ghost text; MG backlog tickets and vehicles; FG product frame, route, and thesis.

**SFX:** Paper-ticket ticks, soft accumulation clicks, then one low ignition pulse on “Start test-driving.”

### BEAT 2 — PARK A TOOL (19.40–36.04s)

**VO:** “Paste a public tool link, and GPT-5.6 analyzes what it appears to do, proposes a usefulness hypothesis, estimates the trial effort, and gives you one concrete first task. The model prepares the ticket. It doesn't own the decision.”

**Concept:** A raw URL enters a processing lane and exits as a bounded test ticket. The transformation feels transparent and mechanical, not magical.

**Visual:** BG returns to paper white with a faint gray road grid. MG contains a large capture field, four labeled ticket rows, and a quick-spin car parked beside the generated task. FG highlights “PUBLIC URL”, “USEFULNESS HYPOTHESIS”, “TRIAL EFFORT”, and “FIRST TEST TASK” as real interface language. A green annotation at the bottom reads “MODEL PREPARES · USER DECIDES”.

**Mood:** Precise workshop diagram; responsible AI made legible.

**Assets:** Crop of `scroll-000.png`, `quick-spin.png`, `focused-session.png` as a distant supporting vehicle.

**Techniques:** Character-by-character URL typing; SVG connector paths; per-word label choreography; CSS 3D ticket assembly.

**Choreography:** URL TYPES across the field. The yellow action block PUNCHES once. Four ticket rows SLIDE out of the input in staggered directions. The car GLIDES into its assigned bay. The responsibility annotation DRAWS as a green underline.

**Transition:** A black browser-frame edge WHIP-PANS right-to-left as an opaque transition layer; Beat 3 enters behind it.

**Depth:** BG paper grid; MG capture field and generated rows; FG car, green ownership annotation, passing browser edge.

**SFX:** Key taps, one confirmation clack, quiet servo glide.

### BEAT 3 — ONE LOT, TWO INPUTS (36.04–48.84s)

**VO:** “Ideas enter the same lot. Capture the thought in seconds, then add an effort tier and a first test task when you're ready. Tools and ideas become Parkables: different inputs, one shared lifecycle.”

**Concept:** Two lanes—Tool and Idea—merge into one parking route. The merge is the product insight, so the screen treats it as infrastructure rather than a feature list.

**Visual:** BG is an overhead Y-junction drawn in white on asphalt. MG shows `mixed-lot.png` on the left and `planned-inspector.png` on the right, each clipped into hard-edged evidence frames. Tool and Idea labels travel down separate lanes. FG uses green and red vehicles approaching the merge, with one shared “PARKABLE” destination marker in safety yellow.

**Mood:** Transit map clarity; satisfying convergence.

**Assets:** `mixed-lot.png`, `planned-inspector.png`, `quick-spin.png`, `weekend-project.png`.

**Techniques:** SVG path drawing; MotionPath-style route animation implemented with deterministic x/y keyframes; CSS 3D screenshot tilt; kinetic merge typography.

**Choreography:** The two road arms DRAW from opposite corners. Screenshot frames TILT upright. Tool and Idea labels TRACK their lanes. Two cars FOLLOW the geometry and ALIGN side by side. “PARKABLE” FILLS from black to yellow as the routes join.

**Transition:** The central dashed lane EXPANDS into an opaque paper-white stripe that covers the frame vertically; Beat 4 builds on the stripe.

**Depth:** BG junction and moving lane texture; MG screenshots; FG cars, labels, and destination marker.

**SFX:** Two indicator clicks from opposite stereo sides, resolving into one centered lock sound.

### BEAT 4 — BOUNDED TEST DRIVE (48.84–58.68s)

**VO:** “Every Parkable begins in the Parking Lot. Start a bounded Test Drive. Record what happened, attach a result, and turn curiosity into evidence.”

**Concept:** The lifecycle becomes a short, finite road—not an endless productivity system. A timer, task, and evidence slot travel with the car.

**Visual:** BG shows the four lifecycle tabs as a wide horizontal roadway. MG uses a tight crop from `planned-inspector.png` showing effort tier, first test task, notes, and result URL. FG carries the focused-session car from Parking Lot to Test Driving, followed by a yellow timer block, a white task ticket, and a green evidence receipt.

**Mood:** Focused pit-lane sequence; momentum with clear boundaries.

**Assets:** `planned-inspector.png`, `mixed-lot.png`, `focused-session.png`.

**Techniques:** SVG route drawing; numeric counter animation; CSS 3D screenshot push-in; staggered evidence-card choreography.

**Choreography:** Lifecycle tabs SLIDE into alignment. The route DRAWS only from Parking Lot to Test Driving. The car ACCELERATES, then BRAKES inside the bay. Timer COUNTS to one bounded session. Task and evidence cards CASCADE behind it. The screenshot crop PUSHES closer on “attach a result”.

**Transition:** A green evidence receipt SCALES forward until its solid surface fills the frame; Beat 5 enters from its far side.

**Depth:** BG lifecycle roadway; MG inspector crop; FG moving car, timer, task, and evidence receipt.

**SFX:** Short ignition, low rolling texture, parking brake click, receipt tear.

### BEAT 5 — EVIDENCE OR EXIT (58.68–72.44s)

**VO:** “Then make a deliberate call. Evidence earns a place in the Garage. A clear reason sends the item to the Scrapyard. Nothing disappears just because an algorithm said so, and nothing reaches the Garage without proof.”

**Concept:** The road forks. Both destinations are valid decisions; the emotional contrast is not success versus failure, but proof versus release.

**Visual:** BG is a symmetrical asphalt fork. MG places `garage.png` and `scrapyard.png` in matched evidence frames, green on the left and red on the right. FG shows one evidence receipt physically unlocking the Garage lane and one written reason opening the Scrapyard lane. Cars choose routes only after the corresponding human-owned artifact appears.

**Mood:** Deliberate courtroom clarity with vehicle-language warmth; negative results are treated as useful closure.

**Assets:** `garage.png`, `scrapyard.png`, `quick-spin.png`, `weekend-project.png`.

**Techniques:** SVG fork drawing; CSS 3D matched screenshot reveal; per-word kinetic contrast; deterministic vehicle path animation.

**Choreography:** The fork DRAWS from one center line. Evidence and reason cards DROP like permits. Green and red gates LIFT. Cars FOLLOW separate routes. “WITHOUT PROOF” STAMPS across the Garage entrance, then resolves into “EVIDENCE REQUIRED”.

**Transition:** Green and red gate arms SWING inward together, forming a full black frame that opens onto Beat 6.

**Depth:** BG route fork; MG terminal-state screenshots; FG permits, gates, cars, and typographic verdicts.

**SFX:** Two distinct gate lifts, pen stroke on the reason, warm chime for Garage, grounded metal click for Scrapyard.

### BEAT 6 — MANAGER PATROL (72.44–92.12s)

**VO:** “When the lot starts going stale, Manager Patrol reviews up to three active Parkables that need attention. It keeps observed facts separate from GPT-5.6 recommendations, and it never changes status automatically. Review the car, plan the missing test, or take the next action yourself.”

**Concept:** The product's AI boundary becomes the centerpiece. A patrol spotlight inspects stale cars, but the screen visibly separates what the system observed from what the model recommends.

**Visual:** BG uses deep asphalt with three softly sweeping spotlight cones. MG brings `mixed-patrol.png` into a flat, readable browser frame and then isolates its two columns. FG creates two large labels: gray “OBSERVED FACT” and green “GPT-5.6 RECOMMENDATION”, connected to the same car but never merged. Three action options remain clearly human-triggered.

**Mood:** Calm operational control room; trustworthy rather than futuristic.

**Assets:** `mixed-patrol.png`, `quick-spin.png`, `focused-session.png`.

**Techniques:** Deterministic Canvas 2D spotlight sweep; CSS 3D screenshot flattening; SVG separation rule; per-word kinetic action labels.

**Choreography:** Spotlights SWEEP over three bays. The product frame ROTATES from slight perspective to straight-on. The observed-fact column SLIDES from left; the recommendation column SLIDES from right. A green divider DRAWS but stops before connecting the columns. Action labels CASCADE beneath the car, waiting for a visible cursor dot to choose none of them automatically.

**Transition:** The spotlight cones CONVERGE into one paper-white circle that expands beyond the frame; Beat 7 enters on paper.

**Depth:** BG patrol field and cones; MG product screenshot; FG separated labels, divider, car, and action markers.

**SFX:** Soft scan pulse, two dry label clicks, deliberate half-second music drop on “never changes status automatically”.

### BEAT 7 — CODEX BUILD · GPT-5.6 RUNTIME (92.12–108.70s)

**VO:** “Codex built and tested this bounded product: one user, browser-local persistence, no login, and collaboration honestly out of scope. Inside it, GPT-5.6 advises; deterministic rules and visible provenance stay in control.”

**Concept:** Build evidence and runtime responsibility share one frame. Codex's implementation/test role is explicit; GPT-5.6 remains advisory inside a bounded running product.

**Visual:** BG is paper white with a slow dark grid drift. MG contains a softened crop of the running product and a parked weekend-project car. FG names “CODEX BUILT IT · GPT-5.6 ADVISES INSIDE IT”, shows a build-log proof stamp for 23 test files / 213 tests, and retains four honest boundary signs—“ONE USER”, “BROWSER-LOCAL”, “NO LOGIN”, “NO FAKE COLLABORATION”.

**Mood:** Engineering candor; sharp, minimal, self-assured.

**Assets:** `scroll-000.png`, `weekend-project.png`; disabled Future control crop from the same screenshot.

**Techniques:** Per-word kinetic typography; SVG signpost assembly; CSS 3D layered product crop; deterministic grid drift.

**Choreography:** The Codex/runtime boundary ENTERS first. Four signs STAMP into a strict two-by-two field with different directional entrances. The car GLIDES behind them and remains parked. Build-log, provenance, and rules labels DRAW as inspection stamps. The disabled Future control SLIDES past without activation.

**Transition:** The four sign backs FLIP to asphalt and tile the screen; their seams become the opening parking grid of Beat 8.

**Depth:** BG grid and product crop; MG vehicle and disabled control; FG boundary signs and inspection stamps.

**SFX:** Four muted sign impacts, inspection stamp, steady pulse returning.

### BEAT 8 — THE ROAD AHEAD (approximately 108.70–140.00s)

**VO:** “Today, the lot holds tools and ideas. The road ahead is wider: trips, books, gear, side projects—anything asking for your time before it earns a commitment. And when a private decision becomes worth sharing, Gather could turn compatible Parkables into a real-world meetup: compare notes, test together, or meet the people behind the same curiosity. These controls are visible today, but honestly disabled. They are the road ahead—not features we're pretending already exist.”

**Concept:** The verified private decision system expands into two explicitly speculative directions: more kinds of Parkables and a path from private evaluation to an in-person Gather meetup.

**Visual:** Begin from the real disabled Future controls. The parking grid expands into TRIP, BOOK, GEAR, and SIDE PROJECT bays, then separate PERSONAL LOTS connect to a circular GATHER plaza. A persistent label reads “FUTURE · NOT YET BUILT.”

**Boundary:** No fabricated UI, pointer click, account flow, matching result, notification, loading state, success state, or cloud-sync behavior.

**Mood:** Honest horizon line; the product’s real boundary remains visible while the next questions widen.

**Assets:** Disabled Future control crop from `scroll-000.png`, `quick-spin.png`, `focused-session.png`, `weekend-project.png`.

**Techniques:** Deterministic Canvas 2D grid expansion; SVG route drawing; per-word kinetic typography; CSS 3D disabled-control crop.

**Choreography:** The disabled Future controls HOLD in their real inactive state. The grid EXPANDS into four labeled bays. PERSONAL LOTS DRAW as distinct circles, then yellow routes CONNECT them to the GATHER plaza without simulating an interaction. “FUTURE · NOT YET BUILT” remains visible throughout.

**Transition:** The circular GATHER plaza contracts into a single yellow route line; Beat 9 enters only after the line covers the full frame.

**Depth:** BG expanding parking grid; MG disabled controls and personal lots; FG labeled bays, connecting routes, persistent boundary label, and vehicles.

**SFX:** Low road-grid pulse, four restrained bay markers, no interface-confirmation sound.

### BEAT 9 — DECIDE WHAT DESERVES YOUR TIME (approximately 140.00–150.00s)

**VO:** “Parking Anything isn't another place to save everything. It's a place to decide what deserves your time. Park it. Test-drive it. Keep the evidence—or make the exit.”

**Concept:** The full product compresses into one clear choice and one memorable line. The last car completes its route and the brand becomes the final parking sign.

**Visual:** BG starts as the asphalt tile grid from Beat 7, then brightens to paper. MG brings back `scroll-000.png` as a centered product frame with slow inward camera motion. FG sends the quick-spin car along a final yellow route through four labels—PARK, TEST DRIVE, EVIDENCE, DECIDE—before it stops beneath the Parking Anything wordmark and thesis.

**Mood:** Resolved product manifesto; earned confidence, not hype.

**Assets:** `scroll-000.png`, `quick-spin.png`, typographic wordmark.

**Techniques:** SVG route drawing; deterministic car path; per-word closing typography; CSS 3D product-frame settle.

**Choreography:** Grid tiles ROTATE from asphalt to paper. Product frame RISES and SETTLES. Route DRAWS while the car GLIDES through each word. “Parking Anything” BUILDS from black blocks; “Stop collecting. Start test-driving.” STAMPS below. The final scene alone FADES gently to primary ink after a full readability hold.

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
