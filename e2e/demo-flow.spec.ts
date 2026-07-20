import { expect, test, type Page } from "@playwright/test";

const analyzeFixture = {
  analysis: {
    title: "Example Tool",
    summary: "A compact AI tool saved for one bounded evaluation.",
    effortTier: "quick_spin",
    suggestedTestTask: "Complete one representative 15-minute evaluation.",
    usefulnessHypothesis: "It may remove one repeated manual review step.",
  },
  sourceMode: "url_only",
  warning: "Page text could not be fetched, so this analysis uses the URL only.",
};

const modelPatrolFixture = {
  recommendations: [
    {
      itemId: "seed-stale",
      suggestedAction: "start_test_drive",
      rationale: "Give this old bookmark one bounded test or clear the slot.",
      source: "model",
    },
  ],
};

const fallbackPatrolFixture = {
  recommendations: [
    {
      itemId: "seed-stale",
      suggestedAction: "scrap",
      rationale: "Clear the slot if it no longer deserves a test.",
      source: "fallback",
    },
  ],
};

function collectUnexpectedErrors(
  page: Page,
  allowedConsoleErrors: RegExp[] = [],
) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !allowedConsoleErrors.some((pattern) => pattern.test(message.text()))
    ) {
      errors.push(`console: ${message.text()}`);
    }
  });
  return () => expect(errors).toEqual([]);
}

async function mockAnalyze(page: Page) {
  await page.route("**/api/analyze-url", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(analyzeFixture),
    }),
  );
}

async function mockPatrol(page: Page, fixture = modelPatrolFixture) {
  await page.route("**/api/manager-patrol", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fixture),
    }),
  );
}

async function analyzeExample(page: Page) {
  await page.getByLabel("AI tool URL").fill("https://example.com/tool");
  await page.getByRole("button", { name: "Analyze & Park" }).click();
  await expect(
    page.getByText(
      "Page text could not be fetched, so this analysis uses the URL only.",
    ),
  ).toBeVisible();
}

async function expectNoHorizontalPageScroll(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function captureStableScreenshot(page: Page, path: string) {
  await page.waitForFunction(() =>
    [...document.images].every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  );
  await page.screenshot({
    path,
    fullPage: true,
    animations: "disabled",
  });
}

test.beforeEach(async ({ page }) => {
  await mockAnalyze(page);
});

test("judge demo resolves curiosity into evidence and a deliberate exit", async ({
  page,
}) => {
  const assertNoErrors = collectUnexpectedErrors(page);
  await mockPatrol(page);
  await page.goto("/");

  await expect(
    page.getByRole("button", { name: /OpenAI Platform Docs, Parked/ }),
  ).toBeVisible();
  await analyzeExample(page);
  await page.getByRole("button", { name: /Example Tool, Parked/ }).click();
  await page.getByRole("button", { name: "Start Test Drive" }).click();
  await page.getByLabel("Test notes").fill("Completed the 15-minute evaluation.");
  await page.getByRole("button", { name: "Park in Garage" }).click();

  await page.getByRole("button", { name: "Run Manager Patrol" }).click();
  const modelRow = page.getByRole("article", {
    name: "Patrol recommendation for OpenAI Platform Docs",
  });
  await expect(modelRow.getByText("Observed Fact")).toBeVisible();
  await expect(modelRow.getByText("GPT-5.6 Recommendation")).toBeVisible();

  await page.getByRole("tab", { name: /Parking Lot/ }).click();
  await page
    .getByRole("button", { name: /OpenAI Platform Docs, Parked/ })
    .click();
  await page.getByRole("button", { name: "Tow Away" }).click();
  await page
    .getByLabel("Decision reason")
    .fill("No current project justifies the setup time.");
  await page.getByRole("button", { name: "Confirm Tow Away" }).click();
  await page.getByRole("tab", { name: /Scrapyard/ }).click();
  await expect(
    page.getByRole("button", { name: /OpenAI Platform Docs, Scrapped/ }),
  ).toBeVisible();
  assertNoErrors();
});

test("Garage and Tow Away require evidence", async ({ page }) => {
  const assertNoErrors = collectUnexpectedErrors(page);
  await page.goto("/");
  await analyzeExample(page);
  await page.getByRole("button", { name: /Example Tool, Parked/ }).click();
  await page.getByRole("button", { name: "Start Test Drive" }).click();
  await page.getByRole("button", { name: "Park in Garage" }).click();
  await expect(
    page.getByText("Add a note or result link before parking in the Garage."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Tow Away" }).click();
  await page.getByRole("button", { name: "Confirm Tow Away" }).click();
  await expect(
    page.getByText("Record why this tool is leaving before towing it away."),
  ).toBeVisible();
  assertNoErrors();
});

test("reset restores the exact repeatable demo", async ({ page }) => {
  const assertNoErrors = collectUnexpectedErrors(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: /OpenAI Platform Docs, Parked/ })
    .click();
  await page.getByRole("button", { name: "Tow Away" }).click();
  await page.getByLabel("Decision reason").fill("Temporary reset check.");
  await page.getByRole("button", { name: "Confirm Tow Away" }).click();

  await page.getByRole("button", { name: "Reset demo data settings" }).click();
  await page.getByRole("button", { name: "Reset demo data", exact: true }).click();

  await expect(page.getByRole("tab", { name: "Parking Lot 1" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Test Driving 1" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Garage 1" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Scrapyard 0" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /OpenAI Platform Docs, Parked/ }),
  ).toBeVisible();
  assertNoErrors();
});

test("fallback provenance is never presented as GPT-5.6 output", async ({ page }) => {
  const assertNoErrors = collectUnexpectedErrors(page);
  await mockPatrol(page, fallbackPatrolFixture);
  await page.goto("/");
  await page.getByRole("button", { name: "Run Manager Patrol" }).click();

  const row = page.getByRole("article", {
    name: "Patrol recommendation for OpenAI Platform Docs",
  });
  await expect(row.getByText("Observed Fact")).toBeVisible();
  await expect(row.getByText("Deterministic fallback")).toBeVisible();
  await expect(row.getByText("GPT-5.6 Recommendation")).toHaveCount(0);
  assertNoErrors();
});

for (const scenario of [
  {
    status: 429,
    headers: { "retry-after": "42" },
    body: { error: "Demo request limit reached." },
    expected: "Demo request limit reached. Try again in 42 seconds.",
  },
  {
    status: 503,
    headers: {},
    body: { error: "Live AI is temporarily unavailable." },
    expected: "Live AI is temporarily unavailable. Try again shortly.",
  },
]) {
  test(`patrol status ${scenario.status} is actionable`, async ({ page }) => {
    const assertNoErrors = collectUnexpectedErrors(page, [
      new RegExp(`Failed to load resource:.*status of ${scenario.status}`),
    ]);
    await page.route("**/api/manager-patrol", (route) =>
      route.fulfill({
        status: scenario.status,
        headers: scenario.headers,
        contentType: "application/json",
        body: JSON.stringify(scenario.body),
      }),
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Run Manager Patrol" }).click();
    await expect(page.getByText(scenario.expected, { exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Parking Lot 1" })).toBeVisible();
    assertNoErrors();
  });
}

test("landmarks, keyboard order, Escape, and focus restoration are accessible", async ({
  page,
}, testInfo) => {
  const assertNoErrors = collectUnexpectedErrors(page);
  await page.goto("/");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByLabel("AI tool URL")).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Parking status filters" })).toBeVisible();

  if (testInfo.project.name === "desktop-chromium") {
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Reset demo data settings" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("AI tool URL")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Analyze & Park" })).toBeFocused();
  }

  const staleCar = page.getByRole("button", {
    name: /OpenAI Platform Docs, Parked/,
  });
  await staleCar.focus();
  await staleCar.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(staleCar).toBeFocused();
  assertNoErrors();
});

test("capture required visual QA states", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "one screenshot matrix is sufficient");
  const assertNoErrors = collectUnexpectedErrors(page);
  await mockPatrol(page);

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
  ]) {
    const size = `${viewport.width}x${viewport.height}`;
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "Reset demo data settings" }).click();
    await page.getByRole("button", { name: "Reset demo data", exact: true }).click();
    await expectNoHorizontalPageScroll(page);
    await captureStableScreenshot(
      page,
      `docs/qa-screenshots/${size}-initial-lot.png`,
    );

    await page
      .getByRole("button", { name: /OpenAI Platform Docs, Parked/ })
      .click();
    await expectNoHorizontalPageScroll(page);
    await captureStableScreenshot(
      page,
      `docs/qa-screenshots/${size}-inspector-open.png`,
    );
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Run Manager Patrol" }).click();
    await expect(page.getByText("GPT-5.6 Recommendation")).toBeVisible();
    await expectNoHorizontalPageScroll(page);
    await captureStableScreenshot(
      page,
      `docs/qa-screenshots/${size}-patrol-results.png`,
    );

    await page.getByRole("tab", { name: /Garage/ }).click();
    await expectNoHorizontalPageScroll(page);
    await captureStableScreenshot(
      page,
      `docs/qa-screenshots/${size}-garage-filter.png`,
    );

    await page.getByRole("tab", { name: /Parking Lot/ }).click();
    await page
      .getByRole("button", { name: /OpenAI Platform Docs, Parked/ })
      .click();
    await page.getByRole("button", { name: "Tow Away" }).click();
    await page.getByLabel("Decision reason").fill("Visual QA decision reason.");
    await page.getByRole("button", { name: "Confirm Tow Away" }).click();
    await expectNoHorizontalPageScroll(page);
    await captureStableScreenshot(
      page,
      `docs/qa-screenshots/${size}-scrapyard-filter.png`,
    );
  }
  assertNoErrors();
});
