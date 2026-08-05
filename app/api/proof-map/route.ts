import { demoBaseline } from "@/lib/demo";
import { aggregateReceipts } from "@/lib/evidence/aggregates";
import { findComparableReceipts } from "@/lib/evidence/similarity";
import { claims, product } from "@/lib/product";
import { seededReceipts } from "@/lib/seed";
import { apiError } from "@/lib/validation/api";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const formulaVersionId = url.searchParams.get("formulaVersionId") ?? product.currentFormulaId;
  const claimId = url.searchParams.get("claimId") ?? claims[0].id;
  const claim = claims.find((entry) => entry.id === claimId);
  if (!claim || formulaVersionId !== product.currentFormulaId) return apiError("PROOF_LENS_NOT_FOUND", "This formula and claim lens is not configured.", 404);
  return Response.json({ ok: true, data: { ...findComparableReceipts({ baseline: demoBaseline, formulaVersionId, claim, receipts: seededReceipts }), aggregate: aggregateReceipts(seededReceipts, formulaVersionId, claimId) } });
}
