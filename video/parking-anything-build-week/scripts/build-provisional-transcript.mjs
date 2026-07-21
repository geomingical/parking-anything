import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const narration = await readFile(resolve(projectDir, "narration.txt"), "utf8");
const paragraphs = narration.trim().split(/\n\s*\n/);

const beats = [
  { paragraphCount: 2, start: 0, end: 19.12 },
  { paragraphCount: 1, start: 19.12, end: 35.26 },
  { paragraphCount: 1, start: 35.26, end: 49.28 },
  { paragraphCount: 1, start: 49.28, end: 59.05 },
  { paragraphCount: 1, start: 59.05, end: 74.34 },
  { paragraphCount: 1, start: 74.34, end: 93.05 },
  { paragraphCount: 1, start: 93.05, end: 106.65 },
  { paragraphCount: 2, start: 106.65, end: 118.12 },
];

let paragraphIndex = 0;
const transcript = [];

for (const beat of beats) {
  const text = paragraphs
    .slice(paragraphIndex, paragraphIndex + beat.paragraphCount)
    .join(" ");
  paragraphIndex += beat.paragraphCount;

  const words = text.split(/\s+/).filter(Boolean);
  const weights = words.map((word) => Math.max(1, word.replace(/[^A-Za-z0-9]/g, "").length));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const beatDuration = beat.end - beat.start;
  let cursor = beat.start;

  words.forEach((word, index) => {
    const wordDuration = beatDuration * (weights[index] / totalWeight);
    const end = index === words.length - 1 ? beat.end : cursor + wordDuration;
    transcript.push({
      text: word,
      start: Number(cursor.toFixed(3)),
      end: Number(end.toFixed(3)),
    });
    cursor = end;
  });
}

await writeFile(
  resolve(projectDir, "transcript.json"),
  `${JSON.stringify(transcript, null, 2)}\n`,
  "utf8",
);

await writeFile(
  resolve(projectDir, "transcript.meta.json"),
  `${JSON.stringify(
    {
      timingSource: "proportional alignment to the 118.120-second macOS TTS track",
      provisional: true,
      replaceWith: "npx hyperframes transcribe narration.wav",
      beatBoundaries: beats.map(({ start, end }) => ({ start, end })),
    },
    null,
    2,
  )}\n`,
  "utf8",
);
