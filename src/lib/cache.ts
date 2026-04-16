import type { Resumen } from "./types";
import { scrapeResumenPresidencial } from "./scraper";

const TTL_MS = Number(process.env.ONPE_CACHE_TTL_MS ?? 60_000);

let cached: { at: number; value: Resumen } | null = null;
let inflight: Promise<Resumen> | null = null;

/**
 * Obtiene el resumen presidencial con cache en memoria (TTL configurable via
 * `ONPE_CACHE_TTL_MS`, por defecto 60s). Deduplica requests concurrentes para
 * que múltiples hits a la API no disparen varios scrapes simultáneos.
 */
export async function getResumenCached(force = false): Promise<Resumen> {
  const now = Date.now();
  if (!force && cached && now - cached.at < TTL_MS) {
    return cached.value;
  }
  if (inflight) return inflight;
  inflight = scrapeResumenPresidencial()
    .then((value) => {
      cached = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
