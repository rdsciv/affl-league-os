import Link from "next/link";
import type { TeamSeason } from "@/lib/data/contracts";
import { formatPoints, formatRecord } from "@/lib/data/selectors";
import { TeamMark } from "@/components/data/TeamMark";
import styles from "./modules.module.css";

/**
 * One standings row. Movement compares the playoff seed a team earned with
 * where it actually finished — schedule outcome against seeding, not a
 * fabricated trend.
 */
export function StandingsRow({ team }: { team: TeamSeason }) {
  const movement =
    team.playoffSeed !== null && team.finalRank !== null ? team.playoffSeed - team.finalRank : null;

  return (
    <Link href={`/franchises/${team.franchiseId}`} className={styles.teamRow}>
      <span className={`${styles.rank} ${team.finalRank === 1 ? styles.rankTop : ""}`}>
        {team.finalRank ?? "—"}
      </span>
      <TeamMark franchiseId={team.franchiseId} teamName={team.teamName} season={team.season} size={24} />
      <span className={styles.teamName}>{team.teamName}</span>
      <span className={styles.record}>{formatRecord(team.wins, team.losses, team.ties)}</span>
      <span className={styles.points}>
        {formatPoints(team.pointsFor)}
        {movement !== null && movement !== 0 ? (
          <span
            className={`${styles.movement} ${movement > 0 ? styles.up : styles.down}`}
            title={`Seeded ${team.playoffSeed}, finished ${team.finalRank}`}
          >
            {movement > 0 ? "▲" : "▼"}
            {Math.abs(movement)}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function StandingsPreview({ teams }: { teams: TeamSeason[] }) {
  return teams.map((team) => <StandingsRow key={team.teamId} team={team} />);
}
