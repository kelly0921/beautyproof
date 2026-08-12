import { calculateCampaignCoverage } from "../campaigns/coverage";
import { asterValeBrand, cloneHeroCampaign } from "../campaigns/hero";
import type {
  Brand,
  CampaignEnrollment,
  ProofCampaign,
  ProofReceiptRecord,
  RewardLedgerEntry,
  SkinAnalysis,
} from "../domain";
import { seededReceipts } from "../seed";
import { canExerciseDemoCampaign } from "../provenance";
import type { BeautyProofRepository, ProofWindowRecord, PublicProofContribution } from "./repository";

function cloneWindow(record: ProofWindowRecord) {
  return { ...record, checkIns: record.checkIns.map((entry) => ({ ...entry })) };
}

function cloneEnrollment(record: CampaignEnrollment) {
  return {
    ...record,
    eligibility: {
      ...record.eligibility,
      reasons: record.eligibility.reasons.map((reason) => ({ ...reason })),
      matchedMetrics: structuredClone(record.eligibility.matchedMetrics),
    },
  };
}

interface MemoryPublicState {
  brands: Map<string, Brand>;
  campaigns: Map<string, ProofCampaign>;
  repositories: Set<MemoryDemoRepository>;
}

const memoryRuntime = globalThis as typeof globalThis & { beautyProofPublicState?: MemoryPublicState };
const publicState = memoryRuntime.beautyProofPublicState ?? {
  brands: new Map([[asterValeBrand.id, { ...asterValeBrand }]]),
  campaigns: new Map([[cloneHeroCampaign().id, cloneHeroCampaign()]]),
  repositories: new Set<MemoryDemoRepository>(),
};
memoryRuntime.beautyProofPublicState = publicState;

export class MemoryDemoRepository implements BeautyProofRepository {
  readonly mode = "memory" as const;
  constructor(private readonly userId = "demo-user") { publicState.repositories.add(this); }
  private analyses = new Map<string, SkinAnalysis>();
  private windows = new Map<string, ProofWindowRecord>();
  private receipts = new Map<string, ProofReceiptRecord>();
  private consented = new Set<string>();
  private enrollments = new Map<string, CampaignEnrollment>();
  private rewards = new Map<string, RewardLedgerEntry>();

  async reset() {
    this.analyses.clear();
    this.windows.clear();
    this.receipts.clear();
    this.consented.clear();
    this.enrollments.clear();
    this.rewards.clear();
    const campaign = cloneHeroCampaign();
    publicState.campaigns = new Map([[campaign.id, campaign]]);
  }

  async listBrands() { return [...publicState.brands.values()].map((brand) => ({ ...brand })); }
  async getBrand(id: string) { const brand = publicState.brands.get(id); return brand ? { ...brand } : null; }
  async listCampaigns() { return [...publicState.campaigns.values()].map((campaign) => structuredClone(campaign)); }
  async getCampaign(id: string) { const campaign = publicState.campaigns.get(id); return campaign ? structuredClone(campaign) : null; }
  async saveCampaign(campaign: ProofCampaign) {
    const record = structuredClone(campaign);
    publicState.campaigns.set(record.id, record);
    return structuredClone(record);
  }
  async setCampaignStatus(id: string, status: ProofCampaign["status"]) {
    const campaign = publicState.campaigns.get(id);
    if (!campaign) return null;
    campaign.status = status;
    return structuredClone(campaign);
  }

  async saveAnalysis(input: Omit<SkinAnalysis, "id" | "userId" | "capturedAt"> & Partial<Pick<SkinAnalysis, "capturedAt">>) {
    const record: SkinAnalysis = {
      ...input,
      id: `analysis-${crypto.randomUUID()}`,
      userId: this.userId,
      capturedAt: input.capturedAt ?? new Date().toISOString(),
    };
    this.analyses.set(record.id, record);
    return { ...record };
  }
  async getAnalysis(id: string) { const record = this.analyses.get(id); return record ? { ...record } : null; }
  async listAnalyses() { return [...this.analyses.values()].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)).map((record) => ({ ...record })); }
  async createWindow(input: Omit<ProofWindowRecord, "id" | "checkIns">) {
    if (!this.analyses.has(input.baselineAnalysisId)) throw new Error("BASELINE_ANALYSIS_NOT_FOUND");
    if (input.campaignEnrollmentId && !this.enrollments.has(input.campaignEnrollmentId)) throw new Error("CAMPAIGN_ENROLLMENT_NOT_FOUND");
    if ([...this.windows.values()].some((window) => window.status === "active")) throw new Error("ACTIVE_PROOF_WINDOW_EXISTS");
    const record: ProofWindowRecord = { ...input, id: `pw-${crypto.randomUUID()}`, checkIns: [] };
    this.windows.set(record.id, record);
    return cloneWindow(record);
  }
  async getWindow(id: string) { const record = this.windows.get(id); return record ? cloneWindow(record) : null; }
  async listWindows() {
    return [...this.windows.values()]
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
      .map(cloneWindow);
  }
  async addCheckIn(id: string, input: ProofWindowRecord["checkIns"][number]) {
    const record = this.windows.get(id);
    if (!record) return null;
    if (!record.checkIns.some((entry) => entry.date === input.date)) record.checkIns.push({ ...input });
    return cloneWindow(record);
  }
  async completeWindow(id: string) {
    const record = this.windows.get(id);
    if (!record) return null;
    record.status = "complete";
    return cloneWindow(record);
  }
  async withdrawWindow(id: string) {
    const record = this.windows.get(id);
    if (!record || record.status !== "active") return null;
    record.status = "withdrawn";
    if (record.campaignEnrollmentId) {
      const enrollment = this.enrollments.get(record.campaignEnrollmentId);
      if (enrollment && enrollment.status !== "completed") enrollment.status = "withdrawn";
      const reward = [...this.rewards.values()].find((entry) => entry.enrollmentId === record.campaignEnrollmentId);
      if (reward?.status === "pending") reward.note = "Trial withdrawn; no prototype reward was earned.";
    }
    return cloneWindow(record);
  }

  async createEnrollment(input: Parameters<BeautyProofRepository["createEnrollment"]>[0]) {
    const existing = [...this.enrollments.values()].find((entry) => entry.campaignId === input.campaignId && entry.baselineAnalysisId === input.baselineAnalysisId);
    if (existing) {
      const reward = await this.getRewardForEnrollment(existing.id);
      if (!reward) throw new Error("REWARD_LEDGER_NOT_FOUND");
      return { enrollment: cloneEnrollment(existing), reward };
    }
    const campaign = publicState.campaigns.get(input.campaignId);
    const analysis = this.analyses.get(input.baselineAnalysisId);
    if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");
    if (campaign.status !== "active") throw new Error("CAMPAIGN_NOT_ACTIVE");
    if (!analysis || analysis.userId !== input.userId) throw new Error("BASELINE_ANALYSIS_NOT_FOUND");
    if (!input.eligibility.eligible || !canExerciseDemoCampaign(analysis)) throw new Error("CAMPAIGN_INELIGIBLE");
    const now = new Date().toISOString();
    const enrollment: CampaignEnrollment = {
      id: `enrollment-${crypto.randomUUID()}`,
      campaignId: campaign.id,
      userId: input.userId,
      baselineAnalysisId: input.baselineAnalysisId,
      status: "enrolled",
      eligibility: structuredClone(input.eligibility),
      campaignConsentAcceptedAt: input.campaignConsentAcceptedAt,
      createdAt: now,
    };
    const reward: RewardLedgerEntry = {
      id: `reward-${crypto.randomUUID()}`,
      enrollmentId: enrollment.id,
      rewardType: campaign.rewardType,
      rewardAmountCents: campaign.rewardAmountCents,
      currency: campaign.currency,
      status: "pending",
      note: "Prototype ledger only. Reward depends on protocol completion, not outcome; no funds moved.",
    };
    this.enrollments.set(enrollment.id, enrollment);
    this.rewards.set(reward.id, reward);
    return { enrollment: cloneEnrollment(enrollment), reward: { ...reward } };
  }
  async getEnrollment(id: string) { const record = this.enrollments.get(id); return record ? cloneEnrollment(record) : null; }
  async listEnrollments(userId?: string) {
    return [...this.enrollments.values()]
      .filter((entry) => !userId || entry.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(cloneEnrollment);
  }
  async linkWindowToEnrollment(windowId: string, enrollmentId: string) {
    const record = this.windows.get(windowId);
    const enrollment = this.enrollments.get(enrollmentId);
    if (!record || !enrollment) return null;
    const duplicate = [...this.windows.values()].find((window) => window.id !== windowId && window.campaignEnrollmentId === enrollmentId);
    if (duplicate) throw new Error("CAMPAIGN_ENROLLMENT_ALREADY_LINKED");
    record.campaignEnrollmentId = enrollmentId;
    enrollment.status = "active";
    return cloneWindow(record);
  }
  async completeCampaignEnrollment(enrollmentId: string) {
    const enrollment = this.enrollments.get(enrollmentId);
    const reward = [...this.rewards.values()].find((entry) => entry.enrollmentId === enrollmentId);
    if (!enrollment || !reward) return null;
    const now = new Date().toISOString();
    enrollment.status = "completed";
    enrollment.completedAt ??= now;
    if (reward.status === "pending") {
      reward.status = "earned";
      reward.earnedAt = now;
    }
    return { enrollment: cloneEnrollment(enrollment), reward: { ...reward } };
  }
  async getReward(id: string) { const reward = this.rewards.get(id); return reward ? { ...reward } : null; }
  async getRewardForEnrollment(enrollmentId: string) {
    const reward = [...this.rewards.values()].find((entry) => entry.enrollmentId === enrollmentId);
    return reward ? { ...reward } : null;
  }
  async issueDemoReward(id: string) {
    const reward = this.rewards.get(id);
    if (!reward || reward.status === "pending") return null;
    reward.status = "issued_demo";
    reward.issuedAt ??= new Date().toISOString();
    reward.note = "Demo credit issued in the prototype ledger; no funds moved.";
    return { ...reward };
  }

  async saveReceipt(input: Omit<ProofReceiptRecord, "id" | "createdAt" | "consentToAggregate">) {
    const existing = [...this.receipts.values()].find((receipt) => receipt.proofWindowId === input.proofWindowId);
    if (existing) return { ...existing };
    const record: ProofReceiptRecord = { ...input, id: `receipt-${crypto.randomUUID()}`, createdAt: new Date().toISOString(), consentToAggregate: false };
    this.receipts.set(record.id, record);
    return { ...record };
  }
  async getReceipt(id: string) { const receipt = this.receipts.get(id); return receipt ? { ...receipt } : null; }
  async getReceiptByWindow(proofWindowId: string) {
    const receipt = [...this.receipts.values()].find((entry) => entry.proofWindowId === proofWindowId);
    return receipt ? { ...receipt } : null;
  }
  async listReceipts() {
    return [...this.receipts.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((record) => ({ ...record }));
  }
  private publicContributionsForThisUser(): PublicProofContribution[] {
    return [...this.receipts.values()].flatMap((receipt) => {
      const proofWindow = this.windows.get(receipt.proofWindowId);
      if (!receipt.consentToAggregate || !proofWindow) return [];
      const campaignId = proofWindow.campaignEnrollmentId ? this.enrollments.get(proofWindow.campaignEnrollmentId)?.campaignId : undefined;
      return [{ receipt: { ...receipt }, proofWindow: cloneWindow(proofWindow), campaignId }];
    });
  }
  async listPublicContributions(): Promise<PublicProofContribution[]> {
    return [...publicState.repositories].flatMap((repository) => repository.publicContributionsForThisUser());
  }
  async consentReceipt(id: string) {
    const receipt = this.receipts.get(id);
    if (!receipt) return { receiptId: id, consented: false, networkDelta: (await this.coverage()).networkDelta };
    receipt.consentToAggregate = true;
    this.consented.add(id);
    return { receiptId: id, consented: true, networkDelta: (await this.coverage()).networkDelta };
  }
  async coverage() {
    const contributedReal = [...this.consented].filter((id) => this.receipts.get(id)?.origin === "real").length;
    return {
      contributedReal,
      networkDelta: contributedReal,
      storedAnalyses: this.analyses.size,
      storedWindows: this.windows.size,
      storedReceipts: this.receipts.size,
    };
  }
  async campaignCoverage(campaignId: string) {
    const campaign = publicState.campaigns.get(campaignId);
    if (!campaign) return null;
    const persistedReceipts = [...publicState.repositories].flatMap((repository) => [...repository.windows.values()]
      .filter((window) => {
        const enrollment = window.campaignEnrollmentId ? repository.enrollments.get(window.campaignEnrollmentId) : null;
        return enrollment?.campaignId === campaignId;
      })
      .flatMap((window) => {
        const receipt = [...repository.receipts.values()].find((entry) => entry.proofWindowId === window.id);
        const baseline = repository.analyses.get(window.baselineAnalysisId);
        const reward = window.campaignEnrollmentId
          ? [...repository.rewards.values()].find((entry) => entry.enrollmentId === window.campaignEnrollmentId)
          : undefined;
        return receipt && baseline ? [{ receipt, baselineOrigin: baseline.origin, baselineSourceType: baseline.sourceType, reward }] : [];
      }));
    return calculateCampaignCoverage({ campaign, syntheticReceipts: seededReceipts, persistedReceipts });
  }
}

const globalRepo = globalThis as typeof globalThis & { beautyProofRepo?: MemoryDemoRepository };
export const demoRepository = globalRepo.beautyProofRepo ?? new MemoryDemoRepository();
globalRepo.beautyProofRepo = demoRepository;
