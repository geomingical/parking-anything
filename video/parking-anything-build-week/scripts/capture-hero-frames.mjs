import { mkdir, readdir, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

import {
  CANONICAL_FRAME_NAMES,
  MAIN_SAMPLE_TIMES,
  assertDisclosureMeasurement,
  isKnownGeneratedArtifact,
} from "./capture-hero-frames-contract.mjs";

const projectDir = resolve(new URL("..", import.meta.url).pathname);
const snapshotsDir = resolve(projectDir, "snapshots");
const serverUrl = "http://127.0.0.1:3028/parking-anything-build-week/index.html";
const canvas = { width: 1920, height: 1080 };
const contactCell = { width: 480, height: 270 };

async function cleanKnownArtifacts() {
  await mkdir(snapshotsDir, { recursive: true });
  const files = await readdir(snapshotsDir);
  await Promise.all(
    files
      .filter(isKnownGeneratedArtifact)
      .map((fileName) => unlink(resolve(snapshotsDir, fileName))),
  );
}

async function disclosurePixelContract(framePath) {
  const disclosureRegion = { left: 1400, top: 30, width: 470, height: 120 };
  const { data, info } = await sharp(framePath)
    .extract(disclosureRegion)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let count = 0;
  let minX = info.width;
  let maxX = -1;
  let minY = info.height;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      const [red, green, blue] = data.subarray(offset, offset + 3);
      if (red >= 230 && green >= 180 && green <= 220 && blue <= 100) {
        count += 1;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const yellowWidth = maxX >= minX ? maxX - minX + 1 : 0;
  const yellowHeight = maxY >= minY ? maxY - minY + 1 : 0;
  let darkCount = 0;
  let darkMinX = info.width;
  let darkMaxX = -1;
  let darkMinY = info.height;
  let darkMaxY = -1;
  for (let y = minY + 6; y <= maxY - 6; y += 1) {
    for (let x = minX + 8; x <= maxX - 8; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      const [red, green, blue] = data.subarray(offset, offset + 3);
      if (red < 80 && green < 80 && blue < 80) {
        darkCount += 1;
        darkMinX = Math.min(darkMinX, x);
        darkMaxX = Math.max(darkMaxX, x);
        darkMinY = Math.min(darkMinY, y);
        darkMaxY = Math.max(darkMaxY, y);
      }
    }
  }
  const darkWidth = darkMaxX >= darkMinX ? darkMaxX - darkMinX + 1 : 0;
  const darkHeight = darkMaxY >= darkMinY ? darkMaxY - darkMinY + 1 : 0;
  const measurement = {
    yellowCount: count,
    yellowWidth,
    yellowHeight,
    darkCount,
    darkWidth,
    darkHeight,
  };
  try {
    assertDisclosureMeasurement(measurement);
  } catch (error) {
    throw new Error(`${framePath}: ${error.message}`);
  }
  return measurement;
}

async function validateFrame(framePath, { future = false } = {}) {
  const metadata = await sharp(framePath).metadata();
  if (metadata.width !== canvas.width || metadata.height !== canvas.height) {
    throw new Error(`${framePath}: expected ${canvas.width}x${canvas.height}, got ${metadata.width}x${metadata.height}`);
  }

  if (!future) return null;
  const disclosure = await disclosurePixelContract(framePath);
  const sceneStats = await sharp(framePath)
    .extract({ left: 80, top: 150, width: 1760, height: 750 })
    .stats();
  const strongestChannelDeviation = Math.max(...sceneStats.channels.slice(0, 3).map((channel) => channel.stdev));
  if (strongestChannelDeviation < 20) {
    throw new Error(`${framePath}: Future scene appears blank (max channel deviation=${strongestChannelDeviation.toFixed(2)})`);
  }
  return { disclosure, strongestChannelDeviation };
}

async function buildContactSheet(framePaths) {
  const cells = await Promise.all(
    framePaths.map((framePath) => sharp(framePath).resize(contactCell.width, contactCell.height).png().toBuffer()),
  );
  const columns = 4;
  const rows = Math.ceil(cells.length / columns);
  await sharp({
    create: {
      width: columns * contactCell.width,
      height: rows * contactCell.height,
      channels: 3,
      background: "#171918",
    },
  })
    .composite(cells.map((input, index) => ({
      input,
      left: (index % columns) * contactCell.width,
      top: Math.floor(index / columns) * contactCell.height,
    })))
    .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
    .toFile(resolve(snapshotsDir, "contact-sheet.jpg"));
}

await cleanKnownArtifacts();

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: canvas, deviceScaleFactor: 1 });
  await page.goto(serverUrl, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.__timelines?.["parking-anything-main"]));

  const framePaths = [];
  for (const [index, time] of MAIN_SAMPLE_TIMES.entries()) {
    await page.evaluate(async (sampleTime) => {
      window.__timelines["parking-anything-main"].pause().time(sampleTime, false);
      await new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
    }, time);
    const framePath = resolve(snapshotsDir, CANONICAL_FRAME_NAMES[index]);
    await page.screenshot({ path: framePath, animations: "disabled" });
    const validation = await validateFrame(framePath, { future: time >= 110 && time <= 138 });
    if (validation) {
      const { disclosure, strongestChannelDeviation } = validation;
      console.log(
        `${time}s Future pixels: yellow=${disclosure.yellowCount}/${disclosure.yellowWidth}x${disclosure.yellowHeight}, text=${disclosure.darkCount}/${disclosure.darkWidth}x${disclosure.darkHeight}, sceneDeviation=${strongestChannelDeviation.toFixed(2)}`,
      );
    }
    framePaths.push(framePath);
  }

  await buildContactSheet(framePaths);
  console.log(`Captured ${framePaths.length} canonical main frames and snapshots/contact-sheet.jpg.`);
} finally {
  await browser.close();
}
