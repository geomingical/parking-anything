import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import {
  buildBeatBoundaries,
  validateAudioProvenance,
  validateMeta,
  validateTranscript,
} from "./transcript-contract.mjs";

const run = promisify(execFile);
const root = resolve(new URL("..", import.meta.url).pathname);
const transcript = JSON.parse(await readFile(resolve(root, "transcript.json"), "utf8"));
validateTranscript(transcript);
const anchorPhrases = [
  "Saving a new tool",
  "Paste a public tool link",
  "Ideas enter the same lot",
  "Every Parkable begins",
  "Then make a deliberate call",
  "When the lot starts",
  "Codex built and tested",
  "Today the lot holds",
  "Parking Anything isn't another",
];
const lastWordEndSeconds = transcript.at(-1).end;
const beatBoundaries = buildBeatBoundaries(transcript, anchorPhrases);
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
const audioProvenance = {
  provider: "macOS say",
  voice: "Samantha",
  sourceRateWpm: 140,
  sourceDurationSeconds: 150.98825,
  tempoFactor: 1.011646566,
  transform: "ffmpeg atempo (pitch-preserving whole track)",
  effectiveRateWpm: 141.63,
  finalDurationSeconds: audioDurationSeconds,
};
const meta = {
  timingSource: "HyperFrames whisper small.en word-level transcription of narration.wav",
  provisional: false,
  engine: "whisper",
  model: "small.en",
  wordCount: transcript.length,
  audioDurationSeconds,
  lastWordEndSeconds,
  beatBoundaries,
  audioProvenance,
};
validateMeta(meta, transcript);
validateAudioProvenance(audioProvenance, audioDurationSeconds);

await writeFile(
  resolve(root, "transcript.meta.json"),
  `${JSON.stringify(meta, null, 2)}\n`,
);

console.log(`Built 9 measured beats; Future ${beatBoundaries[7].start}–${beatBoundaries[7].end}s; final word ${lastWordEndSeconds}s.`);
