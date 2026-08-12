import { afterEach, describe, expect, it } from "vitest";
import { rejectUnsafeMutation } from "@/lib/security/same-origin";

const persistenceKeys = [
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;
const originalValues = new Map(persistenceKeys.map((key) => [key, process.env[key]]));

function clearPersistenceEnvironment() {
  for (const key of persistenceKeys) delete process.env[key];
}

afterEach(() => {
  for (const key of persistenceKeys) {
    const value = originalValues.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("same-origin mutation protection", () => {
  it("allows local memory-mode integration requests", () => {
    clearPersistenceEnvironment();
    expect(rejectUnsafeMutation(new Request("http://test/api/demo/reset", { method: "POST" }))).toBeNull();
  });

  it("blocks originless mutations when durable persistence is configured", () => {
    clearPersistenceEnvironment();
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "server-secret";
    const response = rejectUnsafeMutation(new Request("https://beautyproof.example/api/demo/reset", { method: "POST" }));
    expect(response?.status).toBe(403);
  });

  it("allows same-origin browser mutations", () => {
    clearPersistenceEnvironment();
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "server-secret";
    const response = rejectUnsafeMutation(new Request("https://beautyproof.example/api/demo/reset", { method: "POST", headers: { origin: "https://beautyproof.example", "sec-fetch-site": "same-origin" } }));
    expect(response).toBeNull();
  });
});
