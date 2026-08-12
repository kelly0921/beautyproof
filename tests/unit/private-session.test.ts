import { describe, expect, it } from "vitest";
import { MemoryDemoRepository } from "@/lib/data/demo-repository";

const analysisInput = {
  sourceType: "cached_demo" as const,
  apiVersion: "v2.1" as const,
  captureMode: "preloaded" as const,
  metrics: { hd_moisture: 54, hd_redness: 22, hd_texture: 35, hd_oiliness: 41 },
  uiScores: { hd_moisture: 54, hd_redness: 22, hd_texture: 35, hd_oiliness: 41 },
  maskUrls: {},
  validity: { valid: true, shortSide: 1600, lighting: "good" as const },
  origin: "synthetic" as const,
};

describe("private browser persistence", () => {
  it("keeps personal evidence isolated and supports withdrawing a trial", async () => {
    const first = new MemoryDemoRepository("00000000-0000-4000-8000-000000000101");
    const second = new MemoryDemoRepository("00000000-0000-4000-8000-000000000102");
    const analysis = await first.saveAnalysis(analysisInput);

    expect(await second.getAnalysis(analysis.id)).toBeNull();
    expect(await second.listAnalyses()).toEqual([]);

    const window = await first.createWindow({
      formulaVersionId: "formula-2026-us",
      claimId: "claim-hydration-2026",
      baselineAnalysisId: analysis.id,
      startDate: "2026-08-12",
      plannedEndDate: "2026-08-26",
      returnDeadline: "2026-09-11",
      status: "active",
    });
    await expect(first.createWindow({
      formulaVersionId: "formula-2026-us",
      claimId: "claim-hydration-2026",
      baselineAnalysisId: analysis.id,
      startDate: "2026-08-13",
      plannedEndDate: "2026-08-27",
      returnDeadline: "2026-09-12",
      status: "active",
    })).rejects.toThrow("ACTIVE_PROOF_WINDOW_EXISTS");
    expect((await first.withdrawWindow(window.id))?.status).toBe("withdrawn");
    expect(await first.withdrawWindow(window.id)).toBeNull();
  });
});
