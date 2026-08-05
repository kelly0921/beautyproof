import { beforeEach, describe, expect, it } from "vitest";
import { POST as createCachedAnalysis } from "../../app/api/skin-analysis/tasks/route";
import { POST as uploadAnalysis } from "../../app/api/skin-analysis/upload/route";
import { POST as createProofWindow } from "../../app/api/proof-windows/route";
import { POST as addCheckIn } from "../../app/api/proof-windows/[id]/check-ins/route";
import { POST as completeProofWindow } from "../../app/api/proof-windows/[id]/complete/route";
import { POST as consentReceipt } from "../../app/api/proof-receipts/[id]/consent/route";
import { demoRepository } from "../../lib/data/demo-repository";

async function json<T>(response: Response) {
  return await response.json() as { ok: boolean; data: T; error?: { message: string } };
}

describe("persisted Proof Loop", () => {
  beforeEach(async () => await demoRepository.reset());

  it("stores both analyses, completes a ProofWindow, and requires a real receipt before consent", async () => {
    const baselineResponse = await createCachedAnalysis(new Request("http://test/api/skin-analysis/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "baseline", scenario: "keep", allowCachedFallback: true }),
    }));
    const baseline = await json<{ analysis: { id: string; providerTaskId: string; origin: string } }>(baselineResponse);
    expect(baseline.ok).toBe(true);
    expect(baseline.data.analysis.origin).toBe("cached_real_youcam");

    const windowResponse = await createProofWindow(new Request("http://test/api/proof-windows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formulaVersionId: "formula-2026-us",
        claimId: "claim-hydration-2026",
        baselineAnalysisId: baseline.data.analysis.id,
        startDate: "2026-08-04",
        plannedEndDate: "2026-08-18",
        returnDeadline: "2026-09-03",
        status: "active",
      }),
    }));
    const windowPayload = await json<{ id: string }>(windowResponse);
    expect(windowResponse.status).toBe(201);

    const checkInResponse = await addCheckIn(new Request("http://test/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "2026-08-11", usedProduct: true, experience: "good" }),
    }), { params: Promise.resolve({ id: windowPayload.data.id }) });
    expect(checkInResponse.ok).toBe(true);

    const followupResponse = await createCachedAnalysis(new Request("http://test/api/skin-analysis/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "followup", scenario: "keep", allowCachedFallback: true }),
    }));
    const followup = await json<{ analysis: { id: string } }>(followupResponse);

    const completionResponse = await completeProofWindow(new Request("http://test/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario: "keep", followupAnalysisId: followup.data.analysis.id, experience: "good", majorConfounder: false }),
    }), { params: Promise.resolve({ id: windowPayload.data.id }) });
    const completion = await json<{ receipt: { id: string; baselineAnalysisId: string; followupAnalysisId: string; verdict: string; consentToAggregate: boolean } }>(completionResponse);
    expect(completion.data.receipt).toMatchObject({
      baselineAnalysisId: baseline.data.analysis.id,
      followupAnalysisId: followup.data.analysis.id,
      verdict: "keep",
      consentToAggregate: false,
    });

    const missingConsentResponse = await consentReceipt(new Request("http://test/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent: true }),
    }), { params: Promise.resolve({ id: "missing-receipt" }) });
    expect(missingConsentResponse.status).toBe(404);

    const consentResponse = await consentReceipt(new Request("http://test/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent: true }),
    }), { params: Promise.resolve({ id: completion.data.receipt.id }) });
    const consent = await json<{ consented: boolean; networkDelta: number }>(consentResponse);
    expect(consent.data).toEqual({ receiptId: completion.data.receipt.id, consented: true, networkDelta: 1 });
    expect(await demoRepository.coverage()).toMatchObject({ storedAnalyses: 2, storedWindows: 1, storedReceipts: 1, contributedReal: 1 });
  });

  it("surfaces missing live credentials unless cached fallback was explicitly allowed", async () => {
    const originalKey = process.env.YOUCAM_API_KEY;
    delete process.env.YOUCAM_API_KEY;
    try {
      const bytes = new Uint8Array(24);
      bytes.set([0x89, 0x50, 0x4e, 0x47], 0);
      const view = new DataView(bytes.buffer);
      view.setUint32(16, 1600);
      view.setUint32(20, 1200);
      const file = new File([bytes], "valid-hd.png", { type: "image/png" });

      const liveForm = new FormData();
      liveForm.set("file", file);
      liveForm.set("allowCachedFallback", "false");
      const liveResponse = await uploadAnalysis(new Request("http://test/api/skin-analysis/upload", { method: "POST", body: liveForm }));
      const live = await liveResponse.json() as { ok: boolean; error: { code: string } };
      expect(liveResponse.status).toBe(503);
      expect(live).toMatchObject({ ok: false, error: { code: "MISSING_CREDENTIAL" } });
      expect((await demoRepository.coverage()).storedAnalyses).toBe(0);

      const fallbackForm = new FormData();
      fallbackForm.set("file", file);
      fallbackForm.set("allowCachedFallback", "true");
      const fallbackResponse = await uploadAnalysis(new Request("http://test/api/skin-analysis/upload", { method: "POST", body: fallbackForm }));
      const fallback = await json<{ analysis: { origin: string }; fallbackReason: string }>(fallbackResponse);
      expect(fallback.data).toMatchObject({ analysis: { origin: "cached_real_youcam" }, fallbackReason: "MISSING_CREDENTIAL" });
      expect((await demoRepository.coverage()).storedAnalyses).toBe(1);
    } finally {
      if (originalKey === undefined) delete process.env.YOUCAM_API_KEY;
      else process.env.YOUCAM_API_KEY = originalKey;
    }
  });
});
