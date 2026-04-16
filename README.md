# Diferencia 2° vs 3° — Presidencial Perú 2026 (ONPE)

Muestra **cuántos votos separan al segundo del tercer candidato** en la
elección presidencial peruana 2026, usando los resultados publicados por la
ONPE en <https://resultadoelectoral.onpe.gob.pe/main/resumen>.

## Arquitectura

El scraping y el serving están separados:

1. **Scraper** (corre en tu máquina): Playwright abre la SPA Angular de la
   ONPE en Chromium headless, intercepta los JSON, y guarda el resultado en
   `data/results.json`.
2. **App** (Netlify/Vercel/cualquier host): lee `data/results.json` como
   dato estático. Cero Chromium, cero Playwright en producción.

Así funciona en **cualquier** plataforma sin importar límites de lambda,
timeouts o tamaño de bundle.

## Cómo corre

```bash
npm install
npm run install:browsers   # baja Chromium (solo la primera vez)

# 1. Scrapear datos frescos de la ONPE
npm run scrape             # genera data/results.json

# 2. Levantar la app
npm run dev                # http://localhost:3000
```

Para actualizar los datos en producción:

```bash
npm run scrape
git add data/results.json
git commit -m "update: datos ONPE $(date -I)"
git push
# → Netlify redespliega automáticamente (~30 s)
```

## Endpoints

| Ruta | Descripción |
|------|-------------|
| `/` | UI con la diferencia 2° vs 3° |
| `/api/diferencia` | JSON: `{diferenciaVotos, diferenciaPorcentaje, segundo, tercero}` |
| `/api/resumen` | JSON: todos los candidatos ordenados por votos |

## Estructura

```
data/
└── results.json               ← generado por el scraper, se commitea al repo
src/
├── app/
│   ├── api/
│   │   ├── diferencia/route.ts  GET — delta 2° vs 3°
│   │   └── resumen/route.ts     GET — todos los candidatos
│   ├── layout.tsx
│   └── page.tsx                 UI con la diferencia
├── lib/
│   ├── data.ts                  lee data/results.json
│   ├── diferencia.ts            cálculo del delta
│   ├── scraper.ts               Playwright (solo CLI, no se usa en prod)
│   └── types.ts
└── scripts/
    ├── scrape.ts                CLI → genera data/results.json
    └── discover-endpoints.ts    CLI → debug si la ONPE cambia schema
```

## Deploy

La app no necesita Chromium ni Playwright en producción — es un Next.js
estándar que lee un JSON del filesystem.

### Netlify

1. Importa el repo desde <https://app.netlify.com/start>.
2. Netlify detecta Next.js + el `netlify.toml` del repo.
3. Deploy. Listo.

### Vercel / Railway / Render

Misma idea: import from Git → deploy. Funciona en el plan free de cualquiera.

## ¿Por qué separar scraper de app?

La ONPE sirve todo desde una SPA Angular detrás de CloudFront. Los
endpoints reales no son accesibles programáticamente (CloudFront devuelve
HTML para cualquier path, y Cloudflare Challenge bloquea requests server-side).
Chromium headless es la única forma fiable de extraer los datos, pero no cabe
en lambdas serverless. Al separar scraper (local) de serving (Netlify), ambos
funcionan sin compromisos.
