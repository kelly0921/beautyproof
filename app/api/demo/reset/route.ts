import { getRepositoryForRequest } from "@/lib/data/repository-provider";
import { rejectUnsafeMutation } from "@/lib/security/same-origin";

export async function POST(request: Request) {
  const rejected = rejectUnsafeMutation(request);
  if (rejected) return rejected;
  const repository = getRepositoryForRequest(request);
  await repository.reset();
  return Response.json({ ok: true, data: { seed: Number(process.env.DEMO_SEED ?? 20260804), restoredSyntheticReceipts: 32, networkDelta: 0, persistence: repository.mode, liveRecordsPreserved: repository.mode === "supabase" } });
}
