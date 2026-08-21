import { formatPoints } from "@/lib/data/selectors";
import styles from "./modules.module.css";

export interface SourceSegment {
  key: string;
  label: string;
  token: string;
  value: number;
  share: number;
}

/**
 * Started value split by acquisition source.
 *
 * These are points above replacement, so a segment can be negative — a team
 * whose waiver adds cost it value. The bar is sized by magnitude and the sign
 * is carried in the legend rather than being clipped away.
 */
export function PointSourceBar({
  segments,
  showLegend = true,
}: {
  segments: SourceSegment[];
  showLegend?: boolean;
}) {
  return (
    <div>
      <div className={styles.sourceBar} role="img" aria-label={describe(segments)}>
        {segments
          .filter((s) => s.share > 0.005)
          .map((seg) => (
            <span
              key={seg.key}
              className={styles.sourceSeg}
              style={{
                flexBasis: `${seg.share * 100}%`,
                background: `var(${seg.token})`,
                opacity: seg.value < 0 ? 0.45 : 1,
              }}
              title={`${seg.label}: ${formatPoints(seg.value)} PAR`}
            >
              {seg.share > 0.12 ? `${Math.round(seg.share * 100)}%` : ""}
            </span>
          ))}
      </div>

      {showLegend ? (
        <div className={styles.sourceLegend}>
          {segments.map((seg) => (
            <span key={seg.key} className={styles.legendItem}>
              <span
                className={styles.legendSwatch}
                style={{ background: `var(${seg.token})` }}
                aria-hidden="true"
              />
              {seg.label}
              <span className={styles.legendValue}>
                {seg.value >= 0 ? "+" : ""}
                {formatPoints(seg.value)}
              </span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function describe(segments: SourceSegment[]): string {
  return segments
    .map((s) => `${s.label} ${Math.round(s.share * 100)}%`)
    .join(", ");
}
