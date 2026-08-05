import { getRepository, persistenceConfiguration } from "@/lib/data/repository-provider";

export const dynamic = "force-dynamic";

export async function GET() {
  const configuration = persistenceConfiguration();
  if (configuration.mode === "invalid") {
    return Response.json({ ok: false, data: { persistence: configuration, youcamConfigured: Boolean(process.env.YOUCAM_API_KEY) } }, { status: 503 });
  }
  try {
    const repository = getRepository();
    const coverage = await repository.coverage();
    return Response.json({
      ok: true,
      data: {
        persistence: { ...configuration, activeMode: repository.mode, durable: repository.mode === "supabase" },
        youcamConfigured: Boolean(process.env.YOUCAM_API_KEY),
        records: coverage,
      },
    });
  } catch (error) {
    return Response.json({
      ok: false,
      data: { persistence: configuration, youcamConfigured: Boolean(process.env.YOUCAM_API_KEY) },
      error: { message: error instanceof Error ? error.message : "Persistence health check failed." },
    }, { status: 503 });
  }
}
