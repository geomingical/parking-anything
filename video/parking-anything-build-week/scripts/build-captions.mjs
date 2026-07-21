import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const mainDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const teaserDir = resolve(mainDir, "../parking-anything-teaser");

function groupWords(words) {
  const rawCues = [];
  let group = [];

  const flush = () => {
    if (!group.length) return;
    rawCues.push({
      text: group.map((word) => word.text).join(" "),
      start: group[0].start,
      end: group.at(-1).end,
    });
    group = [];
  };

  for (const word of words) {
    group.push(word);
    const duration = word.end - group[0].start;
    const closesThought = /[.!?]$/.test(word.text);
    const softBreak = /[,;:]$/.test(word.text) && group.length >= 4;
    if (closesThought || softBreak || group.length >= 7 || duration >= 3.2) flush();
  }
  flush();
  for (let index = 0; index < rawCues.length; index += 1) {
    const cue = rawCues[index];
    const wordCount = cue.text.split(/\s+/).length;
    if (wordCount > 2 && cue.end - cue.start >= 0.9) continue;

    const previous = rawCues[index - 1];
    const next = rawCues[index + 1];
    if (previous && `${previous.text} ${cue.text}`.split(/\s+/).length <= 10) {
      previous.text = `${previous.text} ${cue.text}`;
      previous.end = cue.end;
      rawCues.splice(index, 1);
      index -= 1;
    } else if (next && `${cue.text} ${next.text}`.split(/\s+/).length <= 10) {
      next.text = `${cue.text} ${next.text}`;
      next.start = cue.start;
      rawCues.splice(index, 1);
      index -= 1;
    }
  }

  const exactCopy = new Map([
    ["saved it, forgot it,", "Saved it. Forgot it."],
    ["your digital backlog grew again,", "Your digital backlog grew again."],
    ["parking anything turns tools and ideas into", "Parking Anything turns tools and ideas into"],
    ["one bounded test drive,", "one bounded Test Drive."],
    ["garage what earns its place,", "Garage what earns its place."],
    ["scrap what doesn't, with the reason,", "Scrap what doesn't—with a reason."],
    ["gpt-5.6 recommends the next move,", "GPT-5.6 recommends the next move."],
    ["you still decide, stop collecting,", "You still decide. Stop collecting."],
    ["start test-driving", "Start test-driving."],
  ]);

  return rawCues.map((cue) => {
    const normalized = cue.text
      .replace(/Parking anything/gi, "Parking Anything")
      .replace(/GPT 5\.6/g, "GPT-5.6")
      .replace(/real world meetup/gi, "real-world meetup")
      .replace(/test driving/gi, "test-driving");
    return { ...cue, text: exactCopy.get(normalized.toLowerCase()) || normalized };
  });
}

async function build(projectDir) {
  const transcript = JSON.parse(await readFile(resolve(projectDir, "transcript.json"), "utf8"));
  const cues = groupWords(transcript);
  await writeFile(resolve(projectDir, "captions.json"), `${JSON.stringify(cues, null, 2)}\n`, "utf8");
  await writeFile(resolve(projectDir, "captions.js"), `window.__captionCues = ${JSON.stringify(cues)};\n`, "utf8");
  return cues.length;
}

const mainCount = await build(mainDir);
const teaserCount = await build(teaserDir);
console.log(`Built ${mainCount} main caption cues and ${teaserCount} teaser caption cues.`);
