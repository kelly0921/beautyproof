import { getRepository } from "@/lib/data/repository-provider";
import { apiError } from "@/lib/validation/api";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reward = await getRepository().issueDemoReward(id);
  if (!reward) return apiError("REWARD_NOT_EARNED", "Only an earned prototype reward can be issued as demo credit.", 409);
  return Response.json({ ok: true, data: reward });
}
