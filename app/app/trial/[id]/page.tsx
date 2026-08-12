import { notFound } from "next/navigation";
import { AppTrialFlow } from "@/components/app/app-trial-flow";
import { getRequestRepository } from "@/lib/data/repository-provider";

export const dynamic = "force-dynamic";

export default async function AppTrialPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ scenario?: string; demo?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const repository = await getRequestRepository();
  const proofWindow = await repository.getWindow(id);
  if (!proofWindow) notFound();
  const baseline = await repository.getAnalysis(proofWindow.baselineAnalysisId);
  if (!baseline) notFound();
  const receipt = (await repository.listReceipts()).find((entry) => entry.proofWindowId === id);
  const enrollment = proofWindow.campaignEnrollmentId ? await repository.getEnrollment(proofWindow.campaignEnrollmentId) : null;
  const campaign = enrollment ? await repository.getCampaign(enrollment.campaignId) : null;
  const reward = enrollment ? await repository.getRewardForEnrollment(enrollment.id) : null;
  const scenario = ["keep", "swap", "inconclusive"].includes(query.scenario ?? "") ? query.scenario as "keep" | "swap" | "inconclusive" : undefined;
  const followupReady = new Date() >= new Date(`${proofWindow.plannedEndDate}T00:00:00.000Z`);
  return <AppTrialFlow baseline={baseline} campaign={campaign ?? undefined} demoMode={query.demo === "1"} enrollment={enrollment ?? undefined} followupReady={followupReady} proofWindow={proofWindow} receiptId={receipt?.id} reward={reward ?? undefined} scenario={scenario} />;
}
