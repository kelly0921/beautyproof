import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  workers: 1,
  expect: { timeout: 30_000 },
  retries: 0,
  use: {
    baseURL: process.env.BEAUTYPROOF_BASE_URL || "http://localhost:3026",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-edge", use: { ...devices["Desktop Chrome"], channel: "msedge" } },
  ],
});
