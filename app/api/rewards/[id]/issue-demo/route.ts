import { getRepository } from "@/lib/data/repository-provider";
import { rejectUnsafeMutation } from "@/lib/security/same-origin";
import { apiError } from "@/lib/validation/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rejected = rejectUnsafeMutation(request);
  if (rejected) return rejected;
  const { id } = await params;
  const reward = await getRepository().issueDemoReward(id);
  if (!reward) return apiError("REWARD_NOT_EARNED", "Only an earned prototype reward can be issued as demo credit.", 409);
  return Response.json({ ok: true, data: reward });
}
