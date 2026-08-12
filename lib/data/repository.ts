import type {
  Brand,
  CampaignCoverage,
  CampaignEligibilityResult,
  CampaignEnrollment,
  Experience,
  ProofCampaign,
  ProofReceiptRecord,
  RewardLedgerEntry,
  SkinAnalysis,
} from "../domain";

export interface ProofWindowRecord {
  id: string;
  formulaVersionId: string;
  claimId: string;
  baselineAnalysisId: string;
  startDate: string;
  plannedEndDate: string;
  returnDeadline: string;
  status: "active" | "complete" | "withdrawn";
  campaignEnrollmentId?: string;
  checkIns: { date: string; usedProduct: boolean; experience: Experience; confounderNote?: string }[];
}

export interface PublicProofContribution {
  receipt: ProofReceiptRecord;
  proofWindow: ProofWindowRecord;
  campaignId?: string;
}

export interface BeautyProofRepository {
  readonly mode: "memory" | "supabase";
  reset(): Promise<void>;
  listBrands(): Promise<Brand[]>;
  getBrand(id: string): Promise<Brand | null>;
  listCampaigns(): Promise<ProofCampaign[]>;
  getCampaign(id: string): Promise<ProofCampaign | null>;
  saveCampaign(campaign: ProofCampaign): Promise<ProofCampaign>;
  setCampaignStatus(id: string, status: ProofCampaign["status"]): Promise<ProofCampaign | null>;
  saveAnalysis(input: Omit<SkinAnalysis, "id" | "userId" | "capturedAt"> & Partial<Pick<SkinAnalysis, "capturedAt">>): Promise<SkinAnalysis>;
  getAnalysis(id: string): Promise<SkinAnalysis | null>;
  listAnalyses(): Promise<SkinAnalysis[]>;
  createWindow(input: Omit<ProofWindowRecord, "id" | "checkIns">): Promise<ProofWindowRecord>;
  getWindow(id: string): Promise<ProofWindowRecord | null>;
  listWindows(): Promise<ProofWindowRecord[]>;
  addCheckIn(id: string, input: ProofWindowRecord["checkIns"][number]): Promise<ProofWindowRecord | null>;
  completeWindow(id: string): Promise<ProofWindowRecord | null>;
  withdrawWindow(id: string): Promise<ProofWindowRecord | null>;
  createEnrollment(input: {
    campaignId: string;
    userId: string;
    baselineAnalysisId: string;
    eligibility: CampaignEligibilityResult;
    campaignConsentAcceptedAt: string;
  }): Promise<{ enrollment: CampaignEnrollment; reward: RewardLedgerEntry }>;
  getEnrollment(id: string): Promise<CampaignEnrollment | null>;
  listEnrollments(userId?: string): Promise<CampaignEnrollment[]>;
  linkWindowToEnrollment(windowId: string, enrollmentId: string): Promise<ProofWindowRecord | null>;
  completeCampaignEnrollment(enrollmentId: string): Promise<{ enrollment: CampaignEnrollment; reward: RewardLedgerEntry } | null>;
  getReward(id: string): Promise<RewardLedgerEntry | null>;
  getRewardForEnrollment(enrollmentId: string): Promise<RewardLedgerEntry | null>;
  issueDemoReward(id: string): Promise<RewardLedgerEntry | null>;
  saveReceipt(input: Omit<ProofReceiptRecord, "id" | "createdAt" | "consentToAggregate">): Promise<ProofReceiptRecord>;
  getReceipt(id: string): Promise<ProofReceiptRecord | null>;
  getReceiptByWindow(proofWindowId: string): Promise<ProofReceiptRecord | null>;
  listReceipts(): Promise<ProofReceiptRecord[]>;
  listPublicContributions(): Promise<PublicProofContribution[]>;
  consentReceipt(id: string): Promise<{ receiptId: string; consented: boolean; networkDelta: number }>;
  coverage(): Promise<{ contributedReal: number; networkDelta: number; storedAnalyses: number; storedWindows: number; storedReceipts: number }>;
  campaignCoverage(campaignId: string): Promise<CampaignCoverage | null>;
}
