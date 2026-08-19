# AFFL Greenfield Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a verified greenfield AFFL showcase combining a dense adaptive Control Room, a searchable Data Atlas, compact preview-to-explorer modules, real franchise/player data, and editorial social exports.

**Architecture:** A Python read-only adapter queries the existing DuckDB and SQLite sources, applies canonical franchise identity rules, and writes evidence-aware JSON snapshots owned by this repository. A single Next.js application renders those snapshots through a completely new component and visual system; legacy UI code is never imported. Data modules default to compact previews and open focused explorers for full rows. Dedicated export routes render League Journal social cards.

**Tech Stack:** Node 26, npm 11, Next.js 15.5.19, React 19.2.7, TypeScript 5.8.2, CSS Modules/global design tokens, Python 3 + DuckDB/SQLite read-only adapters, Vitest, Testing Library, Playwright, Next `ImageResponse`.

## Global Constraints

- Repository root is `/Users/chilly/Projects/AFFLGreenfield`.
- Read and follow `docs/superpowers/specs/2026-08-19-affl-greenfield-design.md` and `docs/DATA_SOURCE_MANIFEST.md` before editing.
- Do not modify any legacy AFFL project or source database.
- Do not copy any legacy AFFL UI shell, component, page structure, or CSS.
- Official AFFL and franchise artwork may be copied with provenance.
- User-facing UI never displays owners’ real names; use team/franchise names only.
- Franchise history aggregates source-backed team-seasons by canonical internal identity while preserving the team name used each season.
- Do not hardcode a franchise’s expected season count.
- There is no AFFL 2026 statistical season before the draft.
- Full tables never render as the default page composition.
- Every visible metric carries verified, reconstructed, or unavailable status.
- Missing values never become zero, NaN, empty strings, fabricated rows, or fabricated rankings.
- The initial showcase uses real data where available and labels design-only placeholder content explicitly.
- No commit message includes a co-author.
- Do not push or deploy unless the user explicitly asks.
- Do not use or take over the user’s active Chrome session for testing; use an isolated browser. Open visible previews in Safari.

---

## Planned File Structure

```text
AFFLGreenfield/
  app/
    layout.tsx                     # root metadata, fonts, global shell
    page.tsx                       # adaptive off-season Control Room
    season/page.tsx                # compact season intelligence surface
    front-office/page.tsx          # auction/management/point-source previews
    players/page.tsx               # player search and preview results
    players/[espnId]/page.tsx      # one real Player OS profile
    franchises/[franchiseId]/page.tsx # franchise timeline and season aliases
    archive/page.tsx               # rivalry/records/Wrapped previews
    exports/[storyId]/page.tsx     # editorial share view
    exports/[storyId]/opengraph-image.tsx # 1200x630 social render
    globals.css                    # tokens, typography, reset, responsive rules
  components/
    shell/AppShell.tsx             # header, five-area nav, command launcher
    shell/CommandBar.tsx           # deterministic query UX
    modules/PreviewModule.tsx      # summary/mini rows/open explorer contract
    modules/ExplorerDrawer.tsx     # focused drawer with complete rows
    modules/CompactStandings.tsx
    modules/MatchupPulse.tsx
    modules/PointSourceBar.tsx
    modules/AuctionSnapshot.tsx
    data/DataTable.tsx             # focused-only sortable/filterable table
    data/EvidenceBadge.tsx
    exports/JournalCard.tsx        # shared editorial composition
  lib/
    data/contracts.ts              # DataEnvelope and domain types
    data/load.ts                   # generated snapshot loader
    data/selectors.ts              # derived UI selectors only
    query/catalog.ts               # allowlisted query definitions
    query/interpret.ts             # deterministic phrase→query parser
    exports/stories.ts             # story data builders
  data/generated/
    catalog.json
    showcase.json
    qa-report.json
  scripts/
    affl_sources.py                # read-only source openers
    export_affl_showcase.py        # normalized snapshot build
    qa_affl_data.py                # binding data gates
    copy_official_assets.py        # allowlisted artwork copier + manifest
  public/
    brand/
    franchises/
    asset-manifest.json
  tests/
    data/test_affl_sources.py
    data/test_identity_crosswalk.py
    data/test_showcase_export.py
    data/test_qa_gate.py
    unit/query-interpret.test.ts
    unit/selectors.test.ts
    components/PreviewModule.test.tsx
    e2e/control-room.spec.ts
    e2e/data-atlas.spec.ts
    e2e/franchise-player.spec.ts
    e2e/exports.spec.ts
    e2e/visual.spec.ts
  playwright.config.ts
  vitest.config.ts
  package.json
  tsconfig.json
  next.config.ts
```

---

### Task 1: Scaffold the Independent Application and Test Harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/unit/smoke.test.ts`
- Modify: `.gitignore`
- Modify: `README.md`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `typecheck`, `test`, `test:e2e`, `data:build`, `data:qa`, `verify`.
- Produces: root CSS tokens consumed by every later component.

- [ ] **Step 1: Write the failing smoke test**

```ts
// tests/unit/smoke.test.ts
import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";

describe("greenfield scaffold", () => {
  it("declares the isolated AFFL application", () => {
    expect(packageJson.name).toBe("affl-greenfield");
    expect(packageJson.private).toBe(true);
  });
});
```

- [ ] **Step 2: Create `package.json` and install dependencies**

```json
{
  "name": "affl-greenfield",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3459",
    "build": "next build",
    "start": "next start -p 3459",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "data:build": "/usr/bin/python3 scripts/export_affl_showcase.py",
    "data:qa": "/usr/bin/python3 scripts/qa_affl_data.py",
    "verify": "npm run data:qa && npm run typecheck && npm run test && npm run build && npm run test:e2e"
  },
  "dependencies": {
    "next": "15.5.19",
    "react": "19.2.7",
    "react-dom": "19.2.7"
  },
  "devDependencies": {
    "@playwright/test": "^1.55.0",
    "@testing-library/jest-dom": "^6.8.0",
    "@testing-library/react": "^16.3.0",
    "@types/node": "^22.10.5",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.0.0",
    "jsdom": "^26.1.0",
    "typescript": "^5.8.2",
    "vite": "^7.0.0",
    "vitest": "^3.2.0"
  }
}
```

Run: `npm install`  
Expected: lockfile created; no install error.

- [ ] **Step 3: Add TypeScript, Next, Vitest, and Playwright configuration**

`tsconfig.json` must use strict mode, `noUncheckedIndexedAccess`, and the `@/*` alias. `playwright.config.ts` must start `npm run dev` on port 3459 and run Chromium in an isolated profile.

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://127.0.0.1:3459", trace: "retain-on-failure" },
  webServer: { command: "npm run dev", url: "http://127.0.0.1:3459", reuseExistingServer: true },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } }
  ]
});
```

- [ ] **Step 4: Create the root layout and original token foundation**

Use locally available/system fonts initially. Define independent tokens for field, paper, ink, team colors, evidence states, spacing, type scale, and motion. Do not import legacy CSS.

```tsx
// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AFFL League OS",
  description: "The AFFL control room, data atlas, and league archive."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
```

- [ ] **Step 5: Run the scaffold gates**

Run:

```bash
npm run typecheck
npm test
```

Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts app vitest.config.ts playwright.config.ts tests/unit README.md .gitignore
git commit -m "chore: scaffold AFFL greenfield app"
```

---

### Task 2: Build the Read-Only Data Adapter Contract

**Files:**
- Create: `scripts/affl_sources.py`
- Create: `lib/data/contracts.ts`
- Create: `tests/data/test_affl_sources.py`
- Create: `tests/data/test_identity_crosswalk.py`
- Create: `data/generated/.gitkeep`

**Interfaces:**
- Produces Python context managers `open_platform_duckdb()` and `open_semantic_sqlite()`.
- Produces `DataEnvelope<T>`, `EvidenceStatus`, `Coverage`, and `Provenance` TypeScript contracts.
- Consumes source paths from `docs/DATA_SOURCE_MANIFEST.md`; paths remain server/build-only.

- [ ] **Step 1: Write failing read-only source tests**

```python
# tests/data/test_affl_sources.py
import unittest
from scripts.affl_sources import open_platform_duckdb, open_semantic_sqlite

class SourceTests(unittest.TestCase):
    def test_duckdb_is_read_only_and_has_12_completed_seasons(self):
        with open_platform_duckdb() as con:
            self.assertEqual(con.execute("SELECT min(season), max(season), count(*) FROM seasons").fetchone(), (2014, 2025, 12))
            with self.assertRaises(Exception):
                con.execute("CREATE TABLE forbidden_write(x INT)")

    def test_sqlite_is_query_only(self):
        with open_semantic_sqlite() as con:
            self.assertEqual(con.execute("PRAGMA query_only").fetchone()[0], 1)
            with self.assertRaises(Exception):
                con.execute("CREATE TABLE forbidden_write(x INT)")

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test and verify failure**

Run: `/usr/bin/python3 -m unittest tests/data/test_affl_sources.py -v`  
Expected: FAIL because `scripts.affl_sources` does not exist.

- [ ] **Step 3: Implement read-only source openers**

```python
# scripts/affl_sources.py
from contextlib import contextmanager
import sqlite3
import duckdb

PLATFORM_DB = "/Users/chilly/Projects/HermesAFFL/warehouse/build/AFFL_platform.duckdb"
SEMANTIC_DB = "/Users/chilly/Projects/ccDesktopAFFL/affl.db"

@contextmanager
def open_platform_duckdb():
    con = duckdb.connect(PLATFORM_DB, read_only=True)
    try:
        yield con
    finally:
        con.close()

@contextmanager
def open_semantic_sqlite():
    con = sqlite3.connect(f"file:{SEMANTIC_DB}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA query_only=ON")
    try:
        yield con
    finally:
        con.close()
```

- [ ] **Step 4: Define the TypeScript data envelope**

```ts
// lib/data/contracts.ts
export type EvidenceStatus = "verified" | "reconstructed" | "unavailable";
export type MissingReason = "not_applicable" | "outside_source_coverage" | "source_not_collected" | "join_unresolved" | "validation_failed" | "not_published";

export interface Provenance {
  sourceId: "hermes-duckdb" | "cc-sqlite" | "hermes-json" | "pillars-json";
  sourceTier: "ledger" | "semantic" | "publish" | "specialist";
  tablesOrArtifact: string[];
  adapterVersion: string;
  queryId: string;
  sourceChecksum?: string;
  sourceGeneratedAt?: string;
}

export interface Coverage {
  grain: string;
  available: boolean;
  evidenceStatus: EvidenceStatus;
  seasonFrom?: number;
  seasonTo?: number;
  reason?: string;
}

export interface DataEnvelope<T> {
  contractVersion: "affl-readonly-v1";
  domain: string;
  generatedAt: string;
  data: T | null;
  evidenceStatus: EvidenceStatus;
  provenance: Provenance[];
  coverage: Coverage;
  missingReason?: MissingReason;
  warnings: string[];
}
```

- [ ] **Step 5: Write and pass the identity-crosswalk behavior test**

The test must derive franchise seasons from SQLite `v_team`, group by canonical internal `owner_id`, preserve each row’s team name, and never assert an exact season count for one franchise.

```python
# tests/data/test_identity_crosswalk.py
import unittest
from scripts.affl_sources import open_semantic_sqlite

class IdentityTests(unittest.TestCase):
    def test_every_team_season_has_one_canonical_franchise(self):
        with open_semantic_sqlite() as con:
            rows = con.execute("SELECT season, team_id, owner_id, name FROM v_team ORDER BY season, team_id").fetchall()
        self.assertEqual(len(rows), 138)
        self.assertEqual(len({(r["season"], r["team_id"]) for r in rows}), 138)
        self.assertTrue(all(r["owner_id"] and r["name"] for r in rows))

    def test_user_facing_source_is_team_name_not_person_name(self):
        with open_semantic_sqlite() as con:
            rows = con.execute("SELECT name, owner_name FROM v_team").fetchall()
        self.assertTrue(all(r["name"] != r["owner_name"] for r in rows))
```

Run: `/usr/bin/python3 -m unittest tests/data/test_affl_sources.py tests/data/test_identity_crosswalk.py -v`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/affl_sources.py lib/data/contracts.ts tests/data data/generated/.gitkeep
git commit -m "feat: add read-only AFFL data contract"
```

---

### Task 3: Generate the QA Report and Showcase Snapshot

**Files:**
- Create: `scripts/qa_affl_data.py`
- Create: `scripts/export_affl_showcase.py`
- Create: `tests/data/test_qa_gate.py`
- Create: `tests/data/test_showcase_export.py`
- Generate: `data/generated/qa-report.json`
- Generate: `data/generated/catalog.json`
- Generate: `data/generated/showcase.json`

**Interfaces:**
- Produces `qa-report.json` with gate results and coverage warnings.
- Produces `showcase.json` containing season 2025, compact 2024–2025 audit context, canonical franchise timelines, one real player profile, auction snapshot, point-source data, and unavailable envelopes.
- Produces `catalog.json` for the command bar.

- [ ] **Step 1: Write failing QA-gate tests**

```python
# tests/data/test_qa_gate.py
import json, subprocess, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

class QaGateTests(unittest.TestCase):
    def test_qa_report_has_binding_gates_without_hardcoded_franchise_counts(self):
        subprocess.run(["/usr/bin/python3", "scripts/qa_affl_data.py"], cwd=ROOT, check=True)
        report = json.loads((ROOT / "data/generated/qa-report.json").read_text())
        self.assertTrue(report["gates"]["teamSeasonIdentity"]["pass"])
        self.assertTrue(report["gates"]["noAffl2026"]["pass"])
        self.assertTrue(report["gates"]["pf2017to2025"]["pass"])
        self.assertNotIn("expectedKafkaSeasons", json.dumps(report))
```

- [ ] **Step 2: Implement the QA report**

`qa_affl_data.py` must query both sources and emit at least:

- source reachability/read-only status
- seasons 2014–2025 only
- team counts 10/12 by season
- 138 unique team-season keys
- canonical identity resolution with no duplicate owner-season teams
- PF reconciliation summary with 2017–2025 pass and 2014–2016 gated
- draft coverage 2,124 picks
- player universe current-map and full-union counts
- nameless/missing identity counts
- 2026 exclusion
- source conflicts and coverage warnings

Exit nonzero only for binding corruption, not for documented unavailable coverage.

- [ ] **Step 3: Write failing snapshot shape test**

```python
# tests/data/test_showcase_export.py
import json, subprocess, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

class ShowcaseTests(unittest.TestCase):
    def test_snapshot_uses_team_names_and_data_envelopes(self):
        subprocess.run(["/usr/bin/python3", "scripts/export_affl_showcase.py"], cwd=ROOT, check=True)
        data = json.loads((ROOT / "data/generated/showcase.json").read_text())
        self.assertEqual(data["contractVersion"], "affl-readonly-v1")
        self.assertEqual(data["latestCompletedSeason"], 2025)
        self.assertNotIn("ownerName", json.dumps(data))
        self.assertGreater(len(data["franchises"]), 10)
        self.assertTrue(all("seasonAliases" in f for f in data["franchises"]))
```

- [ ] **Step 4: Implement the showcase exporter**

The exporter must use source-qualified helper functions and write deterministic JSON (`sort_keys=True`, stable row ordering). It must include only fields required by the initial showcase; do not dump raw JSON columns or entire source databases.

- [ ] **Step 5: Run data gates**

Run:

```bash
/usr/bin/python3 -m unittest discover -s tests/data -v
/usr/bin/python3 scripts/qa_affl_data.py
/usr/bin/python3 scripts/export_affl_showcase.py
```

Expected: all tests pass; three JSON artifacts exist and parse.

- [ ] **Step 6: Commit**

```bash
git add scripts/qa_affl_data.py scripts/export_affl_showcase.py tests/data data/generated
git commit -m "feat: publish verified AFFL showcase data"
```

---

### Task 4: Import Official Assets With Provenance

**Files:**
- Create: `scripts/copy_official_assets.py`
- Create: `tests/data/test_asset_manifest.py`
- Create: `public/brand/*`
- Create: `public/franchises/*`
- Create: `public/asset-manifest.json`

**Interfaces:**
- Produces asset manifest entries `{destination, sourcePath, sha256, kind, franchiseId?}`.
- Consumes canonical current/latest franchise names from generated data; historical aliases reuse the mapped franchise asset.

- [ ] **Step 1: Write failing asset-manifest test**

```python
# tests/data/test_asset_manifest.py
import json, subprocess, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

class AssetTests(unittest.TestCase):
    def test_every_current_franchise_uses_a_real_asset(self):
        subprocess.run(["/usr/bin/python3", "scripts/copy_official_assets.py"], cwd=ROOT, check=True)
        manifest = json.loads((ROOT / "public/asset-manifest.json").read_text())
        self.assertTrue(manifest["brand"])
        self.assertGreaterEqual(len(manifest["franchises"]), 12)
        self.assertTrue(all(item["sha256"] and item["sourcePath"] for item in manifest["franchises"]))
```

- [ ] **Step 2: Implement allowlisted asset copying**

Copy only files declared by the canonical franchise/source map. Reject missing source files, generated letter tiles, and destinations outside `public/brand` or `public/franchises`.

- [ ] **Step 3: Run and verify**

Run: `/usr/bin/python3 -m unittest tests/data/test_asset_manifest.py -v`  
Expected: PASS and manifest created.

- [ ] **Step 4: Commit**

```bash
git add scripts/copy_official_assets.py tests/data/test_asset_manifest.py public
git commit -m "feat: import official AFFL artwork"
```

---

### Task 5: Build the Original App Shell and Adaptive Control Room

**Files:**
- Create: `components/shell/AppShell.tsx`
- Create: `components/shell/CommandBar.tsx`
- Create: `components/modules/PreviewModule.tsx`
- Create: `components/data/EvidenceBadge.tsx`
- Create: `lib/data/load.ts`
- Create: `lib/data/selectors.ts`
- Create: `app/page.tsx`
- Create: `tests/components/PreviewModule.test.tsx`
- Create: `tests/unit/selectors.test.ts`
- Create: `tests/e2e/control-room.spec.ts`
- Modify: `app/globals.css`

**Interfaces:**
- `loadShowcase(): ShowcaseSnapshot`
- `selectAdaptiveHome(snapshot, now): "in-season" | "off-season"`
- `<PreviewModule title summary rows evidence onOpen>`
- `<EvidenceBadge status>`

- [ ] **Step 1: Write selector and preview tests**

```ts
// tests/unit/selectors.test.ts
import { expect, it } from "vitest";
import { selectAdaptiveHome } from "@/lib/data/selectors";

it("uses off-season mode before a real 2026 draft season exists", () => {
  expect(selectAdaptiveHome({ latestCompletedSeason: 2025, activeSeason: null }, new Date("2026-08-19"))).toBe("off-season");
});
```

```tsx
// tests/components/PreviewModule.test.tsx
import { render, screen } from "@testing-library/react";
import { PreviewModule } from "@/components/modules/PreviewModule";

it("shows at most five preview rows and an Open table action", () => {
  render(<PreviewModule title="Standings" summary="2025 final" rows={[1,2,3,4,5,6].map(String)} evidence="verified" onOpen={() => {}} />);
  expect(screen.getAllByRole("listitem")).toHaveLength(5);
  expect(screen.getByRole("button", { name: /open table/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Build data loader and selectors**

Use static server imports of generated JSON. Parse and validate required top-level keys before rendering.

- [ ] **Step 3: Build AppShell**

The shell exposes five destinations: Now, Season, Front Office, Players, Archive. The command launcher is visible but does not dominate the page. Use the official AFFL mark above the primary navigation. Do not recreate the prior topbar or 11-button nav.

- [ ] **Step 4: Build PreviewModule and EvidenceBadge**

The preview contract must limit default rows, make the conclusion visually primary, provide a clear focused-explorer action, and avoid generic equal-weight card styling.

- [ ] **Step 5: Compose the off-season Control Room**

The initial page must include:

- Latest completed season headline
- Champion/standings movement preview
- Auction HQ preview
- Matchup/season story preview
- Roto/skill preview
- Franchise/player search entry points
- Clearly labeled unavailable modules where data is gated

Use varied compositions: ticker, scoreboard strip, editorial headline, preview list, and compact chart. Do not use a uniform grid of identical cards.

- [ ] **Step 6: Add end-to-end Control Room assertions**

```ts
// tests/e2e/control-room.spec.ts
import { test, expect } from "@playwright/test";

test("off-season home is compact and data-backed", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /AFFL/i })).toBeVisible();
  await expect(page.getByText(/2025/).first()).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link")).toHaveCount(5);
  await expect(page.locator("table")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
});
```

- [ ] **Step 7: Run tests and inspect isolated screenshots**

Run:

```bash
npm test
npm run test:e2e -- --project=desktop tests/e2e/control-room.spec.ts
npm run test:e2e -- --project=mobile tests/e2e/control-room.spec.ts
```

Expected: PASS. Inspect screenshots using isolated browser output, not the user’s Chrome.

- [ ] **Step 8: Commit**

```bash
git add app components/shell components/modules components/data lib/data tests/components tests/unit tests/e2e/control-room.spec.ts
git commit -m "feat: build adaptive AFFL control room"
```

---

### Task 6: Build Preview-to-Explorer Data Atlas Behavior

**Files:**
- Create: `components/modules/ExplorerDrawer.tsx`
- Create: `components/data/DataTable.tsx`
- Create: `app/season/page.tsx`
- Create: `tests/e2e/data-atlas.spec.ts`
- Modify: `components/modules/PreviewModule.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- `<ExplorerDrawer open title onClose>` preserves originating page and filters.
- `<DataTable rows columns initialSort filterable>` renders only inside focused views.
- URL query `?explore=<module>&season=<year>&phase=<scope>` restores drawer state.

- [ ] **Step 1: Write failing explorer behavior test**

```ts
// tests/e2e/data-atlas.spec.ts
import { test, expect } from "@playwright/test";

test("preview opens a focused full table and restores from URL", async ({ page }) => {
  await page.goto("/season");
  await page.getByRole("button", { name: /open standings table/i }).click();
  await expect(page.getByRole("dialog", { name: /standings/i })).toBeVisible();
  await expect(page.getByRole("dialog").locator("table")).toHaveCount(1);
  await expect(page).toHaveURL(/explore=standings/);
  await page.reload();
  await expect(page.getByRole("dialog", { name: /standings/i })).toBeVisible();
});
```

- [ ] **Step 2: Implement accessible drawer and focused DataTable**

Drawer requirements: focus trap, Escape close, return focus, mobile full-screen treatment, desktop side panel, URL-state synchronization.

- [ ] **Step 3: Build compact Season surface**

Use preview modules for standings, Power/luck, matchups, roto, scoring trend, and team dossiers. No default full table. Each module exposes focused exploration.

- [ ] **Step 4: Run behavior and overflow tests**

Run both Playwright projects for `data-atlas.spec.ts`.  
Expected: all interactions and URL restoration pass.

- [ ] **Step 5: Commit**

```bash
git add app/season components/modules/ExplorerDrawer.tsx components/data/DataTable.tsx components/modules/PreviewModule.tsx app/globals.css tests/e2e/data-atlas.spec.ts
git commit -m "feat: add compact data atlas explorers"
```

---

### Task 7: Add Deterministic Command-Bar Queries

**Files:**
- Create: `lib/query/catalog.ts`
- Create: `lib/query/interpret.ts`
- Create: `tests/unit/query-interpret.test.ts`
- Modify: `components/shell/CommandBar.tsx`
- Create: `tests/e2e/command-bar.spec.ts`

**Interfaces:**
- `interpretQuery(input: string): QueryIntent | null`
- Query intents are allowlisted unions, never raw SQL.
- `runQuery(intent, snapshot): DataEnvelope<QueryResult>`

- [ ] **Step 1: Write deterministic parser tests**

```ts
// tests/unit/query-interpret.test.ts
import { expect, it } from "vitest";
import { interpretQuery } from "@/lib/query/interpret";

it("interprets the tallest wide receiver question", () => {
  expect(interpretQuery("Who drafts the tallest wide receivers?"))
    .toEqual({ kind: "franchise-player-trait", position: "WR", trait: "height", aggregation: "average", order: "desc" });
});

it("rejects arbitrary SQL-like requests", () => {
  expect(interpretQuery("DROP TABLE teams")).toBeNull();
});
```

- [ ] **Step 2: Implement the query catalog and parser**

Support initial intents:

- player/entity lookup
- franchise player-trait tendencies
- auction leaders and value
- season standings/Power/luck
- rivalry lookup
- record lookup

The UI must show the interpreted filters before running.

- [ ] **Step 3: Wire CommandBar results into ExplorerDrawer**

Results show a plain-language answer, evidence badge, provenance disclosure, mini result rows, Open full results, and Share.

- [ ] **Step 4: Run unit and E2E tests**

Expected: recognized queries work; unrecognized queries show supported examples and never execute arbitrary data access.

- [ ] **Step 5: Commit**

```bash
git add lib/query components/shell/CommandBar.tsx tests/unit/query-interpret.test.ts tests/e2e/command-bar.spec.ts
git commit -m "feat: add deterministic AFFL command bar"
```

---

### Task 8: Build Franchise and Player Showcase Slices

**Files:**
- Create: `app/franchises/[franchiseId]/page.tsx`
- Create: `app/players/page.tsx`
- Create: `app/players/[espnId]/page.tsx`
- Create: `components/modules/FranchiseTimeline.tsx`
- Create: `components/modules/PlayerCareer.tsx`
- Create: `tests/e2e/franchise-player.spec.ts`

**Interfaces:**
- `getFranchise(franchiseId)` returns current/latest team label plus `seasonAliases` rows.
- `getPlayer(espnId)` returns AFFL career data and separately enveloped NFL context.
- No function returns or renders a real owner name.

- [ ] **Step 1: Write franchise identity E2E test**

```ts
// tests/e2e/franchise-player.spec.ts
import { test, expect } from "@playwright/test";

test("franchise history preserves team-name eras without person names", async ({ page }) => {
  await page.goto("/franchises/m07");
  await expect(page.getByText(/Chupacabras|Glory Holes/).first()).toBeVisible();
  await expect(page.getByText(/Jason Kafka/i)).toHaveCount(0);
  expect(await page.getByTestId("franchise-season").count()).toBeGreaterThan(1);
});
```

Use a helper assertion instead of a hardcoded exact season count.

- [ ] **Step 2: Implement franchise timeline**

The header uses the current/latest team name. Timeline rows use the team name from each source season. Hiatus years render as spacing/era boundaries, not fake zero seasons.

- [ ] **Step 3: Implement player search and one real profile**

Player profile modules: career summary, auction history, team custody, weekly/start history where covered, and NFL context with separate evidence state. A missing context week renders `—` and a reason.

- [ ] **Step 4: Run E2E and accessibility checks**

Expected: identity language, route loading, progressive disclosure, and mobile layout pass.

- [ ] **Step 5: Commit**

```bash
git add app/franchises app/players components/modules/FranchiseTimeline.tsx components/modules/PlayerCareer.tsx tests/e2e/franchise-player.spec.ts
git commit -m "feat: add franchise and player showcase"
```

---

### Task 9: Build Front Office and Archive Surfaces

**Files:**
- Create: `app/front-office/page.tsx`
- Create: `app/archive/page.tsx`
- Create: `components/modules/AuctionSnapshot.tsx`
- Create: `components/modules/PointSourceBar.tsx`
- Create: `tests/e2e/front-office-archive.spec.ts`

**Interfaces:**
- Front Office previews: auction, management, point sources, waivers, trades.
- Archive previews: franchise history, rivalries, records, trends, Wrapped.
- Unavailable deep modules use `DataEnvelope` missing reasons and never fake values.

- [ ] **Step 1: Write route and density tests**

Assert both routes load, show at least four distinct preview compositions, contain no default full table, and expose clear unavailable states where coverage is gated.

- [ ] **Step 2: Implement Front Office previews**

Use real 2025 auction/management/point-source values when available. Reconstructed trades must show reconstructed evidence and confidence. Do not calculate a winner grade.

- [ ] **Step 3: Implement Archive previews**

Use editorial history composition, franchise timeline entry points, rivalry/record previews, and Wrapped entry point. Do not make the archive another long dashboard.

- [ ] **Step 4: Verify and commit**

```bash
npm run typecheck
npm test
npm run test:e2e -- tests/e2e/front-office-archive.spec.ts
git add app/front-office app/archive components/modules/AuctionSnapshot.tsx components/modules/PointSourceBar.tsx tests/e2e/front-office-archive.spec.ts
git commit -m "feat: add front office and archive surfaces"
```

---

### Task 10: Build League Journal Share and Export System

**Files:**
- Create: `lib/exports/stories.ts`
- Create: `components/exports/JournalCard.tsx`
- Create: `app/exports/[storyId]/page.tsx`
- Create: `app/exports/[storyId]/opengraph-image.tsx`
- Create: `app/api/exports/[storyId]/portrait/route.tsx`
- Create: `tests/e2e/exports.spec.ts`

**Interfaces:**
- `getStory(storyId): ExportStory | null`
- `ExportStory` includes headline, scope, primary fact, supporting facts, franchise assets, evidence footer, and canonical URL state.
- Open Graph route renders 1200×630.
- Portrait route renders 1080×1350 PNG.

- [ ] **Step 1: Write export route tests**

```ts
// tests/e2e/exports.spec.ts
import { test, expect } from "@playwright/test";

test("editorial export has focused content and correct image sizes", async ({ page, request }) => {
  await page.goto("/exports/2025-champion");
  await expect(page.getByRole("heading")).toContainText(/2025/);
  await expect(page.getByText(/verified/i)).toBeVisible();
  const og = await request.get("/exports/2025-champion/opengraph-image");
  expect(og.ok()).toBeTruthy();
  expect(og.headers()["content-type"]).toContain("image/png");
  const portrait = await request.get("/api/exports/2025-champion/portrait");
  expect(portrait.ok()).toBeTruthy();
});
```

Add image-dimension assertions by parsing PNG metadata in a unit helper.

- [ ] **Step 2: Implement story builders**

Initial stories:

- 2025 champion
- selected matchup
- selected player career
- selected franchise record
- command-bar result

Stories use only verified/reconstructed envelopes and include source scope. Do not screenshot app chrome.

- [ ] **Step 3: Implement JournalCard and image routes**

Use a cream/ink/orange/blue editorial system distinct from the analytical app while retaining official brand/franchise art. One graphic communicates one conclusion.

- [ ] **Step 4: Add share actions to eligible preview modules**

Actions: Copy link, Open share card, Download portrait, Download CSV when rows exist.

- [ ] **Step 5: Run export tests and inspect actual PNGs**

Expected: correct dimensions, readable typography, official assets, evidence footer, no application navigation/chrome.

- [ ] **Step 6: Commit**

```bash
git add lib/exports components/exports app/exports app/api/exports tests/e2e/exports.spec.ts
git commit -m "feat: add editorial AFFL exports"
```

---

### Task 11: Final Verification, Slop Audit, and Review Preview

**Files:**
- Create: `tests/e2e/visual.spec.ts`
- Create: `docs/SHOWCASE_QA.md`
- Modify: `README.md`

**Interfaces:**
- Produces repeatable screenshots for all top-level routes at desktop and mobile.
- Produces a written slop score before and after repair.
- Produces final verification evidence and review URL.

- [ ] **Step 1: Add visual crawl test**

Test routes:

- `/`
- `/season`
- `/front-office`
- `/players`
- one player profile
- one franchise profile
- `/archive`
- one export view

For every route/project assert:

- HTTP 200
- zero console errors
- zero failed local requests
- zero document-level horizontal overflow
- visible `main`
- no missing images
- no `undefined`, `NaN`, or accidental owner/person names

- [ ] **Step 2: Run full verification**

```bash
npm run data:build
npm run data:qa
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Expected: all exit 0.

- [ ] **Step 3: Run explicit AI-design slop audit**

Score each tell from the PRD design skill:

1. Tech gradient
2. Generic tech hue
3. Feature-tile grid
4. Accent rail
5. Unearned blur
6. Monument stat
7. Icon topper
8. Center stack
9. Default type
10. Wrong surface

Record the pre-repair score and concrete evidence in `docs/SHOWCASE_QA.md`. Repair every compositional tell (3, 8, 10) before review. Re-run screenshots and record the final score.

- [ ] **Step 4: Verify density and table rules manually from screenshots**

Document:

- No top-level page defaults to a full table.
- Preview modules show at most five rows.
- Full tables remain accessible in focused explorers.
- Default page lengths are within the PRD target.
- A, C, and B visual systems are visibly distinct but coherent.

- [ ] **Step 5: Start review server and open Safari**

Run `npm run dev` as a tracked long-lived background process on port 3459. Verify readiness with `curl http://127.0.0.1:3459/`. Open the verified URL in Safari. Do not use or take over Chrome.

- [ ] **Step 6: Final commit**

```bash
git add tests/e2e/visual.spec.ts docs/SHOWCASE_QA.md README.md
git commit -m "test: seal AFFL greenfield showcase"
```

- [ ] **Step 7: Report review status**

Report only:

- project path
- branch/commit
- verification counts
- known gated data
- Safari review URL
- no claim of deployment
