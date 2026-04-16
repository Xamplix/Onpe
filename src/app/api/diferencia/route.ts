import { NextResponse } from "next/server";
import { getResumenCached } from "@/lib/cache";
import { calcularDiferencia } from "@/lib/diferencia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("force") === "1";
  try {
    const resumen = await getResumenCached(force);
    const diff = calcularDiferencia(resumen);
    return NextResponse.json(diff, {
      headers: { "cache-control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
