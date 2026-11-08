import Link from "next/link";
import { imageUrl, type Edition, type Story } from "@/lib/editions";
import { formatEditionDay, formatShortDate, formatTime } from "@/lib/format";

export function EditionView({
  edition,
  isLatest,
  newer,
  older,
}: {
  edition: Edition;
  isLatest: boolean;
  newer?: Edition;
  older?: Edition;
}) {
  return (
    <main className="mx-auto max-w-5xl px-4 pt-10 sm:px-6 sm:pt-12">
      <header className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {isLatest ? (
            <span className="rounded-full bg-positive/15 px-2.5 py-0.5 text-xs font-semibold text-positive">
              Latest edition
            </span>
          ) : (
            <Link
              href="/"
              className="no-print rounded-full border border-border px-2.5 py-0.5 text-xs font-medium hover:text-foreground"
            >
              Archived edition · Go to latest →
            </Link>
          )}
          <span>
            Published {formatTime(edition.publishedAt)}
            {edition.updatedAt && <> · Updated {formatTime(edition.updatedAt)}</>}
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {edition.title}
        </h1>
        {edition.subtitle && (
          <p className="mt-3 text-lg text-muted text-pretty">{edition.subtitle}</p>
        )}
      </header>

      <section aria-labelledby="edition-day" className="mt-10">
        <h2 id="edition-day" className="text-2xl font-semibold tracking-tight">
          {formatEditionDay(edition.date)}
        </h2>
        {edition.intro && (
          <p className="mt-3 max-w-3xl leading-7 whitespace-pre-line text-muted">
            {edition.intro}
          </p>
        )}

        <ol className="mt-8 divide-y divide-border border-t border-border">
          {edition.stories.map((story, i) => (
            <li key={story.id}>
              <StoryItem story={story} lead={i === 0} />
            </li>
          ))}
        </ol>
      </section>

      <EditionNav newer={newer} older={older} />
    </main>
  );
}

function StoryItem({ story, lead }: { story: Story; lead: boolean }) {
  const meta = (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-subtle">
      <span>{story.sourceName}</span>
      {story.publishedAt && (
        <>
          <span aria-hidden="true">·</span>
          <time dateTime={story.publishedAt}>{formatShortDate(story.publishedAt)}</time>
        </>
      )}
      {story.category && (
        <span className="rounded-full border border-border px-2 py-px text-xs text-muted">
          {story.category}
        </span>
      )}
    </p>
  );

  const body = (
    <div className="min-w-0">
      <h3
        className={`font-semibold tracking-tight text-balance ${lead ? "text-2xl" : "text-xl"}`}
      >
        <a
          href={story.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-1 underline-offset-4 decoration-foreground/40 transition-colors hover:decoration-foreground"
        >
          {story.headline}
        </a>
      </h3>
      {meta}
      <p className="mt-3 leading-7 whitespace-pre-line text-foreground/80">{story.summary}</p>
    </div>
  );

  if (!story.image) {
    return <article className="story py-7">{body}</article>;
  }

  const { image } = story;
  return (
    <article className="story grid gap-5 py-7 sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] sm:gap-7">
      <figure className="min-w-0">
        {/* Photos are stored pre-sized (WebP, 600 px wide) in public/news-images/,
            so a plain <img> is enough; no runtime image optimization needed. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl(image)}
          alt={image.alt}
          loading={lead ? "eager" : "lazy"}
          fetchPriority={lead ? "high" : "auto"}
          decoding="async"
          className="aspect-[3/2] w-full rounded-xl bg-placeholder object-cover"
        />
        <figcaption className="mt-2 text-xs leading-5 text-subtle">
          {image.caption ? `Photo: ${image.caption} ` : "Photo: "}
          {image.credit}
        </figcaption>
      </figure>
      {body}
    </article>
  );
}

function EditionNav({ newer, older }: { newer?: Edition; older?: Edition }) {
  if (!newer && !older) return null;
  const card =
    "group flex flex-col rounded-xl border border-border p-4 transition-colors hover:bg-foreground/[0.03]";
  return (
    <nav aria-label="Edition navigation" className="no-print mt-4 grid gap-3 sm:grid-cols-2">
      {older ? (
        <Link href={`/editions/${older.id}`} className={card}>
          <span className="text-xs text-subtle">← Older edition</span>
          <span className="mt-1 font-medium">{older.title}</span>
          <span className="text-sm text-muted">
            {formatShortDate(older.publishedAt)}, {formatTime(older.publishedAt)}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {newer && (
        <Link href={`/editions/${newer.id}`} className={`${card} sm:items-end sm:text-right`}>
          <span className="text-xs text-subtle">Newer edition →</span>
          <span className="mt-1 font-medium">{newer.title}</span>
          <span className="text-sm text-muted">
            {formatShortDate(newer.publishedAt)}, {formatTime(newer.publishedAt)}
          </span>
        </Link>
      )}
    </nav>
  );
}
