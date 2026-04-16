import { NextResponse } from "next/server";
import { loadResumen } from "@/lib/data";

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
  return NextResponse.json(resumen, {
    headers: { "cache-control": "no-store" },
  });
}
