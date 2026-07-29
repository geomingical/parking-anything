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

const v1Envelope = {
  version: 1,
  items: [
    {
      id: "v1-parked",
      url: "https://example.com/v1-tool",
      category: "ai_tool",
      status: "parked",
      title: "Migrated focused tool",
      summary: "A strict v1 record for browser migration.",
      effortTier: "focused_session",
      suggestedTestTask: "Run the exact migration fixture.",
      usefulnessHypothesis: "Migration should preserve this meaning.",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-02T00:00:00.000Z",
      lastActivityAt: "2026-06-03T00:00:00.000Z",
    },
    {
      id: "v1-garaged",
      url: "https://example.com/v1-result-tool",
      category: "ai_tool",
      status: "garaged",
      title: "Migrated result tool",
      summary: "A second strict v1 status.",
      effortTier: "quick_spin",
      suggestedTestTask: "Preserve the result evidence.",
      usefulnessHypothesis: "The evidence URL should be renamed only.",
      createdAt: "2026-06-04T00:00:00.000Z",
      updatedAt: "2026-06-05T00:00:00.000Z",
      lastActivityAt: "2026-06-05T00:00:00.000Z",
      testStartedAt: "2026-06-04T12:00:00.000Z",
      notes: "Migration evidence.",
      repoUrl: "https://example.com/exact-result",
    },
  ],
} as const;

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

async function mockMixedPatrol(page: Page) {
  await page.route("**/api/manager-patrol", async (route) => {
    const body = route.request().postDataJSON() as {
      candidates: Array<{ id: string; kind: "ai_tool" | "idea" }>;
    };
    const idea = body.candidates.find(({ kind }) => kind === "idea");
    const candidate = idea ?? body.candidates[0];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        recommendations: candidate
          ? [{ itemId: candidate.id, suggestedAction: "start_test_drive", rationale: "Plan one bounded test before this gets forgotten.", source: "model" }]
          : [],
      }),
    });
  });
}

async function parkIdea(page: Page, title: string, ideaText: string) {
  await page.getByRole("tab", { name: "Park idea" }).click();
  await page.getByLabel("Idea title").fill(title);
  await page.getByLabel("Idea", { exact: true }).fill(ideaText);
  await page.getByRole("button", { name: "Park Idea" }).click();
  await expect(page.getByRole("button", { name: `${title}, Parked` })).toBeVisible();
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
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  await page.screenshot({
    path,
    fullPage: true,
    animations: "disabled",
  });
}

test.beforeEach(async ({ page }) => {
  await mockAnalyze(page);
});

test("strict v1 data migrates once while v1 remains byte-identical", async ({ page }) => {
  const assertNoErrors = collectUnexpectedErrors(page);
  const rawV1 = JSON.stringify(v1Envelope);
  await page.addInitScript((value) => {
    localStorage.setItem("parking-anything:v1", value);
  }, rawV1);

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Migrated focused tool, Parked" })).toBeVisible();
  const migrated = await page.evaluate(() => ({
    v1: localStorage.getItem("parking-anything:v1"),
    v2: JSON.parse(localStorage.getItem("parking-anything:v2")!),
  }));
  expect(migrated.v1).toBe(rawV1);
  expect(migrated.v2).toEqual({
    version: 2,
    parkingItems: [
      expect.objectContaining({
        id: "v1-parked",
        kind: "ai_tool",
        effortTier: "focused_session",
      }),
      expect.objectContaining({
        id: "v1-garaged",
        kind: "ai_tool",
        resultUrl: "https://example.com/exact-result",
      }),
    ],
  });
  expect(JSON.stringify(migrated.v2)).not.toContain("category");
  expect(JSON.stringify(migrated.v2)).not.toContain("repoUrl");

  await page.reload();
  await expect(page.getByRole("button", { name: "Migrated focused tool, Parked" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("parking-anything:v1"))).toBe(rawV1);
  assertNoErrors();
});

test("a present malformed v2 never falls back to valid v1", async ({ page }) => {
  const assertNoErrors = collectUnexpectedErrors(page);
  const rawV1 = JSON.stringify(v1Envelope);
  const rawV2 = '{"version":2,"parkingItems":"malformed"}';
  await page.addInitScript(({ v1, v2 }) => {
    localStorage.setItem("parking-anything:v1", v1);
    localStorage.setItem("parking-anything:v2", v2);
  }, { v1: rawV1, v2: rawV2 });

  await page.goto("/");
  await expect(page.getByText("Stored demo data cannot be read safely.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Migrated focused tool, Parked" })).toHaveCount(0);
  await expect(page.evaluate(() => ({
    v1: localStorage.getItem("parking-anything:v1"),
    v2: localStorage.getItem("parking-anything:v2"),
  }))).resolves.toEqual({ v1: rawV1, v2: rawV2 });

  // The banner promises the stored value survives until the reset is confirmed,
  // so a mutation attempted in this state must be refused rather than commit.
  await page.getByRole("tab", { name: "Park idea" }).click();
  await page.getByLabel("Idea title").fill("Overwrite probe");
  await page.getByLabel("Idea", { exact: true }).fill("Attempted while unreadable.");
  await page.getByRole("button", { name: "Park Idea" }).click();
  await expect(
    page.getByText("Stored demo data cannot be read safely.", { exact: false }).last(),
  ).toBeVisible();
  await expect(page.evaluate(() => ({
    v1: localStorage.getItem("parking-anything:v1"),
    v2: localStorage.getItem("parking-anything:v2"),
  }))).resolves.toEqual({ v1: rawV1, v2: rawV2 });
  assertNoErrors();
});

test("Idea uses one record through planning, Test Drive, and Garage", async ({ page }) => {
  const assertNoErrors = collectUnexpectedErrors(page);
  await page.goto("/");
  await parkIdea(page, "Decision receipt", "Record the decision owner before a meeting ends.");
  await page.getByRole("button", { name: "Decision receipt, Parked" }).click();
  await page.getByLabel("Effort tier").selectOption("quick_spin");
  await page.getByLabel("First test task").fill("Capture one decision after the next meeting.");
  await page.getByRole("button", { name: "Save planning" }).click();
  await page.getByRole("button", { name: "Start Test Drive" }).click();
  await page.getByLabel("Test notes").fill("The owner confirmed the captured decision.");
  await page.getByRole("button", { name: "Park in Garage" }).click();

  await page.getByRole("tab", { name: /Garage/ }).click();
  await expect(page.getByRole("button", { name: "Decision receipt, Garaged" })).toBeVisible();
  const matching = await page.evaluate(() => {
    const envelope = JSON.parse(localStorage.getItem("parking-anything:v2")!);
    return envelope.parkingItems.filter((item: { title: string }) => item.title === "Decision receipt");
  });
  expect(matching).toHaveLength(1);
  expect(matching[0]).toMatchObject({ kind: "idea", status: "garaged" });
  await expectNoHorizontalPageScroll(page);
  assertNoErrors();
});

test("an unplanned Idea can go directly to the shared Scrapyard", async ({ page }) => {
  const assertNoErrors = collectUnexpectedErrors(page);
  await page.goto("/");
  await parkIdea(page, "Unbounded idea", "This one is not ready to test.");
  await page.getByRole("button", { name: "Unbounded idea, Parked" }).click();
  await page.getByRole("button", { name: "Tow Away" }).click();
  await page.getByLabel("Decision reason").fill("No bounded experiment can be defined yet.");
  await page.getByRole("button", { name: "Confirm Tow Away" }).click();
  await page.getByRole("tab", { name: /Scrapyard/ }).click();
  await expect(page.getByRole("button", { name: "Unbounded idea, Scrapped" })).toBeVisible();
  assertNoErrors();
});

test("mixed Patrol plans an Idea before applying Start Test Drive", async ({ page }) => {
  const assertNoErrors = collectUnexpectedErrors(page);
  await mockMixedPatrol(page);
  await page.goto("/");
  await parkIdea(page, "Patrol planning idea", "Try a smaller decision log.");
  await page.getByRole("button", { name: "Run Manager Patrol" }).click();
  const row = page.getByRole("article", { name: "Patrol recommendation for Patrol planning idea" });
  await expect(row.getByText("Observed Fact")).toBeVisible();
  await expect(row.getByText("GPT-5.6 Recommendation")).toBeVisible();
  await row.getByRole("button", { name: "Plan Test Drive" }).click();
  await expect(page.getByLabel("Effort tier")).toBeFocused();
  await expect(page.getByRole("button", { name: "Patrol planning idea, Parked" })).toHaveCount(0);

  await page.getByLabel("Effort tier").selectOption("focused_session");
  await page.getByLabel("First test task").fill("Write one decision record in a live meeting.");
  await page.getByRole("button", { name: "Save planning" }).click();
  await page.getByRole("button", { name: "Close inspector" }).click();
  await expect(row.getByRole("button", { name: "Start Test Drive" })).toBeVisible();
  await row.getByRole("button", { name: "Start Test Drive" }).click();
  await expect(page.getByRole("tab", { name: /Test Driving 2/ })).toHaveAttribute("aria-selected", "true");
  assertNoErrors();
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
  await page.reload();
  await expect(page.getByRole("tab", { name: "Parking Lot 1" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Test Driving 1" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Garage 1" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Scrapyard 0" })).toBeVisible();
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
    await expect(page.getByRole("tab", { name: "Park tool" })).toBeFocused();
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
  test.skip(true, "v0.4 screenshot artifacts are immutable; v0.5 owns a separate matrix");
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

test("capture v0.5 unified Parkable visual matrix", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "desktop owns the shared viewport matrix");
  const assertNoErrors = collectUnexpectedErrors(page);
  await mockMixedPatrol(page);

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
  ]) {
    const size = `${viewport.width}x${viewport.height}`;
    const shot = (state: string) => `docs/qa-screenshots/v0.5-${size}-${state}.png`;
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "Reset demo data settings" }).click();
    await page.getByRole("button", { name: "Reset demo data", exact: true }).click();

    await expect(page.getByRole("button", { name: /Future/ })).toHaveCount(0);
    await expect(page.getByText(/Planned for later releases/)).toBeVisible();
    await expectNoHorizontalPageScroll(page);
    await captureStableScreenshot(page, shot("future-controls"));

    await page.getByRole("tab", { name: "Park idea" }).click();
    await captureStableScreenshot(page, shot("park-idea"));
    await parkIdea(page, "Decision receipt", "Record one decision before the meeting ends.");
    await expect(page.getByText("Needs review · 49 days")).toBeVisible();
    await expectNoHorizontalPageScroll(page);
    await captureStableScreenshot(page, shot("mixed-lot"));
    await captureStableScreenshot(page, shot("needs-review"));

    await page.getByRole("button", { name: "Decision receipt, Parked" }).click();
    await expectNoHorizontalPageScroll(page);
    await captureStableScreenshot(page, shot("unplanned-inspector"));
    await page.getByLabel("Effort tier").selectOption("quick_spin");
    await page.getByLabel("First test task").fill("Capture one decision after the next meeting.");
    await page.getByRole("button", { name: "Save planning" }).click();
    await captureStableScreenshot(page, shot("planned-inspector"));
    await page.getByRole("button", { name: "Close inspector" }).click();

    await page.getByRole("button", { name: "Run Manager Patrol" }).click();
    await expect(page.getByText("GPT-5.6 Recommendation")).toBeVisible();
    await expectNoHorizontalPageScroll(page);
    await captureStableScreenshot(page, shot("mixed-patrol"));

    const ideaRow = page.getByRole("article", { name: "Patrol recommendation for Decision receipt" });
    await ideaRow.getByRole("button", { name: "Start Test Drive" }).click();
    await page.getByRole("button", { name: "Decision receipt, Test Driving" }).click();
    await page.getByLabel("Test notes").fill("The decision record was useful.");
    await page.getByRole("button", { name: "Park in Garage" }).click();
    await page.getByRole("tab", { name: /Garage/ }).click();
    await expectNoHorizontalPageScroll(page);
    await captureStableScreenshot(page, shot("garage"));

    await page.getByRole("tab", { name: /Parking Lot/ }).click();
    await page.getByRole("button", { name: /OpenAI Platform Docs, Parked/ }).click();
    await page.getByRole("button", { name: "Tow Away" }).click();
    await page.getByLabel("Decision reason").fill("Visual QA deliberate exit.");
    await page.getByRole("button", { name: "Confirm Tow Away" }).click();
    await expectNoHorizontalPageScroll(page);
    await captureStableScreenshot(page, shot("scrapyard"));
  }
  assertNoErrors();
});
