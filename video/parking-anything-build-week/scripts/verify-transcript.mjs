import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const narration = await readFile(resolve(root, "narration.txt"), "utf8");
const transcript = JSON.parse(await readFile(resolve(root, "transcript.json"), "utf8"));
const meta = JSON.parse(await readFile(resolve(root, "transcript.meta.json"), "utf8"));
const captions = JSON.parse(await readFile(resolve(root, "captions.json"), "utf8"));

assert.match(narration, /Today, the lot holds tools and ideas\./);
assert.match(narration, /FUTURE|road ahead—not features we're pretending already exist/i);
assert.equal(meta.provisional, false);
assert.equal(meta.engine, "whisper");
assert.equal(meta.model, "small.en");
assert.equal(meta.wordCount, transcript.length);
assert.equal(meta.beatBoundaries.length, 9);
assert.ok(meta.audioDurationSeconds <= 149.5, `audio ends at ${meta.audioDurationSeconds}s`);
assert.ok(meta.lastWordEndSeconds <= 149.5, `last word ends at ${meta.lastWordEndSeconds}s`);
assert.equal(meta.beatBoundaries.at(-1).end, meta.lastWordEndSeconds);
assert.ok(captions.some((cue) => /real-world meetup/i.test(cue.text)));
assert.ok(captions.some((cue) => /not features.*pretending/i.test(cue.text)));
captions.forEach((cue, index) => {
  assert.ok(cue.start >= 0 && cue.end > cue.start && cue.end <= 150, `invalid cue ${index}`);
  if (index > 0) assert.ok(cue.start >= captions[index - 1].end, `overlapping cue ${index}`);
});

console.log(`Verified ${meta.wordCount} words, ${captions.length} cues, final word ${meta.lastWordEndSeconds}s.`);
