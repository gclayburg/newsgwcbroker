// Shared rules for story photos, used by validate-content, prepare-image and sandbox.
//
// Photos are stored as files in public/<NEWS_IMAGES_PATH>/ (default
// public/news-images/) and served by the site at /<NEWS_IMAGES_PATH>/<file>.
// An edition references a photo by file name only: "image": { "file": "<name>.webp", ... }.
// The sandbox uses public/news-images-sandbox/ (git-ignored) instead.

import { resolve } from "node:path";

/** Photos are WebP, 600 px wide (same as Grok Bot's pages), never enlarged. */
export const IMAGE_WIDTH = 600;
export const IMAGE_MIN_WIDTH = 200;
export const IMAGE_MAX_HEIGHT = 900;
export const IMAGE_MAX_BYTES = 150 * 1024;
export const IMAGE_QUALITY = 75;

export const DEFAULT_IMAGES_PATH = "news-images";
export const SANDBOX_IMAGES_PATH = "news-images-sandbox";

/** URL path segment under public/, e.g. "news-images". */
export function imagesPath(env = process.env) {
  return env.NEWS_IMAGES_PATH || DEFAULT_IMAGES_PATH;
}

/** Folder on disk that holds the photos, e.g. <root>/public/news-images. */
export function imagesDir(root, env = process.env) {
  return resolve(root, "public", imagesPath(env));
}

/** File name rule: "<story id>.webp" or "<story id>-<n>.webp" (n = 2, 3, ... for a replacement photo). */
export function imageFileMatchesStory(file, storyId) {
  if (file === `${storyId}.webp`) return true;
  const m = file.match(/^(.+)-(\d+)\.webp$/);
  return !!m && m[1] === storyId && Number(m[2]) >= 2;
}

export const IMAGE_FILE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.webp$/;

/** Returns { width, height } for a WebP buffer, or null if it isn't a WebP image. */
export function readWebpSize(buf) {
  if (buf.length < 30 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8 ") {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    const b = buf.readUInt32LE(21);
    return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  }
  return null;
}
