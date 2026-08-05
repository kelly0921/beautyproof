import type { MetricVector } from "./domain";

export const demoBaseline: MetricVector = {
  hd_moisture: 54.2,
  hd_redness: 46.8,
  hd_texture: 61.4,
  hd_oiliness: 48.6,
};

export const demoFollowups: Record<"keep" | "swap" | "inconclusive", MetricVector> = {
  keep: { hd_moisture: 61.9, hd_redness: 44.6, hd_texture: 64.1, hd_oiliness: 47.8 },
  swap: { hd_moisture: 48.7, hd_redness: 49.2, hd_texture: 59.8, hd_oiliness: 52.1 },
  inconclusive: { hd_moisture: 55.1, hd_redness: 46.2, hd_texture: 60.9, hd_oiliness: 49.4 },
};

export const metricLabels: Record<keyof MetricVector, string> = {
  hd_moisture: "Moisture",
  hd_redness: "Redness",
  hd_texture: "Texture",
  hd_oiliness: "Oiliness",
};

export const cachedRealDisclosure =
  "Cached real YouCam result — sanitized numeric output captured through the v2.1 integration for reliable demonstration.";
