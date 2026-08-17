import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { chromium } from "@playwright/test";

const cwd = process.cwd();
const phase = process.argv[2] === "after" ? "after" : "before";
const outputDir = path.join(cwd, "artifacts", `ui-${phase}`);
const nextBin = path.join(cwd, "node_modules", "next", "dist", "bin", "next");

async function findFreePort() {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const address = probe.address();
  if (!address || typeof address === "string") throw new Error("Could not allocate an audit port.");
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
      // The production server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the BeautyProof audit server.");
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

  const capture = async (filename, { fullPage = true, viewport } = {}) => {
    if (viewport) await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(120);
    const mobileNav = page.locator(".app-bottom-nav");
    if (fullPage) await mobileNav.evaluateAll((elements) => elements.forEach((item) => { item.style.display = "none"; }));
    await page.screenshot({
      path: path.join(outputDir, filename),
      fullPage,
      animations: "disabled",
      caret: "hide",
    });
    if (fullPage) await mobileNav.evaluateAll((elements) => elements.forEach((item) => { item.style.display = ""; }));
    console.log(`Captured artifacts/ui-${phase}/${filename}`);
  };

  const captureElement = async (filename, selector) => {
    const element = page.locator(selector);
    await element.scrollIntoViewIfNeeded();
    const fixedChrome = page.locator(".app-mobile-header, .app-bottom-nav, .demo-progress-dock");
    await fixedChrome.evaluateAll((elements) => elements.forEach((item) => item.setAttribute("data-audit-display", item.style.display || "")));
    await fixedChrome.evaluateAll((elements) => elements.forEach((item) => { item.style.display = "none"; }));
    await element.screenshot({
      path: path.join(outputDir, filename),
      animations: "disabled",
      caret: "hide",
    });
    await fixedChrome.evaluateAll((elements) => elements.forEach((item) => {
      item.style.display = item.getAttribute("data-audit-display") || "";
      item.removeAttribute("data-audit-display");
    }));
    console.log(`Captured artifacts/ui-${phase}/${filename}`);
  };

  const visit = async (pathname) => {
    await page.goto(`${baseUrl}${pathname}`, { waitUntil: "networkidle" });
    await page.locator("body").waitFor();
  };

  const resetResponse = await page.request.post(`${baseUrl}/api/demo/reset`);
  if (!resetResponse.ok()) throw new Error(`Demo reset failed with ${resetResponse.status()}.`);

  await visit("/demo");
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await capture("02-opening-desktop.png");
  await capture("01-opening-mobile.png", { fullPage: false, viewport: { width: 390, height: 844 } });
  await page.setViewportSize({ width: 1440, height: 900 });

  await visit("/products/dewsignal");
  await capture("03-claim-compiler.png");

  await visit("/proof-map");
  await capture("04-formula-reset.png");

  await visit("/brand/campaigns/campaign-dewsignal-hydration-2026");
  await capture("05-brand-proof-campaign.png");

  await visit("/demo");
  await page.getByRole("button", { name: /Activate campaign|Continue to consumer match/i }).click();
  await page.waitForURL("**/app/campaigns/campaign-dewsignal-hydration-2026**");
  await page.getByRole("checkbox", { name: /I understand this is simulated demo data/i }).check();
  await page.getByRole("button", { name: /Check campaign eligibility/i }).click();
  await page.getByRole("heading", { name: "You qualify" }).waitFor();
  await capture("06-campaign-eligibility.png", { viewport: { width: 430, height: 932 } });

  await page.getByRole("checkbox", { name: /I accept the sponsored Proof Trial terms/i }).check();
  await page.getByRole("button", { name: /Enroll.*pending/i }).click();
  await page.getByRole("heading", { name: /reward ledger is pending/i }).waitFor();
  await capture("15-enrollment-reward-logic.png", { viewport: { width: 430, height: 932 } });

  await page.getByRole("button", { name: /Start sponsored 14-day ProofWindow/i }).click();
  await page.waitForURL(/\/app\/trial\//);
  await capture("07-proof-window-mobile.png", { viewport: { width: 390, height: 844 } });

  await page.getByRole("button", { name: /Save check-in/i }).click();
  await page.getByRole("button", { name: /Demo time jump/i }).click();
  await page.getByRole("button", { name: /Use simulated demo follow-up/i }).click();
  await page.waitForURL(/\/app\/proofs\//);
  await page.getByRole("heading", { name: /Reward earned for completing/i }).waitFor();
  await page.setViewportSize({ width: 1440, height: 900 });
  await captureElement("09-proof-receipt-desktop.png", ".app-receipt-card");
  await page.setViewportSize({ width: 430, height: 932 });
  await captureElement("08-proof-receipt-mobile.png", ".app-receipt-card");
  await capture("10-reward-earned.png", { fullPage: false, viewport: { width: 390, height: 844 } });

  await page.getByRole("button", { name: /I understand.*add demo receipt/i }).click();
  await page.getByRole("link", { name: /See updated campaign coverage/i }).click();
  await page.waitForURL(/\/brand\/campaigns\/campaign-dewsignal-hydration-2026\?updated=1/);
  await capture("11-proof-coverage.png", { viewport: { width: 1440, height: 900 } });

  await visit("/app");
  await capture("12-app-home-mobile.png", { fullPage: false, viewport: { width: 390, height: 844 } });

  await visit("/app/scan");
  await capture("16-scan-mobile.png", { fullPage: false, viewport: { width: 390, height: 844 } });

  await visit("/app/proofs");
  await capture("13-proof-library-mobile.png", { viewport: { width: 390, height: 844 } });

  await visit("/app/profile");
  await capture("14-profile-mobile.png", { viewport: { width: 390, height: 844 } });

  await visit("/app/data-sources");
  await capture("17-data-sources-tablet.png", { viewport: { width: 768, height: 1024 } });
} finally {
  await browser?.close();
  await stopServer();
}
