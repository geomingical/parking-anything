import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = resolve(new URL("..", import.meta.url).pathname);
const transcript = JSON.parse(await readFile(resolve(root, "transcript.json"), "utf8"));
const normalized = transcript.map((word) => word.text.toLowerCase().replace(/[^a-z0-9]+/g, ""));

function phraseStart(phrase) {
  const tokens = phrase
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]+/g, ""));
  const index = normalized.findIndex((_, candidate) =>
    tokens.every((token, offset) => normalized[candidate + offset] === token),
  );
  if (index < 0) throw new Error(`Transcript anchor not found: ${phrase}`);
  return transcript[index].start;
}

const starts = [
  phraseStart("Saving a new tool"),
  phraseStart("Paste a public tool link"),
  phraseStart("Ideas enter the same lot"),
  phraseStart("Every Parkable begins"),
  phraseStart("Then make a deliberate call"),
  phraseStart("When the lot starts"),
  phraseStart("Codex built and tested"),
  phraseStart("Today the lot holds"),
  phraseStart("Parking Anything isn't another"),
];
const lastWordEndSeconds = transcript.at(-1).end;
const { stdout } = await run("ffprobe", [
  "-v",
  "error",
  "-show_entries",
  "format=duration",
  "-of",
  "default=nw=1:nk=1",
  resolve(root, "narration.wav"),
]);
const audioDurationSeconds = Number(stdout.trim());
const beatBoundaries = starts.map((start, index) => ({
  start,
  end: starts[index + 1] ?? lastWordEndSeconds,
}));

await writeFile(
  resolve(root, "transcript.meta.json"),
  `${JSON.stringify(
    {
      timingSource: "HyperFrames whisper small.en word-level transcription of narration.wav",
      provisional: false,
      engine: "whisper",
      model: "small.en",
      wordCount: transcript.length,
      audioDurationSeconds,
      lastWordEndSeconds,
      beatBoundaries,
    },
    null,
    2,
  )}\n`,
);

console.log(`Built 9 measured beats; Future ${starts[7]}–${starts[8]}s; final word ${lastWordEndSeconds}s.`);
