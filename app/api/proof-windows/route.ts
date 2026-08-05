import { getRepository } from "@/lib/data/repository-provider";
import { apiError, windowSchema } from "@/lib/validation/api";

export async function POST(request: Request) {
  const parsed = windowSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("INVALID_PROOF_WINDOW", "ProofWindow input is invalid.", 400, parsed.error.flatten());
  try {
    return Response.json({ ok: true, data: await getRepository().createWindow(parsed.data) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "BASELINE_ANALYSIS_NOT_FOUND") return apiError("BASELINE_ANALYSIS_NOT_FOUND", "Create a stored baseline analysis before starting a ProofWindow.", 409);
    throw error;
  }
}
