import { describe, expect, it } from "vitest";
import {
  selectAdaptiveHome,
  selectFranchise,
  selectPowerVsFinish,
  selectSeasonSummary,
  selectStandingsPreview,
  summarisePointSources,
} from "@/lib/data/selectors";
import { loadShowcase } from "@/lib/data/load";

const snapshot = loadShowcase();

describe("selectAdaptiveHome", () => {
  it("uses off-season mode before a real 2026 draft season exists", () => {
    expect(
      selectAdaptiveHome(
        { latestCompletedSeason: 2025, activeSeason: null },
        new Date("2026-08-19"),
      ),
    ).toBe("off-season");
  });

  it("switches to in-season only when a real active season exists", () => {
    expect(
      selectAdaptiveHome(
        { latestCompletedSeason: 2025, activeSeason: 2026 },
        new Date("2026-10-01"),
      ),
    ).toBe("in-season");
  });

  it("never infers a season from the calendar alone", () => {
    // September would look like football season, but planning membership
    // must not create a statistical season.
    expect(
      selectAdaptiveHome(
        { latestCompletedSeason: 2025, activeSeason: null },
        new Date("2026-09-15"),
      ),
    ).toBe("off-season");
  });
});

describe("snapshot integrity", () => {
  it("loads a verified snapshot with no 2026 season", () => {
    expect(snapshot.contractVersion).toBe("affl-readonly-v1");
    expect(snapshot.latestCompletedSeason).toBe(2025);
    expect(snapshot.activeSeason).toBeNull();
    expect(snapshot.seasons).not.toContain(2026);
  });

  it("exposes a season summary for the latest completed season", () => {
    const summary = selectSeasonSummary(snapshot, 2025);
    expect(summary?.champion?.teamName).toBeTruthy();
    expect(summary?.standings.length).toBeGreaterThan(0);
  });
});

describe("selectStandingsPreview", () => {
  it("returns at most five rows so a preview never becomes a table", () => {
    const rows = selectStandingsPreview(snapshot, 2025);
    expect(rows.length).toBeLessThanOrEqual(5);
    expect(rows[0]?.teamName).toBeTruthy();
  });
});

describe("selectPowerVsFinish", () => {
  it("separates team quality from schedule outcome", () => {
    const rows = selectPowerVsFinish(snapshot, 2025);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(typeof row.powerRank).toBe("number");
      expect(typeof row.finalRank).toBe("number");
    }
  });
});

describe("selectFranchise", () => {
  it("labels a renamed franchise with its latest name and keeps era history", () => {
    const renamed = snapshot.franchises.find((f) => f.nameEras.length > 1);
    expect(renamed).toBeDefined();
    const franchise = selectFranchise(snapshot, renamed!.franchiseId);
    expect(franchise?.currentName).toBe(renamed!.nameEras.at(-1)?.teamName);
    expect(franchise!.seasonAliases.length).toBeGreaterThan(1);
  });

  it("keeps a hiatus as a gap rather than a fabricated season", () => {
    const gapped = snapshot.franchises.find((f) => f.hiatusSeasons.length > 0);
    expect(gapped).toBeDefined();
    const played = new Set(gapped!.seasonAliases.map((a) => a.season));
    for (const year of gapped!.hiatusSeasons) {
      expect(played.has(year)).toBe(false);
    }
  });
});

describe("summarisePointSources", () => {
  it("splits started value by acquisition source", () => {
    const summary = summarisePointSources(snapshot, 2025);
    expect(summary).not.toBeNull();
    expect(summary!.segments.map((s) => s.key).sort()).toEqual(
      ["drafted", "freeAgent", "tradedIn", "waiver"].sort(),
    );
  });
});
