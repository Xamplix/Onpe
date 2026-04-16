# Diferencia 2° vs 3° — Presidencial Perú 2026 (ONPE)

Calcula en vivo **cuántos votos separan al segundo del tercer candidato** en la
elección presidencial peruana 2026, usando los resultados publicados por la ONPE
en <https://resultadoelectoral.onpe.gob.pe/main/resumen>.

- **Stack**: Next.js 15 (App Router) + TypeScript + Playwright.
- **Entradas**: ninguna. El scraper carga la SPA de la ONPE en un Chromium
  headless e intercepta los JSON que pide el tablero.
- **Salidas**:
  - UI en `/` con la diferencia y el detalle del 2° y 3°.
  - API `GET /api/diferencia` → delta de votos + delta de puntos porcentuales.
  - API `GET /api/resumen` → todos los candidatos ordenados por votos.
  - CLI `pnpm run scrape` → misma info en consola.

## Cómo corre (local)

```bash
pnpm install
pnpm run install:browsers   # baja Chromium (solo la primera vez)
pnpm dev                    # http://localhost:3000
# opcional: calcular una sola vez por CLI
pnpm run scrape
```

El scraper cachea el resultado en memoria por 60 s (configurable con
`ONPE_CACHE_TTL_MS`). Para forzar un refresh: `GET /api/diferencia?force=1`.

## Ejemplo de respuesta

```jsonc
// GET /api/diferencia
{
  "eleccion": "Elecciones Generales 2026 – Presidencial",
  "actasProcesadas": 87.42,
  "obtenidoEn": "2026-04-16T18:02:11.842Z",
  "segundo": {
    "posicion": 2,
    "nombre": "…",
    "organizacion": "…",
    "votos": 2183411,
    "porcentaje": 14.72
  },
  "tercero": {
    "posicion": 3,
    "nombre": "…",
    "organizacion": "…",
    "votos": 1904287,
    "porcentaje": 12.84
  },
  "diferenciaVotos": 279124,
  "diferenciaPorcentaje": 1.88
}
```

## ¿Y por qué Playwright?

La ONPE sirve todo desde una SPA Angular cuyas llamadas XHR usan URLs firmadas
a S3 que cambian entre procesos electorales. En lugar de hardcodear endpoints
que se rompen cada elección, abrimos la página en Chromium headless e
interceptamos las respuestas JSON. La función `extractCandidatos` en
`src/lib/scraper.ts` busca heurísticamente el arreglo que parece contener
candidatos (campos con nombre + organización + votos numéricos), sin depender
del nombre exacto de las propiedades.

Si la ONPE cambia el schema y el scraper deja de encontrar datos, corre:

```bash
pnpm run discover
```

Imprime la lista de endpoints JSON que observó y las claves principales, para
ajustar la heurística en `tryMapCandidato`.

## Estructura

```
src/
├── app/
│   ├── api/
│   │   ├── diferencia/route.ts   GET — delta 2° vs 3°
│   │   └── resumen/route.ts      GET — todos los candidatos
│   ├── layout.tsx
│   └── page.tsx                  UI con la diferencia
├── lib/
│   ├── scraper.ts                Playwright + heurística de extracción
│   ├── diferencia.ts             cálculo del delta
│   ├── cache.ts                  memoria con TTL + dedupe de inflight
│   └── types.ts
└── scripts/
    ├── scrape.ts                 CLI: imprime la diferencia
    └── discover-endpoints.ts     CLI: lista JSONs que pide la SPA
```

## Deploy

El proyecto tiene un `Dockerfile` multi-stage que arranca de
`mcr.microsoft.com/playwright:v1.48.0-jammy` (trae Chromium + libs), compila
Next.js y corre con usuario no-root. **Cualquier plataforma que acepte un
Dockerfile sirve**. Probar localmente:

```bash
docker build -t onpe .
docker run -p 3000:3000 onpe
# http://localhost:3000
```

### Railway (recomendado, 1 clic)

1. <https://railway.app> → **New Project** → **Deploy from GitHub repo**
2. Selecciona `Xamplix/Onpe` y la rama `main` (luego de mergear el PR).
3. Railway detecta el `Dockerfile` solo. Pulsa **Deploy**.
4. En **Settings → Networking → Generate domain** obtienes una URL pública.

No hay que setear variables de entorno (todo funciona con defaults).
Opcional: `ONPE_CACHE_TTL_MS=120000` para cachear 2 min.

### Fly.io

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
fly launch --no-deploy        # acepta los defaults, usa el Dockerfile
fly deploy
```

### Render / Cloud Run / DO App Platform

Mismo Dockerfile, mismo flujo: "Deploy from Git" apuntando a este repo.

> ⚠️ **Vercel no es buena opción** para este servicio: Chromium (~170 MB) no
> entra en los límites del lambda estándar. Se podría adaptar con
> `@sparticuz/chromium-min` + `playwright-core`, pero complica el código. Con
> Docker todo Just Works.

## Notas

- `/api/*` está marcado como `dynamic = "force-dynamic"` — los datos cambian
  minuto a minuto durante el conteo, no queremos cachear en el edge.
- El cache en memoria de 60 s vive por instancia. Si escalas a varios pods
  habrá divergencia temporal breve entre réplicas; para algo así tan ligero
  es aceptable.
