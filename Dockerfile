# ---- deps ----------------------------------------------------------------
# Imagen oficial de Playwright: trae Chromium + todas las libs del sistema
# ya instaladas en /ms-playwright/.
FROM mcr.microsoft.com/playwright:v1.48.0-jammy AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
# playwright-core no baja browsers (esa es la gracia). @sparticuz/chromium sí
# se instala pero no se usa fuera de lambda.
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
    HOSTNAME=0.0.0.0 \
    # Decirle a playwright-core dónde vive Chromium dentro de esta imagen.
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN groupadd --system --gid 1001 nodejs \
 && useradd  --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js

USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
