import { loadEnvConfig } from "@next/env";
import { getRepository, persistenceConfiguration } from "../lib/data/repository-provider";

async function main() {
  loadEnvConfig(process.cwd());
  const configuration = persistenceConfiguration();

  if (configuration.mode !== "supabase") {
    throw new Error(`Durable persistence is not ready. ${configuration.message}`);
  }

  const repository = getRepository();
  const coverage = await repository.coverage();

  console.log("BeautyProof durable persistence is ready.");
  console.log(`Adapter: ${repository.mode}`);
  console.log(`Stored analyses: ${coverage.storedAnalyses}`);
  console.log(`Stored ProofWindows: ${coverage.storedWindows}`);
  console.log(`Stored ProofReceipts: ${coverage.storedReceipts}`);
  console.log(`Consented real receipts: ${coverage.contributedReal}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
