# Parking Anything QA Checklist

## Automated coverage

- [x] Desktop Chromium judge flow passes.
- [x] Mobile Safari judge flow passes.
- [x] Garage and Tow Away validation pass.
- [x] Reset restores the exact three fixtures.
- [x] Model and fallback provenance remain distinct.
- [x] `429` and `503` messages are actionable.
- [x] Landmark, label, keyboard order, Escape, and focus-restoration checks pass.
- [x] No unexpected browser console errors or page errors occur.

## Visual matrix

Inspect initial lot, inspector open, patrol results, Garage filter, and Scrapyard filter at 1440x900, 1024x768, and 390x844.

- [x] No text or control overlap.
- [x] Longest labels fit stable buttons and tabs.
- [x] Top-down car assets render without clipping.
- [x] First viewport shows brand, URL input, and meaningful parking state.
- [x] Selected and focus states are visible.
- [x] Color is never the only status signal.
- [x] No nested cards, roadmap labels, decorative orbs, or generic marketing hero.
- [x] Mobile inspector and confirmation controls remain reachable.
- [x] No horizontal page scroll.

## Notes

- Inspected all 15 full-page PNGs in `docs/qa-screenshots/` after the final rerun.
- Desktop Chromium passed 8/8 tests. Mobile Safari passed 7/7 applicable tests; the desktop-owned screenshot-matrix test was skipped once by design.
- The exact judge flow, evidence validation, reset, model/fallback provenance, `429`/`503`, landmarks, desktop Tab order, Escape close, and opener focus restoration all passed.
- Every screenshot state now has an automated `scrollWidth <= clientWidth` assertion. The Next.js development indicator is disabled so it does not contaminate the visual evidence.
- Screenshot capture waits for every image to decode and disables finite animations. Two consecutive final captures produced byte-identical SHA-256 results for all 15 PNGs.
- Observed defects fixed during QA: newly analyzed items no longer interrupt the lot by auto-opening; Start Test Drive keeps the inspector open for evidence entry; reset returns to Parking Lot; the header is a real banner sibling of `main`; closing the dialog restores opener focus; `127.0.0.1` is accepted as the local development origin.

## v0.5 unified Parkable verification — 2026-07-20

### Browser coverage

- [x] Strict v1 browser data migrates to v2 once while v1 bytes remain unchanged.
- [x] A present malformed v2 remains authoritative and never falls back to valid v1.
- [x] Idea capture -> planning -> Test Drive -> Garage preserves one record and ID.
- [x] An unplanned Idea can move directly to the shared Scrapyard.
- [x] Mixed Patrol opens and focuses planning without mutation, then starts Test Drive after valid planning.
- [x] A parked Idea can edit notes and Result URL while a parked Tool retains the unchanged v0.4 evidence boundary.
- [x] The complete v0.4 Tool analysis, evidence, Garage, Tow Away, reset, reload, quota, provenance, and accessibility paths still pass.
- [x] Desktop Chromium and Mobile Safari report no unexpected console or page errors.
- [x] Every tested state asserts no horizontal page overflow.

### v0.5 visual matrix

Inspected nine states at 1440x900, 1024x768, and 390x844 under the `v0.5-*` filenames. The 15 original v0.4 PNGs remain byte-preserved and are not recaptured by the v0.5 suite.

- [x] Park idea and both Future controls are visible, distinct, and unclipped.
- [x] Mixed Tool/Idea vehicles retain stable slots and text kind/status labels.
- [x] Unplanned and planned inspector states are legible; mobile actions remain reachable by internal scrolling.
- [x] Mixed Patrol keeps Observed Fact separate from GPT-5.6 Recommendation or deterministic fallback.
- [x] Garage and Scrapyard show both kinds without changing their shared semantics.
- [x] `Needs review · N days` is text-visible on stale active Parkables.
- [x] No overlap, blank assets, horizontal scrolling, or unintended focus artifacts were observed.
- [x] The first viewport preserves product identity, capture choice, and a meaningful route into the parking workspace.

### Evidence notes

- Playwright is pinned to an isolated v0.5 worktree server on `127.0.0.1:3107` with server reuse disabled, preventing an older port-3000 process from contaminating evidence.
- The initial desktop run correctly exposed one stale keyboard-order assertion after the new capture tabs entered the tab sequence; the corrected order verifies Settings -> active capture tab -> active form input -> submit.
- Contact sheets were generated outside the repository solely for inspection; release commits contain only the 27 source PNGs.
- The final combined E2E gate passed 25 tests across desktop Chromium and Mobile Safari with three documented screenshot-only skips: the immutable v0.4 duplicate in both projects and the desktop-owned v0.5 matrix in mobile.
- After independent Claude review identified the parked-Idea evidence visibility gap, the planned/unplanned inspector screenshots were refreshed and re-inspected at desktop and mobile sizes; the added evidence section remains reachable through the existing inspector scroll with no page overflow.

## v0.5 protected Preview verification — 2026-07-20

Preview deployment `dpl_9SZMM62Tg267Nh7oKyt4fApGKqh2` was verified at `https://parking-anything-gs8epyuqv-aim-ing-data.vercel.app` with Vercel Authentication retained. Production remained on the verified v0.4 deployment throughout these checks.

- [x] Required Preview variable names are configured: `OPENAI_API_KEY`, `OPENAI_ANALYZE_MODEL`, `OPENAI_PATROL_MODEL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RATE_LIMIT_HASH_SECRET`, `DEMO_API_ENABLED`, `RATE_LIMIT_IP_MAX`, `RATE_LIMIT_IP_WINDOW_SECONDS`, and `RATE_LIMIT_GLOBAL_DAILY_MAX`. Values were not retrieved or printed.
- [x] An authenticated fresh/reset browser received the exact three seed records, showed no false storage warning, and retained later lifecycle changes after reload.
- [ ] An exact strict-v1 profile is migrated in the protected Preview and independently compared byte-for-byte.
- [ ] A malformed-v2 plus valid-v1 profile is exercised in the protected Preview without changing either key.
- [x] The two storage profiles above pass the committed local Playwright suite. Live protected-Preview injection remains unclaimed because the authenticated browser security boundary rejected scripted storage seeding and explicitly prohibited workaround attempts.
- [x] Manual Idea capture made no network request and one Idea completed planning -> Test Drive -> evidence -> shared Garage. A separate unplanned Idea moved directly to the shared Scrapyard.
- [x] One real Tool analysis completed through the Preview route in 6,545 ms and visibly returned the expected URL-only fallback warning with a GPT-generated parked Tool record.
- [x] One real mixed Manager Patrol completed in 7,252 ms. Tool and Idea Observed Facts remained deterministic and visibly separate from GPT-5.6 Recommendation or deterministic fallback provenance.
- [x] The unplanned-Idea command displayed `Plan Test Drive`, opened the existing parked record, focused `#idea-effort`, and did not mutate its status.
- [x] Desktop 1440x900 and mobile 390x844 reported `scrollWidth === clientWidth`; viewport screenshots are stored as `v0.5-preview-*-plan-test-drive.png` and show reachable planning controls without overlap.
- [x] The live Preview browser console contained zero error entries.
- [x] Read-only rollback rehearsal confirmed `parking-anything.vercel.app` still aliases ready production deployment `dpl_8R5o3DrmyPiE3vUyQ1ZbZinfFpHa`; no alias, protection, secret, environment, or production deployment change was made.
