# Parking Anything

Parking Anything turns tools and ideas worth remembering into bounded trials, evidence-backed adoption, or deliberate exits.

The public v0.4 release remains the stable production baseline while this v0.5 unified-Parkable increment is verified in a protected Preview. Production promotion is intentionally outside the local implementation phase.

## Why it exists

Bookmarks and fleeting ideas are easy to collect and hard to evaluate. Parking Anything replaces that backlog with one visible lifecycle: park the thing, plan a first test, run it, preserve evidence in the Garage, or record why it belongs in the Scrapyard.

## How v0.5 works

1. **Park tool** — Paste one public HTTP(S) URL. GPT-5.6 returns a strict test ticket with a summary, existing effort tier, usefulness hypothesis, and first task.
2. **Park idea** — Manually capture a title and Idea body without calling AI. The Idea enters the same Parking Lot as a first-class record.
3. **Plan and Test Drive** — An Idea must have both an effort tier and non-empty first test task before Test Drive. Planning edits the same record and updates the vehicle and inspector immediately.
4. **Garage or Scrapyard** — Garage requires a note or HTTP(S) Result URL. Tow Away requires a final decision reason. Either kind can reach either terminal history state.
5. **Manager Patrol** — Review the three stalest active Parkables in one days-descending, ID-ascending order. Deterministic **Observed Fact** text remains visibly separate from a **GPT-5.6 Recommendation** or **Deterministic fallback**.

`Park whatever · Future` and `Gather · Future` are real disabled controls. They communicate extension points without pretending that unsupported behavior exists.

## One data model and lifecycle

`Park tool` and `Park idea` are capture adapters over one strict `ParkingItem` union:

- `kind: "ai_tool"` owns URL analysis fields.
- `kind: "idea"` owns manual Idea text and optional planning while parked or scrapped.
- Both variants share `parked -> test_driving -> garaged` and `parked | test_driving -> scrapped` transitions.
- Garaged and scrapped records are terminal and read-only.
- No promotion, duplicate experiment, Idea waiting bay, separate lifecycle, or record deletion exists.

The existing effort tiers remain exactly `quick_spin`, `focused_session`, and `weekend_project`. Shared result evidence uses `resultUrl`, so non-code Parkables are not forced into repository terminology.

## What GPT-5.6 does

- `gpt-5.6-luna` analyzes submitted Tool URLs with the OpenAI Responses API Structured Outputs interface. If readable page text cannot be fetched, the response and UI visibly report URL-only analysis.
- `gpt-5.6-terra` makes judgment-sensitive Manager Patrol recommendations over a bounded mixed-kind candidate list.
- The model never owns IDs, timestamps, status, lifecycle transitions, evidence rules, activity age, candidate order, or fallback provenance.
- Patrol receives only candidate ID, kind, bounded title, optional effort tier, active status, and complete days since activity. Idea text, summaries, notes, hypotheses, Tool/Result URLs, decision reasons, the storage envelope, and unselected records remain local.

## What Codex built

Codex implemented the repository architecture, strict union and migration, deterministic lifecycle, local persistence, OpenAI integrations, SSRF and quota boundaries, accessible UI, tests, desktop/mobile visual QA, documentation, and deployment preparation in the primary Build Week task. GPT-5.6 is runtime product intelligence; it did not build the application or own deterministic product facts.

See the [build log](docs/build-log.md), [QA checklist](docs/qa-checklist.md), and [judge demo script](docs/demo-script.md) for observed evidence.

## Run locally

Prerequisites: Node.js 20.9 or newer and npm.

```bash
npm install
cp -n .env.example .env.local
npm run dev -- --port 3107
```

Enter server-side values directly in `.env.local`; never place them in client code or commits. `cp -n` does not overwrite an existing local secret file. Open [http://localhost:3107](http://localhost:3107). The isolated port also prevents a different local Next.js project from being mistaken for this worktree during QA.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Live AI | Server-only OpenAI event credential. |
| `OPENAI_ANALYZE_MODEL` | Optional | URL-analysis model; defaults to `gpt-5.6-luna`. |
| `OPENAI_PATROL_MODEL` | Optional | Patrol model; defaults to `gpt-5.6-terra`. |
| `UPSTASH_REDIS_REST_URL` | Production AI | Shared Upstash Redis REST endpoint for quotas. |
| `UPSTASH_REDIS_REST_TOKEN` | Production AI | Server-only Upstash Redis REST token. |
| `RATE_LIMIT_HASH_SECRET` | Production AI | Independent secret used to HMAC caller identities before quota keys are created. |
| `DEMO_API_ENABLED` | Optional | Defaults enabled; set to `false` to disable both public model routes. |
| `RATE_LIMIT_IP_MAX` | Optional | Per-caller request maximum; defaults to `10`. |
| `RATE_LIMIT_IP_WINDOW_SECONDS` | Optional | Per-caller window; defaults to `600`. |
| `RATE_LIMIT_GLOBAL_DAILY_MAX` | Optional | Shared daily ceiling; defaults to `300`. |

Production fails closed when required Upstash or hashing configuration is absent. Use a new `RATE_LIMIT_HASH_SECRET` unrelated to the OpenAI key.

## Local storage and migration

The browser is the only persistence layer: there is no account, server database, cross-device synchronization, or sharing.

- Fresh browsers receive the exact three stable Tool fixtures in `parking-anything:v2`.
- If v2 is absent, one strict `parking-anything:v1` envelope is parsed, converted, validated as a complete v2 envelope, and written once. The v1 key is left untouched.
- A present v2 key is authoritative. Malformed v2 data shows reset guidance and never falls back to v1.
- Reset restores exactly the three fixtures and removes locally added Parkables from v2.

v1 and v2 are not bidirectionally synchronized. Rolling back to the recorded v0.4 commit preserves untouched v1 data, while v0.5-only v2 edits remain dormant. Separately edited v1 and v2 histories are not merged, so a rollback does not promise seamless lossless roll-forward.

## Verification

```bash
npm run lint
npm test
npm run test:e2e
npm run build
```

The verified local gate passes 212 unit tests and 25 applicable Playwright tests across desktop Chromium and Mobile Safari. The 27 inspected v0.5 screenshots cover nine states at 1440x900, 1024x768, and 390x844 under [`docs/qa-screenshots/`](docs/qa-screenshots/); the original 15 v0.4 screenshots remain preserved.

## Security and reliability boundaries

- OpenAI and Upstash secrets are read only by server modules.
- Public-page fetching accepts only HTTP(S), rejects credentials and non-public literal/resolved IP ranges, revalidates redirects, and bounds redirects, time, bytes, content type, and extracted text.
- Request JSON is bounded to 8 KB before parsing.
- Both model routes share per-caller and global quotas. Caller IPs are HMAC-derived before quota storage; application code does not use raw IPs as Redis keys.
- Production quota misconfiguration and backend errors fail closed with fixed responses.
- `DEMO_API_ENABLED=false` is a server-side kill switch; the seeded deterministic lifecycle remains available.
- Strict schemas keep model/server output separate from client-owned IDs, timestamps, status, evidence, and transitions.

## Known tradeoffs and Future scope

- Persistence is browser-local and single-user.
- Readable-content failures may fall back to visibly labeled URL-only Tool analysis.
- Live AI may be unavailable because of provider errors, configuration, the kill switch, or the shared demo cap.
- Manager Patrol is an on-demand product persona, not an authenticated administrator.
- Accounts, permissions, backend administration, notifications, Gather collaboration, and additional Parkable kinds are future work only.

## License

[MIT](LICENSE)
