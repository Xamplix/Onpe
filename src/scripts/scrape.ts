/**
 * CLI: scrapea la ONPE con Playwright (necesita Chromium local), calcula la
 * diferencia 2° vs 3° y guarda el resultado en data/results.json.
 *
 * Uso:
 *   npx tsx src/scripts/scrape.ts
 *   npm run scrape
 *
 * Después de correrlo: git add data/results.json && git commit && git push
 * para que Netlify lo recoja en el siguiente build.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { scrapeResumenPresidencial } from "../lib/scraper";
import { calcularDiferencia } from "../lib/diferencia";

const OUT_DIR = join(process.cwd(), "data");
const OUT_PATH = join(OUT_DIR, "results.json");

async function main() {
  console.log("Scrapeando ONPE...\n");
  const resumen = await scrapeResumenPresidencial();
  const diff = calcularDiferencia(resumen);
  const fmt = new Intl.NumberFormat("es-PE");

  console.log(`=== ${resumen.eleccion} ===`);
  console.log(`Actas procesadas: ${resumen.actasProcesadas}%`);
  console.log(`Muestra: ${resumen.obtenidoEn}\n`);
  console.log(
    `2° ${diff.segundo.nombre} (${diff.segundo.organizacion})`,
    `— ${fmt.format(diff.segundo.votos)} votos — ${diff.segundo.porcentaje}%`,
  );
  console.log(
    `3° ${diff.tercero.nombre} (${diff.tercero.organizacion})`,
    `— ${fmt.format(diff.tercero.votos)} votos — ${diff.tercero.porcentaje}%`,
  );
  console.log(
    `\nΔ votos: ${fmt.format(diff.diferenciaVotos)}`,
    `  ·  Δ puntos: ${diff.diferenciaPorcentaje}`,
  );

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(resumen, null, 2) + "\n");
  console.log(`\nGuardado en ${OUT_PATH}`);
  console.log("Ahora haz: git add data/results.json && git commit -m 'update data' && git push");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
