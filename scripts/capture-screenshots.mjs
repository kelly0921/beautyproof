import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { chromium } from "@playwright/test";

const cwd = process.cwd();
const outputDir = path.join(cwd, "docs", "screenshots");
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
const server = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)], { cwd, stdio: "inherit", windowsHide: true });

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
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
  const capture = async (filename) => {
    await page.screenshot({ path: path.join(outputDir, filename), fullPage: true });
    console.log(`Captured ${filename}`);
  };

  await page.goto(`${baseUrl}/app`, { waitUntil: "networkidle" });
  await capture("06-app-dashboard.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/app`, { waitUntil: "networkidle" });
  await capture("07-app-dashboard-mobile.png");
  await page.goto(`${baseUrl}/app/scan`, { waitUntil: "networkidle" });
  await capture("08-app-scan-mobile.png");
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.goto(`${baseUrl}/demo`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await capture("01-product-claim-compiler.png");

  await page.getByRole("button", { name: /See proof for my starting skin/i }).click();
  await page.waitForURL("**/scan");
  await page.getByRole("button", { name: /High-resolution upload/i }).click();
  await capture("05-youcam-live-upload.png");
  await page.getByRole("button", { name: /Preloaded consented demo image/i }).click();
  await page.getByRole("checkbox", { name: /I consent to cosmetic image analysis/i }).check();
  await page.getByRole("button", { name: /Use preloaded baseline/i }).click();
  await page.waitForURL("**/proof-map");
  await capture("02-proof-map-formula-reset.png");

  await page.getByRole("button", { name: /Start my hydration ProofWindow/i }).click();
  await page.getByRole("button", { name: /Start this ProofWindow/i }).click();
  await page.waitForURL(/\/proof-window\/[^/]+$/);
  await page.getByRole("button", { name: /Save check-in/i }).click();
  await page.getByRole("button", { name: /Demo time jump/i }).click();
  await page.getByRole("button", { name: /Analyze cached-real follow-up/i }).click();
  await page.waitForURL(/\/proof-receipt\/[^/]+$/);
  await capture("03-proof-receipt.png");

  await page.getByRole("button", { name: /I consent — add my ProofReceipt/i }).click();
  await page.waitForURL("**/proof-coverage");
  await capture("04-proof-coverage.png");
} finally {
  await browser?.close();
  await stopServer();
}
