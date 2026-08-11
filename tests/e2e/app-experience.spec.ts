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
