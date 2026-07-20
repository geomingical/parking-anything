# Parking Anything Build Log

## Scope

This primary Codex task implements the approved Parking Anything v0.4 specification for OpenAI Build Week. The judge-first boundary is one AI Tools parking zone, one local user, localStorage persistence, URL analysis, evidence-backed lifecycle decisions, and grounded Manager Patrol recommendations. No roadmap UI or out-of-scope account, cloud-persistence, social, achievement, or extra-zone features were added during bootstrap.

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

## GPT-5.6 Runtime Use

No product runtime request has been made. GPT-5.6 will be called only from server-side route handlers after the dedicated event key is entered locally at the explicit human checkpoint.

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

## Known Tradeoffs

- npm reported two moderate dependency advisories during installation. No unplanned `npm audit fix --force` was applied; production dependency impact will be inspected during the release gate.
- The MVP intentionally uses browser-local persistence and has no account or cross-device synchronization.
