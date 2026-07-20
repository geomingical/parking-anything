# Parking Anything - Design Spec

> Status: approved for implementation (v0.4)
> Date: 2026-07-20
> Context: OpenAI Build Week hackathon project
> Collaboration: ming + Codex (Fugu), reviewed with Codex + Claude via Nexus

---

## 0. Positioning

**Parking Anything** turns digital hoarding into a workflow with deliberate exits.
The user pastes an AI-tool URL. GPT-5.6 identifies what it is, estimates the effort needed to try it, and turns it into a car in a visual parking lot.
The user can test-drive it, record evidence, garage it as an adopted tool, or tow it to the scrapyard and mark it as deliberately scrapped.

> Parking Anything turns saved AI tools into testable decisions, and makes walking away a recorded outcome instead of a failure.

> Most bookmarking tools optimize for saving more. Parking Anything optimizes for deciding what deserves attention and what should leave.

### Primary user

- An individual who regularly saves AI tools, repositories, or demos but rarely returns to evaluate them.
- The Build Week category is **Apps for Your Life**: a personal productivity and digital-decluttering app.

### Product success for the MVP

- A saved item does not remain an anonymous bookmark: it receives a concrete first test task.
- The user can move it to an evidence-backed outcome: `garaged` or `scrapped`.
- The demo proves both paths in one coherent session.

---

## 1. Scope Decision

- Build one focused MVP with one memorable moment, not a broad platform.
- Implement one usable parking zone only: **AI Tools**.
- Keep travel, ideas, meetups, and social concepts out of the product UI. Mention them only in README and submission future-work material.
- Prioritize a working, repeatable demo over extra routes, account systems, or decorative animation.

### Core AI capabilities

1. **Paste URL -> GPT-5.6 analysis -> car created**
   - Output: title, summary, effort tier, usefulness hypothesis, and a concrete first test task.
2. **Manager Patrol**
   - Reviews deterministic stale-item candidates and generates grounded recommendations in one consistent Parking Attendant voice.
   - MVP uses an on-demand patrol button. Scheduled email is roadmap only.

### Narrative focus

- The central story is digital decluttering: saved tools should become tested skills or conscious rejections.
- URL analysis is the entry experience.
- The demo climax is the manager surfacing an old item and the user towing it to the scrapyard with a recorded reason.

---

## 2. Users and Auth

- Single user, no login.
- Local browser data is sufficient for the complete story.
- Accounts, sharing, collaboration, and social discovery are explicitly out of scope.

---

## 3. Visual Direction

- Bird's-eye parking-lot grid.
- Each car represents one saved item.
- Use a daylight municipal-parking visual language: asphalt gray, safety yellow, neutral white, garage green, and scrapyard red. Do not let one hue dominate the interface.
- Car shape and color reflect effort tier; status is also shown with a text label so color is never the only signal.
- Status labels:
  - `Parked`: waiting for evaluation.
  - `Test Driving`: currently being tested.
  - `Garaged`: adopted or learned, with supporting evidence.
  - `Scrapped`: deliberately rejected and retained in history.
- The **action** remains `Tow Away`; the **destination** remains `Scrapyard`; the persisted terminal **status** is `scrapped`.
- Use a small coherent set of custom top-down car assets rather than emoji. Keep movement to three purposeful transitions: a new car enters, a car changes zone, and a towed car exits.
- The parking lot is the primary canvas. Selecting a car opens an inspector; do not turn the experience into a generic dashboard or a nested-card layout.
- Patrol output visually separates **Observed Fact** (deterministic system data) from **GPT-5.6 Recommendation** (model judgment and rationale).

---

## 4. Core Loop and State Machine

1. User pastes an AI-tool URL.
2. GPT-5.6 returns a structured analysis.
3. The client creates a `parked` item and persists it locally.
4. User may start a test drive or scrap the item directly after deciding it is not worth testing.
5. During a test drive, the user records notes and optionally a repo/result link.
6. User returns the item to the lot, garages it, or scraps it.

### Allowed transitions

| From | Allowed destination | Required evidence |
|---|---|---|
| `parked` | `test_driving` | None |
| `parked` | `scrapped` | `finalDecisionReason` |
| `test_driving` | `parked` | None |
| `test_driving` | `garaged` | At least one of `notes` or `repoUrl` |
| `test_driving` | `scrapped` | `finalDecisionReason` |
| `garaged` | None in MVP | Terminal history state |
| `scrapped` | None in MVP | Terminal history state |

### State rules

- `Park in Garage` is available only from `test_driving`.
- `Tow Away` is available from `parked` and `test_driving`.
- Directly scrapping a parked item is intentional: deciding not to spend time on a tool is a valid decluttering outcome.
- `garaged` and `scrapped` are not deleted. They remain accessible through filters.
- MVP does not provide restore/undo transitions for terminal states.
- Every accepted transition updates `updatedAt` and `lastActivityAt`.

---

## 5. Technical Stack and Build Week Use

- `Next.js + TypeScript`.
- Tailwind CSS for layout and visual styling.
- OpenAI Responses API through server-side route handlers; `OPENAI_API_KEY` is never exposed to the browser.
- Endpoint-specific runtime defaults:
  - `OPENAI_ANALYZE_MODEL=gpt-5.6-luna` for short, structured, latency-sensitive URL analysis.
  - `OPENAI_PATROL_MODEL=gpt-5.6-terra` for the more judgment-sensitive patrol recommendation.
- GPT-5.6 Structured Outputs validate dedicated response DTOs, not the full persisted domain object.
- Browser `localStorage` is the only MVP persistence layer. SQLite and Prisma are not fallback scope.
- Deploy a public, no-login live demo to Vercel.
- Use a dedicated event OpenAI project key stored only in local/Vercel server environments. Never commit or expose it to browser code.
- Protect all model-backed routes with a shared Upstash Redis rate limiter, a global daily request cap, bounded model output, and an environment-controlled kill switch.
- Publish the repository publicly with an MIT license.

### Build Week evidence

- The primary implementation session must use Codex with GPT-5.6 and contain the majority of core functionality work.
- Run `/feedback` in that primary build session and retain its Session ID for Devpost.
- During implementation, maintain `docs/build-log.md` with major decisions, Codex contributions, GPT-5.6 runtime usage, tests, and known tradeoffs.
- README and demo narration must explain separately:
  - how Codex with GPT-5.6 accelerated the build;
  - how GPT-5.6 is used inside the running product.

### Judging evidence map

| Official criterion | Evidence to preserve |
|---|---|
| Technological Implementation | Primary `/feedback` session, build log, GPT-5.6 Structured Outputs, state/API tests, deployed runtime |
| Design | Repeatable reset-to-demo flow, coherent single-page lifecycle, responsive and accessible UI |
| Potential Impact | Specific digital-hoarding user, first-test-task intervention, visible `garaged`/`scrapped` outcomes |
| Quality of the Idea | Exit-first alternative to bookmark managers, parking lifecycle metaphor, conscious rejection history |

---

## 6. Data Contracts

```ts
type ParkingItemStatus =
  | "parked"
  | "test_driving"
  | "garaged"
  | "scrapped";

type EffortTier =
  | "quick_spin"
  | "focused_session"
  | "weekend_project";

type AnalyzeUrlResult = {
  title: string;
  summary: string;
  effortTier: EffortTier;
  suggestedTestTask: string;
  usefulnessHypothesis: string;
};

type AnalyzeUrlResponse = {
  analysis: AnalyzeUrlResult;
  sourceMode: "fetched" | "url_only";
  warning?: string;
};

type ParkingItem = AnalyzeUrlResult & {
  id: string;
  url: string;
  category: "ai_tool";
  status: ParkingItemStatus;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  testStartedAt?: string;
  notes?: string;
  repoUrl?: string;
  finalDecisionReason?: string;
};

type PatrolCandidate = Pick<
  ParkingItem,
  "id" | "title" | "effortTier"
> & {
  status: "parked" | "test_driving";
  daysSinceActivity: number;
};

type ModelPatrolRecommendation = {
  itemId: string;
  rationale: string;
  suggestedAction: "start_test_drive" | "return_to_lot" | "scrap";
};

type ManagerPatrolResult = {
  recommendations: ModelPatrolRecommendation[];
};

type PatrolRecommendation = ModelPatrolRecommendation & {
  source: "model" | "fallback";
};

type ManagerPatrolResponse = {
  recommendations: PatrolRecommendation[];
};
```

### Ownership and invariants

- GPT-5.6 owns only fields in `AnalyzeUrlResult` and `ManagerPatrolResult`. The server adds `source` while assembling `ManagerPatrolResponse`.
- The client creates `id` with `crypto.randomUUID()`, sets status, and owns all timestamps and user-entered evidence.
- Persist a complete `ParkingItem` only after validating the API response.
- `finalDecisionReason` is required whenever status becomes `scrapped`.
- `notes` or `repoUrl` is required whenever status becomes `garaged`.
- Staleness is calculated only from `lastActivityAt`, never from `createdAt`.
- Editing notes or repo/result evidence also updates `updatedAt` and `lastActivityAt`.
- Validate bounded field lengths at the API/UI boundary: title 120 characters, summary/usefulness hypothesis 400, suggested test task 500, patrol rationale/final decision reason 280, notes 2,000, and URL fields 2,048.

---

## 7. Single-Page Experience

### Information architecture

- **Mission banner**: `Stop collecting. Start test-driving.` with one short supporting line. It is not called an empty state because seeded cars are present.
- **Primary workspace**:
  - URL input and `Analyze & Park` command.
  - Filter tabs: `Parking Lot`, `Test Driving`, `Garage`, `Scrapyard`.
  - Bird's-eye car grid.
  - Manager Patrol control and result panel.
- **Car Detail / Test Drive inspector**:
  - AI analysis, suggested test task, status-specific actions, notes, repo/result link, and final-decision reason.

### UI behavior

- Garage and Scrapyard are filters over the same local collection, not separate routes.
- `Parking Lot` shows only `parked` items; each other filter maps to its same-named status.
- Terminal items disappear from `Parking Lot` and `Test Driving` but remain visible in their history filters.
- Status-specific actions are hidden or disabled when their transition is invalid.
- `Park in Garage` shows an inline validation message when both notes and repo URL are empty.
- `Tow Away` opens a confirmation step requiring a reason before the transition is committed.
- Loading keeps the input visible, disables duplicate submission, and shows which URL is being analyzed.
- API failure preserves the entered URL and offers retry; a successful URL-only fallback creates the car with a visible, non-blocking warning.
- Manager Patrol renders each deterministic staleness statement under `Observed Fact` and each model-produced action/rationale under `GPT-5.6 Recommendation`.
- First load always shows the deterministic seed fixtures so a judge sees a complete product state before making a live API request.

---

## 8. Server and API Behavior

### Shared public-demo controls

- Apply one shared Upstash Redis-backed limiter to `/api/analyze-url` and `/api/manager-patrol` before any OpenAI request.
- Enforce both a per-IP window and a global daily cap. Store only a one-way hash of the normalized IP identifier; never persist raw IP addresses.
- Default to 10 combined model-backed requests per IP per 10 minutes and 300 combined requests globally per UTC day. Make both values and the window configurable through environment variables.
- Required production configuration: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `RATE_LIMIT_HASH_SECRET`. Runtime controls: `DEMO_API_ENABLED`, `RATE_LIMIT_IP_MAX`, `RATE_LIMIT_IP_WINDOW_SECONDS`, and `RATE_LIMIT_GLOBAL_DAILY_MAX`.
- Return `429` with a bounded `Retry-After` value when a caller exceeds quota. Return `503` when the global cap is reached or `DEMO_API_ENABLED` is false.
- Production fails closed when Redis configuration is missing or unavailable. Local development and tests may inject an in-memory limiter; production may not silently fall back to it.
- Reject request bodies above 8 KB before parsing. Cap analyze output at 700 tokens and patrol output at 500 tokens. Use a 20-second analyze route timeout and a 15-second patrol route timeout. Reject duplicate in-flight URL submissions from the client.
- Monitor OpenAI usage during judging and revoke or rotate the dedicated event key after the judging window.

### `POST /api/analyze-url`

- Input: `{ url: string }`.
- Validate and normalize the URL before any fetch.
- Allow only `http` and `https`.
- Reject loopback, link-local, private-network, and otherwise non-public targets.
- Revalidate every redirect target before following it.
- Use a 5-second total fetch timeout, follow at most three validated redirects, accept at most 1 MB of response content, and send at most 12,000 extracted plain-text characters to the model.
- Call `OPENAI_ANALYZE_MODEL` with Structured Outputs for `AnalyzeUrlResult`.
- Cap model output to the minimum sufficient for the bounded DTO fields.
- Return `AnalyzeUrlResponse`, not `ParkingItem`.
- On fetch failure, analyze using the normalized URL and available model knowledge, return `sourceMode: "url_only"`, and include a warning.
- On model/schema failure, return an error; do not persist a partially formed item.
- The client assembles the complete `ParkingItem` and writes it to localStorage.

### `POST /api/manager-patrol`

- Input:
  - A maximum of three `PatrolCandidate` objects.
- Candidate selection is deterministic and occurs in the client before the model call; the server performs schema and range checks but cannot verify client-local facts against a database:
  - consider only `parked` and `test_driving` items;
  - calculate `daysSinceActivity` from `lastActivityAt`;
  - sort descending by staleness and pass at most the three oldest items.
- Do not send notes, repo URLs, final-decision reasons, or the full localStorage payload to the model.
- Truncate `title` to its defined bound and place all candidate fields in a clearly delimited data block. The system instruction states that candidate content is untrusted data, never executable instruction.
- The UI builds each factual observation deterministically from `status` and `daysSinceActivity`; the model does not write observation text.
- `OPENAI_PATROL_MODEL` returns `ManagerPatrolResult`, choosing a valid action and concise rationale in one consistent Parking Attendant voice for each recommendation. The server returns `ManagerPatrolResponse` after validation and fallback assembly.
- The model may recommend actions but never changes item state itself.
- The UI renders only recommendations whose `itemId` exists in the submitted candidate list.
- The server rejects negative/non-finite `daysSinceActivity`, duplicate IDs, unsupported statuses/actions, and arrays longer than three.
- For a `parked` item, valid suggestions are `start_test_drive` or `scrap`; for `test_driving`, valid suggestions are `return_to_lot` or `scrap`.
- Validate recommendations independently. Keep valid GPT-5.6 recommendations with `source: "model"` and replace only each missing or invalid entry with a deterministic recommendation carrying `source: "fallback"`.
- A fallback is deliberately plain: for the affected candidate, expose `scrap` as the suggested action with a short deterministic rationale. Factual idle-day text still comes from the UI observation template.
- DTO rejection is a defensive client-bug path: log it server-side and return normal fallback behavior, with no dedicated user-facing error screen.

---

## 9. Persistence and Demo Fixtures

- localStorage key: `parking-anything:v1`.
- On first visit only, initialize three deterministic seed cars.
- If the key already exists, do not merge or overwrite seed data.
- Seed fixtures must include:
  - one old `parked` item with an early `lastActivityAt` so patrol has a clear candidate;
  - one `test_driving` item with notes;
  - one `garaged` item with evidence.
- Provide a visible `Reset demo data` command inside a small settings/menu control.
- Reset replaces local data with the exact seed fixture after confirmation.
- Persistence failures show a warning and keep the current in-memory state usable for the session.
- Malformed or wrong-version stored data is not silently coerced; offer the user the confirmed demo reset path.

---

## 10. Demo Script (100-120 seconds)

1. **0-10 seconds:** Open on the seeded parking-lot overview and state the problem: people collect AI tools but rarely decide what deserves their time.
2. **10-35 seconds:** Paste one pre-tested live AI-tool URL. Show the GPT-5.6 loading state, then the generated Parking Ticket with effort tier, usefulness hypothesis, and concrete first test task.
3. **35-55 seconds:** Start the new item's test drive, add short evidence, and park it in the Garage. Briefly expose the evidence-required validation before satisfying it.
4. **55-80 seconds:** Run Manager Patrol. Hold the result long enough to read the deterministic `Observed Fact` and separate `GPT-5.6 Recommendation` for the stale seed car.
5. **80-98 seconds:** Tow the stale item away, enter a concise decision reason, and show it retained under Scrapyard.
6. **98-110 seconds:** Show a concise architecture/evidence frame: GPT-5.6 Structured Outputs, deterministic validators/fallbacks, tests, and server-only API key protection.
7. **110-120 seconds:** Show the Codex build log and repository, then close with:

> Parking Anything is not another place to collect links.
> It turns digital curiosity into a tested skill or a deliberate decision to let go.

The video narration must explicitly distinguish Codex's role in building the product from GPT-5.6's role inside the running product. The `/feedback` Session ID belongs in the Devpost form; the video shows the build log or primary Codex task as supporting evidence rather than centering the opaque ID.

---

## 11. Acceptance Criteria

### URL analysis

- Given a valid public URL, when analysis succeeds, then the response validates as `AnalyzeUrlResponse` and the client creates one `parked` item.
- Given a fetch failure, when URL-only analysis succeeds, then the item is created and a visible fallback warning is shown.
- Given a private or non-HTTP(S) target, when submitted, then the request is rejected before fetching and no item is created.
- Given an invalid model response, when schema validation fails, then no partial item is persisted and retry is available.

### Lifecycle

- Given a `parked` item, when Start Test Drive is confirmed, then it becomes `test_driving` and timestamps update.
- Given a `parked` item, when Tow Away is attempted without a reason, then the transition is blocked.
- Given a `parked` item with a decision reason, when Tow Away is confirmed, then it becomes `scrapped` and appears in Scrapyard.
- Given a `test_driving` item without notes or repo URL, when Park in Garage is attempted, then the transition is blocked with an inline message.
- Given a `test_driving` item with notes or repo URL, when Park in Garage is confirmed, then it becomes `garaged` and retains the evidence.
- Given a terminal item, then no state-changing action is offered in the MVP.

### Persistence and fixtures

- Given saved local data, when the page reloads, then all items and evidence remain unchanged.
- Given existing local data, when the app starts, then seed data is not reinserted or duplicated.
- Given modified demo data, when Reset demo data is confirmed, then the exact three seed fixtures are restored.
- Given malformed or wrong-version local data, when the app starts, then the app offers reset and does not overwrite data without confirmation.

### Manager Patrol

- Given multiple active items, when patrol runs, then at most the three oldest by `lastActivityAt` are sent as candidates.
- Given a patrol result, then factual observation text is produced from the submitted candidate's status and idle days, not from model prose.
- Given a recommendation with an action invalid for that candidate's status, then only that entry receives deterministic fallback content.
- Given one invalid model recommendation in a multi-item response, then valid sibling recommendations are retained.
- Given an API failure with at least one candidate, then the fallback recommends one valid action for the oldest candidate and is visibly deterministic rather than presented as model output.
- Given no active candidates, when patrol runs, then the UI shows a deterministic all-clear state without calling the model.
- Given a rendered `source: "model"` recommendation, then deterministic staleness text appears under `Observed Fact` and model rationale appears under `GPT-5.6 Recommendation`.
- Given a rendered `source: "fallback"` recommendation, then it is labeled as a deterministic fallback and is not presented as GPT-5.6 output.

### Public demo protection

- Given either model-backed route, when quota is available, then the request consumes the shared limiter before calling OpenAI.
- Given a caller above its window quota, when either route is requested, then the server returns `429`, includes `Retry-After`, and does not call OpenAI.
- Given a reached global daily cap or disabled kill switch, when either route is requested, then the server returns `503` and does not call OpenAI.
- Given production without usable Redis configuration, when a model-backed route is requested, then it fails closed and does not use an in-memory fallback.
- Given logs and stored limiter keys, then raw OpenAI secrets and raw IP addresses are absent.

### Demo readiness

- The complete script can be repeated after reset without manually clearing browser storage.
- The flow remains demonstrable if live page fetching fails.
- The deployed app exposes no API key and has no critical console or network errors during the script.
- A fresh browser sees all three seed fixtures before using live AI.
- Desktop and mobile layouts preserve readable labels, usable controls, and non-overlapping content.
- The recorded end-to-end demo completes in no more than 120 seconds before submission-only closing material.

---

## 12. Delivery Guardrails and Human Checkpoints

### Primary build task

- Start one fresh Codex task after this spec and its implementation plan are approved.
- That task initializes the repository and performs the majority of core implementation, tests, documentation, deployment preparation, and visual QA.
- Maintain `docs/build-log.md` from the first implementation phase and commit at phase boundaries so context compaction or an interrupted task does not erase the evidence chain.
- Run `/feedback` in the primary build task after the core product and verification work are complete; retain that Session ID for Devpost.

### Human-required checkpoints

- Before the first real OpenAI request: the user creates a dedicated event project key and enters it directly into `.env.local`; the key is never pasted into chat.
- Before the first production AI request: the user configures the OpenAI key and Upstash credentials in Vercel environment variables.
- After the first complete local flow: the user approves the core UX before time is spent on optional animation or asset polish.
- After deployed smoke testing: the user approves the live demo before recording.
- The user records narration, uploads the public YouTube video, obtains the `/feedback` Session ID, and submits the Devpost form.

### Go/No-Go schedule

- By the end of July 20 (Taipei): URL analysis, car creation, persistence, and the lifecycle state machine work end to end. If not, remove all nonessential animation and asset variation immediately.
- By July 21 at 12:00 (Taipei): Manager Patrol, shared limiter, and one deployment smoke test work end to end. If Patrol is incomplete, keep one recommendation for the oldest candidate and prioritize a valid grounded result over multi-candidate polish.
- By July 21 at 18:00 (Taipei): freeze product logic. Only fix submission-blocking defects, accessibility/overlap problems, documentation, and demo reliability after this point.
- Submit by July 22 at 00:00 (Taipei), preserving an eight-hour buffer before the official July 22 at 08:00 deadline.
- If public AI protection or deployment remains unstable at code freeze, disable production AI with the kill switch, preserve the fully interactive seeded workflow, and use the verified local live-AI flow in the video. A working repository and video take priority over an unsafe public endpoint.

## 13. Non-Goals for MVP

- Account system or cloud sync.
- Scheduled email.
- Multi-user sharing or social discovery.
- Working travel, ideas, meetup, carpool, used-car, or roadside-assistance modules.
- SQLite, Prisma, or another database.
- Independent Garage or Scrapyard routes.
- Complex vehicle animation, rarity, achievements, or gamification systems.
- Runtime persona selection or multiple Parking Attendant voices.
- Roadmap labels, teaser boards, or future modules inside the MVP interface.

---

## 14. Phase 2 Vision

The MVP proves the personal loop: save -> test -> garage or scrap. Later versions may turn resolved digital interests into real-world connection.

- **Meetups**: share selected garage items or test lists and find nearby people with overlapping interests.
- **Carpool**: test the same tool with a small accountability group.
- **Used-car Lot**: publish evidence, repo links, and lessons learned as a reusable tool history.
- **Roadside Assistance**: ask experienced users for help when a test drive stalls.
- **Rest Stops**: extend the metaphor to saved places and local activities.

These concepts belong in README and the submission's future-impact narrative, not the MVP interface or implementation plan.

---

## 15. Locked Decisions

- [x] Apps for Your Life category.
- [x] Single AI Tools zone, single user, no login.
- [x] Bird's-eye parking-lot grid.
- [x] Next.js + TypeScript + OpenAI Responses API + localStorage.
- [x] URL analysis defaults to `gpt-5.6-luna`; Manager Patrol defaults to `gpt-5.6-terra`, each configurable through its endpoint-specific environment variable.
- [x] AI output uses dedicated Structured Output DTOs; AI never creates IDs, timestamps, statuses, or user evidence.
- [x] Persisted terminal status is `scrapped`; action is `Tow Away`; destination is `Scrapyard`.
- [x] A parked item may be scrapped directly with a required decision reason.
- [x] Garage requires notes or a repo/result link.
- [x] Garage and Scrapyard are filters, not routes.
- [x] Manager candidate selection and failure fallback are deterministic; GPT-5.6 provides grounded judgment in one Parking Attendant voice.
- [x] Staleness is based only on `lastActivityAt`.
- [x] Seed initialization happens once; demo reset is mandatory.
- [x] Manager Patrol replaces scheduled email in MVP.
- [x] Roadmap concepts are absent from the MVP UI and appear only in README/submission future-work material.
- [x] Patrol UI labels deterministic facts separately from GPT-5.6 recommendations.
- [x] The public live demo is no-login, uses a dedicated server-only event key, and protects both AI routes with shared Redis-backed quotas and a kill switch.
- [x] The repository is public and MIT-licensed.
- [x] The primary Codex build session, `/feedback` Session ID, build log, README, and narrated demo form one Build Week evidence chain.

---

## 16. Non-Blocking Polish Decisions

These choices may be finalized during implementation without changing architecture or product behavior:

- Exact top-down car asset set and effort-tier color mapping, provided labels remain readable without color.
- Exact wording of the supporting sentence below `Stop collecting. Start test-driving.`
- The specific three AI-tool seed examples, provided they preserve the fixture statuses and timestamps defined above.
