# AFFL Greenfield — League OS

A fresh-start AFFL product: a dense adaptive **Control Room**, a searchable
**Data Atlas**, and an editorial **League Journal** export system.

No existing AFFL UI branch, component system, or page composition is inherited.

## What this is

| Surface | System | Purpose |
| --- | --- | --- |
| `/` | Control Room | Adaptive Now page — off-season Auction HQ + latest completed season |
| `/season` | Control Room | Compact season intelligence with preview→explorer modules |
| `/front-office` | Control Room | Auction, management, point-source and transaction previews |
| `/players`, `/players/[espnId]` | Data Atlas | Player search and Player OS profiles |
| `/franchises/[franchiseId]` | Data Atlas | Combined franchise history across team-name eras |
| `/archive` | Data Atlas | Rivalries, records, trends, Wrapped entry points |
| `/exports/[storyId]` | League Journal | Shareable editorial graphics (1200×630 and 1080×1350) |

## Data posture

Every legacy AFFL source is **read-only**. The Python adapter in `scripts/`
opens DuckDB with `read_only=True` and SQLite with `mode=ro` +
`PRAGMA query_only=ON`, then writes evidence-aware snapshots into
`data/generated/`. The browser never touches a database file, and no database
path or credential reaches the client.

Every domain response carries a `DataEnvelope`: contract version, evidence
status (`verified` | `reconstructed` | `unavailable`), coverage grain and
period, provenance, and a missing reason. **Missing values never become zero,
NaN, an empty string, or a fabricated rank.**

## Identity law

- Owner identifiers are internal continuity keys only.
- User-facing UI never displays a person's real name — team names only.
- Each season shows the team name used *in that season*.
- A franchise view uses the current/latest team name and preserves every
  historical name in its timeline.
- A hiatus is a gap in the timeline, not a new franchise.
- No franchise season count is hardcoded.

## Commands

```bash
npm run dev          # dev server on :3459
npm run data:assets  # copy official artwork with provenance
npm run data:build   # regenerate data/generated snapshots
npm run data:qa      # run the binding data gates
npm run typecheck
npm test             # vitest unit + component
npm run test:e2e     # playwright, isolated browser profile
npm run verify       # the full gate
```

## Docs

- Product/design PRD: [`docs/superpowers/specs/2026-08-19-affl-greenfield-design.md`](docs/superpowers/specs/2026-08-19-affl-greenfield-design.md)
- Read-only source inventory: [`docs/DATA_SOURCE_MANIFEST.md`](docs/DATA_SOURCE_MANIFEST.md)
- Showcase QA and slop audit: [`docs/SHOWCASE_QA.md`](docs/SHOWCASE_QA.md)
