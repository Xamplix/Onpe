import { getResultados } from "@/lib/onpe";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getResultados();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("Error fetching ONPE:", error);
    return NextResponse.json(
      { error: "Error al obtener datos de la ONPE" },
      { status: 502 }
    );
  }
}
