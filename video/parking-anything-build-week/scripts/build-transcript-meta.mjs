import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import {
  deriveCanonicalBeatBoundaries,
  validateAudioProvenance,
  validateMeta,
  validateTranscript,
} from "./transcript-contract.mjs";

const run = promisify(execFile);
const root = resolve(new URL("..", import.meta.url).pathname);
const transcript = JSON.parse(await readFile(resolve(root, "transcript.json"), "utf8"));
validateTranscript(transcript);
const lastWordEndSeconds = transcript.at(-1).end;
const beatBoundaries = deriveCanonicalBeatBoundaries(transcript);
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
  provider: "ElevenLabs",
  voice: "Park anything",
  model: "Eleven Multilingual v2",
  speed: 1.08,
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0,
  speakerBoost: true,
  sourceDurationSeconds: 142.419563,
  tempoFactor: 0.9542700937052958,
  transform: "ffmpeg atempo (pitch-preserving), EBU R128 loudness normalization, 48 kHz PCM, padded tail",
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
