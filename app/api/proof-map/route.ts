import { demoBaseline } from "@/lib/demo";
import { aggregateReceipts } from "@/lib/evidence/aggregates";
import { findComparableReceipts } from "@/lib/evidence/similarity";
import { claims, product } from "@/lib/product";
import { seededReceipts } from "@/lib/seed";
import { apiError } from "@/lib/validation/api";
import { getRepository } from "@/lib/data/repository-provider";
import type { SyntheticReceipt } from "@/lib/domain";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const formulaVersionId = url.searchParams.get("formulaVersionId") ?? product.currentFormulaId;
  const claimId = url.searchParams.get("claimId") ?? claims[0].id;
  const claim = claims.find((entry) => entry.id === claimId);
  if (!claim || formulaVersionId !== product.currentFormulaId) return apiError("PROOF_LENS_NOT_FOUND", "This formula and claim lens is not configured.", 404);
  const repository = getRepository();
  const contributions = await repository.listPublicContributions();
  const publicReceipts: SyntheticReceipt[] = contributions.flatMap(({ receipt, proofWindow: window }) => {
    if (window.formulaVersionId !== formulaVersionId || window.claimId !== claimId) return [];
    return [{
      id: receipt.id,
      formulaVersionId: window.formulaVersionId,
      claimId: window.claimId,
      baseline: receipt.baseline,
      followup: receipt.followup,
      adherenceRate: receipt.adherenceRate,
      evidenceQuality: receipt.evidenceQuality,
      evidenceScore: receipt.evidenceScore,
      verdict: receipt.verdict,
      experience: receipt.experience,
      sensoryNote: receipt.sensoryNote,
      consentToAggregate: true,
      origin: receipt.origin,
      durationDays: 14,
      routineStable: !receipt.evidenceReasons.some((reason) => reason.label === "Routine stayed stable" && !reason.earned),
      capturesValid: receipt.evidenceQuality !== "inconclusive",
    }];
  });
  const receipts = [...seededReceipts, ...publicReceipts];
  const publicContributedRealReceipts = publicReceipts.filter((receipt) => receipt.origin === "real").length;
  const publicContributedDemoReceipts = publicReceipts.filter((receipt) => receipt.origin === "synthetic").length;
  return Response.json({ ok: true, data: {
    ...findComparableReceipts({ baseline: demoBaseline, formulaVersionId, claim, receipts }),
    aggregate: aggregateReceipts(receipts, formulaVersionId, claimId),
    publicContributedReceipts: publicReceipts.length,
    publicContributedRealReceipts,
    publicContributedDemoReceipts,
  } });
}
