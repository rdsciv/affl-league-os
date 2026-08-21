import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { PreviewModule } from "@/components/modules/PreviewModule";
import { TeamMark } from "@/components/data/TeamMark";
import { loadShowcase } from "@/lib/data/load";
import {
  formatPoints,
  formatRecord,
  ordinal,
  selectFranchise,
  selectFranchiseTimeline,
} from "@/lib/data/selectors";
import styles from "../../control-room.module.css";

/** Static export needs every franchise route enumerated at build time. */
export function generateStaticParams() {
  return loadShowcase().franchises.map((f) => ({ franchiseId: f.franchiseId }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ franchiseId: string }>;
}): Promise<Metadata> {
  const { franchiseId } = await params;
  const franchise = selectFranchise(loadShowcase(), franchiseId);
  return {
    title: franchise?.currentName ?? "Franchise",
    description: franchise
      ? `${franchise.currentName} — ${franchise.seasonCount} seasons of AFFL history across every team name used.`
      : undefined,
  };
}

/**
 * Franchise history.
 *
 * Continuity is the franchise, exactly like a pro team that relocates or
 * renames: the record carries across every era. The page therefore shows the
 * CURRENT name as the heading, each season under the name used THAT season,
 * and never a person's name.
 */
export default async function FranchisePage({
  params,
}: {
  params: Promise<{ franchiseId: string }>;
}) {
  const { franchiseId } = await params;
  const snapshot = loadShowcase();
  const franchise = selectFranchise(snapshot, franchiseId);
  if (!franchise) notFound();

  const timeline = selectFranchiseTimeline(franchise);
  const eras = franchise.nameEras;

  return (
    <AppShell
      current="/archive"
      phase="Franchise"
      status={[
        { label: "Seasons", value: String(franchise.seasonCount) },
        { label: "First", value: String(franchise.firstSeason) },
        { label: "Latest", value: String(franchise.lastSeason) },
        { label: "Titles", value: String(franchise.championships.length) },
      ]}
    >
      <div className={styles.grid}>
        <section className={`${styles.hero} u-grain`}>
          <span className="u-streaks u-liquid-cool" aria-hidden="true" />
          <div className={styles.heroBody}>
            <h1 className={styles.heroTitle}>
              <span className={styles.heroEyebrow}>
                AFFL franchise · {franchise.firstSeason}–{franchise.lastSeason}
              </span>
              <span className={`${styles.heroName} u-liquid u-liquid-cool`}>
                {franchise.currentName}
              </span>
            </h1>
            <p className={styles.heroLede}>
              <b>{formatRecord(franchise.totals.wins, franchise.totals.losses, franchise.totals.ties)}</b>{" "}
              across <b>{franchise.seasonCount}</b> seasons
              {eras.length > 1 ? (
                <>
                  {" "}
                  under <b>{eras.length}</b> team names. History carries across every name change.
                </>
              ) : (
                "."
              )}
              {franchise.hiatusSeasons.length > 0 ? (
                <> Seasons away from the league are shown as hiatus, never as zeros.</>
              ) : null}
            </p>

            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue}>{franchise.championships.length}</span>
                <span className={styles.heroStatLabel}>
                  {franchise.championships.length > 0
                    ? `Titles · ${franchise.championships.join(", ")}`
                    : "Titles"}
                </span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue}>
                  {franchise.totals.bestFinish ? ordinal(franchise.totals.bestFinish) : "—"}
                </span>
                <span className={styles.heroStatLabel}>Best finish</span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue}>
                  {formatPoints(franchise.totals.pointsFor)}
                </span>
                <span className={styles.heroStatLabel}>Points for</span>
              </div>
            </div>
          </div>

          <div className={styles.heroCrest}>
            <TeamMark
              franchiseId={franchise.franchiseId}
              teamName={franchise.currentName}
              size={112}
            />
          </div>
        </section>

        {eras.length > 1 ? (
          <div className={styles.span12}>
            <PreviewModule
              id="franchise-eras"
              title="Name eras"
              summary="One franchise, several names. Each era keeps the name that was actually used at the time."
              rows={eras.map((era) => (
                <span key={`${era.teamName}-${era.from}`} className={styles.statLine}>
                  <span className={styles.statLineLabel}>{era.teamName}</span>
                  <b>
                    {era.from}
                    {era.to !== era.from ? `–${era.to}` : ""}
                  </b>
                </span>
              ))}
              evidence="verified"
              provenance={snapshot.seasonSummary.provenance}
              limit={eras.length}
            />
          </div>
        ) : null}

        <div className={styles.span12}>
          <PreviewModule
            id="franchise-timeline"
            tone="lead"
            title="Season by season"
            summary="Every season this franchise played, under the name used that season."
            rows={[]}
            evidence="verified"
            provenance={snapshot.seasonSummary.provenance}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Season</th>
                  <th scope="col">Team name that season</th>
                  <th scope="col">Record</th>
                  <th scope="col">Finish</th>
                  <th scope="col">PF</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((entry) =>
                  entry.kind === "hiatus" ? (
                    <tr key={`hiatus-${entry.season}`} className={styles.tableHiatus}>
                      <td className={styles.tableRank}>{entry.season}</td>
                      <th scope="row" className={styles.tableTeam}>
                        Hiatus
                      </th>
                      <td colSpan={3}>Did not field a team this season</td>
                    </tr>
                  ) : (
                    <tr key={entry.season} data-testid="franchise-season">
                      <td className={styles.tableRank}>{entry.season}</td>
                      <th scope="row" className={styles.tableTeam}>
                        <TeamMark
                          franchiseId={franchise.franchiseId}
                          teamName={entry.alias.teamName}
                          season={entry.season}
                          size={20}
                        />
                        {entry.alias.teamName}
                      </th>
                      <td>{formatRecord(entry.alias.wins, entry.alias.losses, 0)}</td>
                      <td>{entry.alias.finalRank ? ordinal(entry.alias.finalRank) : "—"}</td>
                      <td>{formatPoints(entry.alias.pointsFor)}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </PreviewModule>
        </div>
      </div>
    </AppShell>
  );
}
