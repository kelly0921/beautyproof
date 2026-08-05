import type { ClaimDefinition, FormulaVersion, Product } from "./domain";

export const product: Product = {
  id: "product-dewsignal",
  slug: "dewsignal",
  brandName: "Aster Vale",
  name: "DewSignal Adaptive Serum",
  priceCents: 11800,
  returnPolicyDays: 30,
  currentFormulaId: "formula-2026-us",
  priorFormulaId: "formula-2024-original",
  genericRating: 4.7,
  genericReviewCount: 2418,
};

export const formulas: FormulaVersion[] = [
  {
    id: "formula-2024-original",
    productId: product.id,
    versionLabel: "2024 Original Formula",
    region: "US",
    releaseDate: "2024-03-12",
    isCurrent: false,
    formulaSummary: "Richer gel-serum texture with the original humectant blend.",
    fingerprint: "av-ds-us-2024-a1",
  },
  {
    id: "formula-2026-us",
    productId: product.id,
    versionLabel: "2026 US Formula",
    region: "US",
    releaseDate: "2026-05-18",
    isCurrent: true,
    formulaSummary: "Lighter emulsion texture with an updated humectant blend and reduced fragrance.",
    fingerprint: "av-ds-us-2026-b3",
  },
];

export const claims: ClaimDefinition[] = [
  {
    id: "claim-hydration-2026",
    formulaVersionId: "formula-2026-us",
    text: "Visible hydration in 14 days.",
    type: "youcam_observable",
    primaryMetric: "hd_moisture",
    contextMetrics: ["hd_redness", "hd_texture", "hd_oiliness"],
    claimPeriodDays: 14,
    explanation: "YouCam moisture raw scores can be compared at a guided baseline and follow-up.",
    limitation: "A change during the observation window does not establish that this product caused it.",
    weights: { hd_moisture: 0.5, hd_redness: 0.2, hd_texture: 0.15, hd_oiliness: 0.15 },
  },
  {
    id: "claim-finish-2026",
    formulaVersionId: "formula-2026-us",
    text: "Lightweight, cushiony finish.",
    type: "subjective",
    explanation: "Finish is a sensory experience, collected as good, neutral, or concern with an optional note.",
    limitation: "A facial image analysis cannot determine how a formula feels.",
  },
  {
    id: "claim-barrier-2026",
    formulaVersionId: "formula-2026-us",
    text: "Repairs the skin barrier.",
    type: "unsupported",
    explanation: "BeautyProof cannot establish this claim from a facial image analysis.",
    limitation: "This prototype does not measure barrier function or provide medical assessment.",
  },
];

export const recommendation = {
  id: "recommendation-mira-rowan",
  sourceName: "Mira Rowan / Field Notes",
  sourceType: "fictional_creator",
  formulaVersionId: "formula-2026-us",
  claimId: "claim-hydration-2026",
  publishedAt: "2026-06-03",
  copy: "A fictional recommendation preserved with the exact formula and claim context.",
};
