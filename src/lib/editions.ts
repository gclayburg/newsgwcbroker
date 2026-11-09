// Loads news editions from disk. Schema: see AGENTS.md and scripts/validate-content.mjs.
//
// Editions are read with synchronous fs calls, so pages that use them are
// prerendered at build time (Cache Components treats sync I/O as static).
//
// NEWS_CONTENT_DIR overrides the folder (used for local sandbox testing);
// production always uses content/news.

import fs from "node:fs";
import path from "node:path";

export type StoryImage = {
  /** File name in public/<IMAGES_PATH>/, e.g. "2026-11-08-fed-holds-rates-steady.webp". */
  file: string;
  alt: string;
  caption?: string;
  credit: string;
};

export type Story = {
  id: string;
  headline: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  category?: string;
  publishedAt?: string;
  image?: StoryImage;
};

export type Edition = {
  /** File name without ".json", e.g. "2026-11-08-0700". Used in URLs. */
  id: string;
  schemaVersion: 1;
  date: string;
  title: string;
  subtitle?: string;
  intro?: string;
  publishedAt: string;
  updatedAt?: string;
  stories: Story[];
};

const DEFAULT_DIR = path.resolve(process.cwd(), "content/news");
// turbopackIgnore: editions are read at build time (pages are prerendered), so
// the server bundle doesn't need these files traced into it.
export const CONTENT_DIR = path.resolve(
  /*turbopackIgnore: true*/ process.cwd(),
  process.env.NEWS_CONTENT_DIR || "content/news",
);
/** True when reading from somewhere other than content/news (local testing). */
export const IS_SANDBOX = CONTENT_DIR !== DEFAULT_DIR;

/** Story photos live in public/<IMAGES_PATH>/ (sandbox: news-images-sandbox). */
const IMAGES_PATH = process.env.NEWS_IMAGES_PATH || "news-images";

/** Public URL of a story photo, e.g. /news-images/2026-11-08-fed-holds-rates-steady.webp */
export function imageUrl(image: StoryImage): string {
  return `/${IMAGES_PATH}/${encodeURIComponent(image.file)}`;
}

const FILE_RE = /^(\d{4}-\d{2}-\d{2}-\d{4})\.json$/;

/** All editions, newest first (by publishedAt). Returns [] if the folder is missing. */
export function getAllEditions(): Edition[] {
  let names: string[];
  try {
    names = fs.readdirSync(/*turbopackIgnore: true*/ CONTENT_DIR);
  } catch {
    return [];
  }
  const editions: Edition[] = [];
  for (const name of names) {
    const m = name.match(FILE_RE);
    if (!m) continue;
    const raw = fs.readFileSync(path.join(/*turbopackIgnore: true*/ CONTENT_DIR, name), "utf-8");
    const data = JSON.parse(raw) as Omit<Edition, "id">;
    editions.push({ ...data, id: m[1] });
  }
  return editions.sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
}

export function getLatestEdition(): Edition | undefined {
  return getAllEditions()[0];
}

export function getEditionWithNeighbors(id: string): {
  edition?: Edition;
  newer?: Edition;
  older?: Edition;
  latest?: Edition;
  isLatest: boolean;
} {
  const all = getAllEditions();
  const i = all.findIndex((e) => e.id === id);
  if (i === -1) return { latest: all[0], isLatest: false };
  return {
    edition: all[i],
    newer: all[i - 1],
    older: all[i + 1],
    latest: all[0],
    isLatest: i === 0,
  };
}
