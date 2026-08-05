import { generateSyntheticReceipts } from "../lib/seed";

const seed = Number(process.env.DEMO_SEED ?? 20260804);
const receipts = generateSyntheticReceipts(seed);
console.log(`BeautyProof seed ${seed}: ${receipts.length} deterministic synthetic ProofReceipts ready.`);
console.log(`Current formula hydration receipts: ${receipts.filter((entry) => entry.formulaVersionId === "formula-2026-us" && entry.claimId === "claim-hydration-2026").length}`);
