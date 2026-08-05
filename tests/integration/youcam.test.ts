import { describe, expect, it } from "vitest";
import baseline from "../../lib/youcam/fixtures/baseline.json";
import { parseYouCamResult } from "../../lib/youcam/parser";
import { buildTaskPayload } from "../../lib/youcam/service";
import type { YouCamTaskResponse } from "../../lib/youcam/types";
import { readImageDimensions, validateHdImage } from "../../lib/validation/image";

describe("YouCam server boundary", () => {
  it("constructs an HD-only JSON task", () => {
    expect(buildTaskPayload("file-1")).toEqual({
      src_file_id: "file-1",
      dst_actions: ["hd_moisture", "hd_redness", "hd_texture", "hd_oiliness"],
      miniserver_args: { enable_mask_overlay: true },
      format: "json",
      pf_camera_kit: false,
    });
  });

  it("parses raw scores separately from ui scores", () => {
    const result = parseYouCamResult(baseline as YouCamTaskResponse);
    expect(result.metrics.hd_moisture).toBe(54.2);
    expect(result.uiScores.hd_moisture).toBe(71);
    expect(result.metrics.hd_moisture).not.toBe(result.uiScores.hd_moisture);
  });

  it("reads PNG dimensions and enforces the HD short side", () => {
    const bytes = new Uint8Array(24);
    bytes.set([0x89, 0x50, 0x4e, 0x47], 0);
    const view = new DataView(bytes.buffer);
    view.setUint32(16, 1600); view.setUint32(20, 1200);
    expect(readImageDimensions(bytes, "image/png")).toEqual({ width: 1600, height: 1200 });
    expect(validateHdImage({ type: "image/png", size: bytes.length }, bytes).valid).toBe(true);
    view.setUint32(20, 900);
    expect(validateHdImage({ type: "image/png", size: bytes.length }, bytes)).toMatchObject({ valid: false, code: "IMAGE_TOO_SMALL" });
  });
});
