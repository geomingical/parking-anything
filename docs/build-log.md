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
