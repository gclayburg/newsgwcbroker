"use client";

// Notices editions published after this page was loaded, so a tab left open
// for days stays current. It polls /api/latest-edition (a tiny static JSON
// file that every publish/deploy refreshes) every few minutes, and again
// whenever the tab becomes visible, comes back online, or is restored from
// the back/forward cache.
//
// - Homepage (autoReload): reloads the page to show the new edition.
// - Anywhere else: shows a "New edition available" button that opens the
//   latest edition (a full page load, so the newest deployment is used).

import { useEffect, useState, type ReactNode } from "react";
import type { LatestEditionResponse } from "@/app/api/latest-edition/route";

const ENDPOINT = "/api/latest-edition";
const POLL_MS = 5 * 60_000;
/** Visibility/focus events can fire in bursts; never check more often than this. */
const MIN_GAP_MS = 30_000;
/** Remembers which edition we last reloaded for, to avoid reload loops. */
const RELOAD_KEY = "edition-update-reloaded-for";

type Latest = NonNullable<LatestEditionResponse["latest"]>;

export function EditionUpdateWatcher({
  knownPublishedAt,
  autoReload = false,
  replaceChildren = false,
  children,
}: {
  /** publishedAt of the newest edition this page knew about when it was built (none: no editions). */
  knownPublishedAt?: string;
  /** Reload the page when a newer edition appears (homepage). */
  autoReload?: boolean;
  /** Hide children once a newer edition appears (e.g. a now-stale "Latest edition" badge). */
  replaceChildren?: boolean;
  children?: ReactNode;
}) {
  const [newer, setNewer] = useState<Latest | null>(null);

  useEffect(() => {
    const known = knownPublishedAt ? Date.parse(knownPublishedAt) : -Infinity;
    let stopped = false;
    let inFlight = false;
    // The page was just loaded, so it's current: start the clock now.
    let lastCheck = Date.now();

    function found(latest: Latest) {
      stopped = true;
      if (autoReload) {
        let already: string | null = null;
        try {
          already = sessionStorage.getItem(RELOAD_KEY);
          sessionStorage.setItem(RELOAD_KEY, latest.publishedAt);
        } catch {
          // Storage blocked: reload anyway (polling makes a loop slow at worst).
        }
        // If we already reloaded for this edition and still see the old page
        // (e.g. a cache served stale HTML), offer the button instead.
        if (already !== latest.publishedAt) {
          window.location.reload();
          return;
        }
      }
      setNewer(latest);
    }

    async function check(force = false) {
      if (stopped || inFlight || !navigator.onLine) return;
      if (!force && Date.now() - lastCheck < MIN_GAP_MS) return;
      inFlight = true;
      lastCheck = Date.now();
      try {
        const res = await fetch(ENDPOINT, { cache: "no-store" });
        if (!res.ok) return;
        const { latest } = (await res.json()) as LatestEditionResponse;
        if (!stopped && latest && Date.parse(latest.publishedAt) > known) found(latest);
      } catch {
        // Offline or a transient error: try again next time.
      } finally {
        inFlight = false;
      }
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    const onOnline = () => check(true);
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) check(true);
    };

    const timer = setInterval(() => check(true), POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [knownPublishedAt, autoReload]);

  if (!newer) return children;

  return (
    <>
      {!replaceChildren && children}
      <span role="status" className="contents">
        <NewEditionButton latest={newer} />
      </span>
    </>
  );
}

function NewEditionButton({ latest }: { latest: Latest }) {
  return (
    <button
      type="button"
      // A full page load, not client-side navigation: it picks up the newest
      // deployment instead of this tab's (possibly outdated) app code.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      onClick={() => window.location.assign("/")}
      title={`Show the latest edition: ${latest.title}`}
      className="no-print inline-flex items-center gap-1.5 rounded-full bg-alert px-2.5 py-0.5 text-xs font-semibold text-alert-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-alert"
    >
      <span className="relative flex size-2" aria-hidden="true">
        <span className="absolute inline-flex size-full rounded-full bg-alert-foreground opacity-75 motion-safe:animate-ping" />
        <span className="relative inline-flex size-2 rounded-full bg-alert-foreground" />
      </span>
      New edition available
      <span aria-hidden="true">→</span>
    </button>
  );
}
