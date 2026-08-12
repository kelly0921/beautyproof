import { describe, expect, it } from "vitest";
import { planSyntheticDemoReset } from "@/lib/data/demo-reset";

describe("synthetic demo reset", () => {
  it("preserves live analyses and live ProofWindows", () => {
    const scope = planSyntheticDemoReset({
      analyses: [
        { id: "live-baseline", origin: "live_youcam" },
        { id: "live-followup", origin: "live_youcam" },
        { id: "demo-baseline", origin: "synthetic" },
        { id: "demo-followup", origin: "synthetic" },
      ],
      windows: [
        { id: "live-window", baselineAnalysisId: "live-baseline", campaignEnrollmentId: "live-enrollment" },
        { id: "demo-window", baselineAnalysisId: "demo-baseline", campaignEnrollmentId: "demo-enrollment" },
      ],
      receipts: [
        { proofWindowId: "live-window", followupAnalysisId: "live-followup", origin: "real" },
        { proofWindowId: "demo-window", followupAnalysisId: "demo-followup", origin: "synthetic" },
      ],
      enrollments: [
        { id: "live-enrollment", baselineAnalysisId: "live-baseline" },
        { id: "demo-enrollment", baselineAnalysisId: "demo-baseline" },
      ],
    });

    expect(scope.analysisIds).toEqual(expect.arrayContaining(["demo-baseline", "demo-followup"]));
    expect(scope.analysisIds).not.toContain("live-baseline");
    expect(scope.windowIds).toEqual(["demo-window"]);
    expect(scope.enrollmentIds).toEqual(["demo-enrollment"]);
  });

  it("removes the window before deleting its synthetic enrollment", () => {
    const scope = planSyntheticDemoReset({
      analyses: [
        { id: "analysis-demo", origin: "synthetic" },
        { id: "analysis-live", origin: "live_youcam" },
      ],
      enrollments: [{ id: "enrollment-demo", baselineAnalysisId: "analysis-demo" }],
      windows: [{ id: "window-linked", baselineAnalysisId: "analysis-live", campaignEnrollmentId: "enrollment-demo" }],
      receipts: [],
    });

    expect(scope.windowIds).toEqual(["window-linked"]);
    expect(scope.enrollmentIds).toEqual(["enrollment-demo"]);
  });
});
