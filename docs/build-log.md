# Parking Anything Build Log

## Scope

This primary Codex task implements the approved Parking Anything v0.4 specification for OpenAI Build Week. The judge-first boundary is one AI Tools parking zone, one local user, localStorage persistence, URL analysis, evidence-backed lifecycle decisions, and grounded Manager Patrol recommendations. No roadmap UI or out-of-scope account, cloud-persistence, social, achievement, or extra-zone features were added during bootstrap.

## Phase Evidence Index

Times below are Asia/Taipei commit timestamps from Git. File lists identify the concrete center of each phase; detailed decisions and tradeoffs remain in the phase notes below.

| Phase | Commit time (Asia/Taipei) | Concrete files | Codex decision | Verified command result | Tradeoff |
| --- | --- | --- | --- | --- | --- |
| 1 · Bootstrap | 2026-07-20 10:50:56 | `package.json`, `.gitignore`, `.env.example`, test/build configs | Establish secret-safe Next.js and test boundaries before product code. | Initial Vitest command exited 0 with no tests, as expected. | Omitted nonexistent redundant `@types/ipaddr.js`. |
| 2 · Domain | 2026-07-20 10:55:45 | `schemas.ts`, `transitions.ts`, paired tests | Keep model DTO ownership separate from lifecycle facts and evidence. | 30 focused tests passed. | Only the five approved transitions exist. |
| 3 · Persistence | 2026-07-20 10:58:56 | `fixtures.ts`, `storage.ts`, paired tests | Use an exact versioned local seed envelope for a repeatable demo. | 40 total tests passed. | Local-only; no account or sync. |
| 4 · Visual shell | 2026-07-20 11:10:12 | parking components, `globals.css`, `public/cars/` | Use semantic tabs, text labels, and stable municipal-parking geometry. | 43 total tests and lint passed. | One AI Tools zone; no roadmap UI. |
| 5 · Lifecycle UI | 2026-07-20 11:20:29 | `use-parking-store.ts`, `item-inspector.tsx`, tests | Require evidence for Garage and a reason for Tow Away. | 58 total tests, lint, and production build passed. | Browser-local state remains authoritative. |
| Review correction | 2026-07-20 12:16:30 | hydration test, store hook, `.gitignore` | Share a stable server/hydration snapshot before reading browser storage. | 59 tests, lint, build, and clean generated-type check passed. | A short loading shell is rendered before hydration. |
| 6 · URL fetching | 2026-07-20 12:21:14 | `url-safety.ts`, `page-fetch.ts`, tests | Reject unsafe destinations before any model fallback; revalidate redirects. | 33 focused tests and lint passed. | Some legitimate but ambiguous hosts are intentionally rejected. |
| 7 · Quotas | 2026-07-20 12:25:41 | `request.ts`, `rate-limit.ts`, tests | Bound JSON and share one fail-closed production quota gate across routes. | 16 focused tests and lint passed. | Local/test may use process memory; production requires Upstash. |
| 8 · URL analysis | 2026-07-20 12:30:52 | analysis service, OpenAI client, `/api/analyze-url`, tests | Use Responses API Structured Outputs while keeping identity/state client-owned. | 127 total tests, lint, and build passed; live route later returned 200. | Readable fetch failure becomes visible URL-only mode. |
| 9 · Patrol | 2026-07-20 12:44:44 | patrol service, `/api/manager-patrol`, tests | Send at most three bounded candidates and validate each recommendation independently. | 21 focused tests, lint, build, and live route passed. | Invalid/missing siblings receive explicit deterministic fallbacks. |
| 10 · Live UI | 2026-07-20 12:50:06 | `parking-app.tsx`, `manager-patrol.tsx`, tests | Keep deterministic facts visibly separate and require human lifecycle actions. | 159 total tests, lint, and build passed. | Patrol advises but never mutates status. |
| 11 · E2E/visual QA | 2026-07-20 13:06:34 | `e2e/demo-flow.spec.ts`, QA checklist/screenshots, focused UI fixes | Treat desktop/mobile flow, accessibility, console, and screenshot evidence as one release gate. | Lint passed; 159 tests passed; 15 applicable Playwright checks passed. | Mobile Safari skips only the duplicate desktop-owned screenshot capture. |

## Phase Log

### 2026-07-20 — Phase 1: Repository bootstrap

- Read the approved v0.4 specification and authoritative 13-task implementation plan completely before initialization.
- Accepted the judge-first scope without redesigning or expanding it.
- Initialized the repository on `main`, created the Next.js/TypeScript test scaffold, and installed the planned runtime and development dependencies.
- Corrected one stale plan dependency: npm returned `404` for `@types/ipaddr.js`; the installed `ipaddr.js@2.4.0` package already ships `lib/ipaddr.js.d.ts`, so only the nonexistent redundant package was omitted.
- Established secret-safe ignore rules and an environment-variable template before the first commit. The pre-existing local `.env` file was neither read nor staged.

### 2026-07-20 — Phase 2: Domain contracts and lifecycle

- Added strict Zod schemas for the persisted parking item and the dedicated URL-analysis and Manager Patrol DTOs; model response ownership remains separate from IDs, timestamps, status, and user evidence.
- Used RED-GREEN TDD for both modules: tests first failed because `schemas.ts` and `transitions.ts` did not exist, then passed after the minimum implementations were added.
- The schema suite caught a Zod v4 edge case where a protocol refinement could throw after `.url()` had already rejected malformed input. The refinement now returns a normal validation failure instead.
- Implemented the five allowed lifecycle transitions, evidence requirements, terminal-state rejection, immutable updates, and deterministic injected timestamps.
- Switched Vitest alias resolution to Vite's installed native `resolve.tsconfigPaths` support after Vite 8 emitted a deprecation advisory for the planned plugin path; behavior is unchanged and test output is clean.

### 2026-07-20 — Phase 3: Repeatable demo persistence

- Added the exact three approved deterministic fixtures: one stale parked item, one test-driving item with notes, and one garaged item with evidence.
- Used RED-GREEN TDD for fixtures and storage; both suites first failed on missing modules, then passed after the minimum implementation.
- Implemented the versioned `parking-anything:v1` localStorage envelope, one-time seed initialization, non-destructive malformed/wrong-version handling, non-throwing write failures, and exact demo reset.
- Kept persistence local-only and returned fresh fixture clones so reset cannot share mutable references with prior state.

### 2026-07-20 — Phase 4: Visual parking workspace

- Used the built-in image generation workflow to create three matching top-down vehicle sources: a white hatchback with a safety-yellow accent, garage-green sedan with a white accent, and muted-red utility van with a white roof.
- Followed the image skill's chroma-key workflow, removed the flat backgrounds locally, saved transparent PNGs under `public/cars/`, and visually inspected all three final files at original detail for true overhead framing, transparent corners, consistent scale, and unclipped vehicles.
- Used RED-GREEN TDD for the parking-lot shell. The first run failed on missing components; the next run caught an accessible-name spacing defect (`Parking Lot1`), which was fixed with explicit human-readable tab labels.
- Implemented the single-page mission header, semantic status tabs, asphalt parking canvas with stable tracks, readable text status labels, accessible car buttons, and only the three purposeful transition animation classes.
- Kept the shell focused on the approved AI Tools zone with no roadmap labels or fake AI behavior.

### 2026-07-20 — Phase 5: Local lifecycle controller and inspector

- Used RED-GREEN TDD for the local store hook and responsive inspector. Hook tests cover initialization, add/persist, every lifecycle path, validation failure without mutation, evidence timestamps, reset, malformed storage, and non-destructive persistence failure.
- Implemented semantic status filtering/counts, car selection, the responsive Radix inspector, status-specific actions, inline Garage/Tow validation, evidence drafts, reset confirmation, and persistence/reset guidance.
- Analyze remains explicitly disabled at this phase; no mocked production AI behavior was added.
- ESLint rejected synchronous prop-to-state resets inside an inspector effect. The inspector now uses a keyed inner component so drafts initialize on item/status mount without cascading renders.
- The first production compile exposed `npm init`'s stale CommonJS default and a parent lockfile causing incorrect Turbopack root inference. Setting the package to ESM and `turbopack.root` to this repository fixed the root causes; the next Next.js 16.2.10 build compiled and statically generated `/` successfully.

### 2026-07-20 — Corrective review gate: hydration-safe persistence

- External review identified that render-time `localStorage` access produced a server storage-warning snapshot, a different client browser-data snapshot, and a React hydration mismatch that could let a later action persist seed state over existing data.
- Added a server-render/hydration regression that preloads one exact custom item, hydrates the app, verifies no false warning, applies the first lifecycle action, hydrates again as a reload, and confirms no seed ID was introduced. The RED run captured two recoverable hydration mismatch errors.
- Replaced render-time state initialization with `useSyncExternalStore`: the server and initial hydration share one stable loading snapshot, while the browser snapshot reads or initializes storage only after hydration. Existing data, malformed-data reset state, in-memory write-failure behavior, and fresh seed initialization remain covered.
- Followed current Next.js guidance for generated types: `next-env.d.ts` remains present locally and included by `tsconfig.json`, but `.gitignore` now excludes it and Git no longer tracks it.
- Verified that the running Next development server responds `200` and that `next dev`/`next build` generation adds no working-tree changes beyond this corrective commit.

### 2026-07-20 — Phase 6: SSRF-safe bounded page fetching

- Used RED-GREEN TDD for URL safety and page fetching; both suites first failed because their modules did not exist.
- Implemented normalized HTTP(S)-only URLs, embedded-credential rejection, all-answer DNS validation, literal IPv4/IPv6 checks, IPv4-mapped IPv6 normalization, and rejection of every non-`unicast` address range.
- Implemented manual redirect handling with target revalidation and a three-redirect limit, one five-second abort controller, declared and streamed 1 MB bounds, a strict readable-content allowlist, and a 12,000-character extracted-text ceiling.
- Kept URL-safety rejection separate from typed page-fetch failures so invalid/private targets cannot enter URL-only model fallback. All tests use injected DNS/fetch implementations and make no live request.

### 2026-07-20 — Phase 7: Bounded requests and shared quota gate

- Used RED-GREEN TDD for the 8 KB JSON boundary and shared quota gate; both suites first failed because their server modules did not exist.
- Added declared-length and actual UTF-8 byte limits, fixed malformed/oversize responses, safe unknown-error serialization, and bounded `Retry-After` output without reflecting request or internal error content.
- Added one HMAC-based caller identity boundary, per-IP-before-global quota ordering, a disabled-demo kill switch, shared route-independent Redis prefixes, and production construction that fails closed when Upstash or hashing configuration is absent.
- Configured Upstash with no fail-open timeout. Backend exceptions or timeout results become a fixed `503`; raw IP addresses and secrets are never passed to Redis keys or logs. Local/test use a process-local limiter only when production guarantees are not required.

### 2026-07-20 — Phase 8: GPT-5.6 URL analysis API

- Verified the current official OpenAI Structured Outputs pattern before implementation: the JavaScript SDK uses `responses.parse()` with `text.format: zodTextFormat(...)`, and parsed message content/refusals are handled explicitly.
- Used RED-GREEN TDD for SDK-shaped parsed-output handling, fetched versus URL-only analysis, URL rejection before model use, prompt-injection boundaries, service-boundary schema validation, and the thin route contract.
- Added a lazy server-only OpenAI client and `gpt-5.6-luna` analysis request with a 700-token ceiling. The server returns only `AnalyzeUrlResponse`; item identity, timestamps, category, and persisted lifecycle status remain client-owned.
- Added `/api/analyze-url` with quota-first ordering, bounded parsing, fixed schema/error responses, Node runtime, and a 20-second route limit. All automated tests use injected model/fetch dependencies and made no real OpenAI request.
- Production type-checking exposed that `ipaddr.js`'s `kind()` method does not narrow its TypeScript union; the already-tested IPv4-mapped IPv6 guard now uses the library's explicit `IPv6` class check with unchanged runtime behavior.
- Human key checkpoint completed without exposing the credential: authenticated model metadata returned `200` for `gpt-5.6-luna`. The first live `/api/analyze-url` inference returned `200` in 4,986 ms for `https://openai.com/`, used the designed `url_only` fallback, identified the title as `OpenAI`, selected `quick_spin`, and populated every required structured field. No key or fetched page content was recorded.

### 2026-07-20 — Phase 9: Grounded Manager Patrol

- Used RED-GREEN TDD for deterministic candidate selection/fact text, per-candidate model validation, provenance, failure fallbacks, prompt boundaries, and the quota-aware route adapter.
- Candidate selection sends only bounded ID/title/effort/status/staleness facts, excludes local notes/repository/decision evidence, clamps future activity to zero, sorts by idle days, and limits the request to three active items.
- Added the `gpt-5.6-terra` Structured Outputs call with a 500-token cap. Candidate JSON is delimited, title-bounded, and escapes delimiter-like markup; model recommendations are accepted only for submitted IDs and status-valid actions.
- Valid siblings retain `source: "model"`; each missing or invalid sibling receives an explicit `source: "fallback"`. Complete model/API failure returns only the oldest candidate's deterministic fallback, while an empty candidate list returns all-clear without quota or model use.
- The live `/api/manager-patrol` check returned `200` in 3,637 ms: the stale parked seed received a model-backed `start_test_drive` suggestion, while the test-driving sibling received a clearly labeled deterministic `scrap` fallback. No rationale or local evidence was recorded in the verification output.

### 2026-07-20 — Phase 10: Live AI product integration

- Used RED-GREEN TDD for Analyze & Park loading/duplicate guards, client-owned item assembly, retry behavior, URL-only warnings, strict rejection of server-owned item fields, patrol candidate minimization, provenance rendering, and actionable quota states.
- Analyze & Park now normalizes the submitted HTTP(S) URL, uses one abort controller per guarded submission, validates the bounded server DTO, and creates exactly one local `parked` item with a client UUID and client timestamps. Errors retain the URL for retry; successful URL-only mode remains visibly labeled.
- Added the Manager Patrol command with a fixed-size ScanSearch button and flat recommendation rows. Each row displays deterministic `Observed Fact` text separately from either `GPT-5.6 Recommendation` or `Deterministic fallback`; suggestions only focus the relevant car and never mutate lifecycle state.
- The UI selects at most three deterministic active candidates and never sends notes, repository URLs, decision reasons, or the full local store. Empty patrol is local all-clear; `429`/`503` responses provide actionable retry/availability text without changing items.

### 2026-07-20 — Phase 11: End-to-end, accessibility, and visual QA

- Added the deterministic Playwright judge flow and cross-browser coverage for Analyze & Park, evidence-backed Garage/Tow transitions, exact seed reset, grounded patrol provenance, fallback labeling, and actionable `429`/`503` states.
- Desktop QA exposed five state/interaction defects that focused unit and browser reruns now cover: analyzed items auto-opened unexpectedly, Start Test Drive closed before evidence entry, reset retained the Scrapyard filter, the mission header was nested inside `main`, and controlled-dialog unmounting prevented opener-focus restoration.
- Traced the initial Playwright hydration stall to the development origin/HMR boundary rather than the localStorage controller. `127.0.0.1` is now an allowed development origin, and a clean browser hydrates the seeded store without console or storage warnings.
- Captured and visually inspected all 15 required full-page baselines at 1440x900, 1024x768, and 390x844 for the initial lot, inspector, patrol results, Garage, and Scrapyard. The final matrix has no overlaps, clipped vehicles, unreachable controls, or horizontal overflow; status text and provenance remain visible independently of color.
- Added landmark, label, desktop Tab order, Escape, and focus-restoration checks. Expected browser failed-resource messages are narrowly allowed only in the two deliberately mocked non-2xx tests; every unexpected console error and every page error still fails the suite.
- The final gate exposed Vitest's default `*.spec.ts` discovery importing the new Playwright file. Vitest now explicitly excludes `e2e/**`, preserving one runner per suite instead of hiding the failure in scripts.
- A later release-gate rerun showed four PNG baselines changing because screenshots immediately followed image remounts. Capture now waits for every image to decode and disables finite animations; two consecutive captures produced byte-identical SHA-256 results for all 15 PNGs.

### 2026-07-20 — Phase 12 local release preparation

- Added the judge-facing `README.md` in the authoritative 13-section order and documented all 10 `.env.example` variables without values. The README distinguishes Codex's implementation work, GPT-5.6 Luna/Terra runtime roles, and deterministic ownership of facts and state.
- Added the dated Phase Evidence Index from actual Git commit timestamps and preserved security, QA, and known-tradeoff evidence without inventing deployment results or API usage.
- Final local release gate from the screenshot-stabilized tree: `npm run lint` exited 0; `npm test` passed 20 files and 159 tests; `npm run test:e2e` passed 15 applicable checks with one intentional duplicate screenshot skip; `npm run build` compiled, type-checked, generated five static pages, and listed both dynamic API routes.
- At the end of the local gate, external deployment and publication were intentionally unclaimed and unexecuted pending the explicit GitHub/Vercel authorization checkpoint and direct user entry of production secrets.

### 2026-07-20 — Phase 12 external project setup

- After explicit user authorization and direct account authentication, created the public repository at `https://github.com/geomingical/parking-anything`, pushed `main`, and verified public visibility plus the remote `README.md` and MIT `LICENSE` objects.
- Created the Vercel project `aim-ing-data/parking-anything`. Its first server build completed successfully and Vercel assigned `https://parking-anything.vercel.app`; this is recorded only as project setup, not as a verified demo, because production secrets had not yet been entered.
- The deprecated claimable-deploy fallback returned CLI guidance rather than a deployment. The authenticated Vercel CLI was used instead. No `.env` file or secret value was printed, committed, or intentionally uploaded.
- Production configuration, secret-name verification, redeployment, and fresh-profile smoke testing remained pending at the explicit human secret-entry checkpoint.

### 2026-07-20 15:09 CST — Phase 12 verified production release

- Confirmed by metadata only that all 10 documented variable names are configured as encrypted values for both Production and Preview: `OPENAI_API_KEY`, `OPENAI_ANALYZE_MODEL`, `OPENAI_PATROL_MODEL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RATE_LIMIT_HASH_SECRET`, `DEMO_API_ENABLED`, `RATE_LIMIT_IP_MAX`, `RATE_LIMIT_IP_WINDOW_SECONDS`, and `RATE_LIMIT_GLOBAL_DAILY_MAX`. No variable value was retrieved or printed.
- The first production attempt exposed a Vercel project-setting defect rather than an application defect: the project was configured as `Other` with `public/` output and therefore served `404`. Changed only the project framework preset to Next.js and redeployed the clean source commit `1fa4f3d811fab843c7cc6bd0a9a9eda95e99ab55`.
- Verified deployment `dpl_8R5o3DrmyPiE3vUyQ1ZbZinfFpHa` reached `Ready`, contains `/`, `/api/analyze-url`, and `/api/manager-patrol`, and owns the canonical production alias `https://parking-anything.vercel.app`.
- Narrowed Vercel Authentication to Standard Protection (`prod_deployment_urls_and_all_previews`): the canonical production alias opens in a fresh unauthenticated browser, while `https://parking-anything-9th9zt3cy-aim-ing-data.vercel.app` redirects to Vercel Login. Git-fork protection remains enabled.
- Fresh-profile smoke testing began from the exact fixture counts Parking Lot 1, Test Driving 1, Garage 1, Scrapyard 0 with no false storage-unavailable warning. Real Analyze & Park for `https://example.com/` returned fetched analysis, created one parked item, moved through Test Drive with notes, and reached Garage.
- Real Manager Patrol rendered `Observed Fact` separately from `GPT-5.6 Recommendation` for the stale parked fixture and separately labeled `Deterministic fallback` for the test-driving fixture. Tow Away required a decision reason and moved the parked fixture to Scrapyard. Reset then restored the exact 1/1/1/0 fixtures and removed the generated item.
- Client exposure checks scanned the rendered document and eight script URLs; local bundle checks scanned 12 `.next/static` files. Neither check found the server-only variable names or an OpenAI-key-like prefix. The browser console contained zero warnings/errors. A bounded 30-minute production-log sample contained 14 entries: five `200`, eight intentional validation `400`, and one intended quota `429`; it contained no server-only variable-name or key-prefix match.
- Verified the shared production quota without additional OpenAI calls by sending bounded invalid Analyze requests: requests through the configured per-caller allowance failed input validation with `400`, then the next request failed closed with `429` and `Demo request limit reached.` The analyze route consumes quota before parsing, and the invalid payload cannot reach the OpenAI analyzer.
- The release rerun exposed one nondeterministic screenshot focus outline at 1024×768. The screenshot helper now blurs the active element after image decode and before capture; two focused matrix runs passed and produced byte-identical SHA-256 results for all 15 tracked PNGs without changing a baseline.
- Final post-deployment release gate: `npm run lint` exited 0; `npm test` passed 20 files and 159 tests; `npm run test:e2e` passed 15 applicable checks with one intentional duplicate screenshot skip; `npm run build` compiled, type-checked, generated five pages, and listed both dynamic API routes.
- Task 12 production deployment and smoke testing are complete. The public repository remains `https://github.com/geomingical/parking-anything`; recording and Devpost submission remain Task 13 human-checkpoint work.

## Codex Contributions

- Kept the approved spec and plan as the implementation sources of truth.
- Established the repository, configuration, automated-test runners, evidence log, and secret-handling boundary in the primary implementation task.
- Defined and tested the domain ownership boundary and lifecycle state machine from the approved specification.
- Built deterministic seed and versioned storage primitives for a repeatable judge demo without adding cloud persistence.
- Generated and integrated the custom car assets and implemented the accessible municipal-parking visual shell.
- Connected the pure domain/storage primitives to a tested local state controller and complete evidence-backed lifecycle inspector.
- Corrected the server/client persistence boundary with a hydration-safe external-store snapshot and a full reload regression.
- Built the SSRF-safe, redirect-aware, byte-bounded public-page ingestion boundary.
- Protected both planned model routes behind reusable bounded-request and shared-quota primitives.
- Implemented the first real product AI boundary with the official Responses API Structured Outputs interface while preserving client ownership of deterministic parking facts.
- Implemented grounded Manager Patrol assembly that keeps deterministic observations separate from model judgment and preserves provenance through partial failure.
- Connected both server AI boundaries to the local-first product without surrendering client ownership of persistence or state transitions.
- Verified the complete judge flow in desktop Chromium and Mobile Safari and preserved the inspected screenshot matrix as build evidence.

## GPT-5.6 Runtime Use

The dedicated event key was entered locally by the user and remained server-only. Two live product-route requests were completed: URL analysis with `gpt-5.6-luna` and grounded patrol with `gpt-5.6-terra`. Only status, timing, source mode, and schema/provenance outcomes were recorded; the credential and raw response bodies were not printed, logged, or committed.

## Verification

- Task 1 scaffold: `npm test` exited 0 with Vitest 4.1.10 and no test files, as expected before domain implementation.
- Task 2 domain gate: `npx vitest run src/lib/parking/schemas.test.ts src/lib/parking/transitions.test.ts` exited 0 with 2 files and 30 tests passing.
- Task 3 focused gate: fixture/storage tests exited 0 with 2 files and 10 tests passing; `npm test` then exited 0 with all 4 files and 40 tests passing.
- Task 4 shell gate: the parking-lot component suite exited 0 with 3 tests passing, `npm run lint` exited 0, and the full `npm test` gate exited 0 with 5 files and 43 tests passing.
- Task 5 focused gate: hook/inspector suites exited 0 with 2 files and 15 tests passing; ESLint exited 0; the full unit gate exited 0 with 7 files and 58 tests passing; `npm run build` exited 0 after the ESM/root configuration correction.
- Corrective hydration gate: hydration/store suites exited 0 with 2 files and 11 tests passing; `npm test` exited 0 with 8 files and 59 tests passing; `npm run lint` exited 0; `npm run build` compiled and statically generated `/`; Next dev/build introduced no additional tracked changes.
- Task 6 gate: URL-safety/page-fetch suites exited 0 with 2 files and 33 tests passing; `npm run lint` exited 0.
- Task 7 gate: bounded-request/quota suites exited 0 with 2 files and 16 tests passing; `npm run lint` exited 0.
- Task 8 gate: OpenAI parser/analysis/route suites exited 0 with 3 files and 19 tests passing; the related URL-safety regression suite passed; `npm run lint` and `npm run build` exited 0; the full unit gate passed 15 files and 127 tests.
- Task 8 live gate: server-only authentication reached `gpt-5.6-luna`; the route returned a schema-complete URL-only analysis with HTTP `200` in 4,986 ms.
- Task 9 gate: candidate/service/route suites exited 0 with 3 files and 21 tests passing; `npm run lint` and `npm run build` exited 0; the build manifest contains both `/api/analyze-url` and `/api/manager-patrol`.
- Task 9 live gate: `gpt-5.6-terra` patrol returned HTTP `200` in 3,637 ms with one validated model recommendation and one independently assembled fallback.
- Task 10 gate: analyze/patrol UI suites exited 0 with 2 files and 11 tests passing; `npm run lint` exited 0; the full unit gate passed 20 files and 159 tests; `npm run build` exited 0 with both dynamic routes present.
- Task 11 gate: `npm run lint` exited 0; `npm test` passed 20 files and 159 tests; `npm run test:e2e` passed all 15 applicable checks across desktop Chromium and Mobile Safari with only the intentionally desktop-owned duplicate screenshot test skipped. The final screenshot matrix includes explicit horizontal-overflow assertions.

## Known Tradeoffs

- npm reported two moderate dependency advisories during installation. No unplanned `npm audit fix --force` was applied; production dependency impact will be inspected during the release gate.
- The MVP intentionally uses browser-local persistence and has no account or cross-device synchronization.

### 2026-07-20 — v0.5 Phase 0: protected baseline and repository hygiene

- Verified the v0.5 source at commit `3d88380a98761a5d9dc65b3f9cf82d14911d045c` and the deployed v0.4 rollback source at `1fa4f3d811fab843c7cc6bd0a9a9eda95e99ab55`.
- Created the local-only annotated tag `v0.4-production` at the verified v0.4 source. Per the implementation authorization boundary, the tag was not pushed and no GitHub or Vercel operation was performed.
- Isolated implementation on branch `feat/v0.5-unified-parkable` under the repository-local ignored worktree directory. Added tracked ignore rules for both `.worktrees/` and generated `.superpowers/` content without deleting the brainstorming output.
- Installed the locked dependency tree and ran the untouched baseline: `npm test` passed 20 files and 159 tests. Production remained unchanged.

### 2026-07-20 — v0.5 Phase 1: strict unified Parkable schema

- Used RED-GREEN TDD for the strict `ai_tool | idea` discriminated union, exact existing effort tiers, field bounds, HTTP(S)-only result evidence, blank optional normalization, standing lifecycle invariants, strict v2 envelope, and bounded mixed Patrol candidate.
- The focused RED run executed 34 tests with 10 expected failures against the v1-only schema. After implementation, `npx vitest run src/lib/parking/schemas.test.ts` passed all 34 tests and `npm run lint` exited 0.
- The full unit run intentionally exposed only migration-driven v1 fixture, candidate, storage, and UI factory failures. Those failures are the planned input to v0.5 Phase 2 rather than unrelated regressions; the previously passing schema-independent suites remained green.

### 2026-07-20 — v0.5 Phase 2: exact v1-to-v2 migration and storage authority

- Used RED-GREEN TDD for the frozen strict v1 reader, pure conversion, malformed-present-v2 precedence, exact `items` to `parkingItems` mapping, `category` removal, `kind: "ai_tool"` addition, `repoUrl` to `resultUrl` mapping, complete-v2 validation, and single-write persistence.
- Confirmed migration leaves the v1 bytes untouched, retains existing effort tiers and fixture meaning, performs no v2 write for invalid v1 or invalid converted v2 data, and never falls back to v1 when any v2 key is present.
- The focused storage gate passed 3 files and 18 tests; `npm run lint` exited 0 without warnings. The full unit run advanced to 173 passing tests with 11 expected failures confined to later-plan v1 UI/test factories, old envelope assertions, and Patrol candidates that do not yet include `kind`.

### 2026-07-20 — v0.5 Phase 3: shared lifecycle and deterministic activity age

- Used RED-GREEN TDD for the unplanned-Idea Test Drive gate, planned-Idea shared transition, direct unplanned-Idea Tow Away, `resultUrl` Garage evidence, schema validation of every accepted next state, and exact seven-day complete-day activity boundaries.
- Added one pure activity helper used by both deterministic `Needs review` state and Patrol selection. Patrol candidates now carry the required `kind` while preserving global staleness ordering, ID tie-breaking, and the three-candidate cap.
- The focused lifecycle/activity/Patrol gate passed 3 files and 26 tests; `npm run lint` exited 0. The full unit run reached 178 passing tests with 13 expected downstream failures limited to the Task 4 controller/envelope interface, Task 5 Tool assembly, and Task 7 route candidate fixtures.

### 2026-07-20 — v0.5 Phase 4: validated mixed-item store controller

- Used RED-GREEN TDD for adding Ideas, complete-envelope validation, active Idea editing, test-driving planning protection, terminal edit rejection, `resultUrl` evidence, exact reset, v1 migration hydration, and session-only publication after a valid write failure.
- Every controller command now builds and validates one complete v2 proposal before persistence. Validation failure performs no write or publication; storage failure publishes the valid state with the existing warning. Planning and evidence edits refresh both activity timestamps immediately.
- Root-cause analysis of the first full gate found only stale schema consumers: Tool assembly still emitted `category`, two tests read the old `.items` envelope, and route fixtures omitted `kind`. Their existing failing regressions were corrected without adding Task 5 capture modes or Task 7 mixed-Patrol behavior.
- Focused controller/hydration tests passed 2 files and 16 tests; compatibility regressions passed 2 files and 13 tests; the final `npm test` gate passed all 22 files and 196 tests; `npm run lint` exited 0 without warnings.

### 2026-07-20 — v0.5 Phase 5: first-class Idea capture

- Used RED-GREEN TDD for keyboard-operable Tool/Idea capture selection, exact 120/2,000-character Idea limits, preserved invalid input, one locally assembled parked Idea, zero network calls, and native disabled semantics for `Park whatever · Future`.
- Extracted the verified v0.4 URL workflow into `ToolCaptureForm` without changing its real API request, duplicate guard, URL-only warning, retry behavior, structured-response validation, or client-owned item assembly.
- `MissionHeader` now owns only product identity and reset. Manual Idea capture uses the shared strict schema, one client ID and timestamp, and immediately enters the same Parking Lot with no AI dependency.
- The focused capture gate passed 2 files and 9 tests; the full `npm test` gate passed 23 files and 200 tests; `npm run lint` exited 0 without warnings.

### 2026-07-20 — v0.5 Phase 6: unified vehicles and variant-aware inspector

- Used RED-GREEN TDD for mixed Tool/Idea kind labels, a stable neutral unplanned-Idea vehicle, the shared seven-day `Needs review` indicator, discriminator-specific inspector content, active Idea editing, read-only terminal records, and shared evidence/lifecycle actions.
- An incomplete Idea Test Drive request now leaves status unchanged, shows the deterministic planning message, and focuses the first missing planning field. Valid planning is persisted through the complete-envelope controller and updates the vehicle and inspector immediately in the current session.
- Renamed Garage evidence presentation to `Result URL` throughout the inspector and preserved direct Tow Away for unplanned Ideas. Tool-only source, summary, and hypothesis content is never rendered for Idea records.
- The focused rendering/inspector gate passed 2 files and 12 tests; the full `npm test` gate passed 23 files and 204 tests; `npm run lint` exited 0; `npm run build` compiled successfully with `/`, `/api/analyze-url`, and `/api/manager-patrol` present.

### 2026-07-20 — v0.5 Phase 7: mixed, private, readiness-aware Manager Patrol

- Used RED-GREEN TDD for global mixed-kind selection, exact days-descending/ID-ascending order, kind-aware deterministic observations, strict route input, bounded model serialization, prompt constraints, per-entry provenance, and readiness-aware commands.
- Captured the model request with marker strings attached to every prohibited field and verified none crossed the boundary. The serialized candidate allowlist contains only `id`, `kind`, bounded `title`, optional `effortTier`, `status`, and `daysSinceActivity`; Idea text, summaries, notes, hypotheses, Tool/result URLs, decision reasons, and storage data remain local.
- An unplanned Idea recommendation is displayed as `Plan Test Drive`; its command selects the existing record and focuses its first missing planning field without a transition. Planned Ideas and Tools display `Start Test Drive`, which uses the shared deterministic transition. Observed Fact and GPT-5.6 Recommendation/fallback provenance remain visibly separate.
- The focused Patrol gate passed 4 files and 33 tests; the full `npm test` gate passed 23 files and 210 tests; `npm run lint` exited 0; `npm run build` compiled successfully with both model routes present.

### 2026-07-20 — v0.5 Phase 8: complete unified local workspace

- Added component-level journeys proving that one Idea ID is captured, planned, moved through Test Drive with evidence, and parked in the shared Garage without duplication, and that a separate unplanned Idea can be towed directly into the shared Scrapyard with the same ID.
- Added `Gather · Future` as a separate native-disabled collaboration control outside the capture switcher. Both it and `Park whatever · Future` expose explanatory accessible descriptions and have no event, loading, fetch, or store effects.
- The focused app/hydration gate passed 2 files and 9 tests. The first consolidated check passed lint and 212 tests, then exposed a sandbox-only Turbopack PostCSS worker port denial; the identical build passed outside that restriction. A fresh complete `npm run check` then exited 0 with lint clean, 23 files and 212 tests passing, successful TypeScript compilation, and all application/API routes built.

### 2026-07-20 — v0.5 Phase 9: migration, browser journeys, and visual QA

- Added exact browser fixtures for strict v1-to-v2 migration and malformed-present-v2 authority. The migrated envelope preserves IDs, timestamps, `focused_session`, statuses, and evidence meaning; maps `items` to `parkingItems`, removes `category`, adds `kind: "ai_tool"`, renames `repoUrl` to `resultUrl`, leaves v1 byte-identical, and reloads from authoritative v2. Malformed v2 plus valid v1 shows reset guidance without changing either key.
- Verified Idea capture -> planning -> Test Drive -> Garage, direct unplanned-Idea Tow Away -> Scrapyard, mixed Patrol -> Plan Test Drive focus -> saved planning -> deterministic Start Test Drive, the complete v0.4 Tool journey, evidence gates, exact reset/reload, model/fallback provenance, actionable quota failures, keyboard order, Escape, focus restoration, no unexpected browser/page errors, and no horizontal overflow.
- Isolated Playwright on `127.0.0.1:3107` with server reuse disabled after the first RED run proved that port 3000 belonged to an older v0.4 process. The corrected focused runs passed 14/14 desktop tests and 12/12 applicable mobile tests.
- Captured and visually inspected 27 new v0.5 PNGs covering nine states at 1440x900, 1024x768, and 390x844. No overlap, blank asset, unstable slot, page overflow, or unintended focus artifact was observed; mobile inspector actions remained reachable by internal scrolling. The original 15 v0.4 PNGs were restored byte-for-byte and excluded from recapture.
- Final local release gate: `npm run lint` exited 0; `npm test` passed 23 files and 212 tests; `npm run test:e2e` passed 25 tests with three documented screenshot-only skips; `npm run build` compiled TypeScript and generated `/`, `/api/analyze-url`, and `/api/manager-patrol`; the pre-commit status contained only Task 9 source, QA, plan, and evidence files.

### 2026-07-20 — v0.5 Phase 10: Build Week documentation and judge story

- Rewrote README positioning from observed v0.5 behavior: Tool and manual Idea capture, one strict union and lifecycle, planning gate, Result URL evidence, mixed privacy-bounded Patrol, exact one-way v1 migration, rollback limitations, local setup, verification, security boundaries, and honest disabled Future scope. Codex implementation work and GPT-5.6 runtime judgment remain explicitly separate.
- Added a 118-second English judge runbook that demonstrates real GPT-5.6 Tool Structured Outputs, AI-independent Idea capture, same-record planning, mixed Patrol fact/recommendation provenance, shared Garage/Scrapyard outcomes, and the disabled Park whatever/Gather extension points. The `/feedback` Session ID remains human-only submission evidence and is excluded from narration.
- Ran every documented setup command without exposing secrets: `npm install` completed, `cp -n .env.example .env.local` preserved any existing file, and `npm run dev -- --port 3107` served the v0.5 worktree with HTTP 200. The generated lockfile metadata-only drift from npm was discarded; no dependency version changed.
- Rehearsed every visible narration action through the verified Tool judge flow and unified Idea visual journey. A fresh README verification gate passed lint, 23 files and 212 unit tests, 25 cross-browser E2E tests with three documented screenshot-only skips, and the production build with both AI routes present.

### 2026-07-20 — v0.5 independent Claude release review and correction

- Used the user-requested ModelNexus Claude reviewer against the complete authoritative spec, plan, and `3d88380..HEAD` implementation. The first read-only review returned `FAIL` for one verified medium spec gap: the store permitted parked-Idea evidence edits, but the inspector rendered notes and Result URL only during Test Drive.
- Applied RED-GREEN TDD with a parked-Idea evidence regression and parked-Tool non-regression. A shared `evidenceEditable` predicate now governs both rendering and persistence: parked/test-driving Ideas can edit evidence; AI Tools retain their existing Test-Drive-only evidence UI; garaged and scrapped records remain read-only.
- Focused inspector verification passed 9/9 tests. The complete correction gate passed 23 files and 213 unit tests, lint, 25 applicable desktop/mobile E2E tests with three documented screenshot-only skips, and the production build. Four affected planned/unplanned inspector PNGs were refreshed and visually re-inspected without layout regression.
- A second read-only Claude review inspected the corrected diff, persistence callback, store compatibility, Tool and terminal boundaries, refreshed screenshots, and test expansion. It returned explicit `PASS` with no release-blocking issues. No GitHub, Vercel, tag, or production operation occurred before that PASS.

### 2026-07-20 — v0.5 protected Preview and rollback rehearsal

- After the explicit external-operation authorization and Claude `PASS`, pushed only `feat/v0.5-unified-parkable` and opened draft PR `https://github.com/geomingical/parking-anything/pull/1`. `main` was not merged and the local `v0.4-production` tag was not pushed.
- Deployed commit `d5e62de3f8b5d36b7fc72626fda969d43f7c1a34` only as protected Preview `dpl_9SZMM62Tg267Nh7oKyt4fApGKqh2` at `https://parking-anything-gs8epyuqv-aim-ing-data.vercel.app`. Vercel reported `READY` with no production target; production aliases were untouched.
- Confirmed these Preview variable names are configured as encrypted values without retrieving or printing them: `OPENAI_API_KEY`, `OPENAI_ANALYZE_MODEL`, `OPENAI_PATROL_MODEL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RATE_LIMIT_HASH_SECRET`, `DEMO_API_ENABLED`, `RATE_LIMIT_IP_MAX`, `RATE_LIMIT_IP_WINDOW_SECONDS`, and `RATE_LIMIT_GLOBAL_DAILY_MAX`.
- In an authenticated fresh/reset profile, verified exact seed counts, no false `Browser storage is unavailable` warning, manual Idea capture, immediate planning UI updates, Test Drive, evidence-backed Garage, direct unplanned-Idea Tow Away, and persistence of the resulting `1 parked / 1 test-driving / 2 garaged / 1 scrapped` state after reload.
- Made one quota-bounded real Analyze request for `https://openai.com/codex/`. It completed in 6,545 ms, produced a GPT-generated `OpenAI Codex` parked Tool, and visibly reported URL-only source mode because page text was unavailable. The temporary smoke record was then deterministically towed with a local reason.
- Made one quota-bounded real mixed Patrol request across two Tools and one unplanned Idea. It completed in 7,252 ms; deterministic kind-aware Observed Facts stayed visibly separate from two GPT-5.6 Recommendations and one per-entry fallback. `Plan Test Drive` focused the Idea effort selector while the card and inspector remained `Parked`.
- Verified 1440x900 and 390x844 Preview viewports with `scrollWidth === clientWidth`, visually inspected the saved `v0.5-preview-*-plan-test-drive.png` evidence, and observed zero browser console errors.
- The authenticated browser security policy rejected scripted localStorage seeding and explicitly forbade workaround attempts. Therefore the exact strict-v1 and malformed-v2 live Preview profiles remain unclaimed; both exact cases continue to pass the committed local Playwright suite, including byte-identical v1 and unchanged malformed-v2 assertions.
- Rehearsed rollback read-only. `parking-anything.vercel.app` still resolves to ready production deployment `dpl_8R5o3DrmyPiE3vUyQ1ZbZinfFpHa`, previously built from verified v0.4 source `1fa4f3d811fab843c7cc6bd0a9a9eda95e99ab55`. If rollback is later authorized after a v0.5 promotion, the recorded operation is `npx vercel promote dpl_8R5o3DrmyPiE3vUyQ1ZbZinfFpHa --scope aim-ing-data --yes`; it was not executed.
- Final pre-commit verification exited cleanly: ESLint passed, all 23 Vitest files and 213 tests passed, the production build compiled `/` and both API routes, and Playwright passed 25 applicable desktop/mobile tests with three documented screenshot-ownership skips. The first sandboxed Playwright launch reproduced the known local-port `EPERM`; the unchanged command passed when the port restriction was lifted.

### 2026-07-21 — Build Week HyperFrames video production checkpoint

- Defined and committed a source-backed video identity, 278-word two-minute judge narration, 37-word teaser narration, eight-beat main storyboard, four-beat teaser cut, and an asset audit grounded in the verified v0.5 product states.
- Captured the local 1920x1080 v0.5 surface and reused the first-party visual-QA states for the mixed lot, planned inspector, Manager Patrol, Garage, and Scrapyard. All three existing transparent vehicle assets remain locally referenced rather than inlined or regenerated.
- Auditioned three macOS system voices as a safe local fallback. Samantha at 140 words per minute produced a 118.120-second main narration and a 17.439-second teaser narration, leaving visual holds inside the exact 120-second and 20-second compositions.
- Built standalone deterministic GSAP compositions in `video/parking-anything-build-week/index.html` and `video/parking-anything-teaser/index.html`. Every scene has a distinct entrance, scenes remain fully visible until covered by an opaque road/gate transition, only the final scenes fade out, and no timeline uses random values or infinite repeats.
- Inspected 12 rendered hero frames at 1920x1080 and corrected headline/vehicle collisions, teaser subtitle interference, terminal-state screenshot allocation, and the Patrol closing layout. The committed local checks verify composition roots and durations, media attributes, local assets, registered paused timelines, deterministic-pattern bans, broken images, browser console errors, canvas escapes, and text overflow.
- The unchanged product baseline passed all 23 Vitest files and 213 tests before video authoring. No application runtime, API, product test, deployment, secret, or production state was modified.
- HyperFrames CLI installation was blocked by third-party execution safety review after npm network access failed inside the sandbox. The project therefore records its word timing as explicitly provisional and does not claim HyperFrames lint, validate, inspect, snapshot, Studio, or MP4 completion. Those steps require explicit informed user approval for the CLI; MP4 rendering remains a later review checkpoint.

### 2026-07-21 — HyperFrames transcription, validation, and Studio handoff

- After explicit informed user approval for the third-party CLI, HyperFrames v0.7.64 transcribed the final main narration with Whisper `small.en`: 285 measured words, a 118.84-second final word boundary, and source-backed paragraph cuts. The eight GSAP scene boundaries and storyboard timing now follow those measured pauses rather than proportional estimates.
- Resolved the CLI's duplicate-entry error by separating the 120-second main film and 20-second teaser into independent projects. The teaser now owns local copies of its CSS, GSAP runtime, product screenshots, vehicle art, and narration, so Studio and renderer asset resolution never traverses above the project root.
- HyperFrames lint exited with zero errors for both projects. The main film retains five non-blocking warnings for deliberate media reuse and a 433-line composition; the teaser retains one deliberate media-reuse warning. No warning represents a missing file, invalid path, duplicate root, or runtime failure.
- `hyperframes check` passed both projects with zero runtime, layout, or motion errors. WCAG AA contrast passed 51/51 main-film text checks and 26/26 teaser text checks after correcting terminal-card inheritance; a genuine teaser title/browser overlap and a late main-film browser-bar occlusion were also corrected.
- The required 24-sample inspect passes completed for both timelines with zero errors and zero warnings. Reported info items are intentional slow screenshot zooms cropped by their browser-shell containers and opaque transition covers hiding outgoing content.
- HyperFrames generated and the author visually inspected nine main-film snapshots and nine dense teaser snapshots, including every measured voice/scene boundary and both end holds. Final refinements moved the opening car clear of the thesis, delayed the closing drive until the final sentence, and aligned the teaser's four visual beats to a re-recorded 18.335-second / 45-word narration.
- The corrected local Playwright regression passed both projects with no broken images, console errors, canvas escapes, or clipped text. HyperFrames Studio is live locally at `http://localhost:3027` for the main film and `http://localhost:3026` for the teaser; both endpoints returned HTTP 200.
- HyperFrames emits a generated StaticGuard diagnostic claiming each compiled audio element uses `data-end` without `data-duration`, although both source HTML files declare `data-duration` and all lint, runtime, check, inspect, snapshot, and Studio operations complete. This is recorded as a CLI v0.7.64 tooling note rather than hidden or misreported as a source error.
- Independent read-only review initially identified missing captions, missing Codex/runtime-role evidence, narration-only sound scope, and a non-reproducible review command block. The corrected source now consumes 45 main and nine teaser caption cues, explicitly shows `Codex built it · GPT-5.6 advises inside it` plus `23 files / 213 tests`, reserves licensed underscore/SFX for a post-approval export pass, validates every local media/script/style asset, and documents a two-terminal review workflow with per-project snapshot destinations.
- No MP4 was rendered. Export remains intentionally gated on human Studio review, and no product runtime, API, deployment, secret, PR, or production state changed during video validation.

### 2026-07-21 — Inspector backdrop correction

- Reproduced the reported 40–58-second dark overlay at six explicit HyperFrames timestamps and traced it to the first-party `planned-inspector.png` capture, not the composition transitions. The same screenshot carried Radix Dialog's `bg-black/55` backdrop into both the Idea and bounded Test Drive scenes.
- Added a reproducible Playwright capture that keeps the Decision receipt drawer visible while making only its screenshot backdrop transparent. Pixel-level regression checks now reject both a dimmed product surface and an accidentally blank inspector.
- Rebuilt the nine-frame main-film contact sheet and visually verified 40, 44, 47.8, 48.4, 52, and 57.8 seconds without the dark mask. HyperFrames check passed with zero runtime, layout, or motion errors and 51/51 contrast checks; the targeted inspect pass returned zero errors and zero warnings. The complete project gate passed lint, all 23 Vitest files and 213 tests, and the production build.

### 2026-07-21 — Claude-reviewed narration correction

- Consulted Claude through the user-requested ModelNexus workflow. Most proposed edits were rejected after checking the shipped v0.5 product: the runtime does use deterministic rules and visible provenance, it includes two server routes, and Scrapyard intentionally preserves history rather than claiming nothing is deleted.
- Adopted the one factually stronger scope correction: `one user, browser-local persistence, no login, and collaboration honestly out of scope.` The visual boundary card remains `No fake collaboration` because this task changed spoken copy rather than the already accurate product graphic.
- Re-recorded Samantha at 140 words per minute in the existing 24 kHz mono PCM format. The revised narration measures 119.281 seconds, contains 285 transcribed words, and ends at 119.26 seconds inside the fixed 120-second composition.
- Re-transcribed with HyperFrames Whisper `small.en`, rebuilt 45 caption cues, and realigned scene, transition, storyboard, and timing metadata to the new word boundaries. The 20-second teaser and its narration were left unchanged.
- Static and local layout checks passed. HyperFrames check passed with zero runtime, layout, or motion errors and 51/51 contrast checks; the 24-sample inspect returned zero errors and zero warnings. Nine late-film frames and the refreshed official contact sheet were visually inspected without caption clipping or scene-boundary regression.
- The complete repository gate passed ESLint, all 23 Vitest files and 213 tests, TypeScript, and the Next.js production build with both API routes present. No MP4, deployment, API request, secret, PR, or production state changed.
