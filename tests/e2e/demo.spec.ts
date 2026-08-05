import { expect, test } from "@playwright/test";

test("judge completes the consented BeautyProof loop in nine clicks", async ({ page }) => {
  const healthResponse = await page.request.get("/api/health");
  const health = await healthResponse.json() as { ok: boolean; data: { persistence: { activeMode: string; durable: boolean } } };
  expect(healthResponse.ok()).toBe(true);
  expect(health.ok).toBe(true);
  expect(["memory", "supabase"]).toContain(health.data.persistence.activeMode);
  expect(health.data.persistence.durable).toBe(health.data.persistence.activeMode === "supabase");

  await page.goto("/demo");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByRole("button", { name: /See proof for my starting skin/i }).click();
  await expect(page).toHaveURL(/\/scan$/);

  await page.getByRole("checkbox", { name: /I consent to cosmetic image analysis/i }).check();
  await page.getByRole("button", { name: /Use preloaded baseline/i }).click();
  await expect(page).toHaveURL(/\/proof-map$/);
  await expect(page.getByRole("heading", { name: /Stars, recompiled/i })).toBeVisible();
  await expect(page.getByText("The product name stayed the same.", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: /Start my hydration ProofWindow/i }).click();
  await page.getByRole("button", { name: /Start this ProofWindow/i }).click();
  await page.getByRole("button", { name: /Save check-in/i }).click();
  await page.getByRole("button", { name: /Demo time jump/i }).click();
  await page.getByRole("button", { name: /Analyze cached-real follow-up/i }).click();

  await expect(page).toHaveURL(/\/proof-receipt\/[^/]+$/);
  await expect(page.getByLabel(/ProofReceipt verdict keep/i)).toBeVisible();
  await expect(page.getByLabel(/YouCam evidence provenance/i)).toContainText(/Cached real YouCam Skin AI v2.1/);
  await expect(page.getByText("High-confidence personal observation", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: /I consent — add my ProofReceipt/i }).click();
  await expect(page).toHaveURL(/\/proof-coverage$/);
  await expect(page.getByText(/Network updated/i)).toBeVisible();
});
