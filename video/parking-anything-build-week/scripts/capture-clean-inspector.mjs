import { resolve } from "node:path";
import { chromium } from "playwright";

const projectDir = resolve(new URL("..", import.meta.url).pathname);
const appUrl = process.env.PARKING_ANYTHING_APP_URL ?? "http://127.0.0.1:3107";
const output = resolve(projectDir, "capture/screenshots/planned-inspector.png");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

try {
  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Reset demo data settings" }).click();
  await page.getByRole("button", { name: "Reset demo data", exact: true }).click();

  await page.getByRole("tab", { name: "Park idea" }).click();
  await page.getByLabel("Idea title").fill("Decision receipt");
  await page.getByLabel("Idea", { exact: true }).fill("Record one decision before the meeting ends.");
  await page.getByRole("button", { name: "Park Idea" }).click();
  await page.getByRole("button", { name: "Decision receipt, Parked" }).click();

  await page.getByLabel("Effort tier").selectOption("quick_spin");
  await page.getByLabel("First test task").fill("Capture one decision after the next meeting.");
  await page.getByRole("button", { name: "Save planning" }).click();

  const backdrop = page.locator('[data-state="open"].fixed.inset-0.z-40');
  await backdrop.evaluate((element) => {
    element.style.backgroundColor = "transparent";
  });
  await page.getByRole("dialog", { name: "Decision receipt" }).waitFor({ state: "visible" });

  await page.screenshot({ path: output });
  console.log(`Captured clean inspector screenshot at ${output}`);
} finally {
  await browser.close();
}
