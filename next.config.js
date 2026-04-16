/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Estos paquetes traen binarios / código nativo: no deben bundlarse.
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
  // Incluir el binario (~30 MB) dentro del tracing para que Vercel lo suba al lambda.
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/@sparticuz/chromium/**/*"],
    "/": ["./node_modules/@sparticuz/chromium/**/*"],
  },
  experimental: {
    proxyTimeout: 60_000,
  },
};

module.exports = nextConfig;
