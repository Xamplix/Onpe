import { NextResponse } from "next/server";
import { loadResumen } from "@/lib/data";
import { calcularDiferencia } from "@/lib/diferencia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const resumen = loadResumen();
  if (!resumen) {
    return NextResponse.json(
      {
        error:
          "No hay datos todavía. Corre 'npm run scrape' localmente para generar data/results.json y haz push.",
      },
      { status: 503 },
    );
  }
  try {
    const diff = calcularDiferencia(resumen);
    return NextResponse.json(diff, {
      headers: { "cache-control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
