import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Snapshots are generated at build time into data/generated and imported
  // statically. No database path or credential ever reaches the browser.
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
