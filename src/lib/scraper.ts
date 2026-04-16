import { chromium, type Browser, type Response } from "playwright-core";
import type { Candidato, Resumen } from "./types";

const ONPE_URL = "https://resultadoelectoral.onpe.gob.pe/main/resumen";
const NAV_TIMEOUT_MS = 45_000;
const COLLECT_WINDOW_MS = 8_000;

/**
 * Arranca Chromium tomando la mejor ruta disponible para el entorno:
 *
 * - AWS Lambda / Vercel → binario reducido de `@sparticuz/chromium`.
 * - Local / Docker      → el Chromium instalado por `playwright install`
 *                         o el que trae la imagen `mcr.microsoft.com/playwright`.
 * - Override manual     → `CHROMIUM_EXECUTABLE_PATH` gana siempre.
 */
async function launchBrowser(): Promise<Browser> {
  const override = process.env.CHROMIUM_EXECUTABLE_PATH;
  if (override) {
    return chromium.launch({
      headless: true,
      executablePath: override,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  }

  const isLambda = Boolean(
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.VERCEL ||
      process.env.NETLIFY,
  );
  if (isLambda) {
    const mod = await import("@sparticuz/chromium");
    const sparticuz = (mod as { default?: typeof mod }).default ?? mod;
    return chromium.launch({
      headless: true,
      executablePath: await sparticuz.executablePath(),
      args: sparticuz.args,
    });
  }

  return chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
}

/**
 * Lanza un Chromium headless, visita el tablero de resultados de la ONPE y
 * captura todas las respuestas JSON emitidas por la SPA. De ese conjunto
 * extrae el primer payload que tenga pinta de contener el listado presidencial
 * y lo normaliza al tipo `Resumen`.
 *
 * La ONPE cambia los hashes de bundle y los nombres de campos entre procesos
 * electorales, por lo que la extracción se basa en heurísticas resilientes
 * (buscar campos con votos numéricos + nombre + organización) en lugar de un
 * endpoint hardcodeado.
 */
export async function scrapeResumenPresidencial(): Promise<Resumen> {
  let browser: Browser | undefined;
  try {
    browser = await launchBrowser();
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 900 },
    });
    const page = await context.newPage();

    const jsonResponses: Array<{ url: string; body: unknown }> = [];
    page.on("response", async (response: Response) => {
      try {
        const headers = response.headers();
        const ctype = headers["content-type"] ?? "";
        if (!ctype.includes("json")) return;
        const url = response.url();
        // Ignorar telemetría / Google.
        if (/googletagmanager|google-analytics|doubleclick|gstatic/.test(url)) return;
        const body = await response.json().catch(() => null);
        if (body != null) jsonResponses.push({ url, body });
      } catch {
        /* respuesta abortada o binaria — ignorar */
      }
    });

    await page.goto(ONPE_URL, {
      waitUntil: "networkidle",
      timeout: NAV_TIMEOUT_MS,
    });
    // Dar tiempo a que los widgets carguen datos diferidos.
    await page.waitForTimeout(COLLECT_WINDOW_MS);

    const resumen = pickPresidentialPayload(jsonResponses);
    if (!resumen) {
      const urls = jsonResponses.map((r) => r.url).join("\n  ");
      throw new Error(
        `No se encontró un JSON con candidatos presidenciales. Respuestas observadas:\n  ${urls}`,
      );
    }
    return resumen;
  } finally {
    await browser?.close();
  }
}

/* ---------------------------------------------------------------- heurística */

function pickPresidentialPayload(
  responses: Array<{ url: string; body: unknown }>,
): Resumen | null {
  for (const { url, body } of responses) {
    const candidatos = extractCandidatos(body);
    if (candidatos && candidatos.length >= 3) {
      return {
        eleccion: guessEleccionLabel(url, body),
        actasProcesadas: guessActas(body),
        obtenidoEn: new Date().toISOString(),
        candidatos,
      };
    }
  }
  return null;
}

/** Recorre el JSON buscando un arreglo cuyos elementos parezcan candidatos. */
function extractCandidatos(body: unknown): Candidato[] | null {
  const found: Candidato[] = [];
  walk(body, (node) => {
    if (!Array.isArray(node)) return;
    if (node.length < 2) return;
    const mapped = node
      .map(tryMapCandidato)
      .filter((c): c is Candidato => c != null);
    if (mapped.length >= Math.min(node.length, 3) && mapped.length > found.length) {
      found.length = 0;
      found.push(...mapped);
    }
  });
  if (found.length === 0) return null;
  return found
    .sort((a, b) => b.votos - a.votos)
    .map((c, i) => ({ ...c, posicion: i + 1 }));
}

function tryMapCandidato(raw: unknown): Candidato | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const nombre = pickString(r, [
    "candidato",
    "nombreCandidato",
    "nomCandidato",
    "nombre",
    "nombres",
    "desCandidato",
  ]);
  const organizacion = pickString(r, [
    "organizacion",
    "organizacionPolitica",
    "partido",
    "agrupacion",
    "desOrganizacion",
    "desOrgPol",
    "nombreOrganizacion",
  ]);
  const votos = pickNumber(r, [
    "votos",
    "votosValidos",
    "totalVotos",
    "cantVotos",
    "votos_emitidos",
    "votosEmitidos",
  ]);
  const porcentaje = pickNumber(r, [
    "porcentaje",
    "porcentajeVotos",
    "porValidos",
    "porcValidos",
    "porc",
    "pctg",
  ]);

  if (!nombre || !organizacion) return null;
  if (votos == null) return null;

  return {
    posicion: 0, // se recalcula al ordenar
    nombre,
    organizacion,
    votos,
    porcentaje: porcentaje ?? 0,
  };
}

function guessEleccionLabel(url: string, body: unknown): string {
  const fromBody = pickDeep(body, [
    "descripcionEleccion",
    "nombreProceso",
    "proceso",
    "eleccion",
    "tipoEleccion",
  ]);
  if (typeof fromBody === "string" && fromBody.length > 0) return fromBody;
  if (/2026/.test(url)) return "Elecciones Generales 2026 – Presidencial";
  return "Elecciones Presidenciales – ONPE";
}

function guessActas(body: unknown): number {
  const v = pickDeep(body, [
    "actasProcesadas",
    "porcActasProcesadas",
    "porActasProcesadas",
    "pctgActas",
    "porcActas",
  ]);
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v.replace("%", "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/* ------------------------------------------------------------------ utiles */

function walk(node: unknown, visit: (n: unknown) => void): void {
  visit(node);
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
  } else if (node && typeof node === "object") {
    for (const child of Object.values(node as Record<string, unknown>)) {
      walk(child, visit);
    }
  }
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = findCaseInsensitive(obj, k);
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = findCaseInsensitive(obj, k);
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number.parseFloat(v.replace(/[\s,%]/g, "").replace(",", "."));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function findCaseInsensitive(obj: Record<string, unknown>, key: string): unknown {
  const target = key.toLowerCase();
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase() === target) return obj[k];
  }
  return undefined;
}

function pickDeep(body: unknown, keys: string[]): unknown {
  let result: unknown;
  walk(body, (node) => {
    if (result !== undefined) return;
    if (node && typeof node === "object" && !Array.isArray(node)) {
      const v = pickString(node as Record<string, unknown>, keys);
      if (v) {
        result = v;
        return;
      }
      const n = pickNumber(node as Record<string, unknown>, keys);
      if (n != null) result = n;
    }
  });
  return result;
}
