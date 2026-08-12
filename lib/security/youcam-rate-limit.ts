import { getCloudflareContext } from "@opennextjs/cloudflare";

type YouCamRateLimitEnv = CloudflareEnv & {
  YOUCAM_USER_RATE_LIMITER?: RateLimit;
  YOUCAM_SITE_RATE_LIMITER?: RateLimit;
};

function rateLimitResponse(code: "YOUCAM_RATE_LIMITED" | "RATE_LIMIT_UNAVAILABLE", message: string, status: 429 | 503) {
  return Response.json({ ok: false, error: { code, message } }, {
    status,
    headers: { "Cache-Control": "no-store", "Retry-After": "60" },
  });
}

/**
 * Protects the paid YouCam call at the Worker edge. The per-visitor key uses
 * Cloudflare's connecting address because this public prototype has no login
 * identity yet; a second location-wide ceiling limits burst exposure.
 */
export async function rejectRateLimitedYouCamUpload(request: Request) {
  try {
    const { env } = getCloudflareContext();
    const bindings = env as YouCamRateLimitEnv;
    if (!bindings.YOUCAM_USER_RATE_LIMITER || !bindings.YOUCAM_SITE_RATE_LIMITER) {
      return request.headers.has("cf-ray")
        ? rateLimitResponse("RATE_LIMIT_UNAVAILABLE", "Live analysis is temporarily unavailable. Try again shortly.", 503)
        : null;
    }

    const visitorKey = request.headers.get("cf-connecting-ip") ?? "anonymous";
    const visitor = await bindings.YOUCAM_USER_RATE_LIMITER.limit({ key: `youcam-upload:${visitorKey}` });
    if (!visitor.success) {
      return rateLimitResponse("YOUCAM_RATE_LIMITED", "Too many live analyses were requested. Try again in one minute.", 429);
    }
    const site = await bindings.YOUCAM_SITE_RATE_LIMITER.limit({ key: "youcam-upload" });
    if (!site.success) return rateLimitResponse("YOUCAM_RATE_LIMITED", "Live analysis is busy. Try again in one minute.", 429);
    return null;
  } catch {
    // Unit tests and plain Next.js development do not always expose a Worker
    // context. A real Cloudflare request fails closed if its binding is absent.
    if (request.headers.has("cf-ray") || request.headers.has("cf-connecting-ip")) {
      return rateLimitResponse("RATE_LIMIT_UNAVAILABLE", "Live analysis is temporarily unavailable. Try again shortly.", 503);
    }
    return null;
  }
}
