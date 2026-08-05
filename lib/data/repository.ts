import type { Experience, ProofReceiptRecord, SkinAnalysis } from "../domain";

export interface ProofWindowRecord {
  id: string;
  formulaVersionId: string;
  claimId: string;
  baselineAnalysisId: string;
  startDate: string;
  plannedEndDate: string;
  returnDeadline: string;
  status: "active" | "complete";
  checkIns: { date: string; usedProduct: boolean; experience: Experience; confounderNote?: string }[];
}

export interface BeautyProofRepository {
  readonly mode: "memory" | "supabase";
  reset(): Promise<void>;
  saveAnalysis(input: Omit<SkinAnalysis, "id" | "userId" | "capturedAt"> & Partial<Pick<SkinAnalysis, "capturedAt">>): Promise<SkinAnalysis>;
  getAnalysis(id: string): Promise<SkinAnalysis | null>;
  createWindow(input: Omit<ProofWindowRecord, "id" | "checkIns">): Promise<ProofWindowRecord>;
  getWindow(id: string): Promise<ProofWindowRecord | null>;
  listWindows(): Promise<ProofWindowRecord[]>;
  addCheckIn(id: string, input: ProofWindowRecord["checkIns"][number]): Promise<ProofWindowRecord | null>;
  completeWindow(id: string): Promise<ProofWindowRecord | null>;
  saveReceipt(input: Omit<ProofReceiptRecord, "id" | "createdAt" | "consentToAggregate">): Promise<ProofReceiptRecord>;
  getReceipt(id: string): Promise<ProofReceiptRecord | null>;
  listReceipts(): Promise<ProofReceiptRecord[]>;
  consentReceipt(id: string): Promise<{ receiptId: string; consented: boolean; networkDelta: number }>;
  coverage(): Promise<{ contributedReal: number; networkDelta: number; storedAnalyses: number; storedWindows: number; storedReceipts: number }>;
}
