import { skinMetrics, type MetricVector, type SkinMetric } from "../domain";
import type { ParsedYouCamResult, YouCamTaskResponse } from "./types";

export class YouCamParseError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}

export function parseYouCamResult(response: YouCamTaskResponse): ParsedYouCamResult {
  if (response.data.task_status !== "success") throw new YouCamParseError("TASK_NOT_SUCCESSFUL", "The YouCam task is not complete.");
  if (!response.data.results || typeof response.data.results === "string") throw new YouCamParseError("INVALID_RESULT_FORMAT", "BeautyProof requires the YouCam JSON result format.");
  const output = response.data.results.output ?? [];
  const byType = new Map(output.map((item) => [item.type, item]));
  for (const metric of skinMetrics) {
    if (!byType.has(metric)) throw new YouCamParseError("MISSING_HERO_METRIC", `YouCam response did not include ${metric}.`);
  }
  const metrics = {} as MetricVector;
  const uiScores = {} as MetricVector;
  const maskUrls: Partial<Record<SkinMetric, string[]>> = {};
  for (const metric of skinMetrics) {
    const item = byType.get(metric)!;
    metrics[metric] = item.raw_score;
    uiScores[metric] = item.ui_score;
    if (item.mask_urls?.length) maskUrls[metric] = item.mask_urls;
  }
  return { metrics, uiScores, maskUrls };
}
