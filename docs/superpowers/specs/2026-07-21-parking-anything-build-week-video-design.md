# Parking Anything Build Week Video Design

> Status: approved UI-first direction; pending revised written-spec review
> Date: 2026-07-21
> Audience: OpenAI Build Week judges

## Objective

Create a two-minute-thirty-second landscape product story and a twenty-second teaser from one HyperFrames source package. The film must first prove that Parking Anything is a working decision system, not a bookmark manager, then use a clearly labeled future-vision chapter to show how the same metaphor can expand without presenting roadmap concepts as shipped functionality.

## Chosen Approach

Use a UI-first cinematic product-film format. Real v0.5 captures carry the story; slow camera moves, selective crops, and restrained highlights reveal the relevant product behavior. Top-down vehicles and road markings connect states instead of decorating every frame. Typography is limited to one short headline and, when evidence requires it, one supporting label.

The visual ratio across the main film is approximately 70% real product UI, 20% vehicle/road motion, and 10% typography. The 150-second film remains the source of truth. Its first 107.48 seconds are grounded in the verified v0.5 product, the Future chapter runs from 107.48 to 138.84 seconds, and the closing occupies the remaining time. The teaser stays unchanged.

The rejected direction is a typography-led motion deck: repeated stamp clusters, four-card label walls, oversized multi-line headlines, and decorative grids competing with the product. Implementation must replace that hierarchy rather than layering more motion on top of it.

## Narrative

The story begins with the cost of collecting tools and ideas without acting on them. Parking Anything converts each saved item into a Parkable, gives it one bounded test, then asks for evidence before it earns Garage space or a reason before it goes to the Scrapyard. Manager Patrol closes the loop by surfacing stale items while separating deterministic observed facts from GPT-5.6 recommendations. The user remains the decision-maker.

After the verified build/runtime boundary, the parking grid expands into an explicitly speculative road ahead. More kinds of personal commitments can become Parkables, and a future Gather concept can move selected interests from private evaluation toward an in-person meetup. The film then returns to the existing closing thesis: Parking Anything exists to help people decide what deserves their time.

## Future Vision Chapter

The chapter occupies the measured `107.48–138.84s` interval and sits before the existing closing scene. The approved narration, transcript, and captions are already final and must not be regenerated for the visual redesign.

The opening shot is a large, readable crop of the real disabled `Park whatever · Future` and `Gather · Future` controls. The camera then pulls beyond the browser into one minimal road map. Small roadside signs—not cards or interface panels—name `TRIP`, `BOOK`, `GEAR`, and `SIDE PROJECT`. Three vehicles leave separate, lightly drawn personal lanes and converge at one circular `GATHER` plaza. The road folds into the existing final route so the speculative chapter resolves into the proven product thesis.

`FUTURE · NOT YET BUILT` remains visible as a small upper-corner disclosure throughout the entire chapter. It cannot become the main title or a large banner. No pointer clicks, loading state, success state, account flow, matching algorithm, notification, cloud synchronization, or interactive meetup interface is shown. The motion communicates possibility while the disclosure and narration preserve the implementation boundary.

Approved future narration:

> Today, the lot holds tools and ideas. The road ahead is wider: trips, books, gear, side projects—anything asking for your time before it earns a commitment. And when a private decision becomes worth sharing, Gather could turn compatible Parkables into a real-world meetup: compare notes, test together, or meet the people behind the same curiosity. These controls are visible today, but honestly disabled. They are the road ahead—not features we’re pretending already exist.

## Product Truth Boundaries

- Demonstrate v0.5 Tool and Idea capture in one shared collection.
- Present GPT-5.6 URL analysis and Manager Patrol as advisory capabilities.
- Preserve client ownership of identity, timestamps, lifecycle state, evidence, and final decisions.
- Show browser-local, single-user scope honestly.
- Keep all current-product claims grounded in verified v0.5 behavior.
- Present Gather, additional Parkable kinds, and in-person meetups only inside the persistent `FUTURE · NOT YET BUILT` chapter.
- Never suggest that the current product has automatic status changes, accounts, collaboration, notifications, cloud sync, matching, or meetup coordination.
- Do not fabricate future UI. Use category signs, parking geometry, vehicles, and roads as conceptual motion language.

## UI-First Visual System

### Product scenes

- Every shipped-product scene uses one dominant real capture or a purposeful two-capture comparison. Product evidence occupies at least half of the visible composition, excluding transitions and captions.
- Camera motion is limited to slow push-ins, lateral pans, and crop reveals that point to the narrated behavior. No capture floats as a small decorative thumbnail beside a wall of text.
- Tool capture, Idea capture, Test Drive, Garage/Scrapyard, Manager Patrol, and the build/runtime boundary each retain their current factual screenshot source.
- Manager Patrol keeps the observed-fact and GPT-5.6 recommendation separation visible inside the real UI rather than reconstructing both columns as large typographic cards.

### Typography

- A scene may contain one headline of at most eight words. Opening and closing wordmarks are the only exceptions to the size limit.
- A scene may contain at most two small evidence labels. Four-item stamp rows, two-by-two sign grids, repeated card walls, and floating keyword clouds are prohibited.
- Captions remain the detailed verbal layer. They stay in the established bottom safe area and must not compete with duplicate on-screen sentences.

### Vehicles and roads

- Vehicles enter, travel, or park to explain a state change. Static cars without narrative work are removed.
- A road line may connect UI states, reveal a before/after destination, or bridge into the next scene. It may not become a second background pattern behind an already detailed screenshot.
- Transitions use one road stripe, crop wipe, or product-frame push. Repeated full-screen gates with only color changes are reduced.

### Background and composition

- Use solid paper or asphalt fields with one faint grid only when spatial orientation requires it.
- Preserve generous negative space around the dominant capture. Do not fill empty areas with additional stamps or slogans.
- The original paper, asphalt, safety-yellow, garage-green, and scrapyard-red palette remains unchanged.

## Deliverables

- `video/parking-anything-build-week/index.html`: 150-second main composition.
- `video/parking-anything-teaser/index.html`: separate 20-second teaser composition.
- `DESIGN.md`, `SCRIPT.md`, and `STORYBOARD.md` as production sources.
- Final narration audio, word-level transcript, measured metadata, and synchronized captions.
- Zero-error HyperFrames lint and validation, layout inspection, and a Studio URL before any MP4 render.

## Visual and Audio Direction

Use the product's paper, asphalt, safety-yellow, garage-green, and scrapyard-red palette. The Future chapter remains visually continuous with the product film rather than adopting generic futuristic imagery. The Studio source remains narration-only so visual review is not coupled to an unapproved music license; licensed underscore and effects remain a later export decision.

The final narration is a 149.2445-second Samantha track with a measured final word at 149.20 seconds. Its approved whole-track tempo treatment, 362-word transcript, 60 caption cues, and nine measured beat boundaries remain unchanged during the visual redesign.

## Acceptance Criteria

- The main composition is exactly 150 seconds and remains below the Build Week three-minute submission limit; the teaser remains exactly 20 seconds.
- The final main narration remains 149.2445 seconds with its last word at 149.20 seconds; the visual redesign does not alter audio, transcript, captions, or beat metadata.
- Every scene has an entrance and every scene transition is explicit.
- Product screenshots remain legible at 1920×1080.
- In shipped-product scenes, real captures occupy at least half of the visible composition and remain the primary focal point.
- No scene contains more than one headline or two small evidence labels; opening and closing wordmarks are the only headline-size exceptions.
- Four-card label walls, two-by-two boundary-sign grids, stamp clusters larger than two items, and decorative keyword clouds do not appear.
- Every visible vehicle or road performs a clear lifecycle, transition, or Future-convergence function.
- The film names the problem, demonstrates the unified lifecycle, proves the AI boundary, and ends with a clear product thesis.
- The film explicitly distinguishes Codex's build/test role from GPT-5.6's advisory runtime role and shows build-log evidence.
- The complete future chapter displays `FUTURE · NOT YET BUILT`, starts from genuinely disabled controls, contains no fabricated interactive UI, and makes no present-tense claim about roadmap functionality.
- The Future disclosure remains small and persistent; the chapter moves from one real UI crop to one minimal road-map convergence without a typographic card wall.
- The future sequence communicates both expansion dimensions: more things can become Parkables, and selected private interests can eventually lead to real-world Gather meetups.
- Both versions reuse the same design system and assets without contradicting each other.
