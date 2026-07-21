# Parking Anything Brand Intro Overlay Design

> Status: approach A approved; pending written-spec review
> Date: 2026-07-21
> Scope: main 150-second Build Week film only

## Objective

Make `Parking Anything` unmistakable at the start of the product film without reopening the approved edit. Add one short branded overlay above the existing opening, then reveal the current `Saved it. Forgot it.` hook. The total duration, narration, captions, scene boundaries, Future chapter, closing, and teaser remain unchanged.

## Chosen Approach

Use a `0.00–2.80s` brand overlay inside the existing first scene. This is an overlay, not a new scene and not a three-second prepend. The original Scene 1 continues to run underneath it on the existing timeline.

The overlay contains only two text tiers:

- `PARKING ANYTHING`
- `DECIDE WHAT DESERVES YOUR TIME`

No third tagline, feature list, badge cluster, logo animation, new voice line, music cue, or sound effect is added. The brand treatment uses the existing asphalt, white, and safety-yellow visual system so it reads as part of the film rather than a separate title template.

## Timing and Motion

- `0.00–0.18s`: dark asphalt field is present immediately; the existing narration begins at its current `0.00s` position underneath the overlay.
- `0.18–0.70s`: `PARKING ANYTHING` enters with one restrained position-and-opacity move.
- `0.55–1.10s`: `DECIDE WHAT DESERVES YOUR TIME` appears as the smaller supporting line.
- `1.10–2.25s`: both tiers hold long enough to identify the product.
- `2.25–2.80s`: one short safety-yellow route/wipe removes the overlay and reveals the already-running `Saved it. Forgot it.` opening.
- `2.80s onward`: the approved film continues without timing or content changes.

The overlay may use a faint parking-grid or route accent, but it may not introduce another information panel or obscure the caption safe area. The first caption remains visible and subordinate at the bottom of the frame.

## Timeline Invariants

The implementation must not change any of the following:

- Main composition duration: exactly `150s`.
- Narration file, measured duration (`149.2445s`), hash, volume, or start time.
- Transcript text, 60 caption cues, or caption timing.
- Existing nine scene boundaries and transition starts.
- Any scene after the opening overlay, including the full Future chapter and closing.
- The separate 20-second teaser.

The current opening headline and product UI remain in the DOM and on their existing animation timeline. The new layer only covers them briefly with a higher visual stacking order; it does not replace, delay, or retime them.

## Audio Handling

The source already contains the complete narration track and the Studio exposes it as the main narration track. The brand overlay adds no audio changes.

Audio QA distinguishes two claims:

1. **Source integrity:** confirm the `<audio>` source, timing metadata, file hash, URL response, and Studio mute state are unchanged.
2. **Audible playback:** verify through the user's actual speakers after reopening or resuming Studio playback. HyperFrames routes preview sound through Web Audio and may mute the native `<audio>` element while transport owns playback, so that element state alone is not evidence that the track is missing.

If Studio is still silent after the visual change, diagnose preview transport or system output separately. Do not regenerate or retime narration as a first response.

## Implementation Boundary

Expected implementation files are limited to the main composition and its focused checks:

- `video/parking-anything-build-week/index.html`
- `video/parking-anything-build-week/styles.css`
- existing static or layout checks only where needed to enforce the intro contract

The implementation should add one non-interactive intro container, its existing-palette styling, and a deterministic GSAP exit. No package, asset, capture, narration, caption, Future, or teaser change is expected.

Studio can automatically add `data-hf-id` attributes while previewing. Those mechanical preview edits are not part of this design and must not be mixed into the intro change.

## Verification

- Static checks assert the exact brand title and thesis, one intro overlay, and unchanged duration/audio metadata.
- Targeted browser frames at approximately `0.4s`, `1.2s`, `2.4s`, and `2.9s` verify entry, hold, wipe, and full reveal of the original Scene 1.
- Layout inspection confirms both title tiers fit the 1920×1080 frame and preserve the caption safe area.
- Existing film tests and HyperFrames lint/inspect continue to pass without changing the established later-scene evidence set.
- Studio shows the narration track, its URL loads successfully, the player is not set to mute, and the user confirms whether output is audible on the active device.

## Acceptance Criteria

- `PARKING ANYTHING` is clearly readable within the first second.
- The approved product thesis is visible by `1.10s`.
- The original `Saved it. Forgot it.` opening is fully visible by `2.80s`.
- No more than two brand text tiers are visible in the overlay.
- The first caption remains readable and unobstructed.
- The main film remains exactly 150 seconds, with identical narration, captions, scene timing, Future chapter, closing, and teaser.
- No new narration, music, sound effect, image asset, or fabricated product UI is introduced.
- Audio source integrity is verified separately from device-level audibility.
