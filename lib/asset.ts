/**
 * Prefix a public-directory path with the deployment base path.
 *
 * GitHub Pages serves this app from /<repo>/, but `next/image` with
 * `unoptimized: true` emits the `src` verbatim, so root-relative asset paths
 * (from asset-manifest.json and static references) 404 there. Every reference
 * to a file in public/ must go through this helper.
 *
 * NEXT_PUBLIC_BASE_PATH is inlined at build time, so this works in both server
 * and client components without a runtime lookup.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  if (!path.startsWith("/")) return path;
  return `${BASE}${path}`;
}
