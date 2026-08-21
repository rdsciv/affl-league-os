import Link from "next/link";
import type { AuctionPick } from "@/lib/data/contracts";
import { formatMoney, formatPoints } from "@/lib/data/selectors";
import { TeamMark } from "@/components/data/TeamMark";
import styles from "./modules.module.css";

export interface BudgetRow {
  teamId: number;
  teamName: string;
  spend: number;
  picks: number;
  topBid: number;
  top3: number;
  concentration: number;
}

/**
 * Budget architecture.
 *
 * The bar encodes how much of the cap went into the top three buys, because
 * total spend is capped and identical across the league — a spend bar would be
 * a flat line carrying no information. The filled portion is stars-and-scrubs;
 * the remainder is what was left for the other thirteen roster spots.
 */
export function BudgetBars({
  rows,
  franchiseOf,
  season,
}: {
  rows: BudgetRow[];
  franchiseOf: (teamId: number) => string | undefined;
  season: number;
}) {
  return (
    <div className={styles.budgetList}>
      {rows.map((row) => {
        const franchiseId = franchiseOf(row.teamId);
        const pct = Math.round(row.concentration * 100);
        const body = (
          <>
            {franchiseId ? (
              <TeamMark
                franchiseId={franchiseId}
                teamName={row.teamName}
                season={season}
                size={24}
              />
            ) : (
              <span />
            )}
            <span className={styles.budgetBarWrap}>
              <span className={styles.budgetLabel}>
                <span>{row.teamName}</span>
                <span className={styles.budgetValue}>
                  {formatMoney(row.top3)} on 3 · top {formatMoney(row.topBid)}
                </span>
              </span>
              <span className={styles.budgetTrack}>
                <span
                  className={styles.budgetFill}
                  style={{ width: `${pct}%` }}
                  title={`${pct}% of budget in the top three buys`}
                />
              </span>
            </span>
            <span className={styles.budgetValue}>{pct}%</span>
          </>
        );

        return franchiseId ? (
          <Link key={row.teamId} href={`/franchises/${franchiseId}`} className={styles.budgetRow}>
            {body}
          </Link>
        ) : (
          <div key={row.teamId} className={styles.budgetRow}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

export function AuctionPickRow({ pick }: { pick: AuctionPick }) {
  return (
    <div className={styles.teamRow}>
      <span className={styles.rank}>{pick.position}</span>
      <span />
      <span className={styles.teamName}>{pick.playerName}</span>
      <span className={styles.record}>{pick.teamName}</span>
      <span className={styles.points}>
        {formatMoney(pick.bid)}
        <span className={styles.movement} title="Points above replacement">
          {pick.par !== null ? (
            <span className={pick.par >= 0 ? styles.up : styles.down}>
              {pick.par >= 0 ? "+" : ""}
              {formatPoints(pick.par)}
            </span>
          ) : (
            <span className={styles.flat}>—</span>
          )}
        </span>
      </span>
    </div>
  );
}
