import { expect, test } from "@playwright/test";

test("judge completes the outcome-neutral sponsored Proof Campaign loop", async ({ page }) => {
  const healthResponse = await page.request.get("/api/health");
  const health = await healthResponse.json() as { ok: boolean; data: { persistence: { activeMode: string; durable: boolean } } };
  expect(healthResponse.ok()).toBe(true);
  expect(health.ok).toBe(true);
  expect(["memory", "supabase"]).toContain(health.data.persistence.activeMode);

  const resetResponse = await page.request.post("/api/demo/reset");
  expect(resetResponse.ok()).toBe(true);
  await page.goto("/demo");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.getByText("BeautyProof guided demo", { exact: true })).toBeVisible();
  await expect(page.getByText("1 / 6", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Fund one missing proof gap/i })).toBeVisible();
  await expect(page.getByText(/Barrier repair blocked/i)).toBeVisible();
  await page.getByRole("button", { name: /Activate campaign/i }).click();

  await expect(page).toHaveURL(/\/app\/campaigns\/campaign-dewsignal-hydration-2026/);
  await expect(page.getByText("2 / 6", { exact: true })).toBeVisible();
  await expect(page.getByText("Consumer app", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Sponsored Proof Trial/).first()).toBeVisible();
  await page.getByRole("checkbox", { name: /I understand this is simulated demo data/i }).check();
  await page.getByRole("button", { name: /Check campaign eligibility/i }).click();
  await expect(page.getByText("3 / 6", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "You qualify" })).toBeVisible();
  await expect(page.getByText(/54.2/).first()).toBeVisible();

  await page.getByRole("checkbox", { name: /I accept the sponsored Proof Trial terms/i }).check();
  await page.getByRole("button", { name: /Enroll.*pending/i }).click();
  await expect(page.getByRole("heading", { name: /reward ledger is pending/i })).toBeVisible();
  await page.getByRole("button", { name: /Start sponsored 14-day ProofWindow/i }).click();

  await expect(page).toHaveURL(/\/app\/trial\//);
  await expect(page.getByText("4 / 6", { exact: true })).toBeVisible();
  await expect(page.getByText("Sponsored Proof Trial", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Reward status/i)).toBeVisible();
  await page.getByRole("button", { name: /Save check-in/i }).click();
  await page.getByRole("button", { name: /Demo time jump/i }).click();
  await page.getByRole("button", { name: /Use simulated demo follow-up/i }).click();

  await expect(page).toHaveURL(/\/app\/proofs\//);
  await expect(page.getByText("5 / 6", { exact: true })).toBeVisible();
  await expect(page.getByText("Sponsored Proof Trial", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Reward earned for completing/i })).toBeVisible();
  await expect(page.getByText(/no funds moved/i)).toBeVisible();
  await page.getByRole("button", { name: /I understand.*add demo receipt/i }).click();
  await page.getByRole("link", { name: /See updated campaign coverage/i }).click();

  await expect(page).toHaveURL(/\/brand\/campaigns\/campaign-dewsignal-hydration-2026\?updated=1/);
  await expect(page.getByText("6 / 6", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /proof becomes reusable/i })).toBeVisible();
  await expect(page.getByText(/Campaign coverage updated/i)).toBeVisible();
  await expect(page.getByText(/Rewards earned/i)).toBeVisible();
  await expect(page.getByText("Shopper ProofMap", { exact: true }).locator("..")).toContainText("0 real · 1 demo");
});
