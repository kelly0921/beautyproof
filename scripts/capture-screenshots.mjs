import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { chromium } from "@playwright/test";

const cwd = process.cwd();
const outputDir = path.join(cwd, "docs", "screenshots", "devpost");
const nextBin = path.join(cwd, "node_modules", "next", "dist", "bin", "next");

async function findFreePort() {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const address = probe.address();
  if (!address || typeof address === "string") throw new Error("Could not allocate a local screenshot port.");
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

const port = await findFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)], {
  cwd,
  stdio: "inherit",
  windowsHide: true,
  env: {
    ...process.env,
    SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_URL: "",
    SUPABASE_SECRET_KEY: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
    YOUCAM_API_KEY: "",
    DEMO_MODE: "true",
    NEXT_PUBLIC_DEMO_MODE: "true",
    DEMO_SEED: "20260804",
  },
});

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`BeautyProof server exited with code ${server.exitCode}.`);
    try {
      if ((await fetch(`${baseUrl}/demo`)).ok) return;
    } catch {
      // Production server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for BeautyProof screenshot server.");
}

async function stopServer() {
  if (server.exitCode !== null) return;
  server.kill("SIGTERM");
  await Promise.race([once(server, "exit"), new Promise((resolve) => setTimeout(resolve, 5_000))]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

let browser;
try {
  await waitForServer();
  await mkdir(outputDir, { recursive: true });
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });

  const capture = async (filename, { fullPage = true } = {}) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);
    await page.screenshot({
      path: path.join(outputDir, filename),
      fullPage,
      animations: "disabled",
      caret: "hide",
    });
    console.log(`Captured docs/screenshots/devpost/${filename}`);
  };

  const resetResponse = await page.request.post(`${baseUrl}/api/demo/reset`);
  if (!resetResponse.ok()) throw new Error(`Demo reset failed with ${resetResponse.status()}.`);

  await page.goto(`${baseUrl}/demo`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /Fund one missing proof gap/i }).waitFor();
  await capture("01-brand-funded-proof-gap.png");

  await page.getByRole("button", { name: /Activate campaign|Continue to consumer match/i }).click();
  await page.waitForURL("**/app/campaigns/campaign-dewsignal-hydration-2026**");
  await page.getByText("2 / 6", { exact: true }).waitFor();
  await capture("02-consumer-sponsored-opportunity.png");

  await page.getByRole("checkbox", { name: /I understand this is simulated demo data/i }).check();
  await page.getByRole("button", { name: /Check campaign eligibility/i }).click();
  await page.getByRole("heading", { name: "You qualify" }).waitFor();
  await capture("03-explainable-youcam-eligibility.png");

  await page.getByRole("checkbox", { name: /I accept the sponsored Proof Trial terms/i }).check();
  await page.getByRole("button", { name: /Enroll.*pending/i }).click();
  await page.getByRole("heading", { name: /reward ledger is pending/i }).waitFor();
  await page.getByRole("button", { name: /Start sponsored 14-day ProofWindow/i }).click();
  await page.waitForURL(/\/app\/trial\//);
  await page.getByText("4 / 6", { exact: true }).waitFor();
  await capture("04-sponsored-proof-window.png");

  await page.getByRole("button", { name: /Save check-in/i }).click();
  await page.getByRole("button", { name: /Demo time jump/i }).click();
  await page.getByRole("button", { name: /Use simulated demo follow-up/i }).click();
  await page.waitForURL(/\/app\/proofs\//);
  await page.getByRole("heading", { name: /Reward earned for completing/i }).waitFor();
  await capture("05-proof-receipt-and-earned-reward.png");

  await page.getByRole("button", { name: /I understand.*add demo receipt/i }).click();
  await page.getByRole("link", { name: /See updated campaign coverage/i }).click();
  await page.waitForURL(/\/brand\/campaigns\/campaign-dewsignal-hydration-2026\?updated=1/);
  await page.getByRole("heading", { name: /proof becomes reusable/i }).waitFor();
  await capture("06-brand-campaign-coverage.png");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/app`, { waitUntil: "networkidle" });
  await page.locator(".app-opportunity-card").waitFor();
  await capture("07-mobile-shopper-app.png", { fullPage: false });
} finally {
  await browser?.close();
  await stopServer();
}
