import { chromium } from "playwright";

const captures = [
  { file: "index.html", timeline: "parking-anything-main", times: [4, 23, 39, 53, 64, 80, 98, 113] },
  { file: "teaser.html", timeline: "parking-anything-teaser", times: [1.5, 6, 11, 16.5] },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`browser console: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`page error: ${error.message}`));

for (const capture of captures) {
  await page.goto(`http://127.0.0.1:3028/${capture.file}`, { waitUntil: "networkidle" });
  await page.waitForFunction((timeline) => Boolean(window.__timelines?.[timeline]), capture.timeline);

  const brokenImages = await page.locator("img").evaluateAll((images) =>
    images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.getAttribute("src")),
  );
  brokenImages.forEach((src) => errors.push(`${capture.file}: broken image ${src}`));

  for (const time of capture.times) {
    await page.evaluate(
      ({ timeline, time }) => window.__timelines[timeline].pause().time(time, false),
      { timeline: capture.timeline, time },
    );

    const issues = await page.evaluate(() => {
      const selectors = [
        "h1",
        "h2",
        "h3",
        "p",
        ".stamp",
        ".ticket",
        ".boundary-sign",
        ".ui-card",
        ".action-chip",
        ".wordmark",
        ".browser-bar",
        ".lifecycle-step",
      ].join(",");

      return [...document.querySelectorAll(selectors)]
        .filter((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0.05 && rect.width > 0 && rect.height > 0;
        })
        .flatMap((element) => {
          const rect = element.getBoundingClientRect();
          const findings = [];
          if (rect.left < -2 || rect.top < -2 || rect.right > 1922 || rect.bottom > 1082) {
            findings.push(`${element.id || element.className || element.tagName}: outside canvas (${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.right)},${Math.round(rect.bottom)})`);
          }
          if (element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2) {
            findings.push(`${element.id || element.className || element.tagName}: content overflow`);
          }
          return findings;
        });
    });

    issues.forEach((issue) => errors.push(`${capture.file}@${time}s: ${issue}`));
  }
}

await browser.close();

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Local hero-frame layout checks passed with no broken images, console errors, canvas escapes, or text overflow.");
}
