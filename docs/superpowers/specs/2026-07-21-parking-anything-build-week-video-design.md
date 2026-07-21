# Parking Anything Build Week Video Design

> Status: approved direction; pending written-spec review
> Date: 2026-07-21
> Audience: OpenAI Build Week judges

## Objective

Create a two-minute-thirty-second landscape product story and a twenty-second teaser from one HyperFrames source package. The film must first prove that Parking Anything is a working decision system, not a bookmark manager, then use a clearly labeled future-vision chapter to show how the same metaphor can expand without presenting roadmap concepts as shipped functionality.

## Chosen Approach

Use a hybrid product-story format: real v0.5 UI captures provide evidence, while kinetic typography, top-down vehicles, road markings, camera crops, and narrated transitions create pace. The 150-second film is the source of truth. Its first 109 seconds remain grounded in the verified v0.5 product; an approximately 31-second future-vision chapter follows; the remaining time returns to the existing product thesis. The teaser stays unchanged and reuses the opening, lifecycle montage, Manager Patrol proof point, and final brand card.

## Narrative

The story begins with the cost of collecting tools and ideas without acting on them. Parking Anything converts each saved item into a Parkable, gives it one bounded test, then asks for evidence before it earns Garage space or a reason before it goes to the Scrapyard. Manager Patrol closes the loop by surfacing stale items while separating deterministic observed facts from GPT-5.6 recommendations. The user remains the decision-maker.

After the verified build/runtime boundary, the parking grid expands into an explicitly speculative road ahead. More kinds of personal commitments can become Parkables, and a future Gather concept can move selected interests from private evaluation toward an in-person meetup. The film then returns to the existing closing thesis: Parking Anything exists to help people decide what deserves their time.

## Future Vision Chapter

The chapter begins at approximately `108.70s` and sits before the existing closing scene. Its 75-word narration is expected to occupy about 31 seconds at the established Samantha pace, placing the closing transition near `140s`. Exact internal boundaries will follow the regenerated word-level transcript; only the total 150-second composition is fixed.

The opening shot begins with the existing disabled `Park whatever · Future` and `Gather · Future` controls. The current parking grid widens into abstract labeled bays such as `TRIP`, `BOOK`, `GEAR`, and `SIDE PROJECT`; these are kinetic category signs, not a fabricated application screen. Several separate personal lots then connect by yellow roads to a circular `GATHER` plaza where cars compare notes, test together, and meet in person. The road folds back into the existing final yellow route so the speculative chapter resolves into the proven product thesis.

`FUTURE · NOT YET BUILT` remains visible throughout the entire chapter. No pointer clicks, loading state, success state, account flow, matching algorithm, notification, cloud synchronization, or interactive meetup interface is shown. The motion communicates possibility while the label and narration preserve the implementation boundary.

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

## Deliverables

- `video/parking-anything-build-week/index.html`: 150-second main composition.
- `video/parking-anything-teaser/index.html`: separate 20-second teaser composition.
- `DESIGN.md`, `SCRIPT.md`, and `STORYBOARD.md` as production sources.
- Narration audio and word-level transcript when HyperFrames CLI execution is approved.
- Zero-error HyperFrames lint and validation, layout inspection, and a Studio URL before any MP4 render.

## Visual and Audio Direction

Use the product's paper, asphalt, safety-yellow, garage-green, and scrapyard-red palette. The future chapter remains visually continuous with the product film rather than adopting generic futuristic imagery. The Studio source is narration-only so visual review is not coupled to an unapproved music license; a restrained low mechanical pulse, soft indicator clicks, and one ignition-like transition are reserved for the post-approval export pass. The default narration is concise American English for Build Week judges; synchronized captions carry the same English copy. Re-record the complete Samantha narration at the slowest intelligible rate in the narrow `140–142 wpm` range that places the final word no later than `149.50s`, preserving at least a half-second end hold.

## Acceptance Criteria

- The main composition is exactly 150 seconds and remains below the Build Week three-minute submission limit; the teaser remains exactly 20 seconds.
- The regenerated main narration ends no later than 149.50 seconds; no sentence is time-compressed independently from the rest of the voiceover.
- Every scene has an entrance and every scene transition is explicit.
- Product screenshots remain legible at 1920×1080.
- The film names the problem, demonstrates the unified lifecycle, proves the AI boundary, and ends with a clear product thesis.
- The film explicitly distinguishes Codex's build/test role from GPT-5.6's advisory runtime role and shows build-log evidence.
- The complete future chapter displays `FUTURE · NOT YET BUILT`, starts from genuinely disabled controls, contains no fabricated interactive UI, and makes no present-tense claim about roadmap functionality.
- The future sequence communicates both expansion dimensions: more things can become Parkables, and selected private interests can eventually lead to real-world Gather meetups.
- Both versions reuse the same design system and assets without contradicting each other.
