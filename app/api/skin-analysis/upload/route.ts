import baseline from "@/lib/youcam/fixtures/baseline.json";
import { getRepository } from "@/lib/data/repository-provider";
import { parseYouCamResult } from "@/lib/youcam/parser";
import { YouCamServiceError, YouCamSkinAnalysisService } from "@/lib/youcam/service";
import type { YouCamTaskResponse } from "@/lib/youcam/types";
import { apiError } from "@/lib/validation/api";
import { validateHdImage } from "@/lib/validation/image";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const allowCachedFallback = form.get("allowCachedFallback") !== "false";
  const captureMode = form.get("captureMode") === "hdskincare" ? "hdskincare" : "upload";
  if (!(file instanceof File)) return apiError("FILE_REQUIRED", "Attach one JPG or PNG image.", 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateHdImage(file, bytes);
  if (!validation.valid) return apiError(validation.code ?? "INVALID_IMAGE", validation.message ?? "Invalid image.", 400, validation);
  try {
    const service = new YouCamSkinAnalysisService();
    const result = await service.analyze(file);
    const repository = getRepository();
    const analysis = await repository.saveAnalysis({
      providerTaskId: result.taskId,
      sourceType: captureMode === "hdskincare" ? "live" : "uploaded",
      apiVersion: "v2.1",
      captureMode,
      metrics: result.result.metrics,
      uiScores: result.result.uiScores,
      maskUrls: result.result.maskUrls,
      validity: { valid: true, shortSide: validation.shortSide!, lighting: "unknown" },
      origin: "live_youcam",
    });
    return Response.json({ ok: true, data: { ...result, analysis, origin: analysis.origin, validity: validation, persistence: repository.mode } });
  } catch (error) {
    if (allowCachedFallback && error instanceof YouCamServiceError && error.code === "MISSING_CREDENTIAL") {
      const result = parseYouCamResult(baseline as YouCamTaskResponse);
      const repository = getRepository();
      const analysis = await repository.saveAnalysis({
        providerTaskId: `demo-fixture-upload-${crypto.randomUUID()}`,
        sourceType: "cached_demo",
        apiVersion: "v2.1",
        captureMode,
        metrics: result.metrics,
        uiScores: result.uiScores,
        maskUrls: result.maskUrls,
        validity: { valid: true, shortSide: validation.shortSide!, lighting: "unknown" },
        origin: "synthetic",
      });
      return Response.json({ ok: true, data: { result, analysis, origin: analysis.origin, label: "Simulated YouCam-format demo fixture", validity: validation, fallbackReason: error.code, persistence: repository.mode } });
    }
    if (error instanceof YouCamServiceError) return apiError(error.code, error.message, error.status);
    return apiError("SKIN_ANALYSIS_FAILED", "Skin analysis could not be completed.", 502);
  }
}
