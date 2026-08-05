import type { MetricVector, SkinMetric } from "../domain";

export interface YouCamOutput {
  type: SkinMetric;
  ui_score: number;
  raw_score: number;
  mask_urls?: string[];
}

export interface YouCamTaskResponse {
  status: number;
  data: {
    task_status: "running" | "success" | "error";
    polling_interval?: number;
    results?: { output?: YouCamOutput[] } | string;
    error_code?: string;
    error?: string;
  };
}

export interface ParsedYouCamResult {
  metrics: MetricVector;
  uiScores: MetricVector;
  maskUrls: Partial<Record<SkinMetric, string[]>>;
}

export const heroActions = ["hd_moisture", "hd_redness", "hd_texture", "hd_oiliness"] as const;
