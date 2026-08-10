import type { AnalysisOrigin, SkinAnalysis } from "./domain";

export function isVerifiedYouCamOrigin(origin: AnalysisOrigin) {
  return origin === "live_youcam" || origin === "cached_real_youcam";
}

export function isSimulatedDemoAnalysis(analysis: Pick<SkinAnalysis, "origin" | "sourceType">) {
  return analysis.origin === "synthetic" && analysis.sourceType === "cached_demo";
}

export function canExerciseDemoCampaign(analysis: Pick<SkinAnalysis, "origin" | "sourceType">) {
  return isVerifiedYouCamOrigin(analysis.origin) || isSimulatedDemoAnalysis(analysis);
}

export function analysisOriginLabel(origin: AnalysisOrigin) {
  if (origin === "live_youcam") return "Live YouCam Skin AI v2.1";
  if (origin === "cached_real_youcam") return "Verified cached YouCam result";
  return "Simulated YouCam-format demo fixture";
}
