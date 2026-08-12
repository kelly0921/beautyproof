import { getRepositoryForRequest } from "@/lib/data/repository-provider";
import { rejectUnsafeMutation } from "@/lib/security/same-origin";
import { apiError, consentSchema } from "@/lib/validation/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rejected = rejectUnsafeMutation(request);
  if (rejected) return rejected;
  const { id } = await params;
  const parsed = consentSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("EXPLICIT_CONSENT_REQUIRED", "Set consent to true to aggregate this receipt.", 400);
  const result = await getRepositoryForRequest(request).consentReceipt(id);
  if (!result.consented) return apiError("PROOF_RECEIPT_NOT_FOUND", "The ProofReceipt was not found.", 404);
  return Response.json({ ok: true, data: result });
}
