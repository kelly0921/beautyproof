import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { calculateCampaignCoverage } from "../campaigns/coverage";
import type {
  Brand,
  CampaignEligibilityResult,
  CampaignEnrollment,
  Experience,
  MetricVector,
  ProofCampaign,
  ProofReceiptRecord,
  RewardLedgerEntry,
  SkinAnalysis,
} from "../domain";
import { seededReceipts } from "../seed";
import { canExerciseDemoCampaign } from "../provenance";
import { planSyntheticDemoReset } from "./demo-reset";
import type { BeautyProofRepository, ProofWindowRecord } from "./repository";

export const demoUserId = "00000000-0000-4000-8000-000000000026";

/**
 * Opaque Supabase API keys belong in the `apikey` header, not in a Bearer
 * header. supabase-js currently mirrors the project key into Authorization
 * for unauthenticated requests, so remove only that exact fallback while
 * preserving real user-session JWTs and legacy service-role keys.
 */
export function createSupabaseServerFetch(secretKey: string, fetchImpl: typeof fetch = fetch): typeof fetch {
  const isOpaqueApiKey = secretKey.startsWith("sb_secret_") || secretKey.startsWith("sb_publishable_");

  return async (input, init) => {
    const headers = new Headers(init?.headers);
    const authorization = headers.get("Authorization");
    if (isOpaqueApiKey && authorization && /^Bearer\s+sb_(?:secret|publishable)_/i.test(authorization)) {
      headers.delete("Authorization");
    }
    return fetchImpl(input, { ...init, headers });
  };
}

interface BrandRow {
  id: string;
  slug: string;
  name: string;
  description: string;
}

interface CampaignRow {
  id: string;
  brand_id: string;
  formula_version_id: string;
  claim_id: string;
  title: string;
  purpose: string;
  status: ProofCampaign["status"];
  target_receipt_count: number;
  target_metric_ranges_json: ProofCampaign["targetMetricRanges"];
  required_duration_days: number;
  reward_type: ProofCampaign["rewardType"];
  reward_amount_cents: number;
  reward_label: string;
  currency: "USD";
  outcome_neutral: true;
  starts_at: string;
  ends_at: string;
  created_at: string;
}

interface EnrollmentRow {
  id: string;
  campaign_id: string;
  user_id: string;
  baseline_analysis_id: string;
  status: CampaignEnrollment["status"];
  eligibility_json: CampaignEligibilityResult;
  campaign_consent_accepted_at: string;
  created_at: string;
  completed_at: string | null;
}

interface RewardRow {
  id: string;
  enrollment_id: string;
  reward_type: RewardLedgerEntry["rewardType"];
  reward_amount_cents: number;
  currency: "USD";
  status: RewardLedgerEntry["status"];
  earned_at: string | null;
  issued_at: string | null;
  note: string;
}

interface AnalysisRow {
  id: string;
  user_id: string;
  captured_at: string;
  provider_task_id: string | null;
  source_type: SkinAnalysis["sourceType"];
  api_version: SkinAnalysis["apiVersion"];
  capture_mode: SkinAnalysis["captureMode"];
  metrics_json: MetricVector;
  ui_scores_json: MetricVector | null;
  mask_urls_json: SkinAnalysis["maskUrls"];
  validity_json: SkinAnalysis["validity"];
  origin: SkinAnalysis["origin"];
}

interface WindowRow {
  id: string;
  formula_version_id: string;
  claim_id: string;
  baseline_analysis_id: string;
  start_date: string;
  planned_end_date: string;
  return_deadline: string;
  status: string;
  campaign_enrollment_id: string | null;
}

interface CheckInRow {
  proof_window_id?: string;
  checkin_date: string;
  used_product: boolean;
  experience: Experience;
  confounder_note_nullable: string | null;
}

interface ReceiptObservations {
  baselineAnalysisId: string;
  followupAnalysisId: string;
  baseline: MetricVector;
  followup: MetricVector;
  evidenceScore: number;
  evidenceReasons: ProofReceiptRecord["evidenceReasons"];
  verdictExplanation: string;
}

interface ReceiptRow {
  id: string;
  proof_window_id: string;
  followup_analysis_id: string;
  adherence_rate: number | string;
  evidence_quality: ProofReceiptRecord["evidenceQuality"];
  verdict: ProofReceiptRecord["verdict"];
  observations_json: ReceiptObservations;
  subjective_feedback_json: { experience: Experience; sensoryNote: string };
  consent_to_aggregate: boolean;
  origin: ProofReceiptRecord["origin"];
  created_at: string;
}

export class SupabaseRepositoryError extends Error {
  constructor(public readonly operation: string, message: string) {
    super(`Supabase ${operation} failed: ${message}`);
  }
}

function assertNoError(error: { message: string } | null, operation: string) {
  if (error) throw new SupabaseRepositoryError(operation, error.message);
}

function requireRow<T>(data: T | null, error: { message: string } | null, operation: string) {
  assertNoError(error, operation);
  if (!data) throw new SupabaseRepositoryError(operation, "No row was returned.");
  return data;
}

function mapBrand(row: BrandRow): Brand {
  return { id: row.id, slug: row.slug, name: row.name, description: row.description };
}

function mapCampaign(row: CampaignRow): ProofCampaign {
  return {
    id: row.id,
    brandId: row.brand_id,
    formulaVersionId: row.formula_version_id,
    claimId: row.claim_id,
    title: row.title,
    purpose: row.purpose,
    status: row.status,
    targetReceiptCount: row.target_receipt_count,
    targetMetricRanges: row.target_metric_ranges_json,
    requiredDurationDays: row.required_duration_days,
    rewardType: row.reward_type,
    rewardAmountCents: row.reward_amount_cents,
    rewardLabel: row.reward_label,
    currency: row.currency,
    outcomeNeutral: row.outcome_neutral,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
  };
}

function mapEnrollment(row: EnrollmentRow): CampaignEnrollment {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    userId: row.user_id,
    baselineAnalysisId: row.baseline_analysis_id,
    status: row.status,
    eligibility: row.eligibility_json,
    campaignConsentAcceptedAt: row.campaign_consent_accepted_at,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
  };
}

function mapReward(row: RewardRow): RewardLedgerEntry {
  return {
    id: row.id,
    enrollmentId: row.enrollment_id,
    rewardType: row.reward_type,
    rewardAmountCents: row.reward_amount_cents,
    currency: row.currency,
    status: row.status,
    earnedAt: row.earned_at ?? undefined,
    issuedAt: row.issued_at ?? undefined,
    note: row.note,
  };
}

function mapAnalysis(row: AnalysisRow): SkinAnalysis {
  return {
    id: row.id,
    userId: row.user_id,
    capturedAt: row.captured_at,
    providerTaskId: row.provider_task_id ?? undefined,
    sourceType: row.source_type,
    apiVersion: row.api_version,
    captureMode: row.capture_mode,
    metrics: row.metrics_json,
    uiScores: row.ui_scores_json ?? undefined,
    maskUrls: row.mask_urls_json,
    validity: row.validity_json,
    origin: row.origin,
  };
}

function mapWindow(row: WindowRow, checkIns: CheckInRow[] = []): ProofWindowRecord {
  return {
    id: row.id,
    formulaVersionId: row.formula_version_id,
    claimId: row.claim_id,
    baselineAnalysisId: row.baseline_analysis_id,
    startDate: row.start_date,
    plannedEndDate: row.planned_end_date,
    returnDeadline: row.return_deadline,
    status: row.status === "complete" ? "complete" : "active",
    campaignEnrollmentId: row.campaign_enrollment_id ?? undefined,
    checkIns: checkIns.map((entry) => ({
      date: entry.checkin_date,
      usedProduct: entry.used_product,
      experience: entry.experience,
      confounderNote: entry.confounder_note_nullable ?? undefined,
    })),
  };
}

function mapReceipt(row: ReceiptRow): ProofReceiptRecord {
  return {
    id: row.id,
    proofWindowId: row.proof_window_id,
    baselineAnalysisId: row.observations_json.baselineAnalysisId,
    followupAnalysisId: row.observations_json.followupAnalysisId,
    baseline: row.observations_json.baseline,
    followup: row.observations_json.followup,
    adherenceRate: Number(row.adherence_rate),
    evidenceQuality: row.evidence_quality,
    evidenceScore: row.observations_json.evidenceScore,
    evidenceReasons: row.observations_json.evidenceReasons,
    verdict: row.verdict,
    verdictExplanation: row.observations_json.verdictExplanation,
    experience: row.subjective_feedback_json.experience,
    sensoryNote: row.subjective_feedback_json.sensoryNote,
    consentToAggregate: row.consent_to_aggregate,
    origin: row.origin,
    createdAt: row.created_at,
  };
}

export class SupabaseBeautyProofRepository implements BeautyProofRepository {
  readonly mode = "supabase" as const;
  private readonly client: SupabaseClient;

  constructor(url: string, secretKey: string) {
    this.client = createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: {
        fetch: createSupabaseServerFetch(secretKey),
        headers: { "x-application-name": "beautyproof" },
      },
    });
  }

  async listBrands() {
    const result = await this.client.from("brand").select("*").order("name");
    assertNoError(result.error, "list brands");
    return ((result.data ?? []) as BrandRow[]).map(mapBrand);
  }

  async getBrand(id: string) {
    const result = await this.client.from("brand").select("*").eq("id", id).maybeSingle();
    assertNoError(result.error, "get brand");
    return result.data ? mapBrand(result.data as BrandRow) : null;
  }

  async listCampaigns() {
    const result = await this.client.from("proof_campaign").select("*").order("created_at", { ascending: false });
    assertNoError(result.error, "list Proof Campaigns");
    return ((result.data ?? []) as CampaignRow[]).map(mapCampaign);
  }

  async getCampaign(id: string) {
    const result = await this.client.from("proof_campaign").select("*").eq("id", id).maybeSingle();
    assertNoError(result.error, "get Proof Campaign");
    return result.data ? mapCampaign(result.data as CampaignRow) : null;
  }

  async saveCampaign(campaign: ProofCampaign) {
    const result = await this.client.from("proof_campaign").upsert({
      id: campaign.id,
      brand_id: campaign.brandId,
      formula_version_id: campaign.formulaVersionId,
      claim_id: campaign.claimId,
      title: campaign.title,
      purpose: campaign.purpose,
      status: campaign.status,
      target_receipt_count: campaign.targetReceiptCount,
      target_metric_ranges_json: campaign.targetMetricRanges,
      required_duration_days: campaign.requiredDurationDays,
      reward_type: campaign.rewardType,
      reward_amount_cents: campaign.rewardAmountCents,
      reward_label: campaign.rewardLabel,
      currency: campaign.currency,
      outcome_neutral: campaign.outcomeNeutral,
      starts_at: campaign.startsAt,
      ends_at: campaign.endsAt,
      created_at: campaign.createdAt,
    }).select("*").single();
    return mapCampaign(requireRow(result.data as CampaignRow | null, result.error, "save Proof Campaign"));
  }

  async setCampaignStatus(id: string, status: ProofCampaign["status"]) {
    const result = await this.client.from("proof_campaign").update({ status }).eq("id", id).select("*").maybeSingle();
    assertNoError(result.error, "update Proof Campaign status");
    return result.data ? mapCampaign(result.data as CampaignRow) : null;
  }

  async reset() {
    const [analysisResult, windowsResult, enrollmentResult] = await Promise.all([
      this.client.from("skin_analysis").select("id,origin").eq("user_id", demoUserId),
      this.client.from("proof_window").select("id,baseline_analysis_id,campaign_enrollment_id").eq("user_id", demoUserId),
      this.client.from("campaign_enrollment").select("id,baseline_analysis_id").eq("user_id", demoUserId),
    ]);
    assertNoError(analysisResult.error, "list analyses for safe demo reset");
    assertNoError(windowsResult.error, "list windows for safe demo reset");
    assertNoError(enrollmentResult.error, "list enrollments for safe demo reset");

    const allWindowIds = (windowsResult.data ?? []).map((row) => row.id as string);
    const receiptResult = allWindowIds.length
      ? await this.client.from("proof_receipt").select("proof_window_id,followup_analysis_id,origin").in("proof_window_id", allWindowIds)
      : { data: [], error: null };
    assertNoError(receiptResult.error, "list receipts for safe demo reset");
    const scope = planSyntheticDemoReset({
      analyses: (analysisResult.data ?? []).map((row) => ({ id: row.id as string, origin: row.origin as SkinAnalysis["origin"] })),
      windows: (windowsResult.data ?? []).map((row) => ({
        id: row.id as string,
        baselineAnalysisId: row.baseline_analysis_id as string,
        campaignEnrollmentId: row.campaign_enrollment_id ? String(row.campaign_enrollment_id) : undefined,
      })),
      receipts: (receiptResult.data ?? []).map((row) => ({
        proofWindowId: row.proof_window_id as string,
        followupAnalysisId: row.followup_analysis_id as string,
        origin: row.origin as ProofReceiptRecord["origin"],
      })),
      enrollments: (enrollmentResult.data ?? []).map((row) => ({ id: row.id as string, baselineAnalysisId: row.baseline_analysis_id as string })),
    });

    if (scope.windowIds.length) {
      const deletedReceipts = await this.client.from("proof_receipt").delete().in("proof_window_id", scope.windowIds);
      assertNoError(deletedReceipts.error, "delete synthetic demo receipts");
      const deletedCheckIns = await this.client.from("check_in").delete().in("proof_window_id", scope.windowIds);
      assertNoError(deletedCheckIns.error, "delete synthetic demo check-ins");
      const deletedWindows = await this.client.from("proof_window").delete().in("id", scope.windowIds);
      assertNoError(deletedWindows.error, "delete synthetic demo windows");
    }
    if (scope.enrollmentIds.length) {
      const deletedEnrollments = await this.client.from("campaign_enrollment").delete().in("id", scope.enrollmentIds);
      assertNoError(deletedEnrollments.error, "delete synthetic demo enrollments");
    }
    if (scope.analysisIds.length) {
      const deletedAnalyses = await this.client.from("skin_analysis").delete().in("id", scope.analysisIds);
      assertNoError(deletedAnalyses.error, "delete synthetic demo analyses");
    }

    const remainingEnrollments = await this.client.from("campaign_enrollment").select("*", { count: "exact", head: true }).eq("campaign_id", "campaign-dewsignal-hydration-2026");
    assertNoError(remainingEnrollments.error, "count preserved campaign enrollments");
    if (!remainingEnrollments.count) {
      const campaignResult = await this.client.from("proof_campaign").update({ status: "draft" }).eq("id", "campaign-dewsignal-hydration-2026");
      assertNoError(campaignResult.error, "restore demo Proof Campaign");
    }
  }

  async saveAnalysis(input: Omit<SkinAnalysis, "id" | "userId" | "capturedAt"> & Partial<Pick<SkinAnalysis, "capturedAt">>) {
    const result = await this.client.from("skin_analysis").insert({
      user_id: demoUserId,
      captured_at: input.capturedAt ?? new Date().toISOString(),
      provider_task_id: input.providerTaskId ?? null,
      source_type: input.sourceType,
      api_version: input.apiVersion,
      capture_mode: input.captureMode,
      metrics_json: input.metrics,
      ui_scores_json: input.uiScores ?? null,
      mask_urls_json: input.maskUrls,
      validity_json: input.validity,
      origin: input.origin,
    }).select("*").single();
    return mapAnalysis(requireRow(result.data as AnalysisRow | null, result.error, "save analysis"));
  }

  async getAnalysis(id: string) {
    const result = await this.client.from("skin_analysis").select("*").eq("id", id).maybeSingle();
    assertNoError(result.error, "get analysis");
    return result.data ? mapAnalysis(result.data as AnalysisRow) : null;
  }

  async listAnalyses() {
    const result = await this.client.from("skin_analysis").select("*").eq("user_id", demoUserId).order("captured_at", { ascending: false });
    assertNoError(result.error, "list analyses");
    return ((result.data ?? []) as AnalysisRow[]).map(mapAnalysis);
  }

  async createWindow(input: Omit<ProofWindowRecord, "id" | "checkIns">) {
    const result = await this.client.from("proof_window").insert({
      user_id: demoUserId,
      formula_version_id: input.formulaVersionId,
      claim_id: input.claimId,
      baseline_analysis_id: input.baselineAnalysisId,
      start_date: input.startDate,
      planned_end_date: input.plannedEndDate,
      return_deadline: input.returnDeadline,
      status: input.status,
      routine_stability_status: "stable",
      campaign_enrollment_id: input.campaignEnrollmentId ?? null,
    }).select("*").single();
    return mapWindow(requireRow(result.data as WindowRow | null, result.error, "create ProofWindow"));
  }

  async getWindow(id: string) {
    const windowResult = await this.client.from("proof_window").select("*").eq("id", id).maybeSingle();
    assertNoError(windowResult.error, "get ProofWindow");
    if (!windowResult.data) return null;
    const checkInResult = await this.client.from("check_in").select("checkin_date,used_product,experience,confounder_note_nullable").eq("proof_window_id", id).order("checkin_date");
    assertNoError(checkInResult.error, "get ProofWindow check-ins");
    return mapWindow(windowResult.data as WindowRow, (checkInResult.data ?? []) as CheckInRow[]);
  }

  async listWindows() {
    const windowResult = await this.client.from("proof_window").select("*").eq("user_id", demoUserId).order("start_date", { ascending: false });
    assertNoError(windowResult.error, "list ProofWindows");
    const rows = (windowResult.data ?? []) as WindowRow[];
    if (!rows.length) return [];
    const checkInResult = await this.client
      .from("check_in")
      .select("proof_window_id,checkin_date,used_product,experience,confounder_note_nullable")
      .in("proof_window_id", rows.map((row) => row.id))
      .order("checkin_date");
    assertNoError(checkInResult.error, "list ProofWindow check-ins");
    const checkIns = (checkInResult.data ?? []) as CheckInRow[];
    return rows.map((row) => mapWindow(row, checkIns.filter((entry) => entry.proof_window_id === row.id)));
  }

  async addCheckIn(id: string, input: ProofWindowRecord["checkIns"][number]) {
    const result = await this.client.from("check_in").insert({
      proof_window_id: id,
      checkin_date: input.date,
      used_product: input.usedProduct,
      experience: input.experience,
      confounder_note_nullable: input.confounderNote ?? null,
    });
    if (result.error?.code === "23503") return null;
    assertNoError(result.error, "save check-in");
    return await this.getWindow(id);
  }

  async completeWindow(id: string) {
    const result = await this.client.from("proof_window").update({ status: "complete" }).eq("id", id).select("*").maybeSingle();
    assertNoError(result.error, "complete ProofWindow");
    return result.data ? await this.getWindow(id) : null;
  }

  async createEnrollment(input: Parameters<BeautyProofRepository["createEnrollment"]>[0]) {
    const existingResult = await this.client
      .from("campaign_enrollment")
      .select("*")
      .eq("campaign_id", input.campaignId)
      .eq("user_id", input.userId)
      .eq("baseline_analysis_id", input.baselineAnalysisId)
      .maybeSingle();
    assertNoError(existingResult.error, "find existing campaign enrollment");
    let enrollment: CampaignEnrollment;
    if (existingResult.data) {
      enrollment = mapEnrollment(existingResult.data as EnrollmentRow);
    } else {
      const [campaign, analysis] = await Promise.all([this.getCampaign(input.campaignId), this.getAnalysis(input.baselineAnalysisId)]);
      if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");
      if (campaign.status !== "active") throw new Error("CAMPAIGN_NOT_ACTIVE");
      if (!analysis || analysis.userId !== input.userId) throw new Error("BASELINE_ANALYSIS_NOT_FOUND");
      if (!input.eligibility.eligible || !canExerciseDemoCampaign(analysis)) throw new Error("CAMPAIGN_INELIGIBLE");
      const enrollmentResult = await this.client.from("campaign_enrollment").insert({
        campaign_id: input.campaignId,
        user_id: input.userId,
        baseline_analysis_id: input.baselineAnalysisId,
        status: "enrolled",
        eligibility_json: input.eligibility,
        campaign_consent_accepted_at: input.campaignConsentAcceptedAt,
      }).select("*").single();
      enrollment = mapEnrollment(requireRow(enrollmentResult.data as EnrollmentRow | null, enrollmentResult.error, "create campaign enrollment"));
    }
    let reward = await this.getRewardForEnrollment(enrollment.id);
    if (!reward) {
      const campaign = await this.getCampaign(enrollment.campaignId);
      if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");
      const rewardResult = await this.client.from("reward_ledger").insert({
        enrollment_id: enrollment.id,
        reward_type: campaign.rewardType,
        reward_amount_cents: campaign.rewardAmountCents,
        currency: campaign.currency,
        status: "pending",
        note: "Prototype ledger only. Reward depends on protocol completion, not outcome; no funds moved.",
      }).select("*").single();
      reward = mapReward(requireRow(rewardResult.data as RewardRow | null, rewardResult.error, "create reward ledger entry"));
    }
    return { enrollment, reward };
  }

  async getEnrollment(id: string) {
    const result = await this.client.from("campaign_enrollment").select("*").eq("id", id).maybeSingle();
    assertNoError(result.error, "get campaign enrollment");
    return result.data ? mapEnrollment(result.data as EnrollmentRow) : null;
  }

  async listEnrollments(userId?: string) {
    let query = this.client.from("campaign_enrollment").select("*").order("created_at", { ascending: false });
    if (userId) query = query.eq("user_id", userId);
    const result = await query;
    assertNoError(result.error, "list campaign enrollments");
    return ((result.data ?? []) as EnrollmentRow[]).map(mapEnrollment);
  }

  async linkWindowToEnrollment(windowId: string, enrollmentId: string) {
    const enrollment = await this.getEnrollment(enrollmentId);
    if (!enrollment) return null;
    const windowResult = await this.client
      .from("proof_window")
      .update({ campaign_enrollment_id: enrollmentId })
      .eq("id", windowId)
      .select("*")
      .maybeSingle();
    if (windowResult.error?.code === "23505") throw new Error("CAMPAIGN_ENROLLMENT_ALREADY_LINKED");
    assertNoError(windowResult.error, "link ProofWindow to campaign enrollment");
    if (!windowResult.data) return null;
    const enrollmentResult = await this.client.from("campaign_enrollment").update({ status: "active" }).eq("id", enrollmentId);
    assertNoError(enrollmentResult.error, "activate campaign enrollment");
    return await this.getWindow(windowId);
  }

  async completeCampaignEnrollment(enrollmentId: string) {
    const enrollment = await this.getEnrollment(enrollmentId);
    const reward = await this.getRewardForEnrollment(enrollmentId);
    if (!enrollment || !reward) return null;
    const now = new Date().toISOString();
    const enrollmentResult = await this.client.from("campaign_enrollment").update({
      status: "completed",
      completed_at: enrollment.completedAt ?? now,
    }).eq("id", enrollmentId).select("*").single();
    const updatedEnrollment = mapEnrollment(requireRow(enrollmentResult.data as EnrollmentRow | null, enrollmentResult.error, "complete campaign enrollment"));
    let updatedReward = reward;
    if (reward.status === "pending") {
      const rewardResult = await this.client.from("reward_ledger").update({ status: "earned", earned_at: reward.earnedAt ?? now }).eq("id", reward.id).select("*").single();
      updatedReward = mapReward(requireRow(rewardResult.data as RewardRow | null, rewardResult.error, "earn campaign reward"));
    }
    return { enrollment: updatedEnrollment, reward: updatedReward };
  }

  async getReward(id: string) {
    const result = await this.client.from("reward_ledger").select("*").eq("id", id).maybeSingle();
    assertNoError(result.error, "get reward ledger entry");
    return result.data ? mapReward(result.data as RewardRow) : null;
  }

  async getRewardForEnrollment(enrollmentId: string) {
    const result = await this.client.from("reward_ledger").select("*").eq("enrollment_id", enrollmentId).maybeSingle();
    assertNoError(result.error, "get enrollment reward");
    return result.data ? mapReward(result.data as RewardRow) : null;
  }

  async issueDemoReward(id: string) {
    const reward = await this.getReward(id);
    if (!reward || reward.status === "pending") return null;
    const result = await this.client.from("reward_ledger").update({
      status: "issued_demo",
      issued_at: reward.issuedAt ?? new Date().toISOString(),
      note: "Demo credit issued in the prototype ledger; no funds moved.",
    }).eq("id", id).select("*").single();
    return mapReward(requireRow(result.data as RewardRow | null, result.error, "issue demo reward"));
  }

  async saveReceipt(input: Omit<ProofReceiptRecord, "id" | "createdAt" | "consentToAggregate">) {
    const existing = await this.getReceiptByWindow(input.proofWindowId);
    if (existing) return existing;
    const result = await this.client.from("proof_receipt").insert({
      proof_window_id: input.proofWindowId,
      followup_analysis_id: input.followupAnalysisId,
      adherence_rate: input.adherenceRate,
      evidence_quality: input.evidenceQuality,
      verdict: input.verdict,
      observations_json: {
        baselineAnalysisId: input.baselineAnalysisId,
        followupAnalysisId: input.followupAnalysisId,
        baseline: input.baseline,
        followup: input.followup,
        evidenceScore: input.evidenceScore,
        evidenceReasons: input.evidenceReasons,
        verdictExplanation: input.verdictExplanation,
      },
      subjective_feedback_json: { experience: input.experience, sensoryNote: input.sensoryNote },
      limitations_json: ["Personal cosmetic observation; not diagnosis, clinical proof, or causality."],
      consent_to_aggregate: false,
      origin: input.origin,
    }).select("*").single();
    return mapReceipt(requireRow(result.data as ReceiptRow | null, result.error, "save ProofReceipt"));
  }

  async getReceipt(id: string) {
    const result = await this.client.from("proof_receipt").select("*").eq("id", id).maybeSingle();
    assertNoError(result.error, "get ProofReceipt");
    return result.data ? mapReceipt(result.data as ReceiptRow) : null;
  }

  async getReceiptByWindow(proofWindowId: string) {
    const result = await this.client.from("proof_receipt").select("*").eq("proof_window_id", proofWindowId).maybeSingle();
    assertNoError(result.error, "get ProofReceipt by window");
    return result.data ? mapReceipt(result.data as ReceiptRow) : null;
  }

  async listReceipts() {
    const windowsResult = await this.client.from("proof_window").select("id").eq("user_id", demoUserId);
    assertNoError(windowsResult.error, "list receipt ProofWindows");
    const windowIds = (windowsResult.data ?? []).map((row) => row.id as string);
    if (!windowIds.length) return [];
    const result = await this.client.from("proof_receipt").select("*").in("proof_window_id", windowIds).order("created_at", { ascending: false });
    assertNoError(result.error, "list ProofReceipts");
    return ((result.data ?? []) as ReceiptRow[]).map(mapReceipt);
  }

  async consentReceipt(id: string) {
    const result = await this.client.from("proof_receipt").update({ consent_to_aggregate: true }).eq("id", id).select("id").maybeSingle();
    assertNoError(result.error, "consent ProofReceipt");
    if (!result.data) return { receiptId: id, consented: false, networkDelta: (await this.coverage()).networkDelta };
    return { receiptId: id, consented: true, networkDelta: (await this.coverage()).networkDelta };
  }

  async coverage() {
    const [analysisResult, windowResult, receiptResult, consentResult] = await Promise.all([
      this.client.from("skin_analysis").select("*", { count: "exact", head: true }).eq("user_id", demoUserId),
      this.client.from("proof_window").select("*", { count: "exact", head: true }).eq("user_id", demoUserId),
      this.client.from("proof_receipt").select("*", { count: "exact", head: true }),
      this.client.from("proof_receipt").select("*", { count: "exact", head: true }).eq("consent_to_aggregate", true).eq("origin", "real"),
    ]);
    assertNoError(analysisResult.error, "count analyses");
    assertNoError(windowResult.error, "count windows");
    assertNoError(receiptResult.error, "count receipts");
    assertNoError(consentResult.error, "count consented receipts");
    return {
      contributedReal: consentResult.count ?? 0,
      networkDelta: consentResult.count ?? 0,
      storedAnalyses: analysisResult.count ?? 0,
      storedWindows: windowResult.count ?? 0,
      storedReceipts: receiptResult.count ?? 0,
    };
  }

  async campaignCoverage(campaignId: string) {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) return null;
    const enrollmentResult = await this.client.from("campaign_enrollment").select("id").eq("campaign_id", campaignId);
    assertNoError(enrollmentResult.error, "list campaign coverage enrollments");
    const enrollmentIds = (enrollmentResult.data ?? []).map((row) => row.id as string);
    if (!enrollmentIds.length) return calculateCampaignCoverage({ campaign, syntheticReceipts: seededReceipts, persistedReceipts: [] });

    const windowResult = await this.client
      .from("proof_window")
      .select("id,baseline_analysis_id,campaign_enrollment_id")
      .in("campaign_enrollment_id", enrollmentIds);
    assertNoError(windowResult.error, "list campaign ProofWindows");
    const windows = (windowResult.data ?? []) as Pick<WindowRow, "id" | "baseline_analysis_id" | "campaign_enrollment_id">[];
    if (!windows.length) return calculateCampaignCoverage({ campaign, syntheticReceipts: seededReceipts, persistedReceipts: [] });

    const [receiptResult, analysisResult, rewardResult] = await Promise.all([
      this.client.from("proof_receipt").select("*").in("proof_window_id", windows.map((window) => window.id)),
      this.client.from("skin_analysis").select("*").in("id", windows.map((window) => window.baseline_analysis_id)),
      this.client.from("reward_ledger").select("*").in("enrollment_id", enrollmentIds),
    ]);
    assertNoError(receiptResult.error, "list campaign ProofReceipts");
    assertNoError(analysisResult.error, "list campaign baseline analyses");
    assertNoError(rewardResult.error, "list campaign rewards");
    const receipts = ((receiptResult.data ?? []) as ReceiptRow[]).map(mapReceipt);
    const analyses = ((analysisResult.data ?? []) as AnalysisRow[]).map(mapAnalysis);
    const rewards = ((rewardResult.data ?? []) as RewardRow[]).map(mapReward);
    const persistedReceipts = windows.flatMap((window) => {
      const receipt = receipts.find((entry) => entry.proofWindowId === window.id);
      const baseline = analyses.find((entry) => entry.id === window.baseline_analysis_id);
      const reward = rewards.find((entry) => entry.enrollmentId === window.campaign_enrollment_id);
      return receipt && baseline ? [{ receipt, baselineOrigin: baseline.origin, baselineSourceType: baseline.sourceType, reward }] : [];
    });
    return calculateCampaignCoverage({ campaign, syntheticReceipts: seededReceipts, persistedReceipts });
  }
}
