import { getResumenCached } from "@/lib/cache";
import { calcularDiferencia } from "@/lib/diferencia";
import type { DiferenciaSegundoTercero } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const fmtInt = new Intl.NumberFormat("es-PE");
const fmtPct = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

export default async function Home() {
  let diff: DiferenciaSegundoTercero | null = null;
  let error: string | null = null;
  try {
    const resumen = await getResumenCached();
    diff = calcularDiferencia(resumen);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <main
      style={{
        maxWidth: 780,
        margin: "0 auto",
        padding: "48px 20px 80px",
      }}
    >
      <header style={{ marginBottom: 32 }}>
        <p
          style={{
            textTransform: "uppercase",
            letterSpacing: 2,
            color: "#8ea0ff",
            fontSize: 12,
            margin: 0,
          }}
        >
          ONPE · Presidencial 2026
        </p>
        <h1 style={{ fontSize: 36, margin: "8px 0 4px", lineHeight: 1.15 }}>
          Diferencia entre el 2° y el 3° lugar
        </h1>
        <p style={{ color: "#b5bfe2", margin: 0 }}>
          Datos tomados en vivo de{" "}
          <a
            href="https://resultadoelectoral.onpe.gob.pe/main/resumen"
            style={{ color: "#abc7ff" }}
          >
            resultadoelectoral.onpe.gob.pe
          </a>
        </p>
      </header>

      {error && <ErrorCard message={error} />}

      {diff && (
        <>
          <DiffCard diff={diff} />
          <CandidatoRow label="2° lugar" candidato={diff.segundo} color="#7dd3fc" />
          <CandidatoRow label="3° lugar" candidato={diff.tercero} color="#fbbf24" />

          <footer style={{ marginTop: 32, color: "#8190b8", fontSize: 13 }}>
            <div>Actas procesadas: {fmtPct.format(diff.actasProcesadas)}%</div>
            <div>Muestra tomada: {new Date(diff.obtenidoEn).toLocaleString("es-PE")}</div>
            <div style={{ marginTop: 12 }}>
              API JSON:{" "}
              <a href="/api/diferencia" style={{ color: "#abc7ff" }}>
                /api/diferencia
              </a>{" "}
              ·{" "}
              <a href="/api/resumen" style={{ color: "#abc7ff" }}>
                /api/resumen
              </a>
            </div>
          </footer>
        </>
      )}
    </main>
  );
}

function DiffCard({ diff }: { diff: DiferenciaSegundoTercero }) {
  return (
    <section
      style={{
        background: "linear-gradient(135deg,#1a2248,#2a1a4a)",
        borderRadius: 16,
        padding: "28px 24px",
        marginBottom: 24,
        boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ color: "#b5bfe2", fontSize: 13 }}>Diferencia de votos</div>
      <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -1 }}>
        {fmtInt.format(diff.diferenciaVotos)}
      </div>
      <div style={{ color: "#cbd5ff", marginTop: 4 }}>
        {fmtPct.format(diff.diferenciaPorcentaje)} puntos porcentuales
      </div>
    </section>
  );
}

function CandidatoRow({
  label,
  candidato,
  color,
}: {
  label: string;
  candidato: DiferenciaSegundoTercero["segundo"];
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "16px 20px",
        background: "#141a35",
        borderLeft: `4px solid ${color}`,
        borderRadius: 10,
        marginBottom: 10,
      }}
    >
      <div>
        <div style={{ fontSize: 12, color: "#8ea0ff", textTransform: "uppercase" }}>
          {label}
        </div>
        <div style={{ fontWeight: 600, fontSize: 18 }}>{candidato.nombre}</div>
        <div style={{ color: "#b5bfe2", fontSize: 13 }}>{candidato.organizacion}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>
          {fmtInt.format(candidato.votos)}
        </div>
        <div style={{ color: "#b5bfe2", fontSize: 13 }}>
          {fmtPct.format(candidato.porcentaje)}%
        </div>
      </div>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <section
      style={{
        background: "#3b1220",
        border: "1px solid #7f1d2d",
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8 }}>
        No se pudieron obtener los datos de la ONPE
      </div>
      <code
        style={{
          display: "block",
          whiteSpace: "pre-wrap",
          color: "#fecaca",
          fontSize: 12,
        }}
      >
        {message}
      </code>
      <p style={{ color: "#fca5a5", marginTop: 12, marginBottom: 0, fontSize: 13 }}>
        Probablemente la SPA de ONPE todavía no publicó resultados, o cambió la
        estructura del JSON. Corre <code>pnpm run discover</code> para ver qué
        endpoints está pidiendo hoy.
      </p>
    </section>
  );
}
