import { getRepositoryForRequest } from "@/lib/data/repository-provider";
import { rejectUnsafeMutation } from "@/lib/security/same-origin";
import { apiError } from "@/lib/validation/api";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rejected = rejectUnsafeMutation(request);
  if (rejected) return rejected;
  const { id } = await params;
  const record = await getRepositoryForRequest(request).withdrawWindow(id);
  if (!record) return apiError("ACTIVE_PROOF_WINDOW_NOT_FOUND", "An active ProofWindow was not found for this browser.", 404);
  return Response.json({ ok: true, data: record });
}
