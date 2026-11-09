// GET /api/latest-edition: which edition is currently the latest.
//
// Open tabs poll this to notice newly published editions (see
// src/components/edition-update-watcher.tsx). Editions are read with sync fs
// calls, so this response is prerendered at build time like the pages; every
// publish triggers a new deployment, which ships a fresh copy.

import { getLatestEdition } from "@/lib/editions";

export type LatestEditionResponse = {
  latest: { id: string; title: string; publishedAt: string } | null;
};

export async function GET() {
  const e = getLatestEdition();
  const body: LatestEditionResponse = {
    latest: e ? { id: e.id, title: e.title, publishedAt: e.publishedAt } : null,
  };
  return Response.json(body);
}
