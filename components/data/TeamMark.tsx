import Image from "next/image";
import manifest from "@/public/asset-manifest.json";
import { asset } from "@/lib/asset";
import styles from "./TeamMark.module.css";

interface AssetRecord {
  destination: string;
  franchiseId: string;
  fromSeason: number;
  toSeason: number;
  primary: boolean;
}

const FRANCHISE_ASSETS = manifest.franchises as AssetRecord[];

/**
 * Resolve a franchise's official artwork.
 *
 * When `season` is given, the asset used in that era wins so a historical
 * timeline shows period-correct art. Otherwise the primary (latest) asset is
 * used. A franchise with no local asset returns null — the caller renders a
 * neutral placeholder rather than a generated letter tile.
 */
export function franchiseAsset(franchiseId: string, season?: number): string | null {
  const owned = FRANCHISE_ASSETS.filter((a) => a.franchiseId === franchiseId);
  if (owned.length === 0) return null;
  if (season !== undefined) {
    const era = owned.find((a) => season >= a.fromSeason && season <= a.toSeason);
    if (era) return era.destination;
  }
  return (owned.find((a) => a.primary) ?? owned[owned.length - 1])?.destination ?? null;
}

export function TeamMark({
  franchiseId,
  teamName,
  season,
  size = 28,
}: {
  franchiseId: string;
  teamName: string;
  season?: number;
  size?: number;
}) {
  const src = franchiseAsset(franchiseId, season);

  if (!src) {
    return (
      <span
        className={`${styles.mark} ${styles.absent}`}
        style={{ width: size, height: size }}
        title={`No official artwork is available for ${teamName}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <span className={styles.mark} style={{ width: size, height: size }}>
      <Image
        src={asset(src)}
        alt=""
        width={size * 2}
        height={size * 2}
        className={styles.img}
        aria-hidden="true"
      />
    </span>
  );
}
