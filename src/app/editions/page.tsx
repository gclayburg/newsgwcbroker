import type { Metadata } from "next";
import Link from "next/link";
import { getAllEditions, type Edition } from "@/lib/editions";
import { formatEditionDay, formatTime } from "@/lib/format";

export const metadata: Metadata = { title: "Archive" };

export default function ArchivePage() {
  const all = getAllEditions();
  const latestId = all[0]?.id;

  // Group by edition date, newest day first (all is already newest-first).
  const days = new Map<string, Edition[]>();
  for (const e of all) days.set(e.date, [...(days.get(e.date) ?? []), e]);

  return (
    <main className="mx-auto max-w-5xl px-4 pt-10 sm:px-6 sm:pt-12">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Archive</h1>
      <p className="mt-3 text-muted">
        {all.length
          ? `${all.length} edition${all.length === 1 ? "" : "s"}, newest first. Times are Mountain Time.`
          : "No editions have been published yet."}
      </p>

      <div className="mt-10 space-y-10">
        {[...days].map(([date, editions]) => (
          <section key={date} aria-labelledby={`day-${date}`}>
            <h2 id={`day-${date}`} className="text-lg font-semibold tracking-tight">
              {formatEditionDay(date)}
            </h2>
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
              {editions.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/editions/${e.id}`}
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-foreground/[0.03]"
                  >
                    <span className="w-24 shrink-0 text-sm tabular-nums text-subtle">
                      {formatTime(e.publishedAt)}
                    </span>
                    <span className="min-w-0 flex-1 font-medium">{e.title}</span>
                    <span className="text-sm text-muted">
                      {e.stories.length} stor{e.stories.length === 1 ? "y" : "ies"}
                    </span>
                    {e.id === latestId && (
                      <span className="rounded-full bg-positive/15 px-2 py-0.5 text-xs font-semibold text-positive">
                        Latest
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
