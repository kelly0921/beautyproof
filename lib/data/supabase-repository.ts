import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Experience, MetricVector, ProofReceiptRecord, SkinAnalysis } from "../domain";
import type { BeautyProofRepository, ProofWindowRecord } from "./repository";

export const demoUserId = "00000000-0000-4000-8000-000000000026";

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
      global: { headers: { "x-application-name": "beautyproof" } },
    });
  }

  async reset() {
    const windowsResult = await this.client.from("proof_window").select("id").eq("user_id", demoUserId);
    assertNoError(windowsResult.error, "list demo windows for reset");
    const windowIds = (windowsResult.data ?? []).map((row) => row.id as string);
    if (windowIds.length) {
      const receiptResult = await this.client.from("proof_receipt").delete().in("proof_window_id", windowIds);
      assertNoError(receiptResult.error, "delete demo receipts");
      const checkInResult = await this.client.from("check_in").delete().in("proof_window_id", windowIds);
      assertNoError(checkInResult.error, "delete demo check-ins");
    }
    const windowResult = await this.client.from("proof_window").delete().eq("user_id", demoUserId);
    assertNoError(windowResult.error, "delete demo windows");
    const analysisResult = await this.client.from("skin_analysis").delete().eq("user_id", demoUserId);
    assertNoError(analysisResult.error, "delete demo analyses");
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

  async saveReceipt(input: Omit<ProofReceiptRecord, "id" | "createdAt" | "consentToAggregate">) {
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
}
