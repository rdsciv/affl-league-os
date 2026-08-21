import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { CommandBar } from "./CommandBar";
import styles from "./AppShell.module.css";

export const DESTINATIONS = [
  { href: "/", label: "Now" },
  { href: "/season", label: "Season" },
  { href: "/front-office", label: "Front Office" },
  { href: "/players", label: "Players" },
  { href: "/archive", label: "Archive" },
] as const;

export interface StatusItem {
  label: string;
  value: string;
}

export function AppShell({
  children,
  current,
  system = "control",
  phase,
  status = [],
}: {
  children: ReactNode;
  current: string;
  /** Which visual system this surface belongs to. */
  system?: "control" | "atlas";
  phase: string;
  status?: StatusItem[];
}) {
  return (
    <div className={`${styles.shell} sys-${system}`}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <Image
            src="/brand/affl-mark-640.png"
            alt="AFFL"
            width={640}
            height={238}
            className={styles.mark}
            priority
          />
          <span className={styles.wordmark}>
            <span className={styles.wordmarkTop}>League OS</span>
            <span className={styles.wordmarkSub}>est. 2014</span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          {DESTINATIONS.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className={styles.navLink}
              aria-current={d.href === current ? "page" : undefined}
            >
              {d.label}
            </Link>
          ))}
        </nav>

        <CommandBar className={styles.launcher} keysClassName={styles.launcherKeys}>
          <span className={styles.launcherText}>Search the league</span>
        </CommandBar>
      </header>

      <div className={styles.status} role="status">
        <span className={styles.statusPhase}>
          <span className={styles.pulse} aria-hidden="true" />
          {phase}
        </span>
        {status.map((item) => (
          <span key={item.label} className={styles.statusItem}>
            <span className={styles.statusSep} aria-hidden="true">
              /
            </span>
            {item.label}
            <b>{item.value}</b>
          </span>
        ))}
      </div>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <p className={styles.footerNote}>
          Every figure is read from the AFFL ledger and semantic warehouse under a read-only
          contract, and is labelled verified, reconstructed, or unavailable. Missing coverage is
          stated, never filled with zeros. Franchise history follows canonical continuity; each
          season shows the team name used that season.
        </p>
        <span>AFFL League OS</span>
      </footer>
    </div>
  );
}
