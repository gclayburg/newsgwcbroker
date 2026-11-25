// /analytics: read-only delivery statistics for the latest Private Handle send.
//
// Unlisted (not linked from the site) and unauthenticated for now. Shows counts
// only, never aliases. Rendered per request so Refresh asks the gateway again.

import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatShortDate, formatTime } from "@/lib/format";
import { getLatestSend, getSubscriberStats, type SendStats } from "@/lib/send-stats";

export const metadata: Metadata = {
  title: "Send analytics",
  robots: { index: false, follow: false },
};

const plural = (count: number, one: string, many = `${one}s`) =>
  `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">
        {typeof value === "number" ? value.toLocaleString("en-US") : value}
      </div>
      {note && <div className="mt-0.5 text-xs text-subtle">{note}</div>}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 rounded-xl border border-border px-4 py-3 text-muted">{children}</p>;
}

function SendSection({ s }: { s: SendStats }) {
  const d = s.devices;
  const waiting = d.accepted + d.pending;
  const reasons = Object.entries(s.failureReasons).sort((a, b) => b[1] - a[1]);
  return (
    <>
      <p className="mt-2 text-muted">
        <a href={`/editions/${s.edition.id}`} className="font-medium text-foreground underline-offset-2 hover:underline">
          {s.edition.title}
        </a>
        {s.createdAt && <> · sent {formatShortDate(s.createdAt)}, {formatTime(s.createdAt)}</>}
        {" · "}
        {s.state === "complete" ? "every copy delivered or failed" : "delivery still in progress"}
      </p>
      {s.newerUnsent.length > 0 && (
        <Notice>
          Newer {s.newerUnsent.length === 1 ? "edition" : "editions"} not sent (yet):{" "}
          {s.newerUnsent.map((e) => e.title).join("; ")}.
        </Notice>
      )}

      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-subtle">Private Handles</h3>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Sent to" value={s.handles} />
        <Stat label="Reached" value={s.handlesReached} note="at least one device has it" />
        <Stat label="With 2+ devices" value={s.handlesMultiDevice} />
        <Stat label="Refused" value={s.handlesRefused} note="no reachable device" />
      </div>

      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-subtle">Device copies</h3>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Devices" value={d.total} />
        <Stat label="Delivered" value={d.delivered} note="device confirmed receipt" />
        <Stat label="Waiting" value={waiting} note="device offline or being prepared" />
        <Stat label="Failed" value={d.failed} note="will not be delivered" />
      </div>
      {reasons.length > 0 && (
        <p className="mt-3 text-sm text-muted">
          Failure reasons{s.failureReasonsPartial ? " (sample)" : ""}:{" "}
          {reasons.map(([r, c]) => `${r} (${c})`).join(", ")}
        </p>
      )}
    </>
  );
}

async function Stats() {
  await connection(); // per request: always live numbers
  const [send, subs] = await Promise.all([getLatestSend(), getSubscriberStats()]);
  const checkedAt = new Date().toISOString();

  return (
    <>
      <section className="mt-8" aria-labelledby="send">
        <h2 id="send" className="text-xl font-semibold tracking-tight">Latest send</h2>
        {send.kind === "found" && <SendSection s={send.stats} />}
        {send.kind === "none" && (
          <Notice>
            None of the {plural(send.checked.length, "latest edition")} has been sent to subscribers yet.
          </Notice>
        )}
        {send.kind === "error" && <Notice>{send.message}</Notice>}
      </section>

      <section className="mt-10" aria-labelledby="subs">
        <h2 id="subs" className="text-xl font-semibold tracking-tight">Subscribers now</h2>
        <p className="mt-2 text-muted">Everyone who has added news.gwcbroker.com in Private Handle, as of this moment.</p>
        {subs.kind === "ok" ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Active Private Handles" value={subs.active} />
            <Stat label="Their devices" value={subs.devices} />
            <Stat label="With 2+ devices" value={subs.multiDevice} />
            <Stat label="Departed" value={subs.departed ?? "–"} note="removed the site or unreachable" />
          </div>
        ) : (
          <Notice>{subs.message}</Notice>
        )}
      </section>

      <p className="mt-8 text-sm text-subtle">
        Checked {formatShortDate(checkedAt)}, {formatTime(checkedAt)}. Delivered means a device received
        the message and confirmed it; there is no read receipt.
      </p>
    </>
  );
}

export default function AnalyticsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-6 pt-10 sm:px-6 sm:pt-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Send analytics</h1>
        {/* A plain link reloads the page, which asks the gateway again. */}
        <a
          href="/analytics"
          className="rounded-full border border-border px-4 py-1.5 text-sm font-medium transition-colors hover:bg-foreground/5"
        >
          Refresh
        </a>
      </div>
      <Suspense fallback={<p className="mt-8 text-muted">Asking the Private Handle gateway…</p>}>
        <Stats />
      </Suspense>
    </main>
  );
}
