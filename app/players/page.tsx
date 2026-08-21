import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { PreviewModule } from "@/components/modules/PreviewModule";
import { loadShowcase } from "@/lib/data/load";
import { formatInt, formatPoints, selectPlayerIndex } from "@/lib/data/selectors";
import { isAvailable } from "@/lib/data/contracts";
import styles from "../control-room.module.css";

export const metadata: Metadata = {
  title: "Players",
  description: "The AFFL player universe, ranked by started value across every season on record.",
};

export default function PlayersPage() {
  const snapshot = loadShowcase();
  const players = [...selectPlayerIndex(snapshot)].sort(
    (a, b) => b.startedPoints - a.startedPoints,
  );
  const featured = isAvailable(snapshot.featuredPlayer) ? snapshot.featuredPlayer.data : null;

  return (
    <AppShell
      current="/players"
      phase="Player atlas"
      status={[
        { label: "Players indexed", value: formatInt(players.length) },
        { label: "Range", value: `${snapshot.seasons[0]}–${snapshot.latestCompletedSeason}` },
      ]}
    >
      <div className={styles.grid}>
        {featured ? (
          <section className={styles.hero}>
            <div className={styles.heroBody}>
              <h1 className={styles.heroTitle}>
                <span className={styles.heroEyebrow}>Player OS · {featured.position}</span>
                <span className={styles.heroName}>{featured.name}</span>
              </h1>
              <p className={styles.heroLede}>
                <b>{formatPoints(featured.career.startedPoints)}</b> started points across{" "}
                <b>{featured.career.seasons}</b> seasons and{" "}
                <b>{featured.career.franchises}</b> franchises — custody moves with the roster, so
                the same player appears under each team name that held him.
              </p>
              <div className={styles.heroStats}>
                <div className={styles.heroStat}>
                  <span className={styles.heroStatValue}>{formatInt(featured.career.starts)}</span>
                  <span className={styles.heroStatLabel}>Starts</span>
                </div>
                <div className={styles.heroStat}>
                  <span className={styles.heroStatValue}>
                    {formatPoints(featured.career.bestSeason?.startedPoints)}
                  </span>
                  <span className={styles.heroStatLabel}>
                    Best season · {featured.career.bestSeason?.season ?? "—"}
                  </span>
                </div>
                <div className={styles.heroStat}>
                  <span className={styles.heroStatValue}>
                    {formatPoints(featured.career.totalPoints)}
                  </span>
                  <span className={styles.heroStatLabel}>Total points</span>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {featured ? (
          <div className={styles.span12}>
            <PreviewModule
              id="player-custody"
              title={`${featured.name} — season custody`}
              summary="Each row is the team that rostered him that season, under the name used that year."
              rows={[]}
              evidence={snapshot.featuredPlayer.evidenceStatus}
              provenance={snapshot.featuredPlayer.provenance}
            >
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Season</th>
                    <th scope="col">Team</th>
                    <th scope="col">Started</th>
                    <th scope="col">Starts</th>
                    <th scope="col">PPG</th>
                  </tr>
                </thead>
                <tbody>
                  {featured.seasons.map((s) => (
                    <tr key={s.season}>
                      <td className={styles.tableRank}>{s.season}</td>
                      <th scope="row" className={styles.tableTeam}>
                        {s.teamName ?? "—"}
                      </th>
                      <td>{formatPoints(s.startedPoints)}</td>
                      <td>{formatInt(s.starts)}</td>
                      <td>{formatPoints(s.ppgStarted)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </PreviewModule>
          </div>
        ) : null}

        <div className={styles.sectionLabel}>
          <h2>Career leaders</h2>
          <p>Ranked by started points across every season on record</p>
          <span className={styles.sectionRule} aria-hidden="true" />
        </div>

        <div className={styles.span12}>
          <PreviewModule
            id="player-index"
            title="Player index"
            summary={`${formatInt(players.length)} players have started at least one AFFL lineup.`}
            rows={[]}
            evidence={snapshot.playerIndex.evidenceStatus}
            provenance={snapshot.playerIndex.provenance}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Player</th>
                  <th scope="col">Pos</th>
                  <th scope="col">Seasons</th>
                  <th scope="col">Started</th>
                  <th scope="col">Last team</th>
                </tr>
              </thead>
              <tbody>
                {players.slice(0, 50).map((p, i) => (
                  <tr key={p.playerId}>
                    <td className={styles.tableRank}>{i + 1}</td>
                    <th scope="row" className={styles.tableTeam}>
                      {p.name}
                    </th>
                    <td>{p.position}</td>
                    <td>{p.seasons}</td>
                    <td>{formatPoints(p.startedPoints)}</td>
                    <td>{p.lastTeamName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PreviewModule>
        </div>
      </div>
    </AppShell>
  );
}
