/**
 * Snapshot loader.
 *
 * The generated snapshot is imported statically, so the browser only ever
 * receives the normalised, evidence-aware JSON this repo owns. No database
 * path, credential, or source location is bundled.
 */

import showcaseJson from "@/data/generated/showcase.json";
import catalogJson from "@/data/generated/catalog.json";
import type { ShowcaseSnapshot } from "./contracts";

export interface Catalog {
  contractVersion: string;
  generatedAt: string;
  seasons: number[];
  franchises: { id: string; name: string; aliases: string[] }[];
  players: { id: number; name: string; position: string }[];
  metrics: { id: string; label: string; surface: string }[];
}

const REQUIRED_KEYS: (keyof ShowcaseSnapshot)[] = [
  "contractVersion",
  "latestCompletedSeason",
  "seasons",
  "seasonSummary",
  "franchises",
  "qa",
];

let validated: ShowcaseSnapshot | null = null;

export function loadShowcase(): ShowcaseSnapshot {
  if (validated) return validated;

  const snapshot = showcaseJson as unknown as ShowcaseSnapshot;
  for (const key of REQUIRED_KEYS) {
    if (snapshot[key] === undefined) {
      throw new Error(`showcase snapshot is missing "${String(key)}" — run npm run data:build`);
    }
  }
  if (snapshot.contractVersion !== "affl-readonly-v1") {
    throw new Error(`unexpected contract version "${snapshot.contractVersion}"`);
  }
  validated = snapshot;
  return snapshot;
}

export function loadCatalog(): Catalog {
  return catalogJson as unknown as Catalog;
}
