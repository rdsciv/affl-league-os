# AFFL Greenfield League OS and Data Atlas PRD

**Status:** Draft for user review  
**Date:** 2026-08-19  
**Product:** AFFL League OS  
**Project posture:** Greenfield. No existing AFFL UI layout or component code is inherited.

## Problem Statement

The existing AFFL websites contain valuable features and data, but the product experience is fragmented and repetitive. The latest redesign attempt repaired bugs without delivering a new product composition. It retained long pages, full tables as default content, excessive vertical whitespace, a mostly monochrome visual system, and the old information architecture.

The data is also split across multiple stores with different strengths. Raw source identities, historical team names, owner aliases, player mappings, transaction coverage, and derived metrics can disagree or have different coverage. A page can therefore look complete while omitting franchise seasons or presenting unavailable data as fact.

AFFL needs a fresh product that:

1. Feels like a real league product rather than a database dump.
2. Provides fast access to every useful league, team, player, auction, management, transaction, rivalry, and historical view.
3. Uses progressive disclosure instead of rendering every table in full.
4. Preserves franchise continuity across team-name changes and hiatuses.
5. Produces clean, shareable editorial graphics for WhatsApp and social use.
6. Reads all legacy data sources without mutating them.
7. Makes data quality, provenance, and unavailable coverage explicit.

## Product Thesis

AFFL is a league control room backed by a searchable data atlas.

- **Control Room:** the fast, colorful, adaptive home for the current league state.
- **Data Atlas:** the searchable, filterable workspace for seasons, franchises, players, auctions, management, transactions, and history.
- **League Journal:** the editorial export system that turns verified results into clean graphics and shareable links.

The product must be visually original. It may harvest data definitions, official AFFL/franchise artwork, and proven feature concepts from legacy projects, but it must not copy an existing page composition, navigation shell, card layout, or styling system.

## Surface Model

The primary surface is **Monitor**: current league state and season truth should be understandable at a glance.

The secondary surface is **Command / Inspect**: users can search, filter, open an entity, and drill into underlying evidence without leaving the current context.

The sharing surface is **Editorial**: selected data becomes a designed story rather than a screenshot of the analytical UI.

## Adaptive Homepage

The homepage changes by league state.

### In season

The default view is the current scoring week:

- Matchup scoreboard and live/final state
- Standings movement
- High scorer and notable matchup
- Current injuries and roster-impact context
- Recent waiver, free-agent, and trade activity
- Quick access to team and player inspectors
- Current-week story feed

### Off-season

The default view is Auction HQ plus the latest completed season:

- Latest champion, Sacco, standings, Power, and key season conclusions
- Auction board and team budget architecture
- Player market and historical price context
- Current roster/planning membership clearly separated from completed AFFL seasons
- Recent franchise-history changes
- Entry points to Wrapped and the complete archive

There is no AFFL 2026 statistical season before the draft. Planning membership never creates standings, team-season records, or player-career seasons.

## Information Architecture

### Now

Adaptive Control Room for the current league state.

### Season

- Overview and standings
- Power and luck
- Matchups and scoring
- Roto standings and skill radar
- Teams and season dossiers
- Playoffs and championship bracket

### Front Office

- Auction board
- Budget allocation and roster construction
- Auction return
- Management and optimal-lineup review
- Point sources
- Waivers and free agency
- Trades
- Roster churn and ownership stints

### Players

- Searchable AFFL player universe
- AFFL career and season history
- Auction prices and market context
- Team custody timeline
- Weekly starts and scoring
- Management usage
- NFL context when the identity join is verified

### Archive

- Franchise histories
- Rivalries and head-to-head
- Record book
- Historical standings and Power
- Scoring and league trends
- Wrapped and awards
- Data dictionary and coverage

### Global command bar

The command bar must support:

- Direct navigation to any franchise, player, season, matchup, or metric
- Structured natural-language questions such as “Who drafts the tallest wide receivers?”
- Visible interpretation of the question before results are displayed
- Only allowlisted, deterministic data operations
- No arbitrary database SQL from the browser
- Results with evidence status, provenance, and an Open table action

## Density and Progressive Disclosure

Full tables are never the default page composition.

Every analytical module starts as one of:

1. A conclusion card with one primary result.
2. A mini preview containing two to five rows.
3. A small chart with the important comparison already stated.
4. A collapsed section with a clear count and summary.

Every module may provide:

- Expand inline
- Open focused explorer
- Open full table
- Compare entities
- Export data
- Share graphic

Default pages should normally fit within one to three desktop screens. Long tables live in focused explorers with sticky filters, column controls, search, pagination or virtualization, and a return-to-context action.

Cards must not all have equal visual weight. Each screen has one primary question, one primary result, and secondary modules organized around it.

## Visual Direction

### Composition

- Dense sports Control Room for Now and Season
- Searchable, split-pane Data Atlas for deep analysis
- Editorial League Journal layouts for exports, Wrapped, and selected history pages

### Color

- Official AFFL mark and official franchise art only
- Near-black, navy, cream, and white foundations may coexist
- Strong team colors may identify entities and comparisons
- Semantic color distinguishes score, phase, evidence, positive/negative change, and acquisition source
- The product must not collapse into one blue-on-black visual treatment
- Avoid rainbow decoration; color must carry information or league identity

### Typography

- Compact, high-information sans serif for analytical workspaces
- Strong display face for league headlines and exports
- Tabular numerals for scores and tables
- Type scale and alignment create hierarchy before boxes and borders

### Motion

- Motion explains score changes, expanding modules, drawer continuity, and export generation
- No looping decorative motion
- Respect reduced-motion preferences

## Franchise and Identity Law

A franchise’s history follows the internal canonical owner identity across team-name changes and hiatuses, like the Raiders across Oakland, Los Angeles, and Las Vegas.

Binding rules:

1. Owner/person identifiers are internal continuity keys only.
2. User-facing pages never display an owner’s real name.
3. User-facing pages always use team names.
4. Each season displays the team name used in that season.
5. A combined franchise view uses the current or most recent team name as its main label and preserves every historical team name in its timeline.
6. A hiatus creates a gap in the timeline, not a new franchise.
7. A return after a hiatus continues the same franchise history when the source identity mapping supports it.
8. No exact franchise-season count is hardcoded as a build gate.
9. QA fails when a source-backed team-season is omitted, duplicated, or assigned to the wrong canonical franchise.
10. Owner aliases and ESPN GUID changes are resolved through an explicit identity crosswalk, never through team-name guessing.

## Data Architecture

The greenfield project receives a separate, read-only, evidence-aware data adapter.

### Source roles

- **DuckDB Ledger:** verified seasons, settings, standings, matchups, team-week scores, draft facts, validated lineup slices, raw-source inventory, player map, and NFL context.
- **SQLite semantic warehouse:** canonical franchise identity, team aliases, broader player universe, management metrics, roto, normalized transactions, waivers, custody, auction-value views, and richer analytical views.
- **Published JSON:** versioned runtime snapshots and specialist cache data.
- **Golden exports:** auditable 2024–2025 reconciliation references.

### Access rules

- SQLite opens with read-only URI mode and query-only enforcement.
- DuckDB opens with `read_only=True`.
- Legacy JSON is parsed read-only.
- Legacy project files and databases are never changed by the site or build.
- The browser never reads a database file directly.
- The adapter generates versioned, normalized snapshots into the greenfield project.
- Claude receives an allowlisted data catalog and query interface, not arbitrary filesystem or SQL access.

### Data envelope

Every domain response contains:

- Contract version
- Domain and grain
- Data or null
- Evidence status: verified, reconstructed, or unavailable
- Coverage period
- Missing reason when unavailable
- Source provenance
- Adapter/query version
- Warnings and conflicts

An empty array means the source covers the request and found no rows. Unavailable data is null with a reason. Missing values must never become zero, NaN, an empty string, a fabricated rank, or a fabricated record.

## Data QA Gate

The data adapter and snapshots must pass these checks before product modules are enabled.

### Identity

- Every team-season resolves to exactly one canonical franchise.
- No canonical franchise controls multiple teams in one season.
- Every source alias and ESPN GUID maps explicitly or remains unresolved.
- Historical team names remain attached to their actual seasons.
- Canonical franchise history aggregates across supported aliases without displaying real owner names.
- Zero-team planning identities do not create historical participation.

### League facts

- Seasons are exactly 2014–2025 until the 2026 draft creates a real season.
- Team counts are ten for 2014–2016 and twelve for 2017–2025.
- Team-season keys are unique and reconcile across authoritative sources.
- Standings, final ranks, seeds, team-week scores, matchups, and auction picks are complete for the seasons claimed available.
- 2017–2025 team-week PF reconciliation passes within the documented tolerance.
- 2014–2016 lineup-derived detail remains unavailable where reconciliation fails.

### Players

- The canonical AFFL-touched universe includes lineup, auction, roster, and transaction appearances.
- Duplicate ESPN or GSIS identities are rejected.
- DST is modeled separately from human players.
- Player records without display name or position are blocked from polished Player OS presentation until resolved or clearly labeled.
- 2018–2025 supports full weekly roster and transaction history.
- 2017 supports starter scoring only unless stronger evidence is proven.
- 2014–2016 supports team, auction, and reconstructed career summaries only.
- NFL-only 2026 player context never creates an AFFL 2026 player season.

### Transactions and derived metrics

- Exact transaction and waiver coverage begins in 2018.
- Pre-2018 waivers, benches, and ownership stints remain unavailable.
- Reconstructed trades remain labeled reconstructed and include confidence.
- Derived management, roto, point-source, auction, cap, projection, and xTD metrics carry formula and version provenance.
- Bio, injury, NGS, college, and depth-chart cache data remains labeled cache/specialist until warehouse-backed provenance exists.

Modules that fail coverage remain visible only as clearly explained unavailable previews; they do not silently render partial tables as complete.

## Feature Requirements

### Season Control Room

- Adaptive current-week or completed-season view
- Compact standings and movement preview
- Power and luck conclusion cards
- Matchup cards with team totals and player-line expansion
- Weekly score story and notable games
- Roto snapshot and selected team skill profile
- Playoff/championship state

### Auction

- Full auction board available through focused explorer
- Team budget architecture previews
- Position, age, stars-and-scrubs, and balanced-build analysis
- Auction return and started points per dollar
- Stacks, homers, handcuffs, and drafted-player injuries when supported
- Historical player price and comparable-auction context

### Management

- Actual versus optimal lineup
- Management Score and Points Left on Bench together
- Decisions that changed matchup results
- Correct Decision Rate by position
- Roster churn and unique starters
- Preview cards that open weekly decision explorers

### Point Sources

- Started points reconciled to Drafted, Traded, Waiver Wire, or Free Agency
- Weekly and positional source breakdown
- Ownership-stint timeline
- Franchise tendencies across seasons
- Exact reconciliation to Points Forced where source coverage exists

### Waivers and Trades

- Claims, adds, drops, bids, immediate stream points, total return, and drop regret
- Trade asset ledger and realized started-point return
- Partner and activity summaries
- No winner grade until source history and grading policy are verified

### Teams / Franchises

- Combined franchise history under the current/latest team name
- Historical alias timeline
- Season dossiers
- Championships, finishes, Power, roto, auction, management, point sources, transactions, and records
- No real owner names in user-facing UI

### Players

- Search and command-bar access
- AFFL career overview
- Season-by-season team names, auction price, starts, scoring, and custody
- Weekly log and usage
- NFL context separated from AFFL Ledger facts
- Comparable players and auction cohorts
- Context unavailable states rather than zeros

### Rivals and History

- Head-to-head record, points, margins, streaks, playoffs, notable games, and trades
- Schedule balance
- Record book
- Franchise and league trends
- Historical season and championship explorer

### Wrapped and Awards

- Generated only from metrics already verified elsewhere
- Editorial, shareable season narrative
- Champion, Sacco, standings, Power, luck, roto, management, auction, transaction, player, injury, age, and matchup stories when supported
- Missing modules are omitted or labeled unavailable; never zero-filled

## Sharing and Export System

Every eligible module can generate:

1. **1200×630 link card** for rich previews.
2. **1080×1350 portrait graphic** for social posting.
3. **WhatsApp-friendly image and short link.**
4. **Copyable plain-language result** with context.
5. **CSV export** for underlying rows.
6. **Focused table export** with active filters and provenance.

Export graphics use League Journal composition:

- One result per graphic
- Official AFFL and franchise artwork
- Strong headline and clear season/scope
- Minimal supporting numbers
- Source/evidence footer
- No screenshot of application chrome

Share links preserve selected season, phase, franchise/player, metric, filters, and module state. They must open to a clean focused view with an appropriate preview image.

## User Stories

1. As a league member, I want the current week summarized immediately, so that I can understand what matters without opening several tables.
2. As a league member, I want the homepage to adapt in the off-season, so that the site remains useful before games begin.
3. As a commissioner, I want complete franchise continuity across team-name changes, so that history does not disappear when a team is renamed.
4. As a league member, I want each historical season to use the team name from that season, so that the archive remains authentic.
5. As a league member, I do not want real owner names shown, so that the product speaks in league/franchise language.
6. As a league member, I want summary cards instead of full default tables, so that pages remain readable and compact.
7. As a data-oriented member, I want to open the complete table when needed, so that progressive disclosure does not hide data.
8. As a user, I want drawers and focused explorers to preserve my filters and page context, so that drilling down does not feel like restarting.
9. As a user, I want to search any season, franchise, player, matchup, or metric from one command bar, so that navigation is fast.
10. As a user, I want natural-language questions interpreted visibly, so that I know what the system actually queried.
11. As a user, I want every answer to show its evidence status, so that reconstructed results are not mistaken for verified facts.
12. As a user, I want unavailable data explained instead of rendered as zero, so that missing coverage is honest.
13. As a league member, I want actual standings, Power, luck, and scoring views, so that team quality and schedule outcome are separate.
14. As a league member, I want roto and skill profiles, so that roster strengths are visible beyond fantasy scoring totals.
15. As a league member, I want matchup cards to expand into player lines, so that I can understand how games were won.
16. As a league member, I want auction budget and return views, so that roster construction can be evaluated.
17. As a league member, I want management previews to identify costly decisions, so that owner performance is understandable without a giant report.
18. As a league member, I want every started point assigned to an acquisition source where evidence exists, so that team-building style is measurable.
19. As a league member, I want waiver and free-agent results separated, so that different acquisition methods are not conflated.
20. As a league member, I want trades shown as an asset ledger before winner grades, so that uncertain history is not overstated.
21. As a league member, I want franchise pages that combine all supported aliases, so that long-term records follow the franchise.
22. As a league member, I want player pages with AFFL custody and prices, so that player history belongs to this league rather than a generic NFL database.
23. As a league member, I want NFL context separated from AFFL scoring truth, so that external stats never rewrite league results.
24. As a league member, I want rivalry and schedule-balance explorers, so that historical matchups are easy to investigate.
25. As a league member, I want Wrapped to feel like a designed annual story, so that it is enjoyable to share.
26. As a league member, I want any useful result exported as a clean graphic, so that I can post it without screenshotting application chrome.
27. As a WhatsApp group member, I want shared links to open a focused result with a clean preview, so that conversations start with the insight.
28. As an analyst, I want CSV and filtered-table exports, so that I can continue analysis outside the site.
29. As a commissioner, I want the adapter to read legacy databases without writing to them, so that the new site cannot corrupt league history.
30. As a maintainer, I want identity, coverage, and reconciliation tests to gate published modules, so that future redesigns do not reintroduce data mistakes.

## Implementation Decisions

- Create a completely separate repository and application.
- Do not start from a current AFFL branch or copy an existing UI shell.
- Official visual assets and verified data definitions may be copied into the greenfield destination with provenance.
- Use one web application for Control Room, Data Atlas, Player OS, Archive, and exports.
- Use a build-time/server-side read-only adapter to generate runtime snapshots.
- Keep database paths and credentials server-side.
- Use a component system designed around preview modules, drawers, explorers, and exportable story cards.
- Use responsive layouts at desktop, tablet, and mobile sizes.
- Deep table routes use virtualization or pagination where row volume requires it.
- Natural-language questions compile to allowlisted domain operations; no model-generated arbitrary SQL reaches a data source.
- Social graphics render from dedicated export templates, not DOM screenshots of the app.
- Initial showcase scope must demonstrate the complete product language without pretending every historical module is already verified.

## Initial Showcase Release

The first Claude-designed release must include real, connected examples of:

1. Adaptive off-season Now page using the latest completed season and Auction HQ.
2. Season Control Room with standings, Power/luck, matchup, and roto previews.
3. A focused explorer proving that preview cards can open complete data.
4. One combined franchise page with historical team-name timeline.
5. Player search and one real Player OS profile.
6. Front Office page with auction, management, and point-source previews.
7. Archive page with rivalry, records, and Wrapped entry points.
8. Global command bar with deterministic example questions.
9. One League Journal export shown in 1200×630 and 1080×1350 formats.
10. Responsive desktop and mobile compositions.

The initial showcase may gate incomplete deep modules, but every visible number must come through the read-only contract or be clearly labeled design-only placeholder content. Design-only placeholders must never look like verified AFFL facts.

## Testing Decisions

### Data tests

- Identity crosswalk and unique team-season ownership
- Franchise aggregation across historical aliases
- No user-facing owner names
- Team counts and season-key uniqueness
- Standings and draft completeness
- PF reconciliation and historical coverage gates
- Player identity uniqueness and missing-display checks
- No fake AFFL 2026 season
- Missingness and provenance envelope validation

### Product tests

- Adaptive home state
- Preview-to-explorer behavior
- Drawer and filter persistence
- Full-table accessibility without default table dumps
- Command-bar interpretation and deterministic operations
- Share-link state restoration
- Export dimensions, content, and evidence footer
- Responsive layout and page-level overflow
- Keyboard navigation, focus state, reduced motion, and contrast
- Console, network, and broken-asset checks

### Visual QA

- Desktop and mobile screenshots for every top-level surface
- Verify no page defaults to a long table stack
- Verify no generic equal-card grid dominates a screen
- Verify official logos are used without distortion
- Verify team colors identify entities without reducing readability
- Run explicit AI-design slop audit before user review

## Success Criteria

The product succeeds when a league member can:

1. Understand the current or latest season within seconds.
2. Reach any verified entity or metric from one search or two navigation steps.
3. Expand only the data they want.
4. Open complete tables without losing context.
5. See a franchise’s complete supported history across team-name changes.
6. Open a player and understand his AFFL auction, custody, starts, points, and NFL context.
7. Share a clean league graphic in WhatsApp without manual editing.
8. Trust that every visible number is verified, reconstructed, or explicitly unavailable.

## Out of Scope

- Mutating any legacy database or legacy project
- Starting from the existing AFFL static site or current main branch
- Reusing an existing page composition or CSS shell
- Displaying owner/person names in the product
- Arbitrary SQL access from the browser or Claude
- Creating an AFFL 2026 statistical season before the draft
- Inventing pre-2018 weekly rosters, benches, waivers, or transaction history
- Trade winner grades before the source history and grading contract are verified
- Native mobile applications
- Multi-league support in the initial release

## Further Notes

This PRD describes the complete product and a focused initial showcase. Data QA precedes publication, but the adapter may resolve cross-source identity and coverage issues without rewriting legacy sources. The new repository owns only its adapter code, normalized snapshots, application code, tests, and exports.
