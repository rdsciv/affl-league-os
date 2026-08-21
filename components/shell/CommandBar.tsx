"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { loadCatalog } from "@/lib/data/load";
import styles from "./CommandBar.module.css";

interface Entity {
  kind: "Franchise" | "Player" | "Season" | "Metric";
  name: string;
  meta: string;
  href: string;
}

function buildEntities(): Entity[] {
  const catalog = loadCatalog();
  const entities: Entity[] = [];

  for (const f of catalog.franchises) {
    const aliases = f.aliases.filter((a) => a !== f.name);
    entities.push({
      kind: "Franchise",
      name: f.name,
      meta: aliases.length > 0 ? `also ${aliases.join(", ")}` : "",
      href: `/franchises/${f.id}`,
    });
  }
  for (const s of catalog.seasons) {
    entities.push({
      kind: "Season",
      name: `${s} season`,
      meta: "standings, power, matchups",
      href: `/season?season=${s}`,
    });
  }
  for (const m of catalog.metrics) {
    entities.push({ kind: "Metric", name: m.label, meta: m.surface, href: m.surface });
  }
  for (const p of catalog.players) {
    entities.push({
      kind: "Player",
      name: p.name,
      meta: p.position,
      href: `/players/${p.id}`,
    });
  }
  return entities;
}

/** Matches an entity by name or by any historical alias. */
function matchEntities(entities: Entity[], query: string, limit = 12): Entity[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: { entity: Entity; score: number }[] = [];
  for (const e of entities) {
    const name = e.name.toLowerCase();
    const meta = e.meta.toLowerCase();
    let score = -1;
    if (name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (name.includes(q)) score = 2;
    else if (meta.includes(q)) score = 3;
    if (score >= 0) scored.push({ entity: e, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.entity.name.localeCompare(b.entity.name))
    .slice(0, limit)
    .map((s) => s.entity);
}

export const EXAMPLE_QUERIES = [
  "Who drafts the tallest wide receivers?",
  "Best auction value in 2025",
  "Squaw Valley Skinners",
  "Most points in a season",
  "Patrick Mahomes",
];

export function CommandBar({
  className,
  keysClassName,
  children,
}: {
  className?: string;
  keysClassName?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const entities = useMemo(() => buildEntities(), []);
  const results = useMemo(() => matchEntities(entities, query), [entities, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    openerRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => setActiveIndex(0), [query]);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  function onDialogKey(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      const target = results[activeIndex];
      if (target) {
        event.preventDefault();
        go(target.href);
      }
    }
  }

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        // The visible label is hidden on narrow viewports; the button must
        // keep its name at every width.
        aria-label="Search the league"
      >
        <SearchIcon />
        {children}
        <span className={keysClassName}>⌘K</span>
      </button>

      {open ? (
        <div
          className={styles.overlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label="Search the league"
            onKeyDown={onDialogKey}
          >
            <div className={styles.inputRow}>
              <SearchIcon />
              <input
                ref={inputRef}
                className={styles.input}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Franchise, player, season, metric — or ask a question"
                aria-label="Search the league"
                autoComplete="off"
                spellCheck={false}
              />
              <button type="button" className={styles.esc} onClick={close}>
                Esc
              </button>
            </div>

            <div className={styles.results}>
              {query.trim() === "" ? (
                <div className={styles.empty}>
                  <p className={styles.emptyTitle}>
                    Jump to any franchise, player, season or metric. Questions are interpreted
                    into a fixed set of league queries — nothing else runs.
                  </p>
                  <div className={styles.examples}>
                    {EXAMPLE_QUERIES.map((example) => (
                      <button
                        key={example}
                        type="button"
                        className={styles.example}
                        onClick={() => setQuery(example)}
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              ) : results.length === 0 ? (
                <div className={styles.empty}>
                  <p className={styles.emptyTitle}>
                    Nothing matched “{query}”. Try a franchise, player, season or one of these:
                  </p>
                  <div className={styles.examples}>
                    {EXAMPLE_QUERIES.map((example) => (
                      <button
                        key={example}
                        type="button"
                        className={styles.example}
                        onClick={() => setQuery(example)}
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <p className={styles.groupLabel}>{results.length} matches</p>
                  {results.map((entity, i) => (
                    <button
                      key={`${entity.kind}-${entity.href}-${entity.name}`}
                      type="button"
                      className={styles.item}
                      data-active={i === activeIndex}
                      onClick={() => go(entity.href)}
                      onMouseEnter={() => setActiveIndex(i)}
                    >
                      <span className={styles.itemKind}>{entity.kind}</span>
                      <span className={styles.itemName}>{entity.name}</span>
                      <span className={styles.itemMeta}>{entity.meta}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.2 10.2 13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
