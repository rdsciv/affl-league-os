import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { PreviewModule } from "@/components/modules/PreviewModule";
import { StandingsPreview } from "@/components/modules/CompactStandings";
import { PowerLuckSlope } from "@/components/modules/PowerLuckSlope";
import { MatchupCard } from "@/components/modules/MatchupPulse";
import { TeamMark } from "@/components/data/TeamMark";
import { loadShowcase } from "@/lib/data/load";
import {
  formatPoints,
  formatRecord,
  ordinal,
  selectNotableMatchups,
  selectPowerVsFinish,
  selectSeasonSummary,
  selectStandings,
} from "@/lib/data/selectors";
import styles from "../control-room.module.css";

export const metadata: Metadata = {
  title: "Season",
  description: "Every completed AFFL season: final standings, power against finish, and notable games.",
};

/**
 * Season room.
 *
 * A static export cannot read a query string at build time, so the season
 * picker is a set of real links to prerendered pages rather than a filter on
 * one page. Every season the adapter published gets its own URL.
 */
export default function SeasonPage() {
  const snapshot = loadShowcase();
  const season = snapshot.latestCompletedSeason;
  const summary = selectSeasonSummary(snapshot, season);
  const standings = selectStandings(snapshot, season);
  const powerRows = selectPowerVsFinish(snapshot, season);
  const matchups = selectNotableMatchups(snapshot, 4);

  const franchiseOf = (teamId: number) =>
    standings.find((t) => t.teamId === teamId)?.franchiseId;

  return (
    <AppShell
      current="/season"
      phase={`Season ${season}`}
      status={[
        { label: "Seasons on record", value: String(snapshot.seasons.length) },
        { label: "Range", value: `${snapshot.seasons[0]}–${snapshot.latestCompletedSeason}` },
        { label: "Teams", value: String(summary?.teamCount ?? standings.length) },
      ]}
    >
      <div className={styles.grid}>
        <div className={styles.sectionLabel}>
          <h2>Season {season}</h2>
          <p>The most recent completed season, in full</p>
          <span className={styles.sectionRule} aria-hidden="true" />
        </div>

        <div className={styles.span12}>
          <PreviewModule
            id="season-standings"
            tone="lead"
            title={`${season} final standings`}
            summary="Every team, ordered by final finish. Power rank is all-play quality; the swing is what the schedule added or removed."
            conclusion={summary?.champion?.teamName ?? "—"}
            conclusionNote={
              summary?.champion
                ? `took the ${season} title. ${summary.sacco ? `${summary.sacco.teamName} finished last.` : ""}`
                : undefined
            }
            rows={[]}
            evidence="verified"
            provenance={snapshot.seasonSummary.provenance}
            limit={standings.length}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Team</th>
                  <th scope="col">Record</th>
                  <th scope="col">PF</th>
                  <th scope="col">PA</th>
                  <th scope="col">Power</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((t, i) => (
                  <tr key={t.teamId}>
                    <td className={styles.tableRank}>{t.finalRank ?? i + 1}</td>
                    <th scope="row" className={styles.tableTeam}>
                      <TeamMark
                        franchiseId={t.franchiseId}
                        teamName={t.teamName}
                        season={season}
                        size={22}
                      />
                      <Link href={`/franchises/${t.franchiseId}`}>{t.teamName}</Link>
                    </th>
                    <td>{formatRecord(t.wins, t.losses, t.ties)}</td>
                    <td>{formatPoints(t.pointsFor)}</td>
                    <td>{formatPoints(t.pointsAgainst)}</td>
                    <td>{t.powerRank ? ordinal(t.powerRank) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PreviewModule>
        </div>

        <div className={styles.span7}>
          <PreviewModule
            id="season-power"
            title="Power against finish"
            summary="Where the schedule helped and where it did not. Left is quality, right is result."
            rows={[]}
            evidence="verified"
            provenance={snapshot.seasonSummary.provenance}
          >
            <PowerLuckSlope rows={powerRows} />
          </PreviewModule>
        </div>

        <div className={styles.span5}>
          <PreviewModule
            id="season-top"
            title="Top of the table"
            summary="The teams that finished highest, with their season line."
            rows={standings.slice(0, 5).map((team) => (
              <StandingsPreview key={team.teamId} teams={[team]} />
            ))}
            evidence="verified"
            provenance={snapshot.seasonSummary.provenance}
          />
        </div>

        <div className={styles.span12}>
          <PreviewModule
            id="season-matchups"
            title="Notable games"
            summary={`The highest-combined matchups of ${season}.`}
            rows={[]}
            evidence={snapshot.matchups.evidenceStatus}
            provenance={snapshot.matchups.provenance}
          >
            <div className={styles.stack}>
              {matchups.map((m) => (
                <MatchupCard key={`${m.week}-${m.teamId}`} matchup={m} franchiseOf={franchiseOf} />
              ))}
            </div>
          </PreviewModule>
        </div>

        <div className={styles.sectionLabel}>
          <h2>All seasons</h2>
          <p>{snapshot.seasons.length} on record</p>
          <span className={styles.sectionRule} aria-hidden="true" />
        </div>

        <div className={styles.span12}>
          <div className={styles.chipRow}>
            {[...snapshot.seasons].reverse().map((s) => {
              const sum = selectSeasonSummary(snapshot, s);
              return (
                <div key={s} className={styles.chip}>
                  <span className={styles.chipSeason}>{s}</span>
                  <span className={styles.chipName}>{sum?.champion?.teamName ?? "—"}</span>
                  <span className={styles.chipNote}>champion</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
