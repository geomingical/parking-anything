# Parking Anything v0.5 Unified Parkable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add manual Idea capture as a first-class Parkable while preserving the v0.4 Tool workflow, one lifecycle, privacy-bounded Manager Patrol, and a rollback-safe production baseline.

**Architecture:** Replace the v1 Tool-only persisted record with a strict v2 discriminated union, migrate v1 exactly once when the v2 key is absent, and keep all lifecycle and persistence rules in pure domain modules. React adds two capture adapters and variant-aware rendering over one store; the existing Patrol route receives only the expanded bounded DTO. Production remains on v0.4 until local, Preview, visual, and human approval gates pass.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod 4, Vitest, Testing Library, Playwright, OpenAI Responses API Structured Outputs, browser localStorage, Vercel.

**Authoritative spec:** `docs/superpowers/specs/2026-07-20-parking-anything-v0.5-unified-parkable-design.md`

---

## File Map

### Create

- `src/lib/parking/storage-v1.ts`: frozen strict v1 read contract and pure v1-to-v2 converter.
- `src/lib/parking/storage-v1.test.ts`: exact conversion and rejection tests.
- `src/lib/parking/activity.ts`: shared elapsed-day and Needs-review calculations.
- `src/lib/parking/activity.test.ts`: timestamp boundary tests.
- `src/components/parking/capture-switcher.tsx`: accessible Park tool/Park idea selector and disabled future control.
- `src/components/parking/tool-capture-form.tsx`: extracted v0.4 URL-analysis form.
- `src/components/parking/idea-capture-form.tsx`: network-free manual Idea capture.
- `src/components/parking/idea-capture-form.test.tsx`: capture validation and no-network tests.

### Modify

- `.gitignore`: exclude the generated root `.superpowers/` directory.
- `src/lib/parking/schemas.ts` and tests: strict v2 union, standing invariants, bounded mixed Patrol DTO.
- `src/lib/parking/fixtures.ts` and tests: exact v2 versions of the three existing fixtures.
- `src/lib/parking/storage.ts` and tests: v2 authority, absent-key migration, one-write persistence.
- `src/lib/parking/transitions.ts` and tests: shared variant transitions and Idea planning gate.
- `src/lib/parking/patrol.ts` and tests: shared activity calculation, mixed selection, kind-aware facts.
- `src/hooks/use-parking-store.ts` and tests: unified mutations, Idea editing, result evidence, session-only warning.
- `src/components/parking/car-sprite.tsx`: neutral unplanned Idea treatment.
- `src/components/parking/parking-lot.tsx` and tests: mixed vehicles, kind labels, Needs-review indicator.
- `src/components/parking/item-inspector.tsx` and tests: variant content, planning form, readiness focus, shared actions.
- `src/components/parking/manager-patrol.tsx` and tests: Plan Test Drive readiness behavior.
- `src/components/parking/parking-app.tsx` and tests: compose capture modes and one mixed collection.
- `src/lib/server/manager-patrol.ts` and tests: kind-aware bounded prompt payload.
- `src/app/api/manager-patrol/route.test.ts`: mixed DTO regression.
- `e2e/demo-flow.spec.ts`: v1 migration and complete v0.5 judge paths.
- `src/app/globals.css`: responsive additions only where component utilities are insufficient.
- `README.md`, `docs/build-log.md`, and `docs/qa-checklist.md`: v0.5 behavior and evidence.

### Preserve unchanged unless a failing regression proves otherwise

- `src/lib/server/analyze-url.ts` and `/api/analyze-url`: the Tool analysis boundary.
- `src/lib/server/url-safety.ts`, `page-fetch.ts`, `rate-limit.ts`, and `request.ts`: security and quota behavior.
- Existing car image assets and v0.4 screenshot baselines.

---

### Task 0: Protect the v0.4 baseline and repository hygiene

**Files:**
- Modify: `.gitignore`
- Verify: `docs/build-log.md`

- [x] **Step 1: Verify the exact starting state**

Run:

```bash
git status --short --branch
git rev-parse 1fa4f3d811fab843c7cc6bd0a9a9eda95e99ab55
git tag --list v0.4-production
```

Expected: `main` matches its remote except known untracked `.superpowers/`; the commit resolves; the tag is absent.

- [x] **Step 2: Ignore generated brainstorming output**

Add exactly this repository-local pattern:

```gitignore
/.superpowers/
```

Run `git status --short` and confirm `.superpowers/` disappears without being deleted.

- [x] **Step 3: Record the rollback tag locally**

Run:

```bash
git tag -a v0.4-production 1fa4f3d811fab843c7cc6bd0a9a9eda95e99ab55 -m "Verified Parking Anything v0.4 production baseline"
git show --no-patch --oneline v0.4-production
```

Expected: the tag resolves to `1fa4f3d`.

- [x] **Step 4: Stop for explicit authorization before pushing the tag**

Do not run `git push origin v0.4-production` without user authorization. This checkpoint does not block local implementation.

- [x] **Step 5: Commit repository hygiene**

```bash
git add .gitignore
git commit -m "chore: ignore local brainstorming output"
```

---

### Task 1: Define the strict v2 domain and standing invariants

**Files:**
- Modify: `src/lib/parking/schemas.test.ts`
- Modify: `src/lib/parking/schemas.ts`

- [x] **Step 1: Write failing schema tests**

Add table-driven tests covering:

```ts
const statuses = ["parked", "test_driving", "garaged", "scrapped"] as const;

it.each(statuses)("validates the Idea planning invariant for %s", (status) => {
  const item = makeIdea({ status });
  const result = ParkingItemSchema.safeParse(item);
  expect(result.success).toBe(status === "parked" || status === "scrapped");
});

it("requires testStartedAt for test-driving and garaged records", () => {
  expect(ParkingItemSchema.safeParse(makeTool({ status: "test_driving", testStartedAt: undefined })).success).toBe(false);
  expect(ParkingItemSchema.safeParse(makeTool({ status: "garaged", testStartedAt: undefined })).success).toBe(false);
});

it("requires evidence for Garage and a reason for Scrapyard", () => {
  expect(ParkingItemSchema.safeParse(makeTool({ status: "garaged", notes: undefined, resultUrl: undefined })).success).toBe(false);
  expect(ParkingItemSchema.safeParse(makeIdea({ status: "scrapped", finalDecisionReason: undefined })).success).toBe(false);
});
```

Also test exact effort values, field limits, blank optional normalization, strict unknown-field rejection, `kind` discrimination, and Patrol DTO privacy.

- [x] **Step 2: Run the tests and verify RED**

```bash
npx vitest run src/lib/parking/schemas.test.ts
```

Expected: failures because v2 variants and invariants do not exist.

- [x] **Step 3: Implement the v2 schemas**

Keep `AnalyzeUrlResultSchema` unchanged. Define the persisted domain around this shape:

```ts
const optionalTrimmedText = (max: number) =>
  z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(max).optional(),
  );

const ParkingItemBaseShape = {
  id: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(120),
  status: ParkingItemStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastActivityAt: z.string().datetime(),
  testStartedAt: z.string().datetime().optional(),
  notes: optionalTrimmedText(2000),
  resultUrl: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    httpUrl.optional(),
  ),
  finalDecisionReason: optionalTrimmedText(280),
};

const AiToolParkingItemSchema = z.object({
  ...ParkingItemBaseShape,
  kind: z.literal("ai_tool"),
  url: httpUrl,
  summary: z.string().trim().min(1).max(400),
  usefulnessHypothesis: z.string().trim().min(1).max(400),
  effortTier: EffortTierSchema,
  suggestedTestTask: z.string().trim().min(1).max(500),
}).strict();

const IdeaParkingItemSchema = z.object({
  ...ParkingItemBaseShape,
  kind: z.literal("idea"),
  ideaText: z.string().trim().min(1).max(2000),
  effortTier: EffortTierSchema.optional(),
  suggestedTestTask: optionalTrimmedText(500),
}).strict();
```

Export `ParkingItemSchema` as a discriminated union with one `superRefine` enforcing every rule in spec section 6. Keep `EffortTierSchema` exactly `quick_spin | focused_session | weekend_project`.

Also export the strict envelope schema from `schemas.ts` so storage and migration can both depend on it without importing each other:

```ts
export const ParkingStoreV2Schema = z.object({
  version: z.literal(2),
  parkingItems: z.array(ParkingItemSchema),
}).strict();

export type ParkingStoreV2 = z.infer<typeof ParkingStoreV2Schema>;
```

Update `PatrolCandidateSchema` so `kind` is mandatory and `effortTier` is optional. Do not add any URL or free-form content.

- [x] **Step 4: Run the focused and full schema gates**

```bash
npx vitest run src/lib/parking/schemas.test.ts
npm test
```

Expected: focused tests pass; existing tests may now fail only where they still construct v1-shaped records. Record those expected migration-driven failures before Task 2.

- [x] **Step 5: Commit**

```bash
git add src/lib/parking/schemas.ts src/lib/parking/schemas.test.ts
git commit -m "feat: define unified parkable schema"
```

---

### Task 2: Implement exact v1-to-v2 migration and authoritative storage

**Files:**
- Create: `src/lib/parking/storage-v1.ts`
- Create: `src/lib/parking/storage-v1.test.ts`
- Modify: `src/lib/parking/fixtures.ts`
- Modify: `src/lib/parking/fixtures.test.ts`
- Modify: `src/lib/parking/storage.ts`
- Modify: `src/lib/parking/storage.test.ts`

- [x] **Step 1: Write failing migration and authority tests**

Cover this matrix explicitly:

```ts
it("does not read v1 when a malformed v2 key is present", () => {
  localStorage.setItem(STORAGE_KEY, "malformed");
  localStorage.setItem(V1_STORAGE_KEY, JSON.stringify(validV1Envelope));
  expect(loadParkingStore()).toMatchObject({ kind: "needs_reset" });
  expect(localStorage.getItem(STORAGE_KEY)).toBe("malformed");
});

it("converts strict v1 items exactly once when v2 is absent", () => {
  localStorage.setItem(V1_STORAGE_KEY, JSON.stringify(validV1Envelope));
  const result = loadParkingStore();
  expect(result.kind).toBe("migrated");
  expect(readV2().parkingItems[0]).not.toHaveProperty("category");
  expect(readV2().parkingItems[0]).not.toHaveProperty("repoUrl");
  expect(readV2().parkingItems[0]).toMatchObject({
    kind: "ai_tool",
    resultUrl: validV1Envelope.items[0].repoUrl,
    effortTier: validV1Envelope.items[0].effortTier,
  });
  expect(localStorage.getItem(V1_STORAGE_KEY)).toBe(JSON.stringify(validV1Envelope));
});
```

Also assert no v2 write on invalid v1 or invalid converted v2, exactly one write on migration, v2 precedence, fresh initialization, exact reset, and whitespace normalization.

- [x] **Step 2: Run storage tests and verify RED**

```bash
npx vitest run src/lib/parking/storage-v1.test.ts src/lib/parking/storage.test.ts src/lib/parking/fixtures.test.ts
```

Expected: missing module, key, migration, and v2 fixture failures.

- [x] **Step 3: Freeze the strict v1 reader and pure converter**

In `storage-v1.ts`, copy the v0.4 persisted contract rather than importing the v2 schema:

```ts
export const V1_STORAGE_KEY = "parking-anything:v1";

export const ParkingStoreV1Schema = z.object({
  version: z.literal(1),
  items: z.array(ParkingItemV1Schema),
}).strict();

export function convertV1Envelope(input: unknown): ParkingStoreV2 {
  const v1 = ParkingStoreV1Schema.parse(input);
  return ParkingStoreV2Schema.parse({
    version: 2,
    parkingItems: v1.items.map(({ category: _category, repoUrl, ...remaining }) => ({
      ...remaining,
      kind: "ai_tool" as const,
      ...(repoUrl === undefined ? {} : { resultUrl: repoUrl }),
    })),
  });
}
```

The v1 item schema must preserve the old required analysis fields, old effort enum, strict `category`, timestamps, evidence, status, and limits exactly.

- [x] **Step 4: Implement v2 storage authority**

Use these public constants and result states:

```ts
export const STORAGE_KEY = "parking-anything:v2";

export type LoadParkingStoreResult =
  | { kind: "ok"; items: ParkingItem[] }
  | { kind: "migrated"; items: ParkingItem[] }
  | { kind: "initialized"; items: ParkingItem[] }
  | { kind: "needs_reset"; reason: "malformed" | "wrong_version" };
```

Load order must be: read v2; if present parse only v2; otherwise read and migrate v1; otherwise initialize v2 seeds. `saveParkingStore` validates one complete envelope and performs one `setItem`.

- [x] **Step 5: Convert fixtures without changing their meaning**

For each existing fixture, replace `category` with `kind`, replace `repoUrl` with `resultUrl`, and preserve IDs, statuses, timestamps, copy, effort values, and test evidence exactly.

- [x] **Step 6: Run focused and full tests**

```bash
npx vitest run src/lib/parking/storage-v1.test.ts src/lib/parking/storage.test.ts src/lib/parking/fixtures.test.ts
npm test
```

Expected: storage and fixture suites pass. Remaining failures should identify v1-shaped UI/test factories for later tasks, not storage ambiguity.

- [x] **Step 7: Commit**

```bash
git add src/lib/parking/storage-v1.ts src/lib/parking/storage-v1.test.ts src/lib/parking/storage.ts src/lib/parking/storage.test.ts src/lib/parking/fixtures.ts src/lib/parking/fixtures.test.ts
git commit -m "feat: migrate parking storage to v2"
```

---

### Task 3: Unify lifecycle transitions and activity calculations

**Files:**
- Modify: `src/lib/parking/transitions.test.ts`
- Modify: `src/lib/parking/transitions.ts`
- Create: `src/lib/parking/activity.test.ts`
- Create: `src/lib/parking/activity.ts`
- Modify: `src/lib/parking/patrol.ts`

- [ ] **Step 1: Write failing transition and activity tests**

Include:

```ts
it("blocks an unplanned Idea from Test Drive without mutation", () => {
  const idea = makeIdea({ status: "parked" });
  expect(() => transitionItem(idea, { type: "start_test_drive" }, NOW)).toThrow("Add an effort tier and first test task before starting a Test Drive.");
  expect(idea.status).toBe("parked");
});

it("allows direct Tow Away for an unplanned parked Idea", () => {
  expect(transitionItem(makeIdea(), { type: "tow_away", finalDecisionReason: "Not actionable." }, NOW)).toMatchObject({
    kind: "idea",
    status: "scrapped",
    finalDecisionReason: "Not actionable.",
  });
});

it.each([
  ["2026-07-13T00:00:00.000Z", 7, true],
  ["2026-07-13T00:00:01.000Z", 6, false],
  ["2026-07-21T00:00:00.000Z", 0, false],
])("calculates complete clamped days", (lastActivityAt, days, needsReview) => {
  expect(activityAge(lastActivityAt, new Date("2026-07-20T00:00:00.000Z"))).toEqual({ daysSinceActivity: days, needsReview });
});
```

- [ ] **Step 2: Run tests and verify RED**

```bash
npx vitest run src/lib/parking/transitions.test.ts src/lib/parking/activity.test.ts
```

- [ ] **Step 3: Implement shared validated transitions**

Rename the Garage action payload to `resultUrl`. Before returning any accepted next item, parse it with `ParkingItemSchema`. Check Idea readiness before constructing `test_driving`; continue setting `testStartedAt` automatically. Preserve the v0.4 allowed-action map and terminal behavior.

- [ ] **Step 4: Implement one shared activity helper**

```ts
const DAY_MILLISECONDS = 86_400_000;

export function activityAge(lastActivityAt: string, now: Date) {
  const daysSinceActivity = Math.max(
    0,
    Math.floor((now.getTime() - new Date(lastActivityAt).getTime()) / DAY_MILLISECONDS),
  );
  return { daysSinceActivity, needsReview: daysSinceActivity >= 7 };
}
```

Refactor `selectPatrolCandidates` to use this helper without changing its sort/tie/slice behavior.

- [ ] **Step 5: Run tests and commit**

```bash
npx vitest run src/lib/parking/transitions.test.ts src/lib/parking/activity.test.ts src/lib/parking/patrol.test.ts
npm test
git add src/lib/parking/transitions.ts src/lib/parking/transitions.test.ts src/lib/parking/activity.ts src/lib/parking/activity.test.ts src/lib/parking/patrol.ts src/lib/parking/patrol.test.ts
git commit -m "feat: unify parkable lifecycle rules"
```

---

### Task 4: Extend the store controller with validated Idea edits

**Files:**
- Modify: `src/hooks/use-parking-store.test.tsx`
- Modify: `src/hooks/use-parking-store.ts`
- Modify: `src/components/parking/parking-app.hydration.test.tsx`

- [ ] **Step 1: Write failing controller tests**

Test add Idea, update active Idea details, reject terminal edits, block invalid planning clears, rename evidence to `resultUrl`, migration hydration, reset, and write failure.

The write-failure assertion must preserve the current product contract:

```ts
expect(result.current.items).toContainEqual(expect.objectContaining({ title: "Session-only idea" }));
expect(result.current.storageWarning).toBe("Unable to save parking data in this browser.");
```

- [ ] **Step 2: Run focused tests and verify RED**

```bash
npx vitest run src/hooks/use-parking-store.test.tsx src/components/parking/parking-app.hydration.test.tsx
```

- [ ] **Step 3: Add focused controller commands**

Expose:

```ts
addItem(item: ParkingItem): ActionResult;
applyAction(id: string, action: ParkingAction): ActionResult;
updateEvidence(id: string, notes: string, resultUrl: string): ActionResult;
updateIdea(id: string, input: {
  title: string;
  ideaText: string;
  effortTier?: EffortTier;
  suggestedTestTask?: string;
}): ActionResult;
resetDemo(): void;
```

Each command constructs the complete proposed item list, validates it, calls `saveParkingStore`, then publishes the valid state. Validation failures publish nothing. Storage failures publish the valid new state with the session-only warning.

- [ ] **Step 4: Run focused, hydration, and full gates**

```bash
npx vitest run src/hooks/use-parking-store.test.tsx src/components/parking/parking-app.hydration.test.tsx
npm test
npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-parking-store.ts src/hooks/use-parking-store.test.tsx src/components/parking/parking-app.hydration.test.tsx
git commit -m "feat: manage mixed parkable state"
```

---

### Task 5: Add capture switching and network-free Idea capture

**Files:**
- Create: `src/components/parking/capture-switcher.tsx`
- Create: `src/components/parking/tool-capture-form.tsx`
- Create: `src/components/parking/idea-capture-form.tsx`
- Create: `src/components/parking/idea-capture-form.test.tsx`
- Modify: `src/components/parking/parking-app.test.tsx`
- Modify: `src/components/parking/parking-app.tsx`
- Modify: `src/components/parking/mission-header.tsx`

- [ ] **Step 1: Write failing capture tests**

Assert keyboard-operable Tool/Idea segmented selection, preserved field input after validation errors, exact 120/2,000 limits, one created parked Idea, zero `fetch` calls, disabled Park whatever semantics, and no regression in Tool analysis.

```ts
expect(fetchMock).not.toHaveBeenCalled();
expect(onPark).toHaveBeenCalledWith(expect.objectContaining({
  kind: "idea",
  status: "parked",
  title: "Compare onboarding flows",
  ideaText: "Prototype both flows with five users.",
}));
```

- [ ] **Step 2: Run UI tests and verify RED**

```bash
npx vitest run src/components/parking/idea-capture-form.test.tsx src/components/parking/parking-app.test.tsx
```

- [ ] **Step 3: Extract Tool capture without behavioral changes**

Move the existing URL state, Analyze & Park request, loading guard, URL-only warning, retry state, structured response validation, and client item assembly into `ToolCaptureForm`. Change only `category` to `kind` in item assembly.

- [ ] **Step 4: Implement Idea capture and the selector**

Use native field validation plus the shared Zod schema. Create IDs with `crypto.randomUUID()` and use one ISO timestamp for `createdAt`, `updatedAt`, and `lastActivityAt`. Do not call an API.

Use a tab/segmented-control pattern for active capture modes. Render `Park whatever · Future` as an actual disabled button with an accessible description. Keep Mission Header responsible only for product identity and reset.

- [ ] **Step 5: Run tests and commit**

```bash
npx vitest run src/components/parking/idea-capture-form.test.tsx src/components/parking/parking-app.test.tsx
npm test
npm run lint
git add src/components/parking/capture-switcher.tsx src/components/parking/tool-capture-form.tsx src/components/parking/idea-capture-form.tsx src/components/parking/idea-capture-form.test.tsx src/components/parking/parking-app.tsx src/components/parking/parking-app.test.tsx src/components/parking/mission-header.tsx
git commit -m "feat: add first-class idea capture"
```

---

### Task 6: Render mixed vehicles and the variant-aware inspector

**Files:**
- Modify: `src/components/parking/car-sprite.tsx`
- Modify: `src/components/parking/parking-lot.test.tsx`
- Modify: `src/components/parking/parking-lot.tsx`
- Modify: `src/components/parking/item-inspector.test.tsx`
- Modify: `src/components/parking/item-inspector.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write failing mixed-rendering and inspector tests**

Cover Tool and Idea content separation, neutral unplanned vehicle treatment, text kind/status labels, seven-day Needs review threshold, Idea edit permissions, immediate planning update, first-missing-field focus, shared evidence actions, and read-only terminal records.

- [ ] **Step 2: Run tests and verify RED**

```bash
npx vitest run src/components/parking/parking-lot.test.tsx src/components/parking/item-inspector.test.tsx
```

- [ ] **Step 3: Make vehicle rendering variant-aware**

- Reuse existing car images for planned items.
- Use a stable neutral treatment with text `Planning needed` for unplanned Ideas.
- Keep vehicle dimensions fixed across kind, status, hover, badge, and selection states.
- Render `Tool` or `Idea` text so kind is not color-dependent.
- Render `Needs review · N days` only for stale active items.

- [ ] **Step 4: Split inspector content by discriminator**

Keep shared title, status, evidence, and lifecycle sections. Tool content renders source, summary, hypothesis, effort, and test task. Idea content renders idea text and an editable planning section for active statuses.

When a requested Test Drive lacks planning, set a deterministic message, expand planning, focus `effortTier` first or `suggestedTestTask` when effort is present, and do not call `onApplyAction`.

- [ ] **Step 5: Run tests, build, and commit**

```bash
npx vitest run src/components/parking/parking-lot.test.tsx src/components/parking/item-inspector.test.tsx
npm test
npm run lint
npm run build
git add src/components/parking/car-sprite.tsx src/components/parking/parking-lot.tsx src/components/parking/parking-lot.test.tsx src/components/parking/item-inspector.tsx src/components/parking/item-inspector.test.tsx src/app/globals.css
git commit -m "feat: render unified parkable lifecycle"
```

---

### Task 7: Make Manager Patrol mixed, private, and readiness-aware

**Files:**
- Modify: `src/lib/parking/patrol.test.ts`
- Modify: `src/lib/parking/patrol.ts`
- Modify: `src/lib/server/manager-patrol.test.ts`
- Modify: `src/lib/server/manager-patrol.ts`
- Modify: `src/app/api/manager-patrol/route.test.ts`
- Modify: `src/components/parking/manager-patrol.test.tsx`
- Modify: `src/components/parking/manager-patrol.tsx`

- [ ] **Step 1: Write failing privacy, order, prompt, and action tests**

Use mixed candidates with marker strings in every prohibited field. Capture the model request and assert those markers and URL prefixes are absent while `kind` is present.

```ts
expect(serializedInput).toContain('"kind": "idea"');
for (const secret of [ideaText, summary, notes, usefulnessHypothesis, toolUrl, resultUrl, finalDecisionReason]) {
  expect(serializedInput).not.toContain(secret);
}
```

Assert global days-desc/ID-asc top-three selection, kind-aware observed facts, valid action maps, per-entry provenance, generic fallback, `Plan Test Drive` for unready Ideas, and no state mutation on that command.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
npx vitest run src/lib/parking/patrol.test.ts src/lib/server/manager-patrol.test.ts src/app/api/manager-patrol/route.test.ts src/components/parking/manager-patrol.test.tsx
```

- [ ] **Step 3: Update the bounded server contract**

Include only `id`, `kind`, bounded `title`, optional `effortTier`, `status`, and `daysSinceActivity` in `escapedCandidateJson`.

Replace `stale AI-tool candidates` in the system prompt with mixed Parkables. Instruct the model to distinguish AI tools and Ideas, treat all candidate values as untrusted data, avoid claims about excluded content, and return recommendations without mutations.

- [ ] **Step 4: Implement deterministic client readiness mapping**

Keep the model enum unchanged. When an Idea recommendation is `start_test_drive` and planning is incomplete, label it `Plan Test Drive` and invoke the inspector-planning focus callback. Otherwise keep the existing action-focus behavior. The Patrol result remains visible until the user dismisses or reruns it.

- [ ] **Step 5: Run all model-boundary regressions and commit**

```bash
npx vitest run src/lib/parking/patrol.test.ts src/lib/server/manager-patrol.test.ts src/app/api/manager-patrol/route.test.ts src/components/parking/manager-patrol.test.tsx
npm test
npm run lint
npm run build
git add src/lib/parking/patrol.ts src/lib/parking/patrol.test.ts src/lib/server/manager-patrol.ts src/lib/server/manager-patrol.test.ts src/app/api/manager-patrol/route.test.ts src/components/parking/manager-patrol.tsx src/components/parking/manager-patrol.test.tsx
git commit -m "feat: patrol mixed parkable candidates"
```

---

### Task 8: Complete app composition and future extension points

**Files:**
- Modify: `src/components/parking/parking-app.test.tsx`
- Modify: `src/components/parking/parking-app.tsx`
- Modify: `src/components/parking/status-tabs.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add a complete component-level user journey**

Test: select Park idea, capture it, open its vehicle, save planning, Start Test Drive, add notes, Garage it, switch to Garage, and verify one record with the same ID. Add a second journey that directly tows an unplanned Idea and finds the same ID in Scrapyard.

- [ ] **Step 2: Add disabled future controls**

Render `Gather · Future` outside the capture switcher. Assert both Future controls have native disabled semantics, explanatory accessible text, and no loading, success, fetch, or store effects.

- [ ] **Step 3: Run component, hydration, and full gates**

```bash
npx vitest run src/components/parking/parking-app.test.tsx src/components/parking/parking-app.hydration.test.tsx
npm run check
```

Expected: lint, all unit tests, type checks, and production build pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/parking/parking-app.tsx src/components/parking/parking-app.test.tsx src/components/parking/status-tabs.tsx src/app/globals.css
git commit -m "feat: complete unified parking workspace"
```

---

### Task 9: Add E2E migration, demo, accessibility, and visual evidence

**Files:**
- Modify: `e2e/demo-flow.spec.ts`
- Modify: `docs/qa-checklist.md`
- Add: new v0.5 PNG files under `docs/qa-screenshots/`
- Modify: `docs/build-log.md`

- [ ] **Step 1: Add exact browser migration fixtures**

Before page load, seed one strict v1 envelope containing `repoUrl`, `focused_session`, and mixed statuses. Assert one v2 envelope is produced, values are preserved, v1 bytes are unchanged, and reload reads v2.

Add a separate test with malformed v2 plus valid v1; assert reset UI appears and neither key changes.

- [ ] **Step 2: Add complete v0.5 journeys**

Desktop and mobile must cover:

1. Idea capture -> planning -> Test Drive -> Garage.
2. Unplanned Idea -> Tow Away -> Scrapyard.
3. Mixed Patrol -> Plan Test Drive focus -> saved planning -> Start Test Drive.
4. Existing Tool Analyze & Park and v0.4 lifecycle path.
5. Exact reset and reload behavior.

Continue failing on unexpected console errors, page errors, horizontal overflow, inaccessible focus, or text clipping.

- [ ] **Step 3: Run E2E RED/GREEN loops**

```bash
npx playwright test e2e/demo-flow.spec.ts --project=chromium
npx playwright test e2e/demo-flow.spec.ts --project=mobile-safari
```

Expected: all applicable tests pass; only an explicitly documented duplicate screenshot capture may be skipped.

- [ ] **Step 4: Capture and inspect the v0.5 matrix**

At 1440x900, 1024x768, and 390x844, capture Park idea, mixed lot, unplanned inspector, planned inspector, mixed Patrol, Garage, Scrapyard, Needs review, and Future controls. Preserve existing v0.4 PNGs.

Inspect every image for overlap, clipping, blank assets, unstable dimensions, horizontal scrolling, visible focus artifacts, and meaningful first viewport.

- [ ] **Step 5: Update QA and build evidence**

Append dated v0.5 phase entries with actual commands and results. Do not rewrite historical v0.4 evidence or claim Preview/production work early.

- [ ] **Step 6: Run the complete local release gate and commit**

```bash
npm run lint
npm test
npm run test:e2e
npm run build
git status --short
```

```bash
git add e2e/demo-flow.spec.ts docs/qa-checklist.md docs/qa-screenshots docs/build-log.md
git commit -m "test: verify unified parkable demo"
```

---

### Task 10: Update product documentation and recording flow

**Files:**
- Modify: `README.md`
- Modify: `docs/build-log.md`
- Modify: the existing Task 13 demo/recording document if present; otherwise create `docs/demo-script.md`

- [ ] **Step 1: Update README from observed implementation only**

Document Tool and Idea capture, one lifecycle, v2 migration and rollback limitation, result evidence, privacy-bounded mixed Patrol, local setup, tests, and Future scope. Keep Codex build work separate from GPT-5.6 product runtime use.

- [ ] **Step 2: Write a bounded judge narration**

The script must show this story in order:

1. `Park tool` demonstrates real GPT-5.6 Structured Outputs.
2. `Park idea` demonstrates Parking Anything beyond bookmarks with no AI dependency.
3. Idea planning turns a thought into a testable action.
4. Mixed Patrol separates deterministic facts from GPT-5.6 recommendations.
5. Garage and Scrapyard show deliberate outcomes for either kind.
6. Disabled Park whatever and Gather show extension points without fake functionality.

- [ ] **Step 3: Verify docs against the running app**

Run every README command and rehearse every narration action locally. Remove claims that are not visible or verified.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/build-log.md docs/demo-script.md
git commit -m "docs: prepare v0.5 Build Week story"
```

If the demo script already existed elsewhere, stage that actual path instead of creating a duplicate.

---

### Task 11: Protected Preview, rollback rehearsal, and production checkpoint

**Files:**
- Modify after verification: `docs/build-log.md`
- Modify after verification: `docs/qa-checklist.md`

- [ ] **Step 1: Confirm the implementation tree is clean and pushed**

```bash
git status --short --branch
git log --oneline --decorate -12
```

Expected: no unstaged implementation changes; v0.4 tag still resolves to `1fa4f3d`.

- [ ] **Step 2: Deploy only to a protected Vercel Preview**

Do not change production environment variables or retrieve secret values. Verify only required variable names exist for Preview. Record the Preview deployment ID and URL without exposing credentials.

- [ ] **Step 3: Test fresh, migrated, and malformed browser profiles**

Run the complete smoke checklist in:

- A fresh browser with no v1/v2 keys.
- A browser preloaded with an exact strict v1 envelope.
- A browser with invalid v2 and valid v1 to verify fail-closed authority.

Verify real Tool analysis and real mixed Patrol once within the quota budget. Verify Idea flows without network.

- [ ] **Step 4: Rehearse rollback without changing production**

Confirm the verified v0.4 deployment can be reassigned and that v1 remains untouched after v0.5 migration. Record the exact rollback command or Vercel operation, but do not execute a production alias change.

- [ ] **Step 5: Stop at the human production gate**

Present the Preview URL, verification summary, screenshot evidence, known limitations, and rollback target. Production promotion requires explicit user approval.

- [ ] **Step 6: After approval, promote and re-run smoke tests**

Only after explicit approval, assign the production alias to the verified v0.5 deployment. Re-run the fresh-profile judge path, console check, bundle secret-name scan, bounded production logs, and quota-safe API checks.

- [ ] **Step 7: Record verified release evidence and commit**

Append only observed deployment IDs, aliases, test outcomes, and rollback facts.

```bash
git add docs/build-log.md docs/qa-checklist.md
git commit -m "docs: record verified v0.5 production release"
git push origin HEAD
```

---

## Final Definition of Done

- [ ] The strict v2 union and every persisted invariant are enforced at all entry points.
- [ ] Exact v1 data migrates once without changing v1, effort tiers, IDs, timestamps, or evidence meaning.
- [ ] A malformed present v2 key never falls back to v1.
- [ ] Tool behavior, security, quotas, provenance, hydration, and reset regressions pass.
- [ ] Idea capture makes no API call and creates one first-class parked record.
- [ ] One record moves through planning, Test Drive, Garage, or Scrapyard without promotion or duplication.
- [ ] Manager Patrol is mixed, kind-aware, bounded, private, and advisory only.
- [ ] Needs review is deterministic and applies to both active kinds.
- [ ] All unit, E2E, build, accessibility, and three-viewport visual gates pass.
- [ ] Protected Preview is verified before any production change.
- [ ] Production promotion and tag push occur only with explicit authorization.
- [ ] Build log and final narration distinguish Codex implementation work, deterministic product behavior, and GPT-5.6 runtime judgment.
