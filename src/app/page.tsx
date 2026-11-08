import type { Metadata } from "next";
import { EditionView } from "@/components/edition-view";
import { getAllEditions } from "@/lib/editions";

export function generateMetadata(): Metadata {
  const latest = getAllEditions()[0];
  return latest ? { title: latest.title, description: latest.subtitle } : {};
}

// The homepage always shows the single latest edition (greatest publishedAt).
export default function Home() {
  const all = getAllEditions();
  const latest = all[0];

  if (!latest) {
    return (
      <main className="mx-auto flex max-w-5xl flex-col items-start px-4 py-24 sm:px-6">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Hello News World</h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          No editions have been published yet. The first one will appear here.
        </p>
      </main>
    );
  }

  return <EditionView edition={latest} isLatest older={all[1]} />;
}
