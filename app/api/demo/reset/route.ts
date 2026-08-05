import { getRepository } from "@/lib/data/repository-provider";

export async function POST() {
  const repository = getRepository();
  await repository.reset();
  return Response.json({ ok: true, data: { seed: Number(process.env.DEMO_SEED ?? 20260804), restoredSyntheticReceipts: 32, networkDelta: 0, persistence: repository.mode } });
}
