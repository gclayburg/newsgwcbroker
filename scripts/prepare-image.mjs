#!/usr/bin/env node
// Prepare a story photo for publishing: download (or read) it, convert it to
// WebP 600 px wide (<= 150 KB, metadata stripped) and save it as
// public/news-images/<story-id>.webp. Prints the "image" JSON for the edition.
//
// Usage:
//   npm run news:image -- <image URL or local file> <story-id> [--replace]
//
//   --replace   the story already has a photo and you want a different one:
//               saves <story-id>-2.webp (then -3, ...) instead of failing.
//
// Example:
//   npm run news:image -- https://cdn.example.com/photo.jpg 2026-11-08-fed-holds-rates-steady

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { convertToNewsWebp, downloadImage } from "./lib/image-convert.mjs";
import { imagesDir as defaultImagesDir } from "./lib/news-images.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ID_RE = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(msg) {
  console.error(`news:image: ${msg}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const replace = args.includes("--replace");
const dirIdx = args.indexOf("--images-dir");
const outDir = dirIdx !== -1 ? resolve(args[dirIdx + 1]) : defaultImagesDir(ROOT);
const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--images-dir");
const [source, storyId] = positional;

if (!source || !storyId) {
  fail("usage: npm run news:image -- <image URL or local file> <story-id> [--replace]");
}
if (!ID_RE.test(storyId) || storyId.length > 80) {
  fail(`"${storyId}" is not a valid story id (e.g. 2026-11-08-fed-holds-rates-steady)`);
}

let fileName = `${storyId}.webp`;
if (existsSync(join(outDir, fileName))) {
  if (!replace) {
    fail(
      `${relative(process.cwd(), join(outDir, fileName))} already exists. ` +
        `If the story is carried over, reuse that file. For a different photo, add --replace.`,
    );
  }
  let n = 2;
  while (existsSync(join(outDir, `${storyId}-${n}.webp`))) n++;
  fileName = `${storyId}-${n}.webp`;
}

let input;
try {
  input = /^https?:\/\//i.test(source) ? await downloadImage(source) : readFileSync(source);
} catch (err) {
  fail(err.code === "ENOENT" ? `file not found: ${source}` : err.message);
}

let result;
try {
  result = await convertToNewsWebp(input);
} catch (err) {
  fail(err.message);
}

mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, fileName);
writeFileSync(outPath, result.buffer);

console.log(
  `Saved ${relative(process.cwd(), outPath)} (${result.width}x${result.height}, ` +
    `${(result.buffer.length / 1024).toFixed(1)} KB, quality ${result.quality})\n`,
);
console.log(`Add to the story in the edition JSON (fill in alt, caption and credit):\n`);
console.log(
  JSON.stringify(
    {
      image: {
        file: fileName,
        alt: "<what the photo shows>",
        caption: "<optional: describe the photo, lowercase start, end with a period.>",
        credit: "<Photographer/Agency, via Outlet.>",
      },
    },
    null,
    2,
  ).slice(2, -2),
);
