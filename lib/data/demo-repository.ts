import type { ProofReceiptRecord, SkinAnalysis } from "../domain";
import type { BeautyProofRepository, ProofWindowRecord } from "./repository";

export class MemoryDemoRepository implements BeautyProofRepository {
  readonly mode = "memory" as const;
  private analyses = new Map<string, SkinAnalysis>();
  private windows = new Map<string, ProofWindowRecord>();
  private receipts = new Map<string, ProofReceiptRecord>();
  private consented = new Set<string>();

  async reset() { this.analyses.clear(); this.windows.clear(); this.receipts.clear(); this.consented.clear(); }
  async saveAnalysis(input: Omit<SkinAnalysis, "id" | "userId" | "capturedAt"> & Partial<Pick<SkinAnalysis, "capturedAt">>) {
    const record: SkinAnalysis = {
      ...input,
      id: `analysis-${crypto.randomUUID()}`,
      userId: "demo-user",
      capturedAt: input.capturedAt ?? new Date().toISOString(),
    };
    this.analyses.set(record.id, record);
    return record;
  }
  async getAnalysis(id: string) { return this.analyses.get(id) ?? null; }
  async createWindow(input: Omit<ProofWindowRecord, "id" | "checkIns">) {
    if (!this.analyses.has(input.baselineAnalysisId)) throw new Error("BASELINE_ANALYSIS_NOT_FOUND");
    const record: ProofWindowRecord = { ...input, id: `pw-${crypto.randomUUID()}`, checkIns: [] };
    this.windows.set(record.id, record);
    return record;
  }
  async getWindow(id: string) { return this.windows.get(id) ?? null; }
  async listWindows() {
    return [...this.windows.values()]
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
      .map((record) => ({ ...record, checkIns: [...record.checkIns] }));
  }
  async addCheckIn(id: string, input: ProofWindowRecord["checkIns"][number]) {
    const record = this.windows.get(id); if (!record) return null;
    record.checkIns.push(input); return record;
  }
  async completeWindow(id: string) { const record = this.windows.get(id); if (!record) return null; record.status = "complete"; return record; }
  async saveReceipt(input: Omit<ProofReceiptRecord, "id" | "createdAt" | "consentToAggregate">) {
    const record: ProofReceiptRecord = { ...input, id: `receipt-${crypto.randomUUID()}`, createdAt: new Date().toISOString(), consentToAggregate: false };
    this.receipts.set(record.id, record);
    return record;
  }
  async getReceipt(id: string) { return this.receipts.get(id) ?? null; }
  async listReceipts() {
    return [...this.receipts.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((record) => ({ ...record }));
  }
  async consentReceipt(id: string) {
    const receipt = this.receipts.get(id);
    if (!receipt) return { receiptId: id, consented: false, networkDelta: this.consented.size };
    receipt.consentToAggregate = true;
    this.consented.add(id);
    return { receiptId: id, consented: true, networkDelta: this.consented.size };
  }
  async coverage() {
    return {
      contributedReal: this.consented.size,
      networkDelta: this.consented.size,
      storedAnalyses: this.analyses.size,
      storedWindows: this.windows.size,
      storedReceipts: this.receipts.size,
    };
  }
}

const globalRepo = globalThis as typeof globalThis & { beautyProofRepo?: MemoryDemoRepository };
export const demoRepository = globalRepo.beautyProofRepo ?? new MemoryDemoRepository();
globalRepo.beautyProofRepo = demoRepository;
