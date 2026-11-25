// Builds the Private Handle message sent to every subscriber when an edition
// is published (see src/app/api/notify-subscribers/route.ts).
//
// The text MUST be deterministic for a given edition: the gateway treats a
// repeated requestId with identical content as a replay (nothing is re-sent),
// so never put the current time or anything random in it.

import type { Edition, Story } from "@/lib/editions";
import { SITE_URL } from "@/lib/site";

/** Gateway limit for message text (sending.md §2.2). */
export const MAX_TEXT_BYTES = 16_384;
/** Gateway limit for a thread subject (sending.md §2.3). */
const MAX_SUBJECT_CHARS = 200;

export type SubscriberMessage = {
  /** Batch request id, derived from the edition so retries never double-send. */
  requestId: string;
  subject: string;
  text: string;
  /** Which fallback was needed to fit the size limit ("full" = nothing dropped). */
  detail: "full" | "short-summaries" | "headlines" | "headlines-no-links" | "truncated";
};

export function editionUrl(edition: Edition): string {
  return `${SITE_URL}/editions/${edition.id}`;
}

/** Gateway request id: 1–64 chars of A–Z a–z 0–9 _ - (api-basics.md §6). */
export function requestIdFor(edition: Edition): string {
  return `edition-${edition.id}`;
}

const bytes = (s: string) => Buffer.byteLength(s, "utf8");

function shorten(s: string, max: number): string {
  const flat = s.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–—-]+$/, "")}…`;
}

type Detail = Exclude<SubscriberMessage["detail"], "truncated">;

function storyBlock(story: Story, n: number, detail: Detail): string {
  const lines = [`${n}. ${story.headline}`];
  if (detail === "full") lines.push(story.summary.trim());
  if (detail === "short-summaries") lines.push(shorten(story.summary, 240));
  lines.push(
    detail === "headlines-no-links"
      ? `(${story.sourceName})`
      : `${story.sourceName}: ${story.sourceUrl}`,
  );
  return lines.join("\n");
}

function render(edition: Edition, detail: Detail): string {
  const head = [edition.title];
  if (edition.subtitle) head.push(edition.subtitle);
  const blocks = edition.stories.map((s, i) => storyBlock(s, i + 1, detail));
  return [head.join("\n"), ...blocks, `Read the full edition: ${editionUrl(edition)}`].join(
    "\n\n",
  );
}

/** Every story in the edition, in homepage order, shortened only if needed to fit. */
export function buildSubscriberMessage(edition: Edition): SubscriberMessage {
  const base = {
    requestId: requestIdFor(edition),
    subject: shorten(edition.title, MAX_SUBJECT_CHARS),
  };
  const tiers: Detail[] = ["full", "short-summaries", "headlines", "headlines-no-links"];
  for (const detail of tiers) {
    const text = render(edition, detail);
    if (bytes(text) <= MAX_TEXT_BYTES) return { ...base, text, detail };
  }
  // Last resort (only possible with ~50 very long headlines): cut at a
  // character boundary and keep the edition link.
  const tail = `\n\n…\n\nRead the full edition: ${editionUrl(edition)}`;
  let chars = Array.from(render(edition, "headlines-no-links")); // code points, not UTF-16 units
  while (bytes(chars.join("")) + bytes(tail) > MAX_TEXT_BYTES) chars = chars.slice(0, -64);
  const text = chars.join("");
  return { ...base, text: text + tail, detail: "truncated" };
}
