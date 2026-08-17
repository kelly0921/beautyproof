import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const outputDir = path.join(process.cwd(), "artifacts", "ui-before");
const baseUrl = "https://beautyproof.kellychenmeiyi.workers.dev";

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await page.goto(`${baseUrl}/demo`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outputDir, "01-opening-mobile.png"), fullPage: false, animations: "disabled", caret: "hide" });
  console.log("Captured artifacts/ui-before/01-opening-mobile.png from the current production baseline");

  await page.goto(`${baseUrl}/app/profile`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outputDir, "14-profile-mobile.png"), fullPage: true, animations: "disabled", caret: "hide" });
  console.log("Captured artifacts/ui-before/14-profile-mobile.png from the current production baseline");
} finally {
  await browser.close();
}
