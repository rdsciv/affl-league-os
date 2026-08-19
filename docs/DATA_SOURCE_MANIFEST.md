# Read-Only AFFL Data Source Manifest

This manifest gives future implementation agents readable access to the useful AFFL data without permission to modify legacy projects.

## Access policy

- All sources below are read-only inputs.
- Never write into a legacy AFFL project, source database, source JSON directory, or golden export directory.
- SQLite must open with URI `mode=ro` and `PRAGMA query_only=ON`.
- DuckDB must open with `read_only=True`.
- JSON and CSV sources may be parsed but not rewritten.
- New normalized snapshots, adapter outputs, and exports may be written only inside `/Users/chilly/Projects/AFFLGreenfield`.
- Never read or copy ESPN cookies, browser sessions, `.env` files, API keys, or authentication artifacts into this project.

## Primary sources

### HermesAFFL analytical DuckDB

**Path:** `/Users/chilly/Projects/HermesAFFL/warehouse/build/AFFL_platform.duckdb`

Primary for:

- Seasons and ESPN settings
- Team-season raw facts
- Standings and team-week scores
- Matchups
- Auction/draft facts
- Validated lineup slices
- Raw-file inventory
- ESPN player universe and current player ID map
- NFL weekly context
- Coverage and reconciliation tables

Known limits:

- Raw owner identities are ESPN GUIDs, not the canonical user-facing franchise crosswalk.
- 2014–2016 lineup-derived PF does not fully reconcile.
- Full weekly roster/bench and transaction coverage begins in 2018.

### ccDesktopAFFL semantic SQLite

**Path:** `/Users/chilly/Projects/ccDesktopAFFL/affl.db`

Primary for:

- Canonical internal franchise/owner mapping
- Historical team-name aliases
- Semantic season/team views
- Broader player dimension
- Management and custody metrics
- Roto tables
- Normalized transactions, waivers, and trades
- Auction value, market, cap, projection, and xTD views
- NFL player-week breadth

Identity law:

- `m01 → m07`
- `m03 → m08`
- `m20 → m10`
- Canonical owner IDs are internal continuity keys only.
- User-facing product copy uses team/franchise names, never people’s names.
- Historical seasons retain the team name used that season.
- Franchise histories aggregate all source-backed team-seasons mapped to the same canonical key.

Known limits:

- Several bio/injury/NGS/college/depth-chart warehouse tables exist but contain zero rows.
- SQLite player breadth contains duplicate GSIS groups and requires adapter-level deduplication.
- Reconstructed trade facts must remain labeled reconstructed.

## Runtime and specialist snapshots

### HermesAFFL published data

**Path:** `/Users/chilly/Projects/HermesAFFL/apps/web/data`

Use for:

- Existing evidence-labeled season and player snapshot shapes
- Fast design/prototype runtime data when the snapshot’s scope matches the requested view

Do not treat a published snapshot as more authoritative than its underlying source.

### History CC / Pillars specialist data

**Path:** `/Users/chilly/Projects/FGwebsite_cc_Pillars/public/data`

Use for read-only reference and specialist coverage such as:

- Roto presentation
- Roster Lab concepts
- H2H and records
- Boxscores
- Roster age
- Compact transaction events

Do not copy the existing UI or navigation. Do not treat opaque owner UUID aggregates as canonical identity truth.

### ccDesktopAFFL site caches

**Path:** `/Users/chilly/Projects/ccDesktopAFFL/site`

Useful read-only cache artifacts include:

- `player_bio.json`
- `injuries.json`
- `ngs.json`
- `ngs_profiles.json`
- `depthcharts.json`
- `college_stats.json`
- player and season JSON indexes

These sources must be labeled `specialist` or `cache` until warehouse-backed provenance exists.

## Golden audit exports

**Path:** `/Users/chilly/Projects/HermesAFFL/exports/golden`

Use for:

- 2024 and 2025 standings
- Matchups
- Team-week PF
- Lineups
- PF reconciliation
- Draft
- Player ID map

These are audit references, not runtime databases.

## Official artwork

**Primary read-only asset source:** `/Users/chilly/Projects/ccDesktopAFFL/site/logos`

Rules:

- Copy only official AFFL and franchise assets needed by the new project.
- Never replace a real franchise asset with a generated letter tile.
- Preserve image provenance in the greenfield asset manifest.
- UI layouts and styles from the source site are not reusable inputs.

## Product-law references

- `/Users/chilly/Projects/ccDesktopAFFL/CONTRACTS.md`
- `/Users/chilly/Projects/AFFL/AFFL_ANALYTICS_WEBSITE_SPEC.md`
- `/Users/chilly/Projects/AFFL/AFFL_SITE_MAP_DATA_CROSSWALK.md`
- `/Users/chilly/Projects/HermesAFFL/docs/CONSTITUTION.md`
- `/Users/chilly/Projects/HermesAFFL/docs/METRIC_DICTIONARY.md`

## Adapter output boundary

The future adapter may write only to greenfield-owned locations such as:

- `data/catalog/`
- `data/snapshots/`
- `data/qa/`
- `public/data/`
- `exports/`

Every output must include:

- Contract and adapter version
- Source provenance
- Source checksum or generation metadata when available
- Evidence status
- Coverage grain and period
- Missing reasons and conflicts
- Generation timestamp

No output may contain credentials, cookies, personal owner names for UI display, or arbitrary source paths exposed to the browser.
