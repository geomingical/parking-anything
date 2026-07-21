import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";

const projectDir = resolve(new URL("..", import.meta.url).pathname);

const compositions = [
  { file: "index.html", id: "parking-anything-main", duration: "120", scenes: 8 },
  { file: "teaser.html", id: "parking-anything-teaser", duration: "20", scenes: 4 },
];

const errors = [];

for (const composition of compositions) {
  const source = await readFile(resolve(projectDir, composition.file), "utf8");
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

  for (const image of document.querySelectorAll("img")) {
    const src = image.getAttribute("src");
    if (!src || src.startsWith("data:") || /^https?:/.test(src)) {
      errors.push(`${composition.file}: image must reference a local captured asset`);
      continue;
    }
    try {
      await access(resolve(projectDir, src));
    } catch {
      errors.push(`${composition.file}: missing image ${src}`);
    }
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
