import { getRepository } from "@/lib/data/repository-provider";
import { aggregateReceipts } from "@/lib/evidence/aggregates";
import { product } from "@/lib/product";
import { seededReceipts } from "@/lib/seed";
import { apiError } from "@/lib/validation/api";

export async function GET(_: Request, { params }: { params: Promise<{ formulaVersionId: string }> }) {
  const { formulaVersionId } = await params;
  if (![product.currentFormulaId, product.priorFormulaId].includes(formulaVersionId)) return apiError("FORMULA_NOT_FOUND", "Formula version not found.", 404);
  const repository = getRepository();
  return Response.json({ ok: true, data: { aggregate: aggregateReceipts(seededReceipts, formulaVersionId), contribution: await repository.coverage(), persistence: repository.mode } });
}
