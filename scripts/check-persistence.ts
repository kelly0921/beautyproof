import { loadEnvConfig } from "@next/env";
import { getRepository, persistenceConfiguration } from "../lib/data/repository-provider";

async function main() {
  loadEnvConfig(process.cwd());
  const configuration = persistenceConfiguration();

  if (configuration.mode !== "supabase") {
    throw new Error(`Durable persistence is not ready. ${configuration.message}`);
  }

  const repository = getRepository();
  const [coverage, campaigns, windows, receipts] = await Promise.all([repository.coverage(), repository.listCampaigns(), repository.listWindows(), repository.listReceipts()]);
  const heroCampaign = campaigns.find((campaign) => campaign.id === "campaign-dewsignal-hydration-2026");
  if (!heroCampaign) throw new Error("Proof Campaign migration is missing. Apply supabase/migrations/0002_proof_campaigns.sql.");
  const campaignCoverage = await repository.campaignCoverage(heroCampaign.id);
  if (!campaignCoverage) throw new Error("Seeded Proof Campaign coverage could not be loaded.");
  const analyses = await Promise.all(windows.map((window) => repository.getAnalysis(window.baselineAnalysisId)));
  const staleDemoAnalysisIds = new Set(analyses.filter((analysis) => analysis?.sourceType === "cached_demo" && analysis.origin !== "synthetic").map((analysis) => analysis!.id));
  const staleReceipts = receipts.filter((receipt) => receipt.origin === "real" && staleDemoAnalysisIds.has(receipt.baselineAnalysisId));
  if (staleDemoAnalysisIds.size || staleReceipts.length) throw new Error("Demo fixtures are still labeled as real evidence. Apply supabase/migrations/0003_provenance_hardening.sql.");

  console.log("BeautyProof durable persistence is ready.");
  console.log(`Adapter: ${repository.mode}`);
  console.log(`Stored analyses: ${coverage.storedAnalyses}`);
  console.log(`Stored ProofWindows: ${coverage.storedWindows}`);
  console.log(`Stored ProofReceipts: ${coverage.storedReceipts}`);
  console.log(`Consented real receipts: ${coverage.contributedReal}`);
  console.log(`Seeded Proof Campaign: ${heroCampaign.title} (${heroCampaign.status})`);
  console.log(`Campaign coverage: ${campaignCoverage.completedReceiptCount}/${campaignCoverage.targetReceiptCount}`);
  console.log("Provenance cleanup: ready");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
