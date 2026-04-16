# ---- deps ----------------------------------------------------------------
# Usamos la imagen oficial de Playwright: trae Chromium y TODAS las libs de
# sistema necesarias (libnss3, libatk, etc.) ya instaladas y parchadas.
FROM mcr.microsoft.com/playwright:v1.48.0-jammy AS deps
WORKDIR /app

# Habilitar corepack para usar pnpm/yarn si el proyecto cambia en el futuro.
RUN corepack enable

COPY package.json package-lock.json* ./
# postinstall intentaría bajar Chromium — la imagen ya lo trae, así lo saltamos.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm install --no-audit --no-fund

# ---- builder -------------------------------------------------------------
FROM deps AS builder
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner --------------------------------------------------------------
FROM mcr.microsoft.com/playwright:v1.48.0-jammy AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Usuario no-root que ya viene en la imagen de Playwright.
RUN groupadd --system --gid 1001 nodejs \
 && useradd  --system --uid 1001 --gid nodejs nextjs

# Copiamos solo lo necesario para correr Next.js.
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js

USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
