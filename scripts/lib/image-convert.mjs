// Download a photo and convert it to the site's format (WebP, 600 px wide,
// <= 150 KB, metadata stripped). Uses sharp (devDependency).

import sharp from "sharp";
import {
  IMAGE_MAX_BYTES,
  IMAGE_MAX_HEIGHT,
  IMAGE_MIN_WIDTH,
  IMAGE_QUALITY,
  IMAGE_WIDTH,
} from "./news-images.mjs";

const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;

/** Fetches an image over http(s). Throws a readable error on failure. */
export async function downloadImage(url) {
  let res;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; newsgwcbroker-image-fetch/1.0)",
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    throw new Error(`could not download ${url}: ${err.cause?.message ?? err.message}`);
  }
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status} for ${url} (blocked or missing?)`);
  const type = res.headers.get("content-type") || "";
  if (!type.startsWith("image/")) {
    throw new Error(`${url} returned "${type || "unknown type"}", not an image (blocked, or a web page instead of the image file?)`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_DOWNLOAD_BYTES) throw new Error(`image is larger than 25 MB`);
  return buf;
}

/**
 * Converts any image sharp can read to the site's WebP format.
 * Returns { buffer, width, height, quality }.
 */
export async function convertToNewsWebp(input) {
  let meta;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new Error("not a readable image file");
  }
  if (!meta.width || meta.width < IMAGE_MIN_WIDTH) {
    throw new Error(`image is only ${meta.width ?? "?"} px wide; minimum is ${IMAGE_MIN_WIDTH} px. Use the story without a photo.`);
  }
  for (const quality of [IMAGE_QUALITY, 65, 55, 45, 35]) {
    const { data, info } = await sharp(input, { animated: false })
      .rotate() // apply EXIF orientation
      .resize({
        width: IMAGE_WIDTH,
        height: IMAGE_MAX_HEIGHT,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer({ resolveWithObject: true }); // metadata (EXIF/GPS) is not copied
    if (data.length <= IMAGE_MAX_BYTES) {
      if (info.width < IMAGE_MIN_WIDTH) {
        throw new Error(`image would be only ${info.width} px wide (very tall photo); use the story without a photo`);
      }
      return { buffer: data, width: info.width, height: info.height, quality };
    }
  }
  throw new Error(`could not get the image under ${IMAGE_MAX_BYTES / 1024} KB`);
}
