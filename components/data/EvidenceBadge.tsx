import type { EvidenceStatus, Provenance } from "@/lib/data/contracts";
import styles from "./EvidenceBadge.module.css";

const LABEL: Record<EvidenceStatus, string> = {
  verified: "Verified",
  reconstructed: "Reconstructed",
  unavailable: "Unavailable",
};

const EXPLANATION: Record<EvidenceStatus, string> = {
  verified: "Reconciled against the source ledger.",
  reconstructed: "Derived from partial source history; treat as indicative.",
  unavailable: "The source does not cover this. Nothing is estimated.",
};

export function EvidenceBadge({
  status,
  provenance,
  title,
}: {
  status: EvidenceStatus;
  provenance?: Provenance[];
  title?: string;
}) {
  const sources = provenance?.length
    ? ` Source: ${provenance.map((p) => p.tablesOrArtifact.join(", ")).join("; ")}.`
    : "";

  return (
    <span
      className={`${styles.badge} ${styles[status]}`}
      title={title ?? `${EXPLANATION[status]}${sources}`}
      data-evidence={status}
    >
      <span className={styles.dot} aria-hidden="true" />
      {LABEL[status]}
    </span>
  );
}
