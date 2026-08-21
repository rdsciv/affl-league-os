import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { PreviewModule } from "@/components/modules/PreviewModule";
import { BudgetBars } from "@/components/modules/AuctionSnapshot";
import { PointSourceBar } from "@/components/modules/PointSourceBar";
import { loadShowcase } from "@/lib/data/load";
import {
  formatMoney,
  formatPoints,
  selectAuctionBusts,
  selectAuctionValue,
  selectBudgetConcentration,
  selectManagementRanked,
  selectSeasonSummary,
  summarisePointSources,
} from "@/lib/data/selectors";
import styles from "../control-room.module.css";

export const metadata: Metadata = {
  title: "Front Office",
  description: "Auction board, budget architecture, point sources, and management review.",
};

export default function FrontOfficePage() {
  const snapshot = loadShowcase();
  const season = snapshot.latestCompletedSeason;
  const summary = selectSeasonSummary(snapshot, season);
  const budgets = selectBudgetConcentration(snapshot);
  const value = selectAuctionValue(snapshot, 10);
  const busts = selectAuctionBusts(snapshot, 10);
  const sources = summarisePointSources(snapshot, season);
  const management = selectManagementRanked(snapshot, season);

  const franchiseOf = (teamId: number) =>
    summary?.standings.find((t) => t.teamId === teamId)?.franchiseId;

  return (
    <AppShell
      current="/front-office"
      phase="Front office"
      status={[
        { label: "Season", value: String(season) },
        { label: "Auction spend", value: formatMoney(summary?.auctionSpend) },
        { label: "Teams", value: String(summary?.teamCount ?? "—") },
      ]}
    >
      <div className={styles.grid}>
        <div className={styles.sectionLabel} id="auction">
          <h2>Auction board</h2>
          <p>Every roster gets the same cap — what differs is how it was spent</p>
          <span className={styles.sectionRule} aria-hidden="true" />
        </div>

        <div className={styles.span12}>
          <PreviewModule
            id="fo-budgets"
            tone="lead"
            title="Budget architecture"
            summary="Concentration is the share of a team's budget committed to its top three buys. High is stars-and-scrubs; low is a balanced build."
            rows={[]}
            evidence={snapshot.auctionBudgets.evidenceStatus}
            provenance={snapshot.auctionBudgets.provenance}
          >
            <BudgetBars rows={budgets} franchiseOf={franchiseOf} season={season} />
          </PreviewModule>
        </div>

        <div className={styles.span6}>
          <PreviewModule
            id="fo-value"
            title="Best return per dollar"
            summary="Points above replacement per dollar committed. Cheap flyers dominate this list by construction."
            rows={value.map((p) => (
              <span key={p.playerId} className={styles.statLine}>
                <span className={styles.statLineLabel}>
                  {p.playerName} · {p.teamName}
                </span>
                <b>{formatMoney(p.bid)}</b>
                <b>+{formatPoints(p.par)}</b>
              </span>
            ))}
            evidence={snapshot.auction.evidenceStatus}
            provenance={snapshot.auction.provenance}
            limit={10}
          />
        </div>

        <div className={styles.span6}>
          <PreviewModule
            id="fo-busts"
            title="Biggest misses"
            summary="Buys of $20 or more that returned the least above replacement."
            rows={busts.map((p) => (
              <span key={p.playerId} className={styles.statLine}>
                <span className={styles.statLineLabel}>
                  {p.playerName} · {p.teamName}
                </span>
                <b>{formatMoney(p.bid)}</b>
                <b>{formatPoints(p.par)}</b>
              </span>
            ))}
            evidence={snapshot.auction.evidenceStatus}
            provenance={snapshot.auction.provenance}
            limit={10}
          />
        </div>

        <div className={styles.sectionLabel} id="point-sources">
          <h2>Where value came from</h2>
          <p>Started points traced to how the player was acquired</p>
          <span className={styles.sectionRule} aria-hidden="true" />
        </div>

        <div className={styles.span6}>
          {sources ? (
            <PreviewModule
              id="fo-sources"
              title="Point sources"
              summary={`Every started point in ${season}, by acquisition route.`}
              conclusion={`${Math.round((sources.segments[0]?.share ?? 0) * 100)}%`}
              conclusionNote="of started value came from the auction — the rest was built in-season."
              rows={[]}
              evidence={snapshot.pointSources.evidenceStatus}
              provenance={snapshot.pointSources.provenance}
            >
              <PointSourceBar segments={sources.segments} />
            </PreviewModule>
          ) : null}
        </div>

        <div className={styles.span6} id="management">
          <PreviewModule
            id="fo-management"
            title="Management review"
            summary="Actual lineup against the best legal lineup available that week."
            rows={management.map((row) => (
              <span key={row.teamId} className={styles.statLine}>
                <span className={styles.statLineLabel}>{row.teamName}</span>
                <b>{formatPoints(row.managementScore)}%</b>
                <b>−{formatPoints(row.pointsLeftOnBench)}</b>
              </span>
            ))}
            evidence={snapshot.management.evidenceStatus}
            provenance={snapshot.management.provenance}
            limit={12}
          />
        </div>

        <div className={styles.gated}>
          <div className={styles.gatedHead}>
            <p className={styles.gatedTitle}>Not shown, and why</p>
            <p className={styles.gatedNote}>
              These modules are gated by source coverage rather than filled with estimates.
            </p>
          </div>
          <div className={styles.gatedList}>
            <p className={styles.gatedItem}>
              <b>Trade grades</b>
              Trades are reconstructed from transaction items. No winner grade is published until
              the source history and grading contract are verified.
            </p>
            <p className={styles.gatedItem}>
              <b>Waivers pre-2018</b>
              Waiver and free-agent moves were never collected before 2018.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
