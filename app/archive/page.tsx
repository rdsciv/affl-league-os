import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { PreviewModule } from "@/components/modules/PreviewModule";
import { TeamMark } from "@/components/data/TeamMark";
import { loadShowcase } from "@/lib/data/load";
import {
  formatInt,
  formatPoints,
  formatRecord,
  selectRecords,
  selectRivalries,
} from "@/lib/data/selectors";
import styles from "../control-room.module.css";

export const metadata: Metadata = {
  title: "Archive",
  description: "Franchise history, rivalries, and league records across every AFFL season.",
};

export default function ArchivePage() {
  const snapshot = loadShowcase();
  const rivalries = [...selectRivalries(snapshot)].sort((a, b) => b.games - a.games);
  const records = selectRecords(snapshot);

  // Franchise history is ordered by titles, then total wins — never by owner.
  const franchises = [...snapshot.franchises].sort(
    (a, b) => b.championships.length - a.championships.length || b.totals.wins - a.totals.wins,
  );

  return (
    <AppShell
      current="/archive"
      phase="Archive"
      status={[
        { label: "Franchises", value: String(snapshot.franchises.length) },
        { label: "Seasons", value: String(snapshot.seasons.length) },
        { label: "Range", value: `${snapshot.seasons[0]}–${snapshot.latestCompletedSeason}` },
      ]}
    >
      <div className={styles.grid}>
        <div className={styles.sectionLabel}>
          <h2>Franchise history</h2>
          <p>Continuity follows the franchise across every name it has used</p>
          <span className={styles.sectionRule} aria-hidden="true" />
        </div>

        <div className={styles.span12}>
          <PreviewModule
            id="archive-franchises"
            tone="lead"
            title="All-time franchise table"
            summary="Combined across team-name eras. A franchise that changed names keeps one continuous history, listed under its current name."
            rows={[]}
            evidence="verified"
            provenance={snapshot.seasonSummary.provenance}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Franchise</th>
                  <th scope="col">Seasons</th>
                  <th scope="col">Record</th>
                  <th scope="col">Titles</th>
                  <th scope="col">PF</th>
                </tr>
              </thead>
              <tbody>
                {franchises.map((f, i) => (
                  <tr key={f.franchiseId}>
                    <td className={styles.tableRank}>{i + 1}</td>
                    <th scope="row" className={styles.tableTeam}>
                      <TeamMark
                        franchiseId={f.franchiseId}
                        teamName={f.currentName}
                        size={22}
                      />
                      <Link href={`/franchises/${f.franchiseId}`}>{f.currentName}</Link>
                    </th>
                    <td>{f.seasonCount}</td>
                    <td>{formatRecord(f.totals.wins, f.totals.losses, f.totals.ties)}</td>
                    <td>{f.championships.length > 0 ? f.championships.join(", ") : "—"}</td>
                    <td>{formatPoints(f.totals.pointsFor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PreviewModule>
        </div>

        <div className={styles.span7}>
          <PreviewModule
            id="archive-rivalries"
            title="Most-played rivalries"
            summary="Head-to-head across all seasons, combined across name changes."
            rows={rivalries.slice(0, 10).map((r) => (
              <span key={`${r.franchiseA}-${r.franchiseB}`} className={styles.statLine}>
                <span className={styles.statLineLabel}>
                  {r.nameA} vs {r.nameB}
                </span>
                <b>{r.games} games</b>
                <b>
                  {r.winsA}–{r.winsB}
                  {r.ties > 0 ? `–${r.ties}` : ""}
                </b>
              </span>
            ))}
            evidence={snapshot.rivalries.evidenceStatus}
            provenance={snapshot.rivalries.provenance}
            limit={10}
          />
        </div>

        <div className={styles.span5}>
          <PreviewModule
            id="archive-records"
            title="League records"
            summary="Single-season and single-week extremes, with the season they were set."
            rows={records.map((r) => (
              <span key={r.key} className={styles.statLine}>
                <span className={styles.statLineLabel}>
                  {r.label} · {r.teamName} ({r.season})
                </span>
                <b>{r.unit === "points" ? formatPoints(r.value) : formatInt(r.value)}</b>
              </span>
            ))}
            evidence={snapshot.records.evidenceStatus}
            provenance={snapshot.records.provenance}
            limit={12}
          />
        </div>
      </div>
    </AppShell>
  );
}
