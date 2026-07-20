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
- Observed defects fixed during QA: newly analyzed items no longer interrupt the lot by auto-opening; Start Test Drive keeps the inspector open for evidence entry; reset returns to Parking Lot; the header is a real banner sibling of `main`; closing the dialog restores opener focus; `127.0.0.1` is accepted as the local development origin.
