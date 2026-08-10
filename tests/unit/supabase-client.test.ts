import { describe, expect, it, vi } from "vitest";
import { createSupabaseServerFetch } from "../../lib/data/supabase-repository";

function recordingFetch() {
  const requests: Headers[] = [];
  const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    requests.push(new Headers(init?.headers));
    return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return { fetchImpl, requests };
}

describe("Supabase server key transport", () => {
  it("keeps an opaque secret key in apikey and removes its Bearer fallback", async () => {
    const secretKey = "sb_secret_example";
    const { fetchImpl, requests } = recordingFetch();
    const serverFetch = createSupabaseServerFetch(secretKey, fetchImpl);

    await serverFetch("https://example.supabase.co/rest/v1/proof_campaign", {
      headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
    });

    expect(requests[0].get("apikey")).toBe(secretKey);
    expect(requests[0].get("Authorization")).toBeNull();
  });

  it("preserves a real user-session JWT", async () => {
    const secretKey = "sb_secret_example";
    const { fetchImpl, requests } = recordingFetch();
    const serverFetch = createSupabaseServerFetch(secretKey, fetchImpl);

    await serverFetch("https://example.supabase.co/rest/v1/proof_campaign", {
      headers: { apikey: secretKey, Authorization: "Bearer eyJ.user-session" },
    });

    expect(requests[0].get("Authorization")).toBe("Bearer eyJ.user-session");
  });

  it("preserves the legacy service-role JWT fallback", async () => {
    const serviceRoleKey = "eyJ.legacy-service-role";
    const { fetchImpl, requests } = recordingFetch();
    const serverFetch = createSupabaseServerFetch(serviceRoleKey, fetchImpl);

    await serverFetch("https://example.supabase.co/rest/v1/proof_campaign", {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });

    expect(requests[0].get("Authorization")).toBe(`Bearer ${serviceRoleKey}`);
  });
});
