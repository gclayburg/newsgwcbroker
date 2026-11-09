import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditionView } from "@/components/edition-view";
import { getAllEditions, getEditionWithNeighbors } from "@/lib/editions";

// Cache Components requires at least one param at build time; with no editions
// yet, a placeholder keeps the build valid and simply 404s.
const PLACEHOLDER = "__none__";

// Every edition is prerendered at build time and prefetched by links, so
// reading params here is fine; opting out of instant-navigation validation
// keeps a real 404 status for unknown ids (no Suspense soft-404).
export const instant = false;

export function generateStaticParams() {
  const ids = getAllEditions().map((e) => ({ id: e.id }));
  return ids.length ? ids : [{ id: PLACEHOLDER }];
}

export async function generateMetadata({
  params,
}: PageProps<"/editions/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { edition } = getEditionWithNeighbors(id);
  return edition ? { title: edition.title, description: edition.subtitle } : {};
}

export default async function EditionPage({ params }: PageProps<"/editions/[id]">) {
  const { id } = await params;
  const { edition, newer, older, latest, isLatest } = getEditionWithNeighbors(id);
  if (!edition) notFound();
  return (
    <EditionView
      edition={edition}
      isLatest={isLatest}
      latestPublishedAt={latest?.publishedAt}
      newer={newer}
      older={older}
    />
  );
}
