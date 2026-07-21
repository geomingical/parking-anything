import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import sharp from "sharp";

const projectDir = resolve(new URL("..", import.meta.url).pathname);

const compositions = [
  { file: "index.html", id: "parking-anything-main", duration: "150", scenes: 9 },
  { file: "../parking-anything-teaser/index.html", id: "parking-anything-teaser", duration: "20", scenes: 4 },
];

const errors = [];
const stylesSource = await readFile(resolve(projectDir, "styles.css"), "utf8");
const storyboardSource = await readFile(resolve(projectDir, "STORYBOARD.md"), "utf8");

const expectedStoryboardHeadings = [
  "### BEAT 1 — THE BACKLOG BECOMES A LOT (0.00–19.40s)",
  "### BEAT 2 — PARK A TOOL (19.40–36.04s)",
  "### BEAT 3 — ONE LOT, TWO INPUTS (36.04–48.84s)",
  "### BEAT 4 — BOUNDED TEST DRIVE (48.84–58.68s)",
  "### BEAT 5 — EVIDENCE OR EXIT (58.68–72.44s)",
  "### BEAT 6 — MANAGER PATROL (72.44–92.12s)",
  "### BEAT 7 — CODEX BUILD · GPT-5.6 RUNTIME (92.12–108.70s)",
  "### BEAT 8 — THE ROAD AHEAD (approximately 108.70–140.00s)",
  "### BEAT 9 — DECIDE WHAT DESERVES YOUR TIME (approximately 140.00–150.00s)",
];
const storyboardHeadings = storyboardSource.match(/^### BEAT .+$/gm) || [];
if (JSON.stringify(storyboardHeadings) !== JSON.stringify(expectedStoryboardHeadings)) {
  errors.push("STORYBOARD.md: nine Beat section headings must remain byte-exact with the parent storyboard");
}

const legacyCssSelectors = [
  "ticket-grid",
  "ticket",
  "ui-card",
  "ui-label",
  "ui-value",
  "metric",
  "lifecycle",
  "lifecycle-step",
  "decision-column",
  "decision-card",
  "patrol-columns",
  "patrol-rule",
  "action-row",
  "action-chip",
  "future-grid",
  "future-header",
  "future-title",
  "future-bays",
  "future-bay",
  "future-network",
  "personal-lot",
];
for (const selector of legacyCssSelectors) {
  const unscopedSelector = new RegExp(`^\\s*\\.${selector.replaceAll("-", "\\-")}(?:[\\s,:.{]|$)`, "m");
  if (unscopedSelector.test(stylesSource)) errors.push(`styles.css: remove unscoped legacy selector .${selector}`);
}

function cssRuleHas(selector, declaration) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = stylesSource.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "s"));
  return Boolean(rule && new RegExp(`(?:^|;)\\s*${declaration}\\s*(?:;|$)`).test(rule[1]));
}

if (!cssRuleHas(".road-sign", "opacity:\\s*0")) {
  errors.push("styles.css: Future road signs must be hidden before their post-120s entrance");
}
if (!cssRuleHas(".future-roadmap .gather-plaza", "opacity:\\s*0")) {
  errors.push("styles.css: Gather plaza must be hidden before its post-120s entrance");
}

const requiredCssPrimitives = [
  ".ui-first-layout",
  ".product-primary",
  ".scene-copy",
  ".evidence-label",
  ".future-source",
  ".future-roadmap",
  ".future-disclosure",
  ".road-sign",
  ".gather-plaza",
  ".caption-layer",
  ".caption-line",
];
for (const selector of requiredCssPrimitives) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(`${escaped}(?:\\s*,|\\s*\\{)`).test(stylesSource)) {
    errors.push(`styles.css: missing required UI-first primitive ${selector}`);
  }
}

const requiredPalette = {
  paper: "#f7f7f2",
  ink: "#171918",
  "muted-ink": "#5f645f",
  asphalt: "#4a4d4b",
  "asphalt-deep": "#303331",
  safety: "#f2c94c",
  garage: "#2f7d5c",
  scrap: "#b84a45",
  line: "#ffffff",
};
for (const [name, value] of Object.entries(requiredPalette)) {
  if (!new RegExp(`--${name}:\\s*${value}`, "i").test(stylesSource)) {
    errors.push(`styles.css: palette variable --${name} must remain ${value}`);
  }
}

if (!cssRuleHas("#s1-copy,\n#s1-product,\n#s1-car", "opacity:\\s*0")) {
  errors.push("styles.css: opening copy, product, and car must be hidden at frame zero");
}
if (!cssRuleHas(".caption-layer", "bottom:\\s*24px") || !cssRuleHas(".caption-layer", "z-index:\\s*90")) {
  errors.push("styles.css: caption layer must retain its 24px safe-area offset and z-index 90");
}
if (!cssRuleHas(".transition-cover", "visibility:\\s*hidden")) {
  errors.push("styles.css: transition covers must be hidden outside their explicit timeline windows");
}
if (!/\.caption-layer\s*\{[^}]*width:\s*min\(1380px,\s*calc\(100%\s*-\s*160px\)\)/s.test(stylesSource)) {
  errors.push("styles.css: caption layer must retain its bounded 160px horizontal safe area");
}

const disclosureRules = [...stylesSource.matchAll(/([^{}]*\.future-disclosure[^{}]*)\{([^}]*)\}/gs)];
if (!disclosureRules.length) errors.push("styles.css: Future disclosure styling is missing");
for (const [, , body] of disclosureRules) {
  if (/(?:opacity\s*:\s*0(?:\D|$)|display\s*:\s*none|visibility\s*:\s*hidden)/i.test(body)) {
    errors.push("styles.css: Future disclosure cannot be hidden by CSS");
  }
}

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

  if (composition.id === "parking-anything-main") {
    const narration = document.querySelector("#main-narration");
    if (narration?.dataset.duration !== "149.2445") {
      errors.push(`${composition.file}: narration duration must match measured audio length 149.2445`);
    }

    const brandIntro = document.querySelector("#brand-intro");
    if (document.querySelectorAll("#brand-intro").length !== 1) {
      errors.push(`${composition.file}: expected one brand intro overlay`);
    }
    if (brandIntro?.querySelector("#brand-intro-title")?.textContent.trim() !== "PARKING ANYTHING") {
      errors.push(`${composition.file}: brand intro title must be PARKING ANYTHING`);
    }
    if (brandIntro?.querySelector("#brand-intro-thesis")?.textContent.trim() !== "DECIDE WHAT DESERVES YOUR TIME") {
      errors.push(`${composition.file}: brand intro thesis mismatch`);
    }
    if (brandIntro?.querySelectorAll('[data-brand-tier="true"]').length !== 2) {
      errors.push(`${composition.file}: brand intro must contain exactly two text tiers`);
    }
    if (brandIntro?.querySelector("button, input, select, textarea, a[href]")) {
      errors.push(`${composition.file}: brand intro must remain noninteractive`);
    }

    const narrationContract = {
      src: [narration?.getAttribute("src"), "narration.wav"],
      start: [narration?.dataset.start, "0"],
      duration: [narration?.dataset.duration, "149.2445"],
      trackIndex: [narration?.dataset.trackIndex, "0"],
      volume: [narration?.dataset.volume, "1"],
    };
    for (const [key, [actual, expected]] of Object.entries(narrationContract)) {
      if (actual !== expected) {
        errors.push(`${composition.file}: narration ${key} must remain ${expected}`);
      }
    }

    for (const timingContract of [
      'enter("#brand-intro-title", 0.18',
      'enter("#brand-intro-thesis", 0.55',
      'enter("#brand-intro-route", 0.32',
      'tl.to("#brand-intro", { xPercent: 100, duration: 0.55, ease: "power3.inOut" }, 2.25)',
      'tl.set("#brand-intro", { opacity: 0 }, 2.8)',
    ]) {
      if (!source.includes(timingContract)) {
        errors.push(`${composition.file}: missing brand intro choreography ${timingContract}`);
      }
    }

    const shippedSceneMatrix = [
      { id: "scene-1", headline: "Saved it. Forgot it.", evidence: [], screenshot: "capture/screenshots/scroll-000.png", minWidth: "62" },
      { id: "scene-2", headline: "Paste. Analyze. Test.", evidence: ["GPT-5.6 prepares the ticket"], screenshot: "capture/screenshots/scroll-000.png" },
      { id: "scene-3", headline: "Different inputs. One lifecycle.", evidence: ["TOOL", "IDEA"], screenshots: ["capture/screenshots/mixed-lot.png", "capture/screenshots/planned-inspector.png"] },
      { id: "scene-4", headline: "Run one bounded test.", evidence: ["PLAN", "EVIDENCE"], screenshot: "capture/screenshots/planned-inspector.png", minWidth: "58" },
      { id: "scene-5", headline: "Evidence decides the destination.", evidence: ["GARAGE", "SCRAPYARD"], screenshots: ["capture/screenshots/garage.png", "capture/screenshots/scrapyard.png"] },
      { id: "scene-6", headline: "Facts and advice stay separate.", evidence: ["OBSERVED", "GPT-5.6"], screenshot: "capture/screenshots/mixed-patrol.png", minWidth: "62" },
      { id: "scene-7", headline: "Built by Codex. Advised by GPT-5.6.", evidence: ["23 FILES · 213 TESTS", "BROWSER-LOCAL"], screenshot: "capture/screenshots/scroll-000.png", minWidth: "58" },
    ];

    for (const expected of shippedSceneMatrix) {
      const scene = document.querySelector(`#${expected.id}`);
      const primaries = scene?.querySelectorAll('[data-visual-role="product-primary"]') || [];
      if (primaries.length !== 1) {
        errors.push(`${composition.file}: ${expected.id} must contain exactly one product-primary visual`);
        continue;
      }

      const primary = primaries[0];
      if (!primary.classList.contains("product-primary") || !primary.querySelector(".browser-shell.product-frame")) {
        errors.push(`${composition.file}: ${expected.id} product-primary must wrap one browser-shell product-frame`);
      }
      if (expected.minWidth && primary.dataset.canvasMinWidth !== expected.minWidth) {
        errors.push(`${composition.file}: ${expected.id} product-primary must declare ${expected.minWidth}% minimum canvas width`);
      }

      const headline = scene?.querySelector(".headline")?.textContent.trim();
      if (headline !== expected.headline) errors.push(`${composition.file}: ${expected.id} headline mismatch`);

      const evidence = [...(scene?.querySelectorAll('[data-visual-role="evidence-label"]') || [])].map((label) => label.textContent.trim());
      if (JSON.stringify(evidence) !== JSON.stringify(expected.evidence)) {
        errors.push(`${composition.file}: ${expected.id} evidence labels must be ${expected.evidence.join(" | ") || "absent"}`);
      }

      const screenshotSources = [...primary.querySelectorAll("img")].map((image) => image.getAttribute("src"));
      const expectedSources = expected.screenshots || [expected.screenshot];
      if (JSON.stringify(screenshotSources) !== JSON.stringify(expectedSources)) {
        errors.push(`${composition.file}: ${expected.id} product evidence sources mismatch`);
      }
    }

    for (const scene of scenes) {
      if (scene.querySelectorAll(".headline").length > 1) errors.push(`${composition.file}: ${scene.id} has more than one headline`);
      if (scene.querySelectorAll('[data-visual-role="evidence-label"]').length > 2) errors.push(`${composition.file}: ${scene.id} has more than two evidence labels`);
      if (scene.querySelectorAll(".stamp").length > 2) errors.push(`${composition.file}: ${scene.id} has more than two stamps`);
    }

    for (const selector of [".sign-grid", ".boundary-sign", ".ghost-word"]) {
      if (document.querySelector(selector)) errors.push(`${composition.file}: forbidden text-wall structure ${selector}`);
    }

    for (const movingElement of document.querySelectorAll(".car-wrap, .future-car, .route-svg")) {
      const purpose = movingElement.getAttribute("data-motion-purpose")?.trim();
      if (!purpose || purpose.length < 8) {
        errors.push(`${composition.file}: ${movingElement.id || movingElement.className} requires a meaningful data-motion-purpose`);
      }
    }

    const directTweens = [...source.matchAll(/tl\.to\(\s*["']([^"']+)["']\s*,\s*\{([^}]*)\}\s*,\s*(\d+(?:\.\d+)?)\s*\)/gs)].map((match) => ({
      target: match[1],
      body: match[2],
      time: Number(match[3]),
    }));
    const numericProperty = (body, property) => {
      const match = body.match(new RegExp(`(?:^|,)\\s*${property}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`));
      return match ? Number(match[1]) : undefined;
    };
    const requireVehicleTween = ({ target, time, x, y, duration }) => {
      const tween = directTweens.find((candidate) => candidate.target === target && candidate.time === time);
      if (
        !tween
        || numericProperty(tween.body, "x") !== x
        || numericProperty(tween.body, "y") !== y
        || numericProperty(tween.body, "duration") !== duration
      ) {
        errors.push(`${composition.file}: ${target} must travel to (${x}, ${y}) at ${time}s over ${duration}s`);
      }
    };
    requireVehicleTween({ target: "#s3-car-tool", time: 38.4, x: 645, y: 360, duration: 3 });
    requireVehicleTween({ target: "#s3-car-idea", time: 38.4, x: -645, y: 360, duration: 3 });

    const s5Geometry = {
      green: {
        path: "M960 980 V710 C960 570 690 570 430 430 V180",
        origin: { x: 930, y: 999 },
        checkpoints: [
          { x: 960, y: 710, duration: 1.2 },
          { x: 793, y: 570, duration: 1.2 },
          { x: 430, y: 430, duration: 1.3 },
          { x: 430, y: 330, duration: 0.7 },
        ],
      },
      red: {
        path: "M960 980 V710 C960 570 1230 570 1490 430 V180",
        origin: { x: 990, y: 999 },
        checkpoints: [
          { x: 960, y: 710, duration: 1.2 },
          { x: 1127, y: 570, duration: 1.2 },
          { x: 1490, y: 430, duration: 1.3 },
          { x: 1490, y: 330, duration: 0.7 },
        ],
      },
    };
    for (const [branch, geometry] of Object.entries(s5Geometry)) {
      const route = document.querySelector(`#s5-route-${branch}`);
      if (route?.getAttribute("d") !== geometry.path) {
        errors.push(`${composition.file}: S5 ${branch} route geometry changed without matching choreography`);
      }

      const car = document.querySelector(`#s5-car-${branch}`);
      const expectedHorizontalAnchor = branch === "green" ? "left: 865px" : "right: 865px";
      if (!car?.getAttribute("style")?.includes(expectedHorizontalAnchor)) {
        errors.push(`${composition.file}: S5 ${branch} car must begin beside the shared route origin`);
      }

      const variableName = `s5${branch[0].toUpperCase()}${branch.slice(1)}RouteKeyframes`;
      const declaration = source.match(new RegExp(`const\\s+${variableName}\\s*=\\s*(\\[[\\s\\S]*?\\]);`));
      let keyframes;
      try {
        keyframes = JSON.parse(declaration?.[1]);
      } catch {
        keyframes = undefined;
      }
      const expectedKeyframes = geometry.checkpoints.map((checkpoint) => ({
        x: checkpoint.x - geometry.origin.x,
        y: checkpoint.y - geometry.origin.y,
        duration: checkpoint.duration,
      }));
      const actualGeometry = keyframes?.map(({ x, y, duration }) => ({ x, y, duration }));
      if (JSON.stringify(actualGeometry) !== JSON.stringify(expectedKeyframes)) {
        errors.push(`${composition.file}: S5 ${branch} keyframes must follow vertical, curve, terminal, and capture route checkpoints`);
      }
      const tweenContract = new RegExp(`tl\\.to\\(\\s*["']#s5-car-${branch}["']\\s*,\\s*\\{\\s*keyframes:\\s*${variableName}\\s*\\}\\s*,\\s*61\\.1\\s*\\)`);
      if (!tweenContract.test(source)) {
        errors.push(`${composition.file}: S5 ${branch} car must use ${variableName} at 61.1s`);
      }
    }

    const future = document.querySelector("#scene-8");
    if (!future?.classList.contains("future-scene")) {
      errors.push(`${composition.file}: missing Future scene 8`);
    }
    const futureSource = future?.querySelectorAll('[data-visual-role="future-source"]') || [];
    const futureRoadmap = future?.querySelectorAll('[data-visual-role="future-roadmap"]') || [];
    if (futureSource.length !== 1) errors.push(`${composition.file}: Future must contain exactly one current-UI source state`);
    if (futureRoadmap.length !== 1) errors.push(`${composition.file}: Future must contain exactly one roadmap state`);
    if (futureSource[0]?.querySelector("img")?.getAttribute("src") !== "capture/screenshots/scroll-000.png") {
      errors.push(`${composition.file}: Future source must use the real scroll-000 product capture`);
    }
    if (future?.querySelector(".future-disclosure")?.textContent.trim() !== "FUTURE · NOT YET BUILT") {
      errors.push(`${composition.file}: Future disclosure must be exact and persistent`);
    }
    for (const label of ["TRIP", "BOOK", "GEAR", "SIDE PROJECT", "GATHER"]) {
      if (!future?.textContent.includes(label)) errors.push(`${composition.file}: Future scene missing ${label}`);
    }
    if (future?.querySelectorAll(".road-sign").length !== 4) errors.push(`${composition.file}: Future roadmap must have four road signs`);
    if (future?.querySelectorAll(".gather-plaza").length !== 1) errors.push(`${composition.file}: Future roadmap must have one Gather plaza`);
    if (future?.querySelectorAll(".future-car").length !== 3) errors.push(`${composition.file}: Future roadmap must converge three local cars`);
    if (future?.querySelector("button, input, select, textarea, a[href]")) {
      errors.push(`${composition.file}: Future scene must remain noninteractive`);
    }
    const inlineScriptSource = [...document.querySelectorAll("script:not([src])")].map((script) => script.textContent).join("\n");
    for (const selector of ["#s8-disclosure", ".future-disclosure"]) {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const animatedDisclosure = new RegExp(`(?:\\benter|\\b(?:tl|gsap)\\.(?:to|from|fromTo|set))\\s*\\(\\s*["'][^"']*${escaped}`).test(inlineScriptSource);
      if (animatedDisclosure) errors.push(`${composition.file}: Future disclosure cannot be targeted by animation selector ${selector}`);
    }

    const expectedTransitionStarts = ["18.75", "35.23", "47.87", "57.59", "71.17", "90.71", "107.07", "138.43"];
    const transitionStarts = [...source.matchAll(/coverTransition\([^;]+?,\s*(\d+(?:\.\d+)?)\);/g)].map((match) => match[1]);
    if (JSON.stringify(transitionStarts) !== JSON.stringify(expectedTransitionStarts)) {
      errors.push(`${composition.file}: transition start times changed`);
    }
    if (!/tl\.set\(\s*["']\.transition-cover["']\s*,\s*\{\s*xPercent:\s*0\s*\}\s*,\s*0\s*\)/.test(source)) {
      errors.push(`${composition.file}: transition covers need an explicit timeline-zero state for deterministic random-access rendering`);
    }
    if (!/tl\.set\(\s*cover\s*,\s*\{\s*visibility:\s*["']visible["']\s*,\s*xPercent:\s*0\s*\}\s*,\s*time\s*\)/.test(source)) {
      errors.push(`${composition.file}: each transition cover must become visible and reset at its own transition start`);
    }
    if (!/tl\.set\(\s*cover\s*,\s*\{\s*visibility:\s*["']hidden["']\s*\}\s*,\s*time\s*\+\s*0\.82\s*\)/.test(source)) {
      errors.push(`${composition.file}: each transition cover must hide at the end of its transition window`);
    }
    for (const timingContract of [
      'tl.to("#s8-source .browser-shot", { scale: 1.04, duration: 9.02',
      'tl.to("#s8-source", { opacity: 0, scale: 0.92, duration: 3.5',
      'tl.to("#s8-roadmap", { opacity: 1, scale: 1, duration: 3.5',
      'tl.to("#s9-car", { x: 1120, y: -510, duration: 3.4, ease: "power2.inOut" }, 145.68)',
      'tl.to("#final-wash", { opacity: 1, duration: 0.5, ease: "sine.in" }, 149.5)',
    ]) {
      if (!source.includes(timingContract)) errors.push(`${composition.file}: missing exact choreography contract ${timingContract}`);
    }

    const closing = document.querySelector("#scene-9");
    if (closing?.getAttribute("aria-label") !== "Parking Anything closing thesis") {
      errors.push(`${composition.file}: scene 9 closing thesis label mismatch`);
    }
    if (closing?.querySelector(".product-primary img")?.getAttribute("src") !== "capture/screenshots/scroll-000.png") {
      errors.push(`${composition.file}: scene 9 must close on the real scroll-000 product capture`);
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
  console.log("Static composition checks passed for 150-second main film and 20-second teaser.");
}
