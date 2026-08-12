import { getRepositoryForRequest } from "@/lib/data/repository-provider";
import { rejectUnsafeMutation } from "@/lib/security/same-origin";
import { apiError, checkInSchema } from "@/lib/validation/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rejected = rejectUnsafeMutation(request);
  if (rejected) return rejected;
  const { id } = await params;
  const parsed = checkInSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("INVALID_CHECK_IN", "Check-in input is invalid.", 400, parsed.error.flatten());
  const repository = getRepositoryForRequest(request);
  const current = await repository.getWindow(id);
  if (!current || current.status !== "active") return apiError("ACTIVE_PROOF_WINDOW_NOT_FOUND", "An active ProofWindow was not found for this browser.", 404);
  const record = await repository.addCheckIn(id, parsed.data);
  if (!record) return apiError("PROOF_WINDOW_NOT_FOUND", "The ProofWindow was not found.", 404);
  return Response.json({ ok: true, data: record });
}
