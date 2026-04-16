const ONPE_BASE = "https://resultadoelectoral.onpe.gob.pe/presentacion-backend";

const HEADERS = {
  "sec-fetch-site": "same-origin",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
};

export interface Candidato {
  nombreAgrupacionPolitica: string;
  codigoAgrupacionPolitica: number;
  nombreCandidato: string;
  dniCandidato: string;
  totalVotosValidos: number;
  porcentajeVotosValidos: number;
  porcentajeVotosEmitidos: number;
}

export interface Totales {
  actasContabilizadas: number;
  contabilizadas: number;
  totalActas: number;
  participacionCiudadana: number;
  fechaActualizacion: number;
  totalVotosEmitidos: number;
  totalVotosValidos: number;
}

export interface ResultadosPresidenciales {
  candidatos: Candidato[];
  totales: Totales;
  segundo: Candidato;
  tercero: Candidato;
  diferenciaVotos: number;
  diferenciaPorcentaje: number;
  fechaActualizacion: string;
}

async function fetchOnpe<T>(path: string): Promise<T> {
  const res = await fetch(`${ONPE_BASE}/${path}`, { headers: HEADERS, next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`ONPE ${path}: ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(`ONPE ${path}: success=false`);
  return json.data;
}

export async function getResultados(): Promise<ResultadosPresidenciales> {
  const [candidatos, totales] = await Promise.all([
    fetchOnpe<Candidato[]>(
      "resumen-general/participantes?idEleccion=10&tipoFiltro=eleccion"
    ),
    fetchOnpe<Totales>(
      "resumen-general/totales?idEleccion=10&tipoFiltro=eleccion"
    ),
  ]);

  const sorted = [...candidatos].sort(
    (a, b) => b.totalVotosValidos - a.totalVotosValidos
  );

  const segundo = sorted[1];
  const tercero = sorted[2];

  const fecha = new Date(totales.fechaActualizacion);
  const fechaActualizacion = fecha.toLocaleString("es-PE", {
    timeZone: "America/Lima",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return {
    candidatos: sorted,
    totales,
    segundo,
    tercero,
    diferenciaVotos: segundo.totalVotosValidos - tercero.totalVotosValidos,
    diferenciaPorcentaje:
      Math.round(
        (segundo.porcentajeVotosValidos - tercero.porcentajeVotosValidos) * 1000
      ) / 1000,
    fechaActualizacion,
  };
}
