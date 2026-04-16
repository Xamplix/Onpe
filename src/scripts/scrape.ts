/**
 * CLI: imprime por stdout la diferencia de votos 2° vs 3° presidencial.
 *
 *   npx tsx src/scripts/scrape.ts
 */
import { scrapeResumenPresidencial } from "../lib/scraper";
import { calcularDiferencia } from "../lib/diferencia";

async function main() {
  const resumen = await scrapeResumenPresidencial();
  const diff = calcularDiferencia(resumen);
  const fmt = new Intl.NumberFormat("es-PE");
  console.log(`\n=== ${resumen.eleccion} ===`);
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
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
