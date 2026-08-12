import { getRepositoryForRequest } from "@/lib/data/repository-provider";
import { apiError } from "@/lib/validation/api";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repository = getRepositoryForRequest(request);
  const enrollment = await repository.getEnrollment(id);
  if (!enrollment) return apiError("CAMPAIGN_ENROLLMENT_NOT_FOUND", "The campaign enrollment was not found.", 404);
  const [campaign, reward, windows] = await Promise.all([
    repository.getCampaign(enrollment.campaignId),
    repository.getRewardForEnrollment(id),
    repository.listWindows(),
  ]);
  return Response.json({ ok: true, data: { enrollment, campaign, reward, proofWindow: windows.find((window) => window.campaignEnrollmentId === id) ?? null } });
}
