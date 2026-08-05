import type { EvidenceQuality, Experience, MetricVector, SyntheticReceipt, Verdict } from "./domain";

const verdicts: Verdict[] = ["keep", "keep", "keep", "swap", "return", "continue", "pause", "inconclusive"];
const qualities: EvidenceQuality[] = ["high", "high", "moderate", "moderate", "limited", "inconclusive"];
const sensory = [
  "Lightweight and comfortable",
  "Cushiony with slight tack",
  "Pilled under sunscreen",
  "Comfortable, no fragrance concern",
  "Fragrance concern after use",
  "Neutral finish",
];

function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (value: number) => Math.max(1, Math.min(100, Math.round(value * 10) / 10));

export function generateSyntheticReceipts(seed = 20260804, count = 32): SyntheticReceipt[] {
  const random = mulberry32(seed);
  return Array.from({ length: count }, (_, index) => {
    const oldFormula = index < 13;
    const hydrationClaim = index % 5 !== 4;
    const baseline: MetricVector = {
      hd_moisture: clamp(42 + random() * 32),
      hd_redness: clamp(30 + random() * 37),
      hd_texture: clamp(38 + random() * 34),
      hd_oiliness: clamp(32 + random() * 38),
    };
    const verdict = verdicts[index % verdicts.length];
    const direction = verdict === "keep" ? 1 : verdict === "return" || verdict === "swap" ? -1 : 0;
    const moistureShift = direction * (3 + random() * 8) + (random() - 0.5) * 2;
    const quality = qualities[(index * 5) % qualities.length];
    const experience: Experience = verdict === "pause" ? "concern" : verdict === "keep" ? "good" : "neutral";
    return {
      id: `synthetic-receipt-${String(index + 1).padStart(2, "0")}`,
      formulaVersionId: oldFormula ? "formula-2024-original" : "formula-2026-us",
      claimId: hydrationClaim ? "claim-hydration-2026" : "claim-redness-demo",
      baseline,
      followup: {
        hd_moisture: clamp(baseline.hd_moisture + moistureShift),
        hd_redness: clamp(baseline.hd_redness + (random() - 0.55) * 5),
        hd_texture: clamp(baseline.hd_texture + (random() - 0.45) * 4),
        hd_oiliness: clamp(baseline.hd_oiliness + (random() - 0.5) * 5),
      },
      adherenceRate: quality === "high" ? 0.92 + random() * 0.07 : 0.48 + random() * 0.42,
      evidenceQuality: quality,
      evidenceScore: quality === "high" ? 100 : quality === "moderate" ? 75 : quality === "limited" ? 45 : 20,
      verdict,
      experience,
      sensoryNote: sensory[index % sensory.length],
      consentToAggregate: index % 9 !== 0,
      origin: "synthetic",
      durationDays: quality === "inconclusive" ? 5 : quality === "limited" ? 9 : 14,
      routineStable: quality !== "inconclusive" && index % 7 !== 0,
      capturesValid: quality !== "inconclusive",
    };
  });
}

export const seededReceipts = generateSyntheticReceipts();
