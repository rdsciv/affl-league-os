import path from "node:path";
import type { NextConfig } from "next";

// GitHub Pages serves this project from /<repo>/, so asset and route prefixes
// must be set at build time. Local dev and Playwright keep serving from root.
const repo = "affl-league-os";
const isPages = process.env.DEPLOY_TARGET === "pages";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Static HTML export — no Node server needed on Pages.
  output: "export",
  // Pages has no image optimizer; emit plain <img> sources.
  images: { unoptimized: true },
  // Emit /route/index.html so paths resolve without a server rewrite.
  trailingSlash: true,
  basePath: isPages ? `/${repo}` : undefined,
  assetPrefix: isPages ? `/${repo}/` : undefined,
  // basePath rewrites routes and _next/ assets, but `unoptimized` images emit
  // their src verbatim — so public/ paths must be prefixed by lib/asset.ts.
  env: { NEXT_PUBLIC_BASE_PATH: isPages ? `/${repo}` : "" },
  // This worktree is its own app root; pin it so Next does not walk up into
  // the parent checkout looking for a workspace.
  outputFileTracingRoot: path.resolve(import.meta.dirname),
  // Playwright drives the dev server over 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
