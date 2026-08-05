import { claims, formulas, product, recommendation } from "@/lib/product";
import { apiError } from "@/lib/validation/api";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== product.slug) return apiError("PRODUCT_NOT_FOUND", "No BeautyProof product exists for this slug.", 404);
  return Response.json({ ok: true, data: { product, formulas, claims, recommendation } });
}
