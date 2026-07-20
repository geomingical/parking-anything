# Parking Anything v0.5 — Build Week Judge Demo

Target: 105–118 seconds, English narration, one continuous take. Reset demo data before recording. Keep the browser at 1440x900 unless the recording setup requires a smaller viewport.

## Recording runbook

| Time | Visible action | Narration |
| --- | --- | --- |
| 0–8s | Open the app, confirm Reset demo data, and show the Parking Lot. | “Parking Anything turns tools and ideas worth remembering into decisions worth revisiting.” |
| 8–25s | In **Park tool**, submit the pre-tested public URL and wait for its ticket to appear. | “First, Park tool uses the real OpenAI Responses API. GPT-5.6 returns a strict title, summary, existing effort tier, usefulness hypothesis, and first test—not the ID, status, or timestamps.” |
| 25–38s | Switch to **Park idea**, enter a short title and body, and click **Park Idea**. Point to its neutral `Planning needed` vehicle. | “Park idea goes beyond bookmarks. This capture is fully manual, makes no AI request, and creates one first-class parked record in the same lot.” |
| 38–55s | Open the Idea, choose **Quick spin**, enter one bounded first task, save planning, and point to the immediate vehicle/inspector update. | “Planning turns the thought into a testable action. Both planning fields are required before Test Drive, and the same record updates immediately—there is no promotion or duplicate experiment.” |
| 55–77s | Close the inspector, run **Manager Patrol**, and point first to **Observed Fact**, then to **GPT-5.6 Recommendation** or **Deterministic fallback**. | “Manager Patrol mixes active tools and ideas by deterministic activity age. The observed fact is computed locally; GPT-5.6 supplies only the judgment-sensitive recommendation, with provenance visible for every result.” |
| 77–94s | Start the planned Idea’s Test Drive, add a short note, park it in **Garage**, and show the shared Garage. | “The lifecycle is deterministic. Garage requires evidence, and both tools and ideas use the same terminal history.” |
| 94–106s | Return to Parking Lot, Tow Away the stale seed Tool with a short reason, then show **Scrapyard**. | “Scrapyard contains only genuinely scrapped records. Tow Away requires a reason, and no transition deletes the original item.” |
| 106–113s | Point to disabled **Park whatever · Future** and **Gather · Future**. | “These are honest extension points: more Parkable kinds and collaboration are visible, but disabled—there is no fake functionality.” |
| 113–118s | End on the mixed workspace or build log. | “GPT-5.6 turns each saved URL into a structured test ticket, then gives a grounded recommendation over deterministic activity facts. Codex built the application, tests, security boundaries, visual system, and deployment workflow in the primary implementation task documented in the build log.” |

## Pre-recording checks

1. Use the approved deployed Preview or production URL only after its human gate; otherwise rehearse locally.
2. Confirm the chosen public Tool URL returns promptly and note whether the UI reports fetched or URL-only analysis. Do not hide the warning.
3. Reset demo data and close the settings popover.
4. Keep short prepared Idea/planning/evidence/reason text in a private scratchpad for reliable typing.
5. Confirm **Observed Fact** and recommendation provenance are simultaneously visible after Patrol.
6. Confirm Garage contains the tested Idea and Scrapyard contains the deliberately exited Tool.
7. Confirm both Future buttons remain disabled.
8. Do not speak or display secrets, raw model responses, Redis identifiers, or the `/feedback` Session ID.

## Prepared demo text

- Tool URL: choose and re-test one public HTTP(S) page immediately before recording.
- Idea title: `Decision receipt`
- Idea body: `Record the decision and its owner before a meeting ends.`
- First test task: `Capture one decision after the next meeting.`
- Evidence note: `The owner confirmed the captured decision.`
- Tow reason: `No current project justifies the setup time.`

## Human-only finish

After the deployed demo is approved, the user records the narration, uploads a public YouTube video, verifies anonymous playback, runs `/feedback` in this primary task, and submits the verified video, repository, live URL, and Session ID to Devpost. The Session ID belongs in the form, not the spoken video.
