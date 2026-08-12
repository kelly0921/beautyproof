function durablePersistenceConfigured() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url && key);
}

function configuredAppOrigin() {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  if (!value) return null;
  try { return new URL(value).origin; } catch { return null; }
}

export function rejectUnsafeMutation(request: Request) {
  if (!durablePersistenceConfigured()) return null;
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const allowedOrigins = new Set([requestOrigin, configuredAppOrigin()].filter((value): value is string => Boolean(value)));
  const sameSite = !fetchSite || fetchSite === "same-origin" || fetchSite === "same-site" || fetchSite === "none";

  if (origin && allowedOrigins.has(origin) && sameSite) return null;
  return Response.json({
    ok: false,
    error: {
      code: "UNSAFE_MUTATION_ORIGIN",
      message: "Open BeautyProof in the app before performing this action.",
    },
  }, { status: 403, headers: { "Cache-Control": "no-store" } });
}
