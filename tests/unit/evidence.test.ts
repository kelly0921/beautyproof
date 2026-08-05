import { describe, expect, it } from "vitest";
import { claims } from "../../lib/product";
import { generateSyntheticReceipts } from "../../lib/seed";
import { aggregateReceipts } from "../../lib/evidence/aggregates";
import { evidenceQuality } from "../../lib/evidence/quality";
import { findComparableReceipts, weightedDistance } from "../../lib/evidence/similarity";
import { determineVerdict } from "../../lib/evidence/verdict";
import { demoBaseline } from "../../lib/demo";

describe("BeautyProof evidence engines", () => {
  it("maps the hydration claim to the required HD metrics", () => {
    expect(claims[0].primaryMetric).toBe("hd_moisture");
    expect(claims[0].contextMetrics).toEqual(["hd_redness", "hd_texture", "hd_oiliness"]);
  });

  it("creates deterministic synthetic records with origin labels", () => {
    const first = generateSyntheticReceipts(20260804);
    const second = generateSyntheticReceipts(20260804);
    expect(first).toEqual(second);
    expect(first).toHaveLength(32);
    expect(first.every((receipt) => receipt.origin === "synthetic")).toBe(true);
  });

  it("uses a normalized weighted distance", () => {
    expect(weightedDistance(demoBaseline, demoBaseline)).toBe(0);
    expect(weightedDistance(demoBaseline, { ...demoBaseline, hd_moisture: 90 })).toBeGreaterThan(0);
  });

  it("enforces exact formula, claim, consent, and evidence filters", () => {
    const result = findComparableReceipts({
      baseline: demoBaseline,
      formulaVersionId: "formula-2026-us",
      claim: claims[0],
      receipts: generateSyntheticReceipts(),
    });
    expect(result.comparables.length).toBeGreaterThan(0);
    expect(result.comparables.every(({ receipt }) => receipt.formulaVersionId === "formula-2026-us" && receipt.claimId === claims[0].id)).toBe(true);
  });

  it("scores all five explainable evidence dimensions", () => {
    const result = evidenceQuality({ exactFormula: true, durationComplete: true, adherenceRate: 0.93, routineStable: true, majorConfounder: false, capturesValid: true });
    expect(result).toMatchObject({ score: 100, quality: "high" });
    expect(result.reasons).toHaveLength(5);
  });

  it("treats inconclusive and concern outcomes as first-class", () => {
    expect(determineVerdict({ quality: "inconclusive", durationComplete: true, experience: "neutral", primaryMetricDelta: 8, beforeReturnDeadline: true }).verdict).toBe("inconclusive");
    expect(determineVerdict({ quality: "high", durationComplete: true, experience: "concern", primaryMetricDelta: 8, beforeReturnDeadline: true }).verdict).toBe("pause");
  });

  it("keeps formula aggregates separate", () => {
    const receipts = generateSyntheticReceipts();
    const current = aggregateReceipts(receipts, "formula-2026-us", "claim-hydration-2026");
    const historical = aggregateReceipts(receipts, "formula-2024-original", "claim-hydration-2026");
    expect(current.total).not.toBe(historical.total);
  });
});
