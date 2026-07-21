import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const projectDir = resolve(new URL("..", import.meta.url).pathname);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

const captures = [
  { file: "parking-anything-build-week/index.html", timeline: "parking-anything-main", times: [4, 23, 39, 53, 64, 80, 98, 113], snapshotsDir: resolve(projectDir, "snapshots") },
  { file: "parking-anything-teaser/index.html", timeline: "parking-anything-teaser", times: [1.5, 6, 11, 16.5], snapshotsDir: resolve(projectDir, "../parking-anything-teaser/snapshots") },
];

for (const capture of captures) {
  await mkdir(capture.snapshotsDir, { recursive: true });
  await page.goto(`http://127.0.0.1:3028/${capture.file}`, { waitUntil: "load" });
  await page.waitForFunction((timeline) => Boolean(window.__timelines?.[timeline]), capture.timeline);

  for (const time of capture.times) {
    await page.evaluate(
      ({ timeline, time }) => {
        window.__timelines[timeline].pause().time(time, false);
      },
      { timeline: capture.timeline, time },
    );
    await page.screenshot({
      path: resolve(capture.snapshotsDir, `${capture.timeline}-${time.toFixed(1)}s.png`),
      animations: "disabled",
    });
  }
}

await browser.close();
