import Link from "next/link";
import styles from "./modules.module.css";

export interface SlopeRow {
  teamName: string;
  franchiseId: string;
  powerRank: number;
  finalRank: number;
  netLuck: number;
}

/**
 * Team quality against schedule outcome.
 *
 * Power rank comes from all-play record — what a team's scores were worth
 * against the whole field. Final rank is what the schedule actually gave it.
 * The swing between them is the part luck explains.
 */
export function PowerLuckSlope({ rows }: { rows: SlopeRow[] }) {
  return (
    <div className={styles.slope}>
      <div className={styles.slopeHead}>
        <span>Team</span>
        <span style={{ textAlign: "center" }}>Power</span>
        <span style={{ textAlign: "center" }}>Finish</span>
        <span style={{ textAlign: "right" }}>Swing</span>
      </div>
      {rows.map((row) => {
        const swing = row.powerRank - row.finalRank;
        return (
          <Link
            key={row.franchiseId}
            href={`/franchises/${row.franchiseId}`}
            className={styles.slopeRow}
          >
            <span className={styles.teamName}>{row.teamName}</span>
            <span className={styles.slopeNum}>{row.powerRank}</span>
            <span className={styles.slopeNum}>{row.finalRank}</span>
            <span
              className={`${styles.slopeSwing} ${
                swing > 0 ? styles.up : swing < 0 ? styles.down : styles.flat
              }`}
              title={
                swing > 0
                  ? "Finished better than its scoring deserved"
                  : swing < 0
                    ? "Finished worse than its scoring deserved"
                    : "Finish matched its scoring"
              }
            >
              {swing > 0 ? `+${swing}` : swing}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
