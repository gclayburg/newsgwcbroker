# newsgwcbroker

A Next.js news site. It currently serves a single static homepage ("Hello News World") and a minimal health-check endpoint.

## Stack

- [Next.js](https://nextjs.org) 16.4 (App Router, Turbopack)
- React 19, TypeScript
- Tailwind CSS v4
- Node.js 24 (see `.nvmrc`; Next.js requires >= 20.9)

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 (Next.js picks the next free port if 3000 is taken).

## Scripts

| Command             | What it does                         |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the dev server with hot reload |
| `npm run build`     | Create a production build            |
| `npm run start`     | Serve the production build           |
| `npm run lint`      | Run ESLint                           |
| `npm run typecheck` | Type-check with `tsc --noEmit`       |

## Project layout

```
src/app/
  layout.tsx            Root layout, fonts, metadata
  page.tsx              Homepage
  globals.css           Tailwind import, theme tokens, animations
  api/health/route.ts   GET /api/health -> {"status":"ok"}
docs/                   Planning notes
public/                 Static assets
```

## Endpoints

- `GET /` — homepage
- `GET /api/health` — returns `{"status":"ok","service":"newsgwcbroker"}`
