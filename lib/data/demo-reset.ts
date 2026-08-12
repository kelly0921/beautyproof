import type { AnalysisOrigin, DataOrigin } from "../domain";

interface ResetAnalysis {
  id: string;
  origin: AnalysisOrigin;
}

interface ResetWindow {
  id: string;
  baselineAnalysisId: string;
  campaignEnrollmentId?: string;
}

interface ResetReceipt {
  proofWindowId: string;
  followupAnalysisId: string;
  origin: DataOrigin;
}

interface ResetEnrollment {
  id: string;
  baselineAnalysisId: string;
}

export function planSyntheticDemoReset(input: {
  analyses: ResetAnalysis[];
  windows: ResetWindow[];
  receipts: ResetReceipt[];
  enrollments: ResetEnrollment[];
}) {
  const syntheticAnalysisIds = new Set(input.analyses.filter((analysis) => analysis.origin === "synthetic").map((analysis) => analysis.id));
  const receiptsByWindow = new Map(input.receipts.map((receipt) => [receipt.proofWindowId, receipt]));
  const enrollmentIds = new Set(input.enrollments
    .filter((enrollment) => syntheticAnalysisIds.has(enrollment.baselineAnalysisId))
    .map((enrollment) => enrollment.id));
  const windowIds = new Set(input.windows.filter((window) => {
    const receipt = receiptsByWindow.get(window.id);
    return syntheticAnalysisIds.has(window.baselineAnalysisId)
      || Boolean(window.campaignEnrollmentId && enrollmentIds.has(window.campaignEnrollmentId))
      || Boolean(receipt && (receipt.origin === "synthetic" || syntheticAnalysisIds.has(receipt.followupAnalysisId)));
  }).map((window) => window.id));

  for (const window of input.windows) {
    if (windowIds.has(window.id) && window.campaignEnrollmentId) enrollmentIds.add(window.campaignEnrollmentId);
  }

  return {
    analysisIds: [...syntheticAnalysisIds],
    windowIds: [...windowIds],
    enrollmentIds: [...enrollmentIds],
  };
}
