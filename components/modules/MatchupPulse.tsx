import type { MatchupLine } from "@/lib/data/contracts";
import { formatPoints } from "@/lib/data/selectors";
import { TeamMark } from "@/components/data/TeamMark";
import styles from "./modules.module.css";

/** One matchup as a two-line card: both totals, winner emphasised. */
export function MatchupCard({
  matchup,
  franchiseOf,
}: {
  matchup: MatchupLine;
  franchiseOf: (teamId: number) => string | undefined;
}) {
  const won = matchup.points > matchup.opponentPoints;
  const homeFranchise = franchiseOf(matchup.teamId);
  const awayFranchise = franchiseOf(matchup.opponentId);

  return (
    <div className={`${styles.matchup} ${matchup.isPlayoff ? styles.matchupPlayoff : ""}`}>
      <div className={styles.matchupSide}>
        {homeFranchise ? (
          <TeamMark
            franchiseId={homeFranchise}
            teamName={matchup.teamName}
            season={matchup.season}
            size={20}
          />
        ) : (
          <span />
        )}
        <span className={won ? styles.matchupWinner : styles.matchupLoser}>{matchup.teamName}</span>
        <span className={`${styles.matchupScore} ${won ? styles.matchupWinner : styles.matchupLoser}`}>
          {formatPoints(matchup.points)}
        </span>
      </div>
      <div className={styles.matchupSide}>
        {awayFranchise ? (
          <TeamMark
            franchiseId={awayFranchise}
            teamName={matchup.opponentName}
            season={matchup.season}
            size={20}
          />
        ) : (
          <span />
        )}
        <span className={!won ? styles.matchupWinner : styles.matchupLoser}>
          {matchup.opponentName}
        </span>
        <span className={`${styles.matchupScore} ${!won ? styles.matchupWinner : styles.matchupLoser}`}>
          {formatPoints(matchup.opponentPoints)}
        </span>
      </div>
      <div className={styles.matchupMeta}>
        <span>Week {matchup.week}</span>
        <span>{matchup.isPlayoff ? "Playoff" : "Regular"}</span>
        <span>
          {formatPoints(Math.abs(matchup.margin))} margin ·{" "}
          {formatPoints(matchup.points + matchup.opponentPoints)} combined
        </span>
      </div>
    </div>
  );
}

/** Ten roto categories as relative strengths — a roster's shape at a glance. */
export function SkillProfile({
  categories,
}: {
  categories: { key: string; label: string; rank: number; strength: number }[];
}) {
  return (
    <div className={styles.skillGrid}>
      {categories.map((cat) => (
        <div key={cat.key} className={styles.skillRow}>
          <span className={styles.skillLabel}>{cat.label}</span>
          <span className={styles.skillTrack}>
            <span
              className={`${styles.skillFill} ${cat.strength < 0.5 ? styles.skillWeak : ""}`}
              style={{ width: `${Math.max(cat.strength * 100, 4)}%` }}
            />
          </span>
          <span className={styles.skillRank}>{cat.rank}</span>
        </div>
      ))}
    </div>
  );
}
