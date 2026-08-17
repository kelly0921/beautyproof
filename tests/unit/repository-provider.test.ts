import { afterEach, describe, expect, it } from "vitest";
import { persistenceConfiguration } from "../../lib/data/repository-provider";

const original = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

function clearSupabaseEnvironment() {
  const mutableEnvironment = process.env as Partial<NodeJS.ProcessEnv>;
  delete mutableEnvironment.SUPABASE_URL;
  delete mutableEnvironment.NEXT_PUBLIC_SUPABASE_URL;
  delete mutableEnvironment.SUPABASE_SECRET_KEY;
  delete mutableEnvironment.SUPABASE_SERVICE_ROLE_KEY;
}

afterEach(() => {
  clearSupabaseEnvironment();
  for (const [key, value] of Object.entries(original)) {
    if (value !== undefined) process.env[key] = value;
  }
});

describe("persistence configuration", () => {
  it("uses memory only when Supabase is completely unconfigured", () => {
    clearSupabaseEnvironment();
    expect(persistenceConfiguration()).toMatchObject({ mode: "memory", configured: false });
  });

  it("rejects partial Supabase configuration", () => {
    clearSupabaseEnvironment();
    process.env.SUPABASE_URL = "https://project.supabase.co";
    expect(persistenceConfiguration()).toMatchObject({ mode: "invalid", configured: false });
  });

  it("selects durable persistence when URL and server secret are present", () => {
    clearSupabaseEnvironment();
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
    expect(persistenceConfiguration()).toMatchObject({ mode: "supabase", configured: true });
  });
});
