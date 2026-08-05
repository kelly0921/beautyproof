import { notFound } from "next/navigation";
import { AppTrialFlow } from "@/components/app/app-trial-flow";
import { getRepository } from "@/lib/data/repository-provider";

export const dynamic = "force-dynamic";

export default async function AppTrialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repository = getRepository();
  const proofWindow = await repository.getWindow(id);
  if (!proofWindow) notFound();
  const baseline = await repository.getAnalysis(proofWindow.baselineAnalysisId);
  if (!baseline) notFound();
  const receipt = (await repository.listReceipts()).find((entry) => entry.proofWindowId === id);
  return <AppTrialFlow baseline={baseline} proofWindow={proofWindow} receiptId={receipt?.id} />;
}
