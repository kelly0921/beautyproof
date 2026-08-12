import { expect, test } from "@playwright/test";

test("mobile app shell keeps the primary product actions one tap away", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app");

  await expect(page.getByRole("heading", { name: /Morning, Kelly/i })).toBeVisible();
  await expect(page.locator(".app-bottom-nav")).toBeVisible();

  await page.getByRole("link", { name: "Scan", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/scan$/);
  await expect(page.getByRole("heading", { name: /Start with a clear picture/i })).toBeVisible();
  await expect(page.getByLabel("Choose or take a photo")).not.toHaveAttribute("capture");
  await expect(page.locator('input[type="file"]')).toHaveCount(1);

  await page.getByRole("link", { name: "Proofs", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/proofs$/);
  await expect(page.getByRole("heading", { name: /Your skincare evidence/i })).toBeVisible();

  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/profile$/);
  await expect(page.getByRole("heading", { name: "Kelly Chen" })).toBeVisible();
  await expect(page.getByText("YouCam Skin AI", { exact: true })).toBeVisible();
  await expect(page.getByText("Supabase", { exact: true })).toBeVisible();
});

test("follow-up photo selection offers the iPhone camera or photo library", async ({ page }) => {
  const baselineResponse = await page.request.post("/api/skin-analysis/tasks", { data: { kind: "baseline", scenario: "keep", allowCachedFallback: true } });
  const baseline = await baselineResponse.json() as { data: { analysis: { id: string } } };
  const today = new Date();
  const dateAfter = (days: number) => { const value = new Date(today); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); };
  const windowResponse = await page.request.post("/api/proof-windows", { data: { formulaVersionId: "formula-2026-us", claimId: "claim-hydration-2026", baselineAnalysisId: baseline.data.analysis.id, startDate: dateAfter(0), plannedEndDate: dateAfter(14), returnDeadline: dateAfter(30), status: "active" } });
  const proofWindow = await windowResponse.json() as { data: { id: string } };
  await page.request.post(`/api/proof-windows/${proofWindow.data.id}/check-ins`, { data: { date: dateAfter(7), usedProduct: true, experience: "good" } });

  await page.goto(`/app/trial/${proofWindow.data.id}`);
  await page.getByRole("button", { name: /Demo time jump/i }).click();
  await expect(page.getByLabel("Choose or take a follow-up photo")).not.toHaveAttribute("capture");
});
