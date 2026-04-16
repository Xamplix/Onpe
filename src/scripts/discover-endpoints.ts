/**
 * Utilidad de debugging: abre la SPA de la ONPE y lista todas las respuestas
 * JSON que observó (URL + tamaño + primeras claves). Útil cuando la heurística
 * del scraper deja de encontrar candidatos porque la ONPE cambió el schema.
 *
 *   npx tsx src/scripts/discover-endpoints.ts
 */
import { chromium } from "playwright";

const URL_ONPE = "https://resultadoelectoral.onpe.gob.pe/main/resumen";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  const hits: Array<{ url: string; keys: string[]; size: number }> = [];

  page.on("response", async (res) => {
    const ct = res.headers()["content-type"] ?? "";
    if (!ct.includes("json")) return;
    try {
      const text = await res.text();
      let keys: string[] = [];
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          keys = Object.keys(parsed).slice(0, 10);
        } else if (Array.isArray(parsed)) {
          keys = [`array[${parsed.length}]`];
        }
      } catch {
        /* ignore */
      }
      hits.push({ url: res.url(), keys, size: text.length });
    } catch {
      /* ignore */
    }
  });

  await page.goto(URL_ONPE, { waitUntil: "networkidle", timeout: 45_000 });
  await page.waitForTimeout(8_000);
  await browser.close();

  console.log(`\nRespuestas JSON observadas (${hits.length}):\n`);
  for (const h of hits) {
    console.log(`• ${h.url}`);
    console.log(`    bytes=${h.size}  keys=${h.keys.join(", ") || "-"}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
