import baseline from "@/lib/youcam/fixtures/baseline.json";
import { parseYouCamResult } from "@/lib/youcam/parser";
import type { YouCamTaskResponse } from "@/lib/youcam/types";
import { apiError } from "@/lib/validation/api";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id.startsWith("demo-fixture-")) return apiError("TASK_NOT_FOUND", "The analysis task was not found in the demo adapter.", 404);
  return Response.json({ ok: true, data: { taskId: id, taskStatus: "success", result: parseYouCamResult(baseline as YouCamTaskResponse), origin: "synthetic", label: "Simulated YouCam-format demo fixture" } });
}
