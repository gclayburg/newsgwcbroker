#!/usr/bin/env node
// Validates news edition files in content/news/ against the schema in AGENTS.md.
// Usage: node scripts/validate-content.mjs [dir]   (default: content/news)
// Exits 0 when every file is valid, 1 otherwise. No dependencies.
//
// Edition files are named YYYY-MM-DD-HHMM.json: the edition's publishedAt
// converted to US Mountain Time (America/Denver), 24-hour clock.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const dir = resolve(process.argv[2] ?? "content/news");

const FILE_RE = /^(\d{4}-\d{2}-\d{2})-(\d{2})(\d{2})\.json$/;
const TIMEZONE = "America/Denver";
// publishedAt may be at most this far ahead of the build clock (clock skew).
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
const STORY_ID_DATE_RE = /^(\d{4}-\d{2}-\d{2})-/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// ISO 8601 with seconds and an explicit offset or Z, e.g. 2026-11-08T07:00:00-07:00
const TIMESTAMP_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

const EDITION_KEYS = {
  required: ["schemaVersion", "date", "title", "publishedAt", "stories"],
  optional: ["updatedAt"],
};
const STORY_KEYS = {
  required: ["id", "headline", "summary", "sourceName", "sourceUrl"],
  optional: ["category", "publishedAt"],
};

const LIMITS = {
  title: 120,
  headline: 200,
  summary: 800,
  sourceName: 100,
  category: 40,
  idLength: 80,
  minStories: 1,
  maxStories: 50,
};

function isValidCalendarDate(s) {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  );
}

const mountainFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Returns { date: "YYYY-MM-DD", hhmm: "HHMM" } for a timestamp in Mountain Time. */
function toMountain(ts) {
  const parts = Object.fromEntries(
    mountainFmt.formatToParts(new Date(ts)).map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hhmm: `${parts.hour}${parts.minute}` };
}

function isValidTimestamp(s) {
  return typeof s === "string" && TIMESTAMP_RE.test(s) && !Number.isNaN(Date.parse(s));
}

function checkString(errors, where, value, max, { allowNewlines = false } = {}) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${where}: must be a non-empty string`);
    return;
  }
  if (value !== value.trim()) errors.push(`${where}: has leading/trailing whitespace`);
  if (value.length > max) errors.push(`${where}: longer than ${max} characters (${value.length})`);
  if (!allowNewlines && /[\r\n]/.test(value)) errors.push(`${where}: must be a single line`);
  if (/<\/?[a-z][\s\S]*?>/i.test(value)) errors.push(`${where}: must be plain text (no HTML tags)`);
}

function checkKeys(errors, where, obj, spec) {
  for (const k of spec.required) {
    if (!(k in obj)) errors.push(`${where}: missing required field "${k}"`);
  }
  const allowed = new Set([...spec.required, ...spec.optional]);
  for (const k of Object.keys(obj)) {
    if (!allowed.has(k)) errors.push(`${where}: unknown field "${k}"`);
  }
}

function validateStory(errors, where, story, seenIds) {
  if (story === null || typeof story !== "object" || Array.isArray(story)) {
    errors.push(`${where}: must be an object`);
    return;
  }
  checkKeys(errors, where, story, STORY_KEYS);

  if (typeof story.id !== "string" || !ID_RE.test(story.id)) {
    errors.push(`${where}.id: must be lowercase kebab-case (a-z, 0-9, hyphens)`);
  } else {
    if (story.id.length > LIMITS.idLength) errors.push(`${where}.id: longer than ${LIMITS.idLength} characters`);
    const idDate = story.id.match(STORY_ID_DATE_RE)?.[1];
    if (!idDate || !isValidCalendarDate(idDate)) {
      errors.push(`${where}.id: must start with the date the story first appeared, e.g. "2026-11-08-..."`);
    }
    if (seenIds.has(story.id)) errors.push(`${where}.id: duplicate id "${story.id}"`);
    seenIds.add(story.id);
  }

  checkString(errors, `${where}.headline`, story.headline, LIMITS.headline);
  checkString(errors, `${where}.summary`, story.summary, LIMITS.summary, { allowNewlines: true });
  checkString(errors, `${where}.sourceName`, story.sourceName, LIMITS.sourceName);

  if (typeof story.sourceUrl !== "string") {
    errors.push(`${where}.sourceUrl: must be a string`);
  } else {
    try {
      const u = new URL(story.sourceUrl);
      if (u.protocol !== "https:") errors.push(`${where}.sourceUrl: must use https://`);
    } catch {
      errors.push(`${where}.sourceUrl: not a valid URL`);
    }
  }

  if ("category" in story) checkString(errors, `${where}.category`, story.category, LIMITS.category);
  if ("publishedAt" in story && !isValidTimestamp(story.publishedAt)) {
    errors.push(`${where}.publishedAt: must be ISO 8601 with offset, e.g. 2026-11-08T06:30:00-07:00`);
  }
}

function validateEdition(file, data) {
  const errors = [];
  const [, fileDate, fileHH, fileMM] = file.match(FILE_RE);
  const fileHHMM = `${fileHH}${fileMM}`;

  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return ["top level: must be a JSON object"];
  }
  checkKeys(errors, "edition", data, EDITION_KEYS);

  if (data.schemaVersion !== 1) errors.push(`schemaVersion: must be the number 1`);

  if (!isValidCalendarDate(fileDate)) errors.push(`filename: ${fileDate} is not a real calendar date`);
  if (Number(fileHH) > 23 || Number(fileMM) > 59) {
    errors.push(`filename: ${fileHHMM} is not a valid 24-hour time (0000-2359)`);
  }
  if (data.date !== fileDate) errors.push(`date: "${data.date}" must equal the filename date "${fileDate}"`);

  checkString(errors, "title", data.title, LIMITS.title);

  if (!isValidTimestamp(data.publishedAt)) {
    errors.push(`publishedAt: must be ISO 8601 with offset, e.g. 2026-11-08T07:00:00-07:00`);
  } else {
    const mt = toMountain(data.publishedAt);
    if (mt.date !== fileDate || mt.hhmm !== fileHHMM) {
      errors.push(
        `publishedAt: ${data.publishedAt} is ${mt.date} ${mt.hhmm} Mountain Time, so the file must be named ${mt.date}-${mt.hhmm}.json`,
      );
    }
    if (Date.parse(data.publishedAt) > Date.now() + FUTURE_TOLERANCE_MS) {
      errors.push(`publishedAt: ${data.publishedAt} is in the future`);
    }
  }
  if ("updatedAt" in data) {
    if (!isValidTimestamp(data.updatedAt)) {
      errors.push(`updatedAt: must be ISO 8601 with offset, e.g. 2026-11-08T15:00:00-07:00`);
    } else if (isValidTimestamp(data.publishedAt) && Date.parse(data.updatedAt) < Date.parse(data.publishedAt)) {
      errors.push(`updatedAt: must not be earlier than publishedAt`);
    }
  }

  if (!Array.isArray(data.stories)) {
    errors.push(`stories: must be an array`);
  } else {
    if (data.stories.length < LIMITS.minStories || data.stories.length > LIMITS.maxStories) {
      errors.push(`stories: must contain ${LIMITS.minStories}-${LIMITS.maxStories} stories (has ${data.stories.length})`);
    }
    const seenIds = new Set();
    data.stories.forEach((s, i) => validateStory(errors, `stories[${i}]`, s, seenIds));
  }
  return errors;
}

function main() {
  if (!existsSync(dir)) {
    console.log(`validate-content: ${dir} does not exist; nothing to validate.`);
    return 0;
  }
  const entries = readdirSync(dir, { withFileTypes: true }).filter(
    (e) => e.name !== ".gitkeep" && e.name !== ".DS_Store",
  );

  let failed = 0;
  let checked = 0;
  const publishedAtSeen = new Map(); // epoch ms -> file name
  for (const e of entries) {
    if (!e.isFile() || !FILE_RE.test(e.name)) {
      console.error(`✗ ${e.name}: unexpected entry; only YYYY-MM-DD-HHMM.json files belong in ${dir}`);
      failed++;
      continue;
    }
    checked++;
    let data;
    try {
      data = JSON.parse(readFileSync(join(dir, e.name), "utf-8"));
    } catch (err) {
      console.error(`✗ ${e.name}: invalid JSON: ${err.message}`);
      failed++;
      continue;
    }
    const errors = validateEdition(e.name, data);
    if (errors.length) {
      failed++;
      console.error(`✗ ${e.name}`);
      for (const msg of errors) console.error(`    - ${msg}`);
    } else {
      console.log(`✓ ${e.name} (${data.stories.length} stories)`);
    }
    if (isValidTimestamp(data?.publishedAt)) {
      const t = Date.parse(data.publishedAt);
      const other = publishedAtSeen.get(t);
      if (other) {
        console.error(`✗ ${e.name}: publishedAt is identical to ${other}; each edition needs a unique time`);
        failed++;
      } else {
        publishedAtSeen.set(t, e.name);
      }
    }
  }

  if (!failed && publishedAtSeen.size) {
    const [latestT, latestFile] = [...publishedAtSeen].sort((a, b) => b[0] - a[0])[0];
    console.log(`Latest edition (shown on homepage): ${latestFile} (${new Date(latestT).toISOString()})`);
  }

  if (failed) {
    console.error(`\nvalidate-content: FAILED (${failed} problem file(s)/entries, ${checked} edition file(s) checked)`);
    return 1;
  }
  console.log(`validate-content: OK (${checked} edition file(s))`);
  return 0;
}

process.exit(main());
