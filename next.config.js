/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The scraper imports Playwright; keep it out of the client bundle.
  serverExternalPackages: ["playwright"],
  experimental: {
    // Allow longer scraping jobs during SSR/route handlers.
    proxyTimeout: 60_000,
  },
};

module.exports = nextConfig;
