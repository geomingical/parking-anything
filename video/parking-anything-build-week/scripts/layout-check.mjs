import { chromium } from "playwright";

const captures = [
  {
    file: "parking-anything-build-week/index.html",
    timeline: "parking-anything-main",
    times: [4, 23, 39, 53, 64, 80, 98, 110, 118, 128, 138, 142, 147, 149.4],
    contractTimes: [0, 61.1, 62.3, 63.5, 64.8, 65.5, 113, 138.4],
  },
  { file: "parking-anything-teaser/index.html", timeline: "parking-anything-teaser", times: [1.5, 6, 11, 16.5] },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
const measurements = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`browser console: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`page error: ${error.message}`));

for (const capture of captures) {
  await page.goto(`http://127.0.0.1:3028/${capture.file}`, { waitUntil: "load" });
  await page.waitForFunction((timeline) => Boolean(window.__timelines?.[timeline]), capture.timeline);

  const brokenImages = await page.locator("img").evaluateAll((images) =>
    images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.getAttribute("src")),
  );
  brokenImages.forEach((src) => errors.push(`${capture.file}: broken image ${src}`));

  for (const time of [...capture.times, ...(capture.contractTimes || [])]) {
    const isSampleTime = capture.times.includes(time);
    await page.evaluate(({ timeline, time }) => {
      window.__timelines[timeline].pause().time(time, false);
    }, { timeline: capture.timeline, time });

    const issues = isSampleTime ? await page.evaluate(() => {
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
        ".caption-line",
        ".evidence-label",
        ".future-disclosure",
        ".road-sign",
        ".gather-plaza",
      ].join(",");

      const isEffectivelyVisible = (element) => {
        let current = element;
        while (current) {
          const style = getComputedStyle(current);
          if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) <= 0.05) return false;
          current = current.parentElement;
        }
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      return [...document.querySelectorAll(selectors)]
        .filter(isEffectivelyVisible)
        .flatMap((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          const findings = [];
          if (rect.left < -2 || rect.top < -2 || rect.right > 1922 || rect.bottom > 1082) {
            findings.push(`${element.id || element.className || element.tagName}: outside canvas (${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.right)},${Math.round(rect.bottom)})`);
          }
          const clipsX = ["auto", "clip", "hidden", "scroll"].includes(style.overflowX);
          const clipsY = ["auto", "clip", "hidden", "scroll"].includes(style.overflowY);
          if ((clipsX && element.scrollWidth > element.clientWidth + 2) || (clipsY && element.scrollHeight > element.clientHeight + 2)) {
            findings.push(`${element.id || element.className || element.tagName}: content overflow`);
          }
          return findings;
        });
    }) : [];

    issues.forEach((issue) => errors.push(`${capture.file}@${time}s: ${issue}`));

    if (capture.timeline === "parking-anything-main") {
      const contractResult = await page.evaluate((time) => {
        const findings = [];
        const metrics = [];
        const elementOpacity = (element) => {
          let opacity = 1;
          let current = element;
          while (current) {
            const style = getComputedStyle(current);
            if (style.display === "none" || style.visibility === "hidden") return 0;
            opacity *= Number(style.opacity);
            current = current.parentElement;
          }
          return opacity;
        };
        const rectsOverlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        const visibleRegionRect = (element) => {
          const rect = element.getBoundingClientRect();
          const clipped = {
            left: Math.max(0, rect.left),
            top: Math.max(0, rect.top),
            right: Math.min(1920, rect.right),
            bottom: Math.min(1080, rect.bottom),
          };
          let current = element.parentElement;
          while (current && clipped.right > clipped.left && clipped.bottom > clipped.top) {
            const style = getComputedStyle(current);
            const ancestorRect = current.getBoundingClientRect();
            if (["auto", "clip", "hidden", "scroll"].includes(style.overflowX)) {
              clipped.left = Math.max(clipped.left, ancestorRect.left);
              clipped.right = Math.min(clipped.right, ancestorRect.right);
            }
            if (["auto", "clip", "hidden", "scroll"].includes(style.overflowY)) {
              clipped.top = Math.max(clipped.top, ancestorRect.top);
              clipped.bottom = Math.min(clipped.bottom, ancestorRect.bottom);
            }
            current = current.parentElement;
          }
          return clipped.right > clipped.left && clipped.bottom > clipped.top ? clipped : null;
        };
        const rectangleUnionArea = (rectangles) => {
          const xEdges = [...new Set(rectangles.flatMap((rect) => [rect.left, rect.right]))].sort((a, b) => a - b);
          let area = 0;
          for (let index = 0; index < xEdges.length - 1; index += 1) {
            const left = xEdges[index];
            const right = xEdges[index + 1];
            if (right <= left) continue;
            const intervals = rectangles
              .filter((rect) => rect.left < right && rect.right > left)
              .map((rect) => [rect.top, rect.bottom])
              .sort((a, b) => a[0] - b[0]);
            let coveredY = 0;
            let activeStart;
            let activeEnd;
            for (const [top, bottom] of intervals) {
              if (activeStart === undefined) {
                activeStart = top;
                activeEnd = bottom;
              } else if (top <= activeEnd) {
                activeEnd = Math.max(activeEnd, bottom);
              } else {
                coveredY += activeEnd - activeStart;
                activeStart = top;
                activeEnd = bottom;
              }
            }
            if (activeStart !== undefined) coveredY += activeEnd - activeStart;
            area += (right - left) * coveredY;
          }
          return area;
        };
        const near = (actual, expected, tolerance = 10) => Math.abs(actual - expected) <= tolerance;
        const verifyComputedColor = ({ label, element, property, expected }) => {
          if (!element) {
            findings.push(`${label} is missing for rendered palette verification`);
            return;
          }
          const actual = getComputedStyle(element)[property];
          metrics.push(`${label} ${property}=${actual}`);
          if (actual !== expected) findings.push(`${label} ${property} is ${actual}; expected ${expected}`);
        };

        if (time === 4) {
          verifyComputedColor({
            label: "#scene-1 canvas",
            element: document.querySelector("#scene-1"),
            property: "backgroundColor",
            expected: "rgb(48, 51, 49)",
          });
          const activeCaption = [...document.querySelectorAll(".caption-line")]
            .find((element) => elementOpacity(element) > 0.05);
          verifyComputedColor({
            label: "active .caption-line",
            element: activeCaption,
            property: "backgroundColor",
            expected: "rgba(23, 25, 24, 0.95)",
          });
          verifyComputedColor({
            label: "active .caption-line",
            element: activeCaption,
            property: "color",
            expected: "rgb(255, 255, 255)",
          });
        }

        if (time === 23) {
          verifyComputedColor({
            label: "#s2-copy .evidence-label",
            element: document.querySelector("#s2-copy .evidence-label"),
            property: "backgroundColor",
            expected: "rgb(242, 201, 76)",
          });
          verifyComputedColor({
            label: "#s2-copy .evidence-label",
            element: document.querySelector("#s2-copy .evidence-label"),
            property: "color",
            expected: "rgb(23, 25, 24)",
          });
          verifyComputedColor({
            label: "#s2-route",
            element: document.querySelector("#s2-route"),
            property: "stroke",
            expected: "rgb(47, 125, 92)",
          });
        }

        if (time === 113) {
          verifyComputedColor({
            label: "#s8-disclosure",
            element: document.querySelector("#s8-disclosure"),
            property: "backgroundColor",
            expected: "rgb(242, 201, 76)",
          });
          verifyComputedColor({
            label: "#s8-disclosure",
            element: document.querySelector("#s8-disclosure"),
            property: "color",
            expected: "rgb(23, 25, 24)",
          });
        }

        if (time === 0) {
          const openingOpacity = [];
          for (const selector of ["#s1-copy", "#s1-product", "#s1-car"]) {
            const opacity = elementOpacity(document.querySelector(selector));
            openingOpacity.push(`${selector}=${opacity.toFixed(3)}`);
            if (opacity > 0.01) findings.push(`${selector} must be hidden at frame zero, got opacity ${opacity.toFixed(3)}`);
          }
          metrics.push(`frame zero ${openingOpacity.join(", ")}`);
        }

        const widthContracts = {
          4: ["#s1-product", 0.62],
          53: ["#s4-product", 0.58],
          80: ["#s6-product", 0.62],
          98: ["#s7-product", 0.58],
        };
        if (widthContracts[time]) {
          const [selector, fraction] = widthContracts[time];
          const width = document.querySelector(selector).getBoundingClientRect().width;
          const minimum = 1920 * fraction;
          metrics.push(`${selector} width=${width.toFixed(1)}px minimum=${minimum.toFixed(1)}px`);
          if (width + 0.5 < minimum) findings.push(`${selector} width ${width.toFixed(1)}px is below ${minimum.toFixed(1)}px`);
        }

        const s5Contracts = {
          61.1: [[930, 999], [990, 999]],
          62.3: [[960, 710], [960, 710]],
          63.5: [[793, 570], [1127, 570]],
          64.8: [[430, 430], [1490, 430]],
          65.5: [[430, 330], [1490, 330]],
        };
        if (s5Contracts[time]) {
          ["#s5-car-green", "#s5-car-red"].forEach((selector, index) => {
            const rect = document.querySelector(selector).getBoundingClientRect();
            const center = [rect.left + rect.width / 2, rect.top + rect.height / 2];
            const expected = s5Contracts[time][index];
            metrics.push(`${selector} center=(${center.map((value) => value.toFixed(1)).join(", ")})`);
            if (!near(center[0], expected[0]) || !near(center[1], expected[1])) {
              findings.push(`${selector} center (${center.map((value) => value.toFixed(1)).join(", ")}) misses route checkpoint (${expected.join(", ")})`);
            }
          });
        }

        if ([110, 113, 118, 128, 138, 138.4].includes(time)) {
          const disclosure = document.querySelector("#s8-disclosure");
          const style = getComputedStyle(disclosure);
          const opacity = elementOpacity(disclosure);
          const rect = disclosure.getBoundingClientRect();
          const textRange = document.createRange();
          textRange.selectNodeContents(disclosure);
          const textRect = textRange.getBoundingClientRect();
          if (opacity <= 0.95 || style.display === "none" || style.visibility !== "visible") {
            findings.push(`Future disclosure must remain visible, got opacity ${opacity.toFixed(3)}, display ${style.display}, visibility ${style.visibility}`);
          }
          if (disclosure.textContent.trim() !== "FUTURE · NOT YET BUILT") {
            findings.push(`Future disclosure text changed to ${JSON.stringify(disclosure.textContent.trim())}`);
          }
          if (rect.width < 340 || rect.height < 54) {
            findings.push(`Future disclosure geometry collapsed to ${rect.width.toFixed(1)}x${rect.height.toFixed(1)}px`);
          }
          if (rect.left < 0 || rect.top < 0 || rect.right > 1920 || rect.bottom > 1080) {
            findings.push(`Future disclosure leaves canvas at (${rect.left.toFixed(1)}, ${rect.top.toFixed(1)}, ${rect.right.toFixed(1)}, ${rect.bottom.toFixed(1)})`);
          }
          if (disclosure.scrollWidth > disclosure.clientWidth + 2 || disclosure.scrollHeight > disclosure.clientHeight + 2) {
            findings.push(`Future disclosure clips content (${disclosure.scrollWidth}x${disclosure.scrollHeight} scroll vs ${disclosure.clientWidth}x${disclosure.clientHeight} client)`);
          }
          if (
            textRect.width < 250
            || textRect.height < 18
            || textRect.left < rect.left
            || textRect.top < rect.top
            || textRect.right > rect.right
            || textRect.bottom > rect.bottom
          ) {
            findings.push(`Future disclosure text geometry is clipped or empty (${textRect.width.toFixed(1)}x${textRect.height.toFixed(1)}px)`);
          }

          const scene = document.querySelector("#scene-8");
          const sceneRect = scene.getBoundingClientRect();
          const sceneOpacity = elementOpacity(scene);
          const visibleFutureLayers = ["#s8-source", "#s8-roadmap"]
            .map((selector) => elementOpacity(document.querySelector(selector)))
            .filter((layerOpacity) => layerOpacity > 0.2).length;
          if (sceneOpacity <= 0.95 || sceneRect.width < 1919 || sceneRect.height < 1079 || visibleFutureLayers < 1) {
            findings.push(`Future scene must remain nonblank and full-canvas, got opacity ${sceneOpacity.toFixed(3)}, ${sceneRect.width.toFixed(1)}x${sceneRect.height.toFixed(1)}px, visible layers ${visibleFutureLayers}`);
          }
          metrics.push(
            `Future disclosure opacity=${opacity.toFixed(3)}, box=${rect.width.toFixed(1)}x${rect.height.toFixed(1)}px, text=${textRect.width.toFixed(1)}x${textRect.height.toFixed(1)}px, sceneOpacity=${sceneOpacity.toFixed(3)}, visibleLayers=${visibleFutureLayers}`,
          );
        }

        const shippedProductTimes = [4, 23, 39, 53, 64, 80, 98];
        const visibleProductRegions = [...document.querySelectorAll('[data-visual-role="product-primary"]')]
          .filter((element) => elementOpacity(element) > 0.05)
          .map(visibleRegionRect)
          .filter(Boolean);
        if (shippedProductTimes.includes(time) && !visibleProductRegions.length) {
          findings.push("shipped-product sample has no visible product-primary region");
        } else if (visibleProductRegions.length) {
          const coverage = rectangleUnionArea(visibleProductRegions) / (1920 * 1080);
          const percentage = coverage * 100;
          metrics.push(`visible product-primary union=${percentage.toFixed(2)}% (minimum 45%)`);
          if (coverage + Number.EPSILON < 0.45) {
            findings.push(`visible product-primary union covers ${percentage.toFixed(2)}% of 1920x1080; expected at least 45%`);
          }
        }

        const visibleCaption = [...document.querySelectorAll(".caption-line")].find((element) => elementOpacity(element) > 0.05);
        if (visibleCaption) {
          const captionRect = visibleCaption.getBoundingClientRect();
          const important = [...document.querySelectorAll(".scene-copy, .product-primary, .future-source-frame, .future-disclosure, .gather-plaza")]
            .filter((element) => elementOpacity(element) > 0.05);
          for (const element of important) {
            if (rectsOverlap(captionRect, element.getBoundingClientRect())) {
              findings.push(`caption collides with ${element.id || element.className}`);
            }
          }
        }

        return { findings, metrics };
      }, time);
      contractResult.findings.forEach((issue) => errors.push(`${capture.file}@${time}s: ${issue}`));
      contractResult.metrics.forEach((metric) => measurements.push(`${time}s ${metric}`));
    }
  }
}

await browser.close();

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Local visual contract checks passed for frame zero, rendered palette, route geometry, UI widths, 45% product-primary union area, Future disclosure, captions, and sampled layouts.");
  console.log(measurements.join("\n"));
}
