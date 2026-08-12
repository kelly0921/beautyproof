import baseline from "@/lib/youcam/fixtures/baseline.json";
import followup from "@/lib/youcam/fixtures/followup.json";
import { getRepository } from "@/lib/data/repository-provider";
import { demoFollowups } from "@/lib/demo";
import { parseYouCamResult } from "@/lib/youcam/parser";
import type { YouCamTaskResponse } from "@/lib/youcam/types";
import { apiError, taskRequestSchema } from "@/lib/validation/api";
import { rejectUnsafeMutation } from "@/lib/security/same-origin";

export async function POST(request: Request) {
  const rejected = rejectUnsafeMutation(request);
  if (rejected) return rejected;
  const parsed = taskRequestSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("INVALID_TASK_REQUEST", "Task request is invalid.", 400, parsed.error.flatten());
  const fixture = parsed.data.kind === "baseline" ? baseline : followup;
  const result = parseYouCamResult(fixture as YouCamTaskResponse);
  if (parsed.data.kind === "followup") result.metrics = demoFollowups[parsed.data.scenario];
  const taskId = `demo-fixture-${parsed.data.kind}-${parsed.data.scenario}-${crypto.randomUUID()}`;
  const repository = getRepository();
  const analysis = await repository.saveAnalysis({
    providerTaskId: taskId,
    sourceType: "cached_demo",
    apiVersion: "v2.1",
    captureMode: "preloaded",
    metrics: result.metrics,
    uiScores: result.uiScores,
    maskUrls: result.maskUrls,
    validity: { valid: parsed.data.scenario !== "inconclusive", shortSide: 1600, lighting: parsed.data.scenario === "inconclusive" ? "unknown" : "good" },
    origin: "synthetic",
  });
  return Response.json({ ok: true, data: { taskId, taskStatus: "success", result, analysis, origin: analysis.origin, label: "Simulated YouCam-format demo fixture", persistence: repository.mode } });
}
