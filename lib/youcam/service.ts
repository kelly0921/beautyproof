import { heroActions, type YouCamTaskResponse } from "./types";
import { parseYouCamResult } from "./parser";

const defaultBaseUrl = "https://yce-api-01.makeupar.com/s2s/v2.1";

export class YouCamServiceError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 502) { super(message); }
}

interface FileInitResponse {
  status: number;
  data?: { files?: { file_id: string; requests: { method: string; url: string; headers?: Record<string, string> }[] }[] };
  error_code?: string;
  error?: string;
}

interface TaskInitResponse {
  status: number;
  data?: { task_id?: string };
  error_code?: string;
  error?: string;
}

export function buildTaskPayload(fileId: string) {
  return {
    src_file_id: fileId,
    dst_actions: [...heroActions],
    miniserver_args: { enable_mask_overlay: true },
    format: "json" as const,
    pf_camera_kit: false,
  };
}

export class YouCamSkinAnalysisService {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: { apiKey?: string; baseUrl?: string } = {}) {
    this.apiKey = options.apiKey ?? process.env.YOUCAM_API_KEY ?? "";
    this.baseUrl = options.baseUrl ?? defaultBaseUrl;
    if (!this.apiKey) throw new YouCamServiceError("MISSING_CREDENTIAL", "YOUCAM_API_KEY is not configured.", 503);
  }

  private headers() { return { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" }; }

  async initializeUpload(file: File) {
    const response = await fetch(`${this.baseUrl}/file/skin-analysis`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ files: [{ content_type: file.type, file_name: file.name, file_size: file.size }] }),
    });
    const payload = (await response.json()) as FileInitResponse;
    const initialized = payload.data?.files?.[0];
    const request = initialized?.requests?.[0];
    if (!response.ok || !initialized?.file_id || !request?.url) throw new YouCamServiceError(payload.error_code ?? "FILE_INIT_FAILED", payload.error ?? "YouCam file initialization failed.", response.status);
    return { fileId: initialized.file_id, uploadRequest: request };
  }

  async uploadBytes(file: File, uploadRequest: { method: string; url: string; headers?: Record<string, string> }) {
    const headers = new Headers(uploadRequest.headers);
    headers.set("Content-Type", file.type);
    headers.set("Content-Length", String(file.size));
    const response = await fetch(uploadRequest.url, { method: uploadRequest.method || "PUT", headers, body: await file.arrayBuffer() });
    if (!response.ok) throw new YouCamServiceError("PRESIGNED_UPLOAD_FAILED", "The image could not be uploaded to the YouCam destination.", response.status);
  }

  async createTask(fileId: string) {
    const response = await fetch(`${this.baseUrl}/task/skin-analysis`, { method: "POST", headers: this.headers(), body: JSON.stringify(buildTaskPayload(fileId)) });
    const payload = (await response.json()) as TaskInitResponse;
    const taskId = payload.data?.task_id;
    if (!response.ok || !taskId) throw new YouCamServiceError(payload.error_code ?? "TASK_CREATE_FAILED", payload.error ?? "YouCam task creation failed.", response.status);
    return taskId;
  }

  async getTask(taskId: string) {
    const response = await fetch(`${this.baseUrl}/task/skin-analysis/${encodeURIComponent(taskId)}`, { headers: { Authorization: `Bearer ${this.apiKey}` } });
    const payload = (await response.json()) as YouCamTaskResponse;
    if (!response.ok) throw new YouCamServiceError(payload.data?.error_code ?? "TASK_STATUS_FAILED", payload.data?.error ?? "YouCam task status request failed.", response.status);
    return payload;
  }

  async pollTask(taskId: string, options: { timeoutMs?: number; intervalMs?: number } = {}) {
    const timeoutMs = options.timeoutMs ?? 75_000;
    const fallbackInterval = options.intervalMs ?? 1_800;
    const started = Date.now();
    let networkRetries = 0;
    while (Date.now() - started < timeoutMs) {
      try {
        const task = await this.getTask(taskId);
        if (task.data.task_status === "success") return parseYouCamResult(task);
        if (task.data.task_status === "error") throw new YouCamServiceError(task.data.error_code ?? "TASK_ERROR", task.data.error ?? "YouCam could not process this image.");
        networkRetries = 0;
        await new Promise((resolve) => setTimeout(resolve, Math.max(800, (task.data.polling_interval ?? fallbackInterval / 1000) * 1000)));
      } catch (error) {
        if (error instanceof YouCamServiceError && error.code === "TASK_ERROR") throw error;
        networkRetries += 1;
        if (networkRetries > 2) throw error;
        await new Promise((resolve) => setTimeout(resolve, fallbackInterval * networkRetries));
      }
    }
    throw new YouCamServiceError("POLL_TIMEOUT", "YouCam analysis did not finish within the allowed demo polling window.", 504);
  }

  async analyze(file: File) {
    const initialized = await this.initializeUpload(file);
    await this.uploadBytes(file, initialized.uploadRequest);
    const taskId = await this.createTask(initialized.fileId);
    const result = await this.pollTask(taskId);
    return { taskId, result };
  }
}
