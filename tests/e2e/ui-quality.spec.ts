import { expect, test } from "@playwright/test";

const auditedWidths = [360, 390, 430, 768, 1024, 1440] as const;
const representativeRoutes = [
  "/demo",
  "/app",
  "/app/scan",
  "/app/proofs",
  "/app/profile",
  "/brand/campaigns/campaign-dewsignal-hydration-2026",
] as const;

test("winner-ready routes stay inside every required viewport", async ({ page }) => {
  for (const width of auditedWidths) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 900 });
    const routes = width === 390 || width === 768 || width === 1440 ? representativeRoutes : ["/demo", "/app"];
    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth, `${route} overflowed at ${width}px`).toBeLessThanOrEqual(dimensions.clientWidth);
    }
  }
});

test("the judge opening is keyboard-operable and keeps demo controls separate", async ({ page }) => {
  await page.goto("/demo");
  const primaryStoryLink = page.getByRole("link", { name: /See the funded proof loop/i });
  await primaryStoryLink.focus();
  await expect(primaryStoryLink).toBeFocused();

  const controls = page.locator(".guided-presenter-controls");
  await expect(controls).not.toHaveAttribute("open", "");
  const summary = controls.locator("summary");
  await summary.focus();
  await expect(summary).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(controls).toHaveAttribute("open", "");
  await expect(page.getByRole("button", { name: "inconclusive", exact: true })).toBeVisible();
});

test("reduced-motion preference removes meaningful UI animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/app");
  const duration = await page.locator(".app-opportunity-card").evaluate((element) => getComputedStyle(element).transitionDuration);
  const seconds = duration.split(",").map((value) => value.trim()).map((value) => value.endsWith("ms") ? Number.parseFloat(value) / 1000 : Number.parseFloat(value));
  expect(Math.max(...seconds)).toBeLessThanOrEqual(0.01);
});

test("formula reset and synthetic origin remain explicit", async ({ page }) => {
  await page.goto("/proof-map");
  await expect(page.getByRole("heading", { name: /The product name stayed the same/i })).toBeVisible();
  await expect(page.getByText("Historical · excluded by default", { exact: true })).toBeVisible();
  await expect(page.getByText("Current evidence pool", { exact: true })).toBeVisible();
  await expect(page.getByText(/Simulated YouCam-format fixture/i).first()).toBeVisible();
});
