import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Resumen } from "./types";

const DATA_PATH = join(process.cwd(), "data", "results.json");

/**
 * Lee el snapshot estático `data/results.json`. Este archivo se genera
 * localmente con `npm run scrape` (Playwright + Chromium) y se commitea
 * al repo para que Netlify/Vercel lo sirva como dato estático.
 *
 * Retorna null si el archivo no existe todavía.
 */
export function loadResumen(): Resumen | null {
  try {
    const raw = readFileSync(DATA_PATH, "utf-8");
    return JSON.parse(raw) as Resumen;
  } catch {
    return null;
  }
}
