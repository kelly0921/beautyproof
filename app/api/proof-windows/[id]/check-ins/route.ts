import { getRepository } from "@/lib/data/repository-provider";
import { apiError, checkInSchema } from "@/lib/validation/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = checkInSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("INVALID_CHECK_IN", "Check-in input is invalid.", 400, parsed.error.flatten());
  const record = await getRepository().addCheckIn(id, parsed.data);
  if (!record) return apiError("PROOF_WINDOW_NOT_FOUND", "The ProofWindow was not found.", 404);
  return Response.json({ ok: true, data: record });
}
