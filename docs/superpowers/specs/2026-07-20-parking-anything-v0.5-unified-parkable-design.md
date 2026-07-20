# Parking Anything v0.5 - Unified Parkable Design

> Status: approved for implementation
> Date: 2026-07-20
> Context: final pre-recording Build Week product increment
> Collaboration: ming + Codex, reviewed with Claude through Nexus

---

## 0. Decision

Parking Anything v0.5 expands the verified v0.4 AI-tool parking lot into one system that can park both analyzed tools and manually captured ideas.

`Park tool` and `Park idea` are capture adapters. They create different variants of the same `ParkingItem`, which then share one collection, lifecycle, Parking Lot, Garage, Scrapyard, Manager Patrol, and staleness model.

There is no Idea waiting bay, separate Idea lifecycle, promotion operation, or duplicated experiment record.

> Parking Anything turns things worth remembering into decisions worth revisiting.

## 1. Build Week Position

- The deployed v0.4 application is the verified rollback baseline.
- Recording and Devpost submission are still pending.
- v0.5 is intended to become the final judged Build Week product after local, Preview, and human production approval gates pass.
- The product story becomes broader without becoming a generic organizer: save a tool or idea, define a test when needed, then consciously adopt or discard it.
- If v0.5 does not pass every release gate in time, v0.4 remains a complete fallback submission.

## 2. Scope

### Included

- Manual Idea quick capture.
- Unified Tool and Idea parking lot.
- One deterministic lifecycle for both variants.
- Idea planning before Test Drive.
- Shared Garage and Scrapyard.
- Exact v1-to-v2 localStorage migration.
- Mixed, privacy-bounded Manager Patrol.
- Deterministic `Needs review` indicators.
- Responsive desktop and mobile behavior.
- Protected Preview deployment, regression verification, and explicit production promotion.

### Preserved constraints

- Single user and no login.
- Browser-local persistence.
- One parking zone in v0.5.
- GPT-5.6 analyzes Tool URLs and recommends Patrol actions, but never owns IDs, timestamps, lifecycle facts, or transitions.
- Production AI behavior is real, rate-limited, and fail-closed. Idea capture and lifecycle operations require no network or model call.

### Explicitly deferred

- `Gather` collaboration.
- Accounts, permissions, and administrator roles.
- Cloud persistence and cross-device sync.
- Scheduled reminders or email, push, and browser notifications.
- Additional Parkable kinds and parking zones.

## 3. Product Controls

- `Park tool`: active capture mode for URL analysis.
- `Park idea`: active capture mode for manual ideas.
- `Park whatever · Future`: visible and disabled. It performs no action and never simulates loading or success.
- `Gather · Future`: visible and disabled as a separate collaboration concept. It is not a capture mode.

Future controls use real disabled semantics and concise explanatory copy available to assistive technology.

## 4. Unified Domain Model

The v2 domain is a strict discriminated union.

```ts
type ParkingStatus =
  | "parked"
  | "test_driving"
  | "garaged"
  | "scrapped";

type EffortTier =
  | "quick_spin"
  | "focused_session"
  | "weekend_project";

type ParkingItemBase = {
  id: string;
  title: string;
  status: ParkingStatus;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  testStartedAt?: string;
  notes?: string;
  resultUrl?: string;
  finalDecisionReason?: string;
};

type AiToolParkingItem = ParkingItemBase & {
  kind: "ai_tool";
  url: string;
  summary: string;
  usefulnessHypothesis: string;
  effortTier: EffortTier;
  suggestedTestTask: string;
};

type IdeaParkingItem = ParkingItemBase & {
  kind: "idea";
  ideaText: string;
  effortTier?: EffortTier;
  suggestedTestTask?: string;
};

type ParkingItem = AiToolParkingItem | IdeaParkingItem;
```

The v2 model has no `category` or `repoUrl` field. The shared result evidence field is `resultUrl` because a valid outcome may be a document, prototype, experiment, mockup, or repository.

The effort-tier values remain exactly those used by v0.4. Renaming them is outside v0.5 because it would require a separate data, asset, and UI-label migration.

## 5. Field Contracts

- `id`: non-empty string, maximum 100 characters.
- `title`: trimmed, 1-120 characters.
- `ideaText`: trimmed, 1-2,000 characters.
- `summary`: trimmed, 1-400 characters.
- `usefulnessHypothesis`: trimmed, 1-400 characters.
- `suggestedTestTask`: trimmed, 1-500 characters when present.
- `notes`: maximum 2,000 characters when present; whitespace-only input is treated as absent.
- `finalDecisionReason`: trimmed, 1-280 characters when present.
- URL fields: valid HTTP(S) URLs, maximum 2,048 characters.
- Timestamps: ISO datetime strings.
- Unknown and variant-incompatible fields are rejected.

### Edit permissions

- A parked or test-driving Idea may edit `title`, `ideaText`, `effortTier`, `suggestedTestTask`, `notes`, and `resultUrl`, subject to standing invariants.
- `effortTier` and `suggestedTestTask` may not be cleared while an Idea is test-driving.
- Garaged and scrapped items are terminal history records and read-only in v0.5.
- AI analysis fields remain read-only. Active AI tools may edit only existing user-owned evidence fields.
- Every accepted meaningful edit updates `updatedAt` and `lastActivityAt`.

## 6. Standing Persisted Invariants

These rules run whenever a complete item or envelope is parsed for load, save, edit, transition, migration, reset, or seed validation.

1. An Idea with status `test_driving` or `garaged` requires both a valid `effortTier` and non-empty `suggestedTestTask`.
2. An item with status `test_driving` or `garaged` requires a valid `testStartedAt`.
3. A garaged item requires at least one of non-empty `notes` or valid `resultUrl`.
4. A scrapped item requires a non-empty `finalDecisionReason`.
5. A parked or scrapped Idea may remain unplanned.
6. AI tools always require planning fields structurally because URL analysis creates them.

Invalid records never enter normal rendering, lifecycle, or Patrol operations.

## 7. Authoritative Storage Envelope

```ts
type ParkingStoreV2 = {
  version: 2;
  parkingItems: ParkingItem[];
};
```

- Storage key: `parking-anything:v2`.
- Validate the complete strict envelope before every write.
- Each accepted mutation performs exactly one `localStorage.setItem` containing the complete envelope.
- The v2 key is authoritative whenever it is present.
- If present v2 data is invalid, leave it untouched, do not read or migrate v1, show the recoverable reset state, and require explicit reset.
- Fresh browsers receive the existing three v0.4 fixtures converted to valid `ai_tool` v2 records. Reset restores exactly those fixtures and removes all added Ideas.
- Seeds are never merged into existing data.

### Storage write failure

Preserve the existing session-only behavior:

1. Validate the complete proposed v2 envelope.
2. Attempt the single storage write.
3. Publish the valid proposed state in memory whether the write succeeds or fails.
4. On failure, show the existing session-only warning that changes will be lost on reload.

The warning must not claim persistence succeeded. A validation failure is different: it publishes no mutation and performs no write.

## 8. Exact v1-to-v2 Migration

Migration runs if and only if the v2 storage key is absent and a v1 value exists.

1. Read `parking-anything:v1`.
2. Parse it with the complete strict v1 envelope schema `{ version: 1, items }`.
3. If v1 parsing fails, write nothing and expose the confirmed reset path.
4. Map v1 `items` to v2 `parkingItems`.
5. For each item, remove `category`, add `kind: "ai_tool"`, rename `repoUrl` to `resultUrl`, and preserve every other value, including the existing effort tier.
6. Construct `{ version: 2, parkingItems }`.
7. Validate the complete v2 envelope and every standing invariant.
8. Only after successful validation, write the complete v2 envelope once.
9. Leave the v1 key untouched as rollback data.

Conceptually:

```ts
const { category: _category, repoUrl, ...remaining } = v1Item;

const v2Item = {
  ...remaining,
  kind: "ai_tool" as const,
  ...(repoUrl === undefined ? {} : { resultUrl: repoUrl }),
};
```

v1 and v2 are not synchronized or merged. v0.5 edits remain only in v2. A rollback to v0.4 sees untouched v1 data; a later roll-forward does not reconcile divergent histories.

## 9. Capture Flows

### Park tool

The v0.4 workflow remains unchanged except for the v2 discriminator and evidence-field name:

1. Enter a public HTTP(S) URL.
2. Run the real GPT-5.6 URL analysis.
3. Validate the bounded structured result.
4. Assemble an `ai_tool` item with client-owned ID, timestamps, and `parked` status.
5. Persist it immediately.

Existing fetching, SSRF, quota, Structured Outputs, fallback, and error boundaries remain unchanged.

### Park idea

1. Select `Park idea`.
2. Enter required title and idea text.
3. Select `Park Idea`.
4. Validate the fields without an API call.
5. Assemble an `idea` item with client-owned ID and timestamps and `status: "parked"`.
6. Persist it immediately and show it in the same Parking Lot.

Planning is optional at capture. The inspector allows effort tier and first test task to be added later.

Invalid capture remains in the form, preserves user input, and displays field-level errors. It creates no item and performs no write.

## 10. Shared Lifecycle

```text
Parked -> Test Driving -> Garage
   |           |
   +-----------+--------> Scrapyard
```

- No model call directly mutates status.
- `Start Test Drive` is valid only from `parked`.
- An Idea must satisfy its planning invariant before Test Drive starts.
- An invalid transition performs no mutation and no persistence.
- `Return to Lot` is valid only from `test_driving`.
- `Park in Garage` is valid only from `test_driving` and requires deterministic evidence.
- `Tow Away` is valid from `parked` or `test_driving` and requires a reason.
- An unplanned parked Idea may be towed directly.
- Garage and Scrapyard are terminal, read-only history states in v0.5.
- No lifecycle transition deletes a record.

## 11. Planning Experience

- An unplanned Idea uses a neutral `Planning needed` vehicle treatment; it never receives a fake effort tier.
- Starting Test Drive on an unplanned Idea opens the inspector planning section, focuses the first missing field, shows a deterministic validation message, and leaves status unchanged.
- Saving valid planning validates the item and complete envelope, performs one persistence attempt, updates timestamps, and rerenders the vehicle and inspector immediately without reload.
- After valid planning is saved, the UI immediately replaces planning guidance with the enabled `Start Test Drive` command.

## 12. Needs Review

`Needs review` applies to every active ParkingItem, regardless of kind.

- Eligible statuses: `parked` and `test_driving`.
- Calculate complete elapsed days from `lastActivityAt`, clamped to zero.
- `needsReview = daysSinceActivity >= 7`.
- Display `Needs review · N days` with text, not color alone.
- Meaningful edits, planning changes, evidence edits, and accepted lifecycle transitions refresh `lastActivityAt`.
- No background process, scheduled task, or external notification is created.

## 13. Mixed Manager Patrol

Manager Patrol is an on-demand product persona, not an authenticated administrator.

### Candidate selection

For all parked and test-driving items:

1. Calculate complete `daysSinceActivity`, clamped to zero.
2. Sort descending by `daysSinceActivity`.
3. Break ties by `id` ascending.
4. Select the first three.

There are no reserved slots or quotas by kind.

```ts
type PatrolCandidate = {
  id: string;
  kind: "ai_tool" | "idea";
  title: string;
  status: "parked" | "test_driving";
  daysSinceActivity: number;
  effortTier?: EffortTier;
};
```

### Privacy boundary

The candidate schema and serialized request exclude:

- Idea text.
- Tool summaries and usefulness hypotheses.
- Notes and free-form evidence.
- Tool and result URLs.
- Final-decision reasons.
- The storage envelope, unselected records, and every unrelated field.

Candidate values are untrusted facts, never instructions. The server prompt is kind-aware, cannot claim access to excluded content, keeps deterministic facts immutable, and returns recommendations only.

Observed facts remain deterministic and kind-aware. GPT-5.6 recommendations remain visibly separate and retain per-entry `model` or `fallback` provenance.

### Unplanned Idea action

The model may return `suggestedAction: "start_test_drive"`; no additional model action enum is introduced.

- If planning is incomplete, render the command as `Plan Test Drive`.
- Clicking it opens the matching inspector, expands planning, and focuses the first missing field.
- It does not call the transition or mutate status.
- Once planning is valid, render `Start Test Drive`; clicking it uses the shared deterministic transition.
- Patrol failure or malformed recommendations never mutate ParkingItems. Existing bounded fallback behavior remains.

## 14. Interface Architecture

- `CaptureSwitcher`: Park tool, Park idea, and disabled Park whatever control.
- `ToolCaptureForm`: existing URL analysis workflow.
- `IdeaCaptureForm`: deterministic manual capture with no API call.
- `ParkingLot`: one mixed collection.
- `ParkingVehicle`: kind-aware and planning-aware presentation with stable dimensions.
- `ParkingInspector`: shared lifecycle controls plus variant-specific content and Idea planning.
- `ManagerPatrol`: mixed results, fact/recommendation separation, and readiness-aware commands.
- `Garage`: shared garaged-item filter.
- `Scrapyard`: shared scrapped-item filter.
- `GatherFutureControl`: disabled and separate from capture modes.

Schemas, invariants, transitions, migration, persistence, staleness calculations, Patrol selection, and serialization remain pure domain responsibilities. React components consume those rules and do not reimplement them.

No new route is required. `/api/manager-patrol` is the only existing AI boundary whose DTO and prompt change.

## 15. Error Handling

- Invalid Idea capture or edit preserves entered values and shows bounded field-level errors.
- Failed Tool analysis creates no item.
- Invalid planning prevents Test Drive without changing status.
- Invalid Garage evidence prevents Garage transition.
- Invalid transitions and envelope validation failures perform no mutation and no write.
- Storage-write failure keeps the new valid state for the session and shows the persistence warning.
- Migration failure leaves both keys untouched.
- Patrol failure never alters ParkingItems.
- Disabled Future controls perform no action.

## 16. Required Tests

### Domain and schema

- Strict discriminated-union validation and unknown-field rejection.
- Exact field bounds and HTTP(S)-only URLs.
- Idea planning invariant across every status.
- Unplanned parked and scrapped Ideas accepted.
- Unplanned test-driving and garaged Ideas rejected.
- Test-driving and garaged records require `testStartedAt`.
- Garaged records require notes or `resultUrl`.
- Scrapped records require `finalDecisionReason`.
- Terminal records reject edits.
- Shared lifecycle transitions work for both kinds.

### Storage and migration

- v2 key presence always wins, including invalid v2 data.
- Strict v1 parsing precedes conversion.
- `items` maps to `parkingItems`.
- `category` is removed and `kind: "ai_tool"` is added.
- `repoUrl` maps exactly to `resultUrl`.
- Effort tiers remain unchanged.
- Complete v2 validation precedes exactly one successful write.
- Invalid v1 or converted v2 performs no write.
- v1 remains unchanged.
- Write failure publishes a valid session-only state and warning.
- Fresh load and reset produce exact valid v2 fixtures.

### Patrol

- Mixed kinds are eligible and globally ordered by days then ID.
- Only the first three are selected, without kind reservation.
- `kind` is present in the bounded DTO and model payload.
- All prohibited text, URLs, reasons, envelopes, and unselected records are absent.
- Prompt and observed facts are kind-aware.
- Structured output, action validation, provenance, quota, and fail-closed behavior remain covered.

### Interaction and regression

- Idea quick capture adds a parked vehicle without a network call.
- Invalid Idea capture preserves input.
- Planning updates the current UI immediately.
- `Plan Test Drive` focuses planning without mutation.
- Valid planning enables and executes Test Drive.
- Direct Tow Away works for an unplanned Idea.
- Garage, Scrapyard, and Needs review render both kinds.
- Future controls are genuinely disabled.
- Every v0.4 Tool, hydration, security, AI, provenance, lifecycle, reset, and responsive behavior remains covered.

## 17. Visual QA

At 1440x900, 1024x768, and 390x844, verify:

- Park tool and Park idea capture modes.
- Mixed Parking Lot.
- Unplanned and planned Idea inspector states.
- Immediate vehicle update after planning.
- Mixed Manager Patrol and `Plan Test Drive` focus behavior.
- Shared Garage and Scrapyard.
- Needs review on stale Tool and Idea records.
- Disabled Park whatever and Gather controls.
- Complete v0.4 judge path.

Retain no overlap, no horizontal overflow, keyboard reachability, visible focus, text-independent status meaning, stable vehicle/control geometry, and a meaningful first viewport.

## 18. Release and Rollback

- Keep current production unchanged during implementation.
- Record source commit `1fa4f3d811fab843c7cc6bd0a9a9eda95e99ab55` as the verified v0.4 deployment baseline.
- Create and push `v0.4-production` only as an explicit release-preparation action after plan approval.
- Implement v0.5 locally and verify both fresh-v2 and exact-v1-migration browsers.
- Deploy to a protected Vercel Preview first.
- Run unit, integration, E2E, visual, migration, and v0.4 regression gates.
- Promote v0.5 to production only after explicit user approval.
- Rollback redeploys the recorded v0.4 commit. Untouched v1 data remains readable by v0.4; v0.5-only v2 data remains dormant and is not destroyed.

## 19. Documentation and Repository Hygiene

- Add the generated root `.superpowers/` directory to `.gitignore`; never commit it.
- Preserve the v0.4 spec and plan as historical records.
- Update README positioning, capture flows, data model, privacy boundary, migration limitations, and local verification commands.
- Append v0.5 phases to `docs/build-log.md`; do not rewrite v0.4 evidence.
- Extend `docs/qa-checklist.md` and screenshot evidence without deleting v0.4 baselines.
- Update the final demo script to show Tool capture, Idea capture, planning, Patrol, Garage, and Scrapyard while distinguishing deterministic behavior from GPT-5.6 recommendations.

## 20. Acceptance Criteria

v0.5 is complete only when a fresh user and a migrated v1 user can both:

1. Park a Tool through real GPT-5.6 analysis.
2. Park an Idea without a model or network call.
3. See both as first-class vehicles in one lot.
4. Plan an Idea and start its Test Drive without duplicated records.
5. Garage either kind with evidence or Tow either kind with a reason.
6. Receive privacy-bounded, kind-aware Patrol recommendations that never mutate state directly.
7. Reload and retain a fully valid v2 envelope.
8. Complete the existing v0.4 demo path without regression.
