import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  assertCaptionScriptMatches,
  validateAudioProvenance,
  validateMeta,
  validateTranscript,
} from "./transcript-contract.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const narration = await readFile(resolve(root, "narration.txt"), "utf8");
const transcript = JSON.parse(await readFile(resolve(root, "transcript.json"), "utf8"));
const meta = JSON.parse(await readFile(resolve(root, "transcript.meta.json"), "utf8"));
const captions = JSON.parse(await readFile(resolve(root, "captions.json"), "utf8"));
const captionsScript = await readFile(resolve(root, "captions.js"), "utf8");
validateTranscript(transcript);
validateMeta(meta, transcript);
validateAudioProvenance(meta.audioProvenance, meta.audioDurationSeconds);
assertCaptionScriptMatches(captions, captionsScript);
const transcriptText = transcript.map((word) => word.text).join(" ");

assert.match(narration, /Today, the lot holds tools and ideas\./);
assert.match(narration, /FUTURE|road ahead—not features we're pretending already exist/i);
assert.equal(meta.provisional, false);
assert.equal(meta.engine, "whisper");
assert.equal(meta.model, "small.en");
assert.equal(meta.wordCount, transcript.length);
assert.equal(meta.beatBoundaries.length, 9);
const meetupCue = captions.find((cue) => /real-world meetup/i.test(cue.text));
const disclaimerCue = captions.find((cue) => /not features.*pretending/i.test(cue.text));
const effortTierCue = captions.find((cue) => /\beffort tier\b/i.test(cue.text));
assert.ok(meetupCue, `captions missing real-world meetup; cues=${JSON.stringify(captions.map((cue) => cue.text))}`);
assert.ok(disclaimerCue, `captions missing Future disclaimer; cues=${JSON.stringify(captions.map((cue) => cue.text))}`);
assert.ok(effortTierCue, `captions missing effort tier; cues=${JSON.stringify(captions.map((cue) => cue.text))}`);
assert.match(transcriptText, /\beffort tier\b/i);
assert.doesNotMatch(transcriptText, /\beffort here\b/i);
captions.forEach((cue, index) => {
  assert.ok(cue && typeof cue === "object", `invalid cue ${index}: ${JSON.stringify(cue)}`);
  assert.equal(typeof cue.start, "number", `cue ${index} start must be numeric: ${JSON.stringify(cue)}`);
  assert.equal(typeof cue.end, "number", `cue ${index} end must be numeric: ${JSON.stringify(cue)}`);
  assert.ok(Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.start >= 0 && cue.end > cue.start && cue.end <= 150, `invalid cue ${index}: ${JSON.stringify(cue)}`);
  if (index > 0) assert.ok(cue.start >= captions[index - 1].end, `overlapping cue ${index}: previous=${JSON.stringify(captions[index - 1])} current=${JSON.stringify(cue)}`);
});

console.log(`Verified ${meta.wordCount} words, ${captions.length} cues, final word ${meta.lastWordEndSeconds}s.`);
