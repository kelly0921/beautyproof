import { beforeEach, describe, expect, it } from "vitest";
import { PATCH as updateCampaign } from "../../app/api/proof-campaigns/[id]/route";
import { POST as evaluateEligibility } from "../../app/api/proof-campaigns/[id]/eligibility/route";
import { POST as enrollCampaign } from "../../app/api/proof-campaigns/[id]/enroll/route";
import { GET as getCampaignCoverage } from "../../app/api/proof-campaigns/[id]/coverage/route";
import { POST as createCachedAnalysis } from "../../app/api/skin-analysis/tasks/route";
import { POST as createProofWindow } from "../../app/api/proof-windows/route";
import { POST as addCheckIn } from "../../app/api/proof-windows/[id]/check-ins/route";
import { POST as completeProofWindow } from "../../app/api/proof-windows/[id]/complete/route";
import { POST as consentReceipt } from "../../app/api/proof-receipts/[id]/consent/route";
import { GET as getProofMap } from "../../app/api/proof-map/route";
import { demoRepository } from "../../lib/data/demo-repository";

const campaignId = "campaign-dewsignal-hydration-2026";
const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function json<T>(response: Response) {
  return await response.json() as { ok: boolean; data: T; error?: { code: string; message: string } };
}

function request(path: string, body: unknown) {
  return new Request(`http://test${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

describe("sponsored Proof Campaign loop", () => {
  beforeEach(async () => await demoRepository.reset());

  it("activates, enrolls, earns once, updates campaign coverage, and keeps public consent separate", async () => {
    const activation = await updateCampaign(request(`/api/proof-campaigns/${campaignId}`, { status: "active" }), params(campaignId));
    expect(activation.ok).toBe(true);

    const baselineResponse = await createCachedAnalysis(request("/api/skin-analysis/tasks", { kind: "baseline", scenario: "keep", allowCachedFallback: true }));
    const baseline = await json<{ analysis: { id: string; origin: string; sourceType: string } }>(baselineResponse);
    expect(baseline.data.analysis).toMatchObject({ origin: "synthetic", sourceType: "cached_demo" });

    const eligibilityResponse = await evaluateEligibility(request(`/api/proof-campaigns/${campaignId}/eligibility`, { baselineAnalysisId: baseline.data.analysis.id }), params(campaignId));
    const eligibility = await json<{ eligible: boolean; reasons: { passed: boolean }[] }>(eligibilityResponse);
    expect(eligibility.data.eligible).toBe(true);
    expect(eligibility.data.reasons.every((reason) => reason.passed)).toBe(true);

    const enrollmentResponse = await enrollCampaign(request(`/api/proof-campaigns/${campaignId}/enroll`, { baselineAnalysisId: baseline.data.analysis.id, campaignConsent: true }), params(campaignId));
    const enrolled = await json<{ enrollment: { id: string }; reward: { id: string; status: string } }>(enrollmentResponse);
    expect(enrolled.data.reward.status).toBe("pending");

    const duplicateEnrollmentResponse = await enrollCampaign(request(`/api/proof-campaigns/${campaignId}/enroll`, { baselineAnalysisId: baseline.data.analysis.id, campaignConsent: true }), params(campaignId));
    const duplicateEnrollment = await json<{ enrollment: { id: string }; reward: { id: string } }>(duplicateEnrollmentResponse);
    expect(duplicateEnrollment.data).toMatchObject({ enrollment: { id: enrolled.data.enrollment.id }, reward: { id: enrolled.data.reward.id } });

    const beforeCoverageResponse = await getCampaignCoverage(new Request("http://test/coverage"), params(campaignId));
    const beforeCoverage = await json<{ coverage: { completedReceiptCount: number } }>(beforeCoverageResponse);

    const windowResponse = await createProofWindow(request("/api/proof-windows", {
      formulaVersionId: "formula-2026-us",
      claimId: "claim-hydration-2026",
      baselineAnalysisId: baseline.data.analysis.id,
      campaignEnrollmentId: enrolled.data.enrollment.id,
      startDate: "2026-08-10",
      plannedEndDate: "2026-08-24",
      returnDeadline: "2026-09-09",
      status: "active",
    }));
    const windowPayload = await json<{ id: string; campaignEnrollmentId: string }>(windowResponse);
    expect(windowPayload.data.campaignEnrollmentId).toBe(enrolled.data.enrollment.id);

    const checkInResponse = await addCheckIn(request("/check-in", { date: "2026-08-17", usedProduct: true, experience: "good" }), params(windowPayload.data.id));
    expect(checkInResponse.ok).toBe(true);

    const followupResponse = await createCachedAnalysis(request("/api/skin-analysis/tasks", { kind: "followup", scenario: "keep", allowCachedFallback: true }));
    const followup = await json<{ analysis: { id: string } }>(followupResponse);
    const completionRequest = () => request("/complete", { scenario: "keep", followupAnalysisId: followup.data.analysis.id, experience: "good", majorConfounder: false, demoTimeJump: true });
    const completionResponse = await completeProofWindow(completionRequest(), params(windowPayload.data.id));
    const completion = await json<{ receipt: { id: string; consentToAggregate: boolean; origin: string }; campaign: { reward: { status: string } }; idempotent: boolean }>(completionResponse);
    expect(completion.data).toMatchObject({ receipt: { consentToAggregate: false, origin: "synthetic" }, campaign: { reward: { status: "earned" } }, idempotent: false });
    expect((await demoRepository.coverage()).contributedReal).toBe(0);
    const privateProofMap = await json<{ publicContributedReceipts: number }>(await getProofMap(new Request("http://test/api/proof-map")));
    expect(privateProofMap.data.publicContributedReceipts).toBe(0);

    const repeatedCompletion = await json<{ receipt: { id: string }; campaign: { reward: { id: string; status: string } }; idempotent: boolean }>(await completeProofWindow(completionRequest(), params(windowPayload.data.id)));
    expect(repeatedCompletion.data).toMatchObject({ receipt: { id: completion.data.receipt.id }, campaign: { reward: { id: enrolled.data.reward.id, status: "earned" } }, idempotent: true });
    expect((await demoRepository.listReceipts())).toHaveLength(1);

    const afterCoverageResponse = await getCampaignCoverage(new Request("http://test/coverage"), params(campaignId));
    const afterCoverage = await json<{ coverage: { completedReceiptCount: number; originCounts: { real: number; simulatedDemo: number }; earnedRewardCount: number } }>(afterCoverageResponse);
    expect(afterCoverage.data.coverage.completedReceiptCount).toBe(beforeCoverage.data.coverage.completedReceiptCount + 1);
    expect(afterCoverage.data.coverage).toMatchObject({ originCounts: { real: 0, simulatedDemo: 1 }, earnedRewardCount: 1 });

    const consentResponse = await consentReceipt(request("/consent", { consent: true }), params(completion.data.receipt.id));
    expect(consentResponse.ok).toBe(true);
    expect((await demoRepository.coverage()).contributedReal).toBe(0);
    const publicProofMap = await json<{ publicContributedReceipts: number; publicContributedRealReceipts: number; publicContributedDemoReceipts: number }>(await getProofMap(new Request("http://test/api/proof-map")));
    expect(publicProofMap.data).toMatchObject({ publicContributedReceipts: 1, publicContributedRealReceipts: 0, publicContributedDemoReceipts: 1 });
  });
});
