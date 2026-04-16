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

El código detecta en runtime dónde está corriendo y elige el Chromium
adecuado:

| Entorno | Binario usado |
|---------|--------------|
| Vercel / AWS Lambda | `@sparticuz/chromium` (~30 MB, cabe en el lambda) |
| Docker / VPS        | Chromium de la imagen `mcr.microsoft.com/playwright` |
| Local               | el que bajó `npx playwright install chromium` |
| Override            | `CHROMIUM_EXECUTABLE_PATH` (gana siempre) |

### Netlify (1 clic)

1. <https://app.netlify.com/start> → **Import from Git** → `Xamplix/Onpe`.
2. Netlify detecta Next.js automáticamente. El `netlify.toml` del repo ya
   pide 1024 MB + 26 s de timeout y fuerza a que `@sparticuz/chromium` se
   incluya en el bundle del lambda.
3. Deploy.

> ⚠️ **Plan Free de Netlify tiene 10 s de timeout** y Chromium tarda ~3 s en
> arrancar en cold start + otro tanto en navegar la SPA. Si estás en Free y
> el endpoint da 504, necesitas Pro (26 s) o un deploy en Railway/Fly.

Variables opcionales que puedes setear en **Site settings → Environment**:

| Variable | Default | Para qué |
|----------|---------|----------|
| `ONPE_CACHE_TTL_MS` | `60000` | cache en memoria por request |
| `ONPE_NAV_TIMEOUT_MS` | `15000` | timeout del `page.goto` |
| `ONPE_COLLECT_MS` | `4000` | ventana para capturar XHR JSON |

### Vercel (1 clic)

1. <https://vercel.com/new> → **Import Git Repository** → `Xamplix/Onpe`.
2. `vercel.json` ya pide 1024 MB + 60 s de timeout.
3. Deploy.

Tras mergear el PR, Vercel/Netlify auto-redespliega. La primera llamada
tarda ~5 s (cold start bajando Chromium a `/tmp`); las siguientes son
instantáneas mientras el lambda esté caliente.

### Railway / Fly / Render (Docker)

Incluye `Dockerfile` multi-stage basado en
`mcr.microsoft.com/playwright:v1.48.0-jammy` (Chromium + libs pre-instalados,
usuario no-root). Probar localmente:

```bash
docker build -t onpe .
docker run -p 3000:3000 onpe
```

- **Railway**: *New Project → Deploy from GitHub repo →* selecciona `Xamplix/Onpe`.
  Detecta el Dockerfile solo.
- **Fly.io**: `fly launch --no-deploy && fly deploy`.
- **Render / Cloud Run / DO App Platform**: deploy from Git con el Dockerfile.

## Notas

- `/api/*` está marcado como `dynamic = "force-dynamic"` — los datos cambian
  minuto a minuto durante el conteo, no queremos cachear en el edge.
- El cache en memoria de 60 s vive por instancia. Si escalas a varios pods
  habrá divergencia temporal breve entre réplicas; para algo así tan ligero
  es aceptable.
