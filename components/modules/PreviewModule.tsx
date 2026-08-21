"use client";

import type { ReactNode } from "react";
import type { EvidenceStatus, MissingReason, Provenance } from "@/lib/data/contracts";
import { MISSING_REASON_COPY } from "@/lib/data/contracts";
import { PREVIEW_ROW_LIMIT } from "@/lib/data/selectors";
import { EvidenceBadge } from "@/components/data/EvidenceBadge";
import styles from "./PreviewModule.module.css";

export interface PreviewModuleProps {
  title: string;
  summary: string;
  rows: ReactNode[];
  evidence: EvidenceStatus;
  /** The single headline result. Rendered larger than any row. */
  conclusion?: ReactNode;
  conclusionNote?: string;
  onOpen?: () => void;
  /** Link form of the primary action, for server-rendered surfaces. */
  openHref?: string;
  openLabel?: string;
  /** Extra actions (compare, share, export) rendered beside Open. */
  actions?: ReactNode;
  provenance?: Provenance[];
  missingReason?: MissingReason;
  missingDetail?: string;
  tone?: "lead" | "default" | "quiet";
  limit?: number;
  /** Replaces the row list — used for charts and bars. */
  children?: ReactNode;
  id?: string;
}

export function PreviewModule({
  title,
  summary,
  rows,
  evidence,
  conclusion,
  conclusionNote,
  onOpen,
  openHref,
  openLabel = "Open table",
  actions,
  provenance,
  missingReason,
  missingDetail,
  tone = "default",
  limit = PREVIEW_ROW_LIMIT,
  children,
  id,
}: PreviewModuleProps) {
  const unavailable = evidence === "unavailable";
  const shown = rows.slice(0, limit);
  const hidden = Math.max(0, rows.length - shown.length);

  return (
    <section
      className={`${styles.module} ${tone === "lead" ? styles.lead : ""} ${
        tone === "quiet" ? styles.quiet : ""
      }`}
      aria-labelledby={id ? `${id}-title` : undefined}
      data-module={id}
      data-tone={tone}
    >
      <header className={styles.head}>
        <div className={styles.titleGroup}>
          <h2 className={styles.title} id={id ? `${id}-title` : undefined}>
            {title}
          </h2>
          <p className={styles.summary}>{summary}</p>
        </div>
        <EvidenceBadge status={evidence} provenance={provenance} />
      </header>

      {unavailable ? (
        <div className={styles.missing}>
          <p className={styles.missingReason}>
            {missingReason ? MISSING_REASON_COPY[missingReason] : "Not available"}
          </p>
          {missingDetail ? <p className={styles.missingDetail}>{missingDetail}</p> : null}
        </div>
      ) : (
        <>
          {conclusion !== undefined ? (
            <div>
              <p className={styles.conclusion} data-testid="preview-conclusion">
                {conclusion}
              </p>
              {conclusionNote ? <p className={styles.conclusionNote}>{conclusionNote}</p> : null}
            </div>
          ) : null}

          {children}

          {shown.length > 0 ? (
            <ul className={styles.rows}>
              {shown.map((row, i) => (
                <li key={i}>{row}</li>
              ))}
            </ul>
          ) : null}

          {onOpen || openHref || actions ? (
            <div className={styles.foot}>
              <span className={styles.count}>
                {hidden > 0
                  ? `${shown.length} of ${rows.length.toLocaleString("en-US")} rows`
                  : rows.length > 0
                    ? `${rows.length} row${rows.length === 1 ? "" : "s"}`
                    : ""}
              </span>
              <div className={styles.actions}>
                {actions}
                {onOpen ? (
                  <button type="button" className={styles.open} onClick={onOpen}>
                    {openLabel}
                    <ArrowIcon />
                  </button>
                ) : openHref ? (
                  <a href={openHref} className={styles.open}>
                    {openLabel}
                    <ArrowIcon />
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function ArrowIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Secondary action styled to sit beside the primary Open action. */
export function ModuleAction({
  children,
  onClick,
  href,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  if (href) {
    return (
      <a className={`${styles.open} ${styles.secondary}`} href={href}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={`${styles.open} ${styles.secondary}`} onClick={onClick}>
      {children}
    </button>
  );
}
