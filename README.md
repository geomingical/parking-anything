# Parking Anything

Parking Anything turns saved AI-tool links into bounded trials, evidence-backed adoptions, or deliberate exits.

## Why it exists

AI tools are easy to bookmark and hard to evaluate. The result is digital hoarding: a growing list of “someday” links with no test, evidence, or decision. Parking Anything replaces that inertia with a small lifecycle that asks what deserves a quick spin, what earned a permanent Garage space, and what should leave through the Scrapyard.

## How it works

1. **Analyze & Park** — Paste one public HTTP(S) URL. The app creates a test ticket with a summary, effort tier, usefulness hypothesis, and first task.
2. **Test Drive** — Move a parked tool into a bounded evaluation and record notes or a result/repository URL.
3. **Garage or Scrapyard** — Garage requires evidence. Tow Away requires a final decision reason. These transitions are deterministic and local.
4. **Manager Patrol** — Review up to three stale active tools. The panel shows deterministic **Observed Fact** text separately from a GPT-5.6 recommendation or a clearly labeled deterministic fallback. Patrol never changes status automatically.

## What GPT-5.6 does

- `gpt-5.6-luna` analyzes a submitted URL through the OpenAI Responses API and returns a strict Structured Output for the test ticket. If readable page text cannot be fetched, the UI visibly reports URL-only analysis.
- `gpt-5.6-terra` handles the judgment-sensitive Manager Patrol recommendation for a bounded set of deterministic candidates.
- The model does not own IDs, timestamps, status, user evidence, observed staleness facts, lifecycle validation, or deterministic fallbacks.
- Provenance remains visible: model output is labeled **GPT-5.6 Recommendation**; fallback output is labeled **Deterministic fallback**.

## What Codex did

Codex built the repository architecture, domain state machine, local persistence, OpenAI integrations, SSRF and quota boundaries, accessible UI, tests, desktop/mobile visual QA, documentation, and deployment preparation in the primary Build Week task. The implementation was developed task-by-task with TDD and verification gates. See the [build log](docs/build-log.md) and [visual QA checklist](docs/qa-checklist.md) for concrete evidence.

## Run locally

Prerequisites: Node.js 20.9 or newer and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Enter the server-side values directly in `.env.local`; never expose them in browser code or commits. Then open [http://localhost:3000](http://localhost:3000).

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes for live AI | Server-only OpenAI event credential. |
| `OPENAI_ANALYZE_MODEL` | Yes | URL-analysis model; defaults to `gpt-5.6-luna`. |
| `OPENAI_PATROL_MODEL` | Yes | Manager Patrol model; defaults to `gpt-5.6-terra`. |
| `UPSTASH_REDIS_REST_URL` | Production | Shared Upstash Redis REST endpoint for quotas. |
| `UPSTASH_REDIS_REST_TOKEN` | Production | Server-only Upstash Redis REST token. |
| `RATE_LIMIT_HASH_SECRET` | Production | Independent secret used to HMAC caller identities before quota keys are created. |
| `DEMO_API_ENABLED` | Yes | Set to `false` to disable both public model routes without disabling the seeded local workflow. |
| `RATE_LIMIT_IP_MAX` | Yes | Maximum requests per hashed caller within the configured window. |
| `RATE_LIMIT_IP_WINDOW_SECONDS` | Yes | Per-caller quota window length in seconds. |
| `RATE_LIMIT_GLOBAL_DAILY_MAX` | Yes | Shared daily request ceiling across both public model routes. |

Production fails closed when required Upstash or hashing configuration is absent. Use a new `RATE_LIMIT_HASH_SECRET` unrelated to the OpenAI key.

## Demo data

The browser initializes exactly three local fixtures: one stale parked tool, one active Test Drive with notes, and one Garaged tool with evidence. Use the settings control and confirm **Reset demo data** to restore those exact fixtures. Data stays in versioned `localStorage`; there is no account, server persistence, cross-device sync, or sharing.

## Verification

```bash
npm run lint
npm test
npm run test:e2e
npm run build
```

The Playwright suite exercises the complete judge flow in desktop Chromium and Mobile Safari and preserves 15 inspected screenshots under [`docs/qa-screenshots/`](docs/qa-screenshots/).

## Security

- The OpenAI key and Upstash credentials are read only by server modules.
- Public-page fetching accepts only HTTP(S), rejects embedded credentials and non-public literal/resolved IP ranges, revalidates redirects, and bounds redirect count, time, bytes, content type, and extracted text.
- Request JSON is bounded to 8 KB before parsing.
- Both model routes share per-caller and global quotas. Caller IPs are HMAC-derived before quota storage; raw IP addresses are not used as Redis keys or logged by application code.
- Production quota configuration and backend errors fail closed with fixed responses.
- `DEMO_API_ENABLED=false` is a server-side kill switch for live AI requests.
- Strict schemas keep server/model fields separate from client-owned IDs, timestamps, status, and evidence.

## Known tradeoffs

- Persistence is browser-local, with no account or synchronization.
- Page fetching intentionally rejects many ambiguous targets; readable content failures may fall back to visibly labeled URL-only analysis.
- Live AI can be unavailable because of provider errors, configuration, the kill switch, or the demo request cap. The seeded lifecycle remains usable without live AI.
- The MVP contains one AI Tools parking zone and one manager persona.

## Future work

Meetups, Carpool, Used-car Lot, Roadside Assistance, and Rest Stops are post-MVP directions only. They are not present in the v0.4 UI or implementation.

## License

[MIT](LICENSE)
