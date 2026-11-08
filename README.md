# newsgwcbroker

The news site at **https://news.gwcbroker.com**. Daily editions are JSON files in `content/news/`, and their photos are WebP files in `public/news-images/`. Grok Bot commits them to `main`, and Vercel rebuilds and deploys the site. The homepage always shows the latest edition. The full publishing procedure and edition format are in [AGENTS.md](AGENTS.md) (`CLAUDE.md` is a symlink to it).

## Stack

- [Next.js](https://nextjs.org) 16.4 (App Router, Turbopack, Cache Components)
- React 19, TypeScript, Tailwind CSS v4
- Node.js 24 (see `.nvmrc`; Next.js requires >= 20.9)
- No database: pages are prerendered from `content/news/*.json` at build time
- Story photos are stored in the repo (WebP, 600 px wide), never loaded from news sites

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. Next.js picks the next free port if 3000 is taken. With no editions in `content/news/`, the homepage shows a "Hello News World" placeholder.

## Testing locally with made-up editions

Test editions never go in `content/news/`, and test photos never go in `public/news-images/`. They live in git-ignored sandbox folders, `.sandbox/news/` and `public/news-images-sandbox/`, which the `*:sandbox` scripts point the site at:

```bash
npm run sandbox:seed      # make ~4 days of made-up editions with placeholder photos
npm run dev:sandbox       # dev server on the sandbox (header shows a SANDBOX badge)
npm run sandbox:publish   # simulate Grok Bot publishing a new edition right now
```

Reload the homepage after `sandbox:publish` to see the new edition become the latest. Other commands: `sandbox:list`, `sandbox:clear`, `build:sandbox` (production build from the sandbox; run `npm run build` afterwards to switch back). Placeholder photos are downloaded once from picsum.photos (needs internet) and converted exactly like real ones.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload (real `content/news/`) |
| `npm run build` | Validate editions, then production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run validate:content` | Check edition files and their photos against the schema (also runs before every build) |
| `npm run news:image -- <url-or-file> <story-id>` | Download/convert a story photo to `public/news-images/<story-id>.webp` (600 px WebP) |
| `npm run dev:sandbox` / `build:sandbox` | Same as dev/build, but reading `.sandbox/news/` |
| `npm run sandbox:seed` / `publish` / `list` / `clear` | Manage made-up test editions |

## Project layout

```
content/news/                 Published editions: YYYY-MM-DD-HHMM.json (Mountain Time)
public/news-images/           Story photos: <story-id>.webp (600 px wide)
src/app/
  page.tsx                    Homepage: latest edition
  editions/page.tsx           Archive
  editions/[id]/page.tsx      One edition, with older/newer navigation
  api/health/route.ts         GET /api/health -> {"status":"ok"}
  globals.css                 Theme tokens (light/dark), print styles
  layout.tsx                  Header/footer, theme script
src/components/
  edition-view.tsx            Edition and story layout
  site-chrome.tsx             Header (Archive, Download PDF, Copy link, theme toggle) and footer
  header-actions.tsx          Client-side buttons
src/lib/
  editions.ts                 Loads editions from disk
  format.ts                   Mountain Time date formatting
scripts/
  validate-content.mjs        Edition and photo validator
  prepare-image.mjs           npm run news:image (download + convert a photo)
  sandbox.mjs                 Made-up test editions
  lib/news-images.mjs         Photo rules (size, naming) shared by the scripts
  lib/image-convert.mjs       Download + WebP conversion (sharp)
docs/                         Planning notes
```

## Features

- **Latest edition on the homepage**, chosen by the greatest `publishedAt`
- **Archive** grouped by day, and per-edition pages with older/newer links
- **Story photos** stored with the site (600 px WebP), shown with caption and credit; stories without photos are shown as text only
- **Download PDF**: opens the print dialog (choose "Save as PDF"); print output is always light, without the header
- **Light/dark theme**: follows the OS setting until the visitor toggles it; the choice is remembered
