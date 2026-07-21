import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import sharp from "sharp";

const projectDir = resolve(new URL("..", import.meta.url).pathname);

const compositions = [
  { file: "index.html", id: "parking-anything-main", duration: "120", scenes: 8 },
  { file: "../parking-anything-teaser/index.html", id: "parking-anything-teaser", duration: "20", scenes: 4 },
];

const errors = [];

const inspectorScreenshot = resolve(projectDir, "capture/screenshots/planned-inspector.png");
try {
  const { data } = await sharp(inspectorScreenshot)
    .extract({ left: 100, top: 500, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const luminance = (data[0] + data[1] + data[2]) / 3;
  if (luminance < 220) {
    errors.push("planned-inspector.png: modal backdrop darkens the product surface");
  }
  const inspectorStats = await sharp(inspectorScreenshot)
    .extract({ left: 900, top: 480, width: 480, height: 360 })
    .greyscale()
    .stats();
  if (inspectorStats.entropy < 2.3) {
    errors.push("planned-inspector.png: inspector content is visually blank");
  }
} catch {
  errors.push("planned-inspector.png: unable to verify clean product surface");
}

for (const composition of compositions) {
  const compositionPath = resolve(projectDir, composition.file);
  const compositionDir = resolve(compositionPath, "..");
  const source = await readFile(compositionPath, "utf8");
  const dom = new JSDOM(source);
  const document = dom.window.document;
  const roots = [...document.querySelectorAll("[data-composition-id]")];
  const root = roots[0];

  if (roots.length !== 1) errors.push(`${composition.file}: expected one composition root`);
  if (!root || root.dataset.compositionId !== composition.id) errors.push(`${composition.file}: composition id mismatch`);
  if (root?.dataset.width !== "1920" || root?.dataset.height !== "1080") errors.push(`${composition.file}: canvas must be 1920x1080`);
  if (root?.dataset.start !== "0" || root?.dataset.duration !== composition.duration) errors.push(`${composition.file}: root timing mismatch`);

  const scenes = [...document.querySelectorAll(".scene")];
  if (scenes.length !== composition.scenes) errors.push(`${composition.file}: expected ${composition.scenes} scenes, found ${scenes.length}`);
  scenes.forEach((scene) => {
    if (!scene.id) errors.push(`${composition.file}: scene without id`);
    if (!scene.getAttribute("aria-label")) errors.push(`${composition.file}: ${scene.id} lacks aria-label`);
  });

  const transitions = document.querySelectorAll(".transition-cover");
  if (transitions.length !== composition.scenes - 1) errors.push(`${composition.file}: transition count must equal scene count minus one`);

  for (const media of document.querySelectorAll("audio")) {
    for (const attribute of ["id", "src", "data-start", "data-duration", "data-track-index", "data-volume"]) {
      if (!media.hasAttribute(attribute)) errors.push(`${composition.file}: audio missing ${attribute}`);
    }
  }

  for (const asset of document.querySelectorAll("img[src], audio[src], script[src], link[href]")) {
    const attribute = asset.hasAttribute("href") ? "href" : "src";
    const reference = asset.getAttribute(attribute);
    if (!reference || reference.startsWith("data:") || /^https?:/.test(reference)) {
      errors.push(`${composition.file}: ${asset.tagName.toLowerCase()} must reference a local asset`);
      continue;
    }
    try {
      await access(resolve(compositionDir, reference));
    } catch {
      errors.push(`${composition.file}: missing local asset ${reference}`);
    }
  }

  const captionPath = resolve(compositionDir, "captions.json");
  try {
    const captions = JSON.parse(await readFile(captionPath, "utf8"));
    if (!captions.length) errors.push(`${composition.file}: captions.json must contain cues`);
    captions.forEach((cue, index) => {
      if (typeof cue.text !== "string" || !cue.text.trim()) errors.push(`${composition.file}: caption ${index} has no text`);
      if (!(cue.start >= 0 && cue.end > cue.start && cue.end <= Number(composition.duration))) {
        errors.push(`${composition.file}: caption ${index} has invalid timing`);
      }
      if (index > 0 && cue.start < captions[index - 1].end) errors.push(`${composition.file}: caption ${index} overlaps the previous cue`);
    });
  } catch {
    errors.push(`${composition.file}: missing or invalid captions.json`);
  }

  const bannedPatterns = [
    ["Math.random(", "non-deterministic Math.random"],
    ["Date.now(", "non-deterministic Date.now"],
    ["repeat: -1", "infinite GSAP repeat"],
    ["<iframe", "iframe"],
    ["fonts.googleapis.com", "remote Google font"],
    ["cdn.jsdelivr.net", "remote runtime"],
  ];
  for (const [pattern, label] of bannedPatterns) {
    if (source.includes(pattern)) errors.push(`${composition.file}: contains ${label}`);
  }

  if (!source.includes("gsap.timeline({ paused: true")) errors.push(`${composition.file}: timeline is not paused`);
  if (!source.includes(`window.__timelines[\"${composition.id}\"] = tl`)) errors.push(`${composition.file}: timeline is not registered`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Static composition checks passed for 120-second main film and 20-second teaser.");
}
