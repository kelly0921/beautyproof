export const skinMetrics = [
  "hd_moisture",
  "hd_redness",
  "hd_texture",
  "hd_oiliness",
] as const;

export type SkinMetric = (typeof skinMetrics)[number];
export type MetricVector = Record<SkinMetric, number>;
export type DataOrigin = "real" | "synthetic";
export type AnalysisOrigin = "live_youcam" | "cached_real_youcam" | "synthetic";
export type ClaimType =
  | "youcam_observable"
  | "observable_plus_subjective"
  | "subjective"
  | "external_provenance"
  | "unsupported";
export type EvidenceQuality = "high" | "moderate" | "limited" | "inconclusive";
export type Verdict = "keep" | "swap" | "continue" | "pause" | "return" | "inconclusive";
export type Experience = "good" | "neutral" | "concern";

export interface ClaimDefinition {
  id: string;
  formulaVersionId: string;
  text: string;
  type: ClaimType;
  primaryMetric?: SkinMetric;
  contextMetrics?: SkinMetric[];
  claimPeriodDays?: number;
  explanation: string;
  limitation?: string;
  weights?: Partial<Record<SkinMetric, number>>;
}

export interface FormulaVersion {
  id: string;
  productId: string;
  versionLabel: string;
  region: string;
  releaseDate: string;
  isCurrent: boolean;
  formulaSummary: string;
  fingerprint: string;
}

export interface Product {
  id: string;
  slug: string;
  brandName: string;
  name: string;
  priceCents: number;
  returnPolicyDays: number;
  currentFormulaId: string;
  priorFormulaId: string;
  genericRating: number;
  genericReviewCount: number;
}

export interface SkinAnalysis {
  id: string;
  userId: string;
  capturedAt: string;
  providerTaskId?: string;
  sourceType: "live" | "uploaded" | "cached_demo";
  apiVersion: "v2.1";
  captureMode: "hdskincare" | "upload" | "preloaded";
  metrics: MetricVector;
  uiScores?: MetricVector;
  maskUrls: Partial<Record<SkinMetric, string[]>>;
  validity: { valid: boolean; shortSide: number; lighting: "good" | "ok" | "unknown" };
  origin: AnalysisOrigin;
}

export interface SyntheticReceipt {
  id: string;
  formulaVersionId: string;
  claimId: string;
  baseline: MetricVector;
  followup: MetricVector;
  adherenceRate: number;
  evidenceQuality: EvidenceQuality;
  evidenceScore: number;
  verdict: Verdict;
  experience: Experience;
  sensoryNote: string;
  consentToAggregate: boolean;
  origin: DataOrigin;
  durationDays: number;
  routineStable: boolean;
  capturesValid: boolean;
}

export interface EvidenceQualityInput {
  exactFormula: boolean;
  durationComplete: boolean;
  adherenceRate: number;
  routineStable: boolean;
  majorConfounder: boolean;
  capturesValid: boolean;
}

export interface EvidenceQualityResult {
  score: number;
  quality: EvidenceQuality;
  reasons: { label: string; earned: boolean; points: number }[];
}

export interface VerdictInput {
  quality: EvidenceQuality;
  durationComplete: boolean;
  experience: Experience;
  primaryMetricDelta: number;
  beforeReturnDeadline: boolean;
  strongerAlternativeAvailable?: boolean;
}

export interface ProofReceiptRecord {
  id: string;
  proofWindowId: string;
  baselineAnalysisId: string;
  followupAnalysisId: string;
  baseline: MetricVector;
  followup: MetricVector;
  adherenceRate: number;
  evidenceQuality: EvidenceQuality;
  evidenceScore: number;
  evidenceReasons: { label: string; earned: boolean; points: number }[];
  verdict: Verdict;
  verdictExplanation: string;
  experience: Experience;
  sensoryNote: string;
  consentToAggregate: boolean;
  origin: DataOrigin;
  createdAt: string;
}
