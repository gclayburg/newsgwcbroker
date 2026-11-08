#!/usr/bin/env node
// Local sandbox for testing the layout and the publishing flow with made-up
// editions. Writes ONLY to .sandbox/news/ and public/news-images-sandbox/
// (both git-ignored), never to content/news/ or public/news-images/.
//
//   node scripts/sandbox.mjs seed [--days N] [--seed N]   replace sandbox with N days of editions (default 4)
//   node scripts/sandbox.mjs publish                      add one new edition stamped "now" (like Grok Bot)
//   node scripts/sandbox.mjs clear                        delete all sandbox editions
//   node scripts/sandbox.mjs list                         list sandbox editions, newest first
//
// View with: npm run dev:sandbox   (sets NEWS_CONTENT_DIR=.sandbox/news and
// NEWS_IMAGES_PATH=news-images-sandbox)
//
// Stories, outlets and towns are fictional. Source links point to example.com
// (a reserved domain). Photos are random placeholders downloaded from
// https://picsum.photos and converted exactly like real ones (npm run news:image).

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { convertToNewsWebp, downloadImage } from "./lib/image-convert.mjs";
import { DEFAULT_IMAGES_PATH, SANDBOX_IMAGES_PATH } from "./lib/news-images.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SANDBOX_DIR = join(ROOT, ".sandbox", "news");
const SANDBOX_IMAGES_DIR = join(ROOT, "public", SANDBOX_IMAGES_PATH);
const REAL_DIR = join(ROOT, "content");
const REAL_IMAGES_DIR = join(ROOT, "public", DEFAULT_IMAGES_PATH);
const TZ = "America/Denver";

// Hard safety stop: never write inside content/ or the real photo folder.
const inside = (p, dir) => p === dir || p.startsWith(dir + sep);
if (inside(SANDBOX_DIR, REAL_DIR) || inside(SANDBOX_IMAGES_DIR, REAL_IMAGES_DIR)) {
  console.error("Refusing to write test data into content/ or public/news-images/.");
  process.exit(1);
}

// ---------- made-up content ----------

const OUTLETS = [
  "The Front Range Ledger",
  "Continental Wire",
  "Mesa Daily Courier",
  "Plains & Peaks Report",
  "Metro Signal",
  "Silver Creek Gazette",
  "High Desert Dispatch",
];

// [category, headline, summary]
const STORIES = [
  ["Local", "Pine Hollow council approves light-rail extension after marathon session",
    "After nine hours of public comment, the Pine Hollow city council voted 6-1 to fund a four-mile light-rail extension to the Granite Springs park-and-ride. Construction is expected to begin next spring, and officials say the line could carry 8,000 riders a day by 2030."],
  ["Weather", "Early-season storm to drop up to a foot of snow on the high country",
    "Forecasters expect a fast-moving storm to bring 6 to 12 inches of snow above 9,000 feet by Tuesday morning. Lower elevations should see a cold rain turning to light snow overnight, with slick commutes likely along the mountain corridor."],
  ["Business", "Regional grocer Copper Basket to open three new stores",
    "Copper Basket, a family-owned grocery chain, says it will open stores in Aspen Flats, Redwater and North Ridge over the next 18 months. The company plans to hire about 400 people and expand its locally sourced produce program."],
  ["Politics", "Statehouse panel advances bill to cap rental application fees",
    "A legislative committee voted along party lines to advance a measure limiting rental application fees to $25 and requiring landlords to return unused screening fees. Supporters say it would save renters hundreds of dollars a year; landlord groups warn of higher deposits."],
  ["Technology", "Startup unveils battery that charges an e-bike in eight minutes",
    "Granite Springs startup Voltaic Trail demonstrated a prototype e-bike battery that reaches 80 percent charge in about eight minutes. The company says it will begin limited production next year, pending safety certification."],
  ["Sports", "Mountaineers rally late to clinch division title",
    "Down by 10 with six minutes left, the Silver Creek Mountaineers scored two touchdowns to win 31-27 and secure their first division title in a decade. Quarterback Dana Ruiz threw for 312 yards and ran in the winning score."],
  ["Health", "County opens free walk-in flu and COVID vaccine clinics",
    "The county health department is running free walk-in vaccine clinics at five libraries through the end of the month. No appointment or insurance is required, and officials recommend this season's updated shots for anyone six months and older."],
  ["Environment", "Reservoir levels climb to highest point in five years",
    "Thanks to a wet spring and a cool summer, Blue Mesa-area reservoirs are at 87 percent of capacity, the highest level since 2021. Water managers caution that a single good year does not end the long-term drought."],
  ["Education", "School district pilots four-day week at six rural schools",
    "Six rural schools in the Redwater district will move to a four-day week starting in January as part of a two-year pilot. District leaders say the change could help recruit teachers; some parents worry about child care on Fridays."],
  ["Transportation", "Highway closure planned overnight for bridge replacement",
    "Crews will close both directions of the Canyon Road highway between mileposts 40 and 46 from 9 p.m. to 5 a.m. through Thursday to set new bridge girders. Drivers should plan on a 25-minute detour through Aspen Flats."],
  ["Business", "Tech employer to add 600 jobs at new North Ridge campus",
    "Cloud software company Lattice & Pine says it will build a regional campus in North Ridge and hire 600 people over three years. The state approved $12 million in performance-based tax credits tied to the hiring."],
  ["Local", "Historic theater reopens after two-year restoration",
    "The 1926 Paramount Theater in downtown Granite Springs reopened Friday with its original marquee and pipe organ restored. The $14 million project was funded by a mix of grants and more than 3,000 private donations."],
  ["Science", "Amateur astronomers spot rare double comet from local observatory",
    "Volunteers at the Pine Hollow Observatory photographed a comet that appears to have split into two fragments. Researchers at the state university are using the images to study how comets break apart near the sun."],
  ["Politics", "Mayor proposes budget with new money for parks and transit",
    "Mayor Elena Park's proposed $2.1 billion budget adds 40 park rangers, extends weekend bus service and freezes most fees. The council will hold three public hearings before a final vote next month."],
  ["Economy", "Gas prices fall for third straight week",
    "The average price of regular gasoline fell 7 cents this week to $3.12 a gallon, according to a regional motor club survey. Analysts credit lower crude prices and the end of the summer driving season."],
  ["Outdoors", "Ski areas move up opening day after cold snap",
    "Two high-elevation ski areas say they will open this weekend, a week earlier than planned, after snowmaking crews took advantage of overnight lows in the teens. Only a handful of beginner runs will be open at first."],
  ["Housing", "Home sales slow while prices hold steady",
    "Home sales across the metro area fell 9 percent from a year ago in October, but the median sale price held at about $585,000. Agents say buyers are waiting for mortgage rates to ease further."],
  ["Public Safety", "Wildfire crews contain grass fire near Redwater",
    "Firefighters fully contained a 340-acre grass fire east of Redwater on Sunday afternoon. No structures were lost, and evacuation orders for about 120 homes have been lifted."],
  ["Arts", "Mural festival transforms downtown alleys",
    "More than 30 artists painted murals across 12 downtown alleys during the weeklong Walls of Granite festival. Organizers expect the new artwork to draw visitors through the winter."],
  ["Agriculture", "Peach growers report record harvest despite late frost",
    "Western-slope orchards shipped a record 1.2 million boxes of peaches this season, growers say, after a late-April frost spared most high-elevation trees. Prices to farmers were up slightly from last year."],
  ["Technology", "Libraries begin lending Wi-Fi hotspots to close digital divide",
    "The regional library system now lends 500 mobile Wi-Fi hotspots for up to three weeks at a time. Librarians say demand has been strongest among students and job seekers in rural branches."],
  ["Health", "Hospital opens new pediatric emergency wing",
    "Mesa General Hospital opened a 24-bed pediatric emergency department designed to shorten waits for children. The wing includes quieter rooms and a separate entrance from the adult ER."],
  ["Local", "Volunteers plant 5,000 trees along restored creek",
    "About 600 volunteers planted willows and cottonwoods along a two-mile stretch of Silver Creek that was straightened decades ago. The restoration aims to cool the water and bring back native trout."],
  ["Business", "Brewery wins national gold medal for its winter ale",
    "High Desert Brewing took gold at a national beer competition for its spiced winter ale. The small brewery says it will double production of the seasonal beer this year."],
];

const PHOTO_CAPTIONS = [
  "placeholder image for a made-up story.",
  "random sample photo used for layout testing.",
  "stock placeholder, not related to the story.",
];

// ---------- helpers ----------

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rand = Math.random;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const intBetween = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const slugify = (s) => {
  const full = s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (full.length <= 50) return full;
  const cut = full.slice(0, 51);
  return cut.slice(0, cut.lastIndexOf("-")); // end on a whole word
};

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});
const offsetFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" });

/** Mountain Time wall-clock parts for an instant. */
function mt(date) {
  const p = Object.fromEntries(partsFmt.formatToParts(date).map((x) => [x.type, x.value]));
  const off = offsetFmt.formatToParts(date).find((x) => x.type === "timeZoneName").value.replace("GMT", "") || "+00:00";
  return { date: `${p.year}-${p.month}-${p.day}`, hh: p.hour, mm: p.minute, ss: p.second, offset: off };
}

/** ISO 8601 timestamp with the Mountain Time offset, e.g. 2026-11-08T07:00:00-07:00 */
function isoMountain(date) {
  const m = mt(date);
  return `${m.date}T${m.hh}:${m.mm}:${m.ss}${m.offset}`;
}

/** Instant for a Mountain Time wall-clock date + time. */
function fromMountain(dateStr, hh, mm) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  let guess = Date.UTC(y, mo - 1, d, hh, mm) + 7 * 3600e3;
  for (let i = 0; i < 2; i++) {
    const off = mt(new Date(guess)).offset; // "-07:00"
    const mins = (off[0] === "-" ? -1 : 1) * (Number(off.slice(1, 3)) * 60 + Number(off.slice(4, 6)));
    guess = Date.UTC(y, mo - 1, d, hh, mm) - mins * 60e3;
  }
  return new Date(guess);
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const longDay = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
const dayLabel = (dateStr) => longDay.format(new Date(`${dateStr}T12:00:00Z`));

function editionTitle(hh, dateStr) {
  const h = Number(hh);
  const kind = h < 11 ? "Morning Briefing" : h < 17 ? "Afternoon Update" : "Evening Edition";
  return `${kind} — ${dayLabel(dateStr)}`;
}

function makeStory(template, firstDate, publishedAt) {
  const [category, headline, summary] = template;
  const id = `${firstDate}-${slugify(headline)}`;
  const story = {
    id,
    headline,
    summary,
    sourceName: pick(OUTLETS),
    sourceUrl: `https://example.com/news/${slugify(headline)}`,
    category,
    publishedAt,
  };
  if (rand() < 0.75) {
    story.image = {
      file: `${id}.webp`,
      alt: `Placeholder photo for the story “${headline}”`,
      caption: pick(PHOTO_CAPTIONS),
      credit: "Lorem Picsum (placeholder).",
    };
  }
  return story;
}

/**
 * Makes sure every story photo exists in public/news-images-sandbox/, downloading
 * placeholders as needed (6 at a time). Stories whose photo can't be fetched
 * become text-only, which also exercises that layout.
 */
async function ensurePhotos(editions) {
  mkdirSync(SANDBOX_IMAGES_DIR, { recursive: true });
  const needed = new Map(); // file -> story id
  for (const e of editions) {
    for (const s of e.data.stories) {
      if (s.image && !existsSync(join(SANDBOX_IMAGES_DIR, s.image.file))) needed.set(s.image.file, s.id);
    }
  }
  const failed = new Set();
  const queue = [...needed];
  let done = 0;
  if (queue.length) process.stdout.write(`Downloading ${queue.length} placeholder photo(s) from picsum.photos `);
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const [file, id] = item;
      const [w, h] = pick([[1200, 800], [1200, 675], [1000, 750], [1200, 900]]);
      try {
        const buf = await downloadImage(`https://picsum.photos/seed/${id}/${w}/${h}.jpg`);
        const { buffer } = await convertToNewsWebp(buf);
        writeFileSync(join(SANDBOX_IMAGES_DIR, file), buffer);
      } catch {
        failed.add(file);
      }
      if (++done % 5 === 0) process.stdout.write(".");
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  if (needed.size) console.log(` done${failed.size ? ` (${failed.size} failed; those stories are text-only)` : ""}\n`);
  for (const e of editions) {
    for (const s of e.data.stories) if (s.image && failed.has(s.image.file)) delete s.image;
  }
}

/** Builds an edition. `carry` = stories from the previous edition to keep. */
function buildEdition(when, carry, used) {
  const m = mt(when);
  const publishedAt = isoMountain(when);
  const fresh = carry.length ? intBetween(2, 3) : intBetween(7, 9);
  const kept = carry.length ? shuffle(carry).slice(0, intBetween(5, 7)) : [];
  const onPage = new Set(kept.map((st) => st.headline));
  const available = STORIES.filter((t) => !used.has(t[1]));
  // When the story bank runs out, recycle stories that aren't on the current front page.
  const pool = available.length >= fresh ? available : STORIES.filter((t) => !onPage.has(t[1]));
  const newStories = shuffle(pool)
    .slice(0, fresh)
    .map((t) => {
      used.add(t[1]);
      const storyTime = isoMountain(new Date(when.getTime() - intBetween(20, 300) * 60e3));
      return makeStory(t, m.date, storyTime);
    });
  const keptIds = new Set();
  const stories = [...newStories, ...kept].filter((s) => !keptIds.has(s.id) && keptIds.add(s.id));
  return {
    file: `${m.date}-${m.hh}${m.mm}.json`,
    data: {
      schemaVersion: 1,
      date: m.date,
      title: editionTitle(m.hh, m.date),
      subtitle: `${stories.length} made-up stories for layout and publishing tests.`,
      intro:
        "This is a sandbox edition generated by scripts/sandbox.mjs. Outlets, towns and people are fictional, links go to example.com, and photos are random placeholders.",
      publishedAt,
      stories,
    },
  };
}

function readEditions() {
  if (!existsSync(SANDBOX_DIR)) return [];
  return readdirSync(SANDBOX_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}-\d{4}\.json$/.test(f))
    .map((f) => ({ file: f, data: JSON.parse(readFileSync(join(SANDBOX_DIR, f), "utf-8")) }))
    .sort((a, b) => Date.parse(b.data.publishedAt) - Date.parse(a.data.publishedAt));
}

function write(edition) {
  mkdirSync(SANDBOX_DIR, { recursive: true });
  writeFileSync(join(SANDBOX_DIR, edition.file), JSON.stringify(edition.data, null, 2) + "\n");
}

function validate() {
  try {
    execFileSync(
      process.execPath,
      [join(ROOT, "scripts", "validate-content.mjs"), SANDBOX_DIR, "--images-dir", SANDBOX_IMAGES_DIR],
      { stdio: "inherit" },
    );
  } catch {
    process.exit(1);
  }
}

const rel = (p) => relative(process.cwd(), p) || ".";

// ---------- commands ----------

async function seed(days, seedNum) {
  rand = mulberry32(seedNum);
  rmSync(SANDBOX_DIR, { recursive: true, force: true });
  rmSync(SANDBOX_IMAGES_DIR, { recursive: true, force: true });
  const built = [];
  const now = new Date();
  const today = mt(now).date;
  const used = new Set();
  let prev = null;
  let count = 0;
  for (let d = days - 1; d >= 0; d--) {
    const date = addDays(today, -d);
    const slots = [[7, intBetween(0, 3) * 15]];
    if (rand() < 0.6) slots.push([intBetween(12, 15), intBetween(0, 11) * 5]);
    if (rand() < 0.4) slots.push([intBetween(18, 21), intBetween(0, 11) * 5]);
    for (const [hh, mm] of slots) {
      const when = fromMountain(date, hh, mm);
      if (when > now) continue; // never create future editions
      // Each new day starts fresh; later editions that day carry stories over.
      const carry = prev && prev.data.date === date ? prev.data.stories : [];
      const edition = buildEdition(when, carry, used);
      built.push(edition);
      prev = edition;
      count++;
    }
  }
  await ensurePhotos(built);
  built.forEach(write);
  console.log(`Seeded ${count} sandbox edition(s) over ${days} day(s) in ${rel(SANDBOX_DIR)}/\n`);
  validate();
  console.log(`\nView them: npm run dev:sandbox`);
}

async function publish() {
  const now = new Date();
  now.setSeconds(0, 0);
  const latest = readEditions()[0];
  const carry = latest && latest.data.date === mt(now).date ? latest.data.stories : [];
  const used = new Set(readEditions().flatMap((e) => e.data.stories.map((s) => s.headline)));
  const edition = buildEdition(now, carry, used);
  if (existsSync(join(SANDBOX_DIR, edition.file))) {
    console.error(`${edition.file} already exists (one edition per minute). Wait a minute and try again.`);
    process.exit(1);
  }
  await ensurePhotos([edition]);
  write(edition);
  console.log(`Published sandbox edition ${rel(join(SANDBOX_DIR, edition.file))}`);
  console.log(`  "${edition.data.title}" with ${edition.data.stories.length} stories` +
    (carry.length ? ` (carried over from ${latest.file})` : "") + "\n");
  validate();
  console.log(`\nReload the homepage on the sandbox dev server to see it as the latest edition.`);
}

function clear() {
  rmSync(SANDBOX_DIR, { recursive: true, force: true });
  rmSync(SANDBOX_IMAGES_DIR, { recursive: true, force: true });
  console.log(`Removed ${rel(SANDBOX_DIR)}/ and ${rel(SANDBOX_IMAGES_DIR)}/`);
}

function list() {
  const all = readEditions();
  if (!all.length) return console.log(`No sandbox editions. Run: npm run sandbox:seed`);
  for (const [i, e] of all.entries()) {
    console.log(`${i === 0 ? "★" : " "} ${e.file}  ${e.data.title}  (${e.data.stories.length} stories)`);
  }
  console.log(`\n★ = latest (shown on the homepage)`);
}

const [cmd = "help", ...args] = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? Number(args[i + 1]) : dflt;
};

switch (cmd) {
  case "seed": {
    const days = opt("days", 4);
    if (!Number.isInteger(days) || days < 1 || days > 30) {
      console.error("--days must be a whole number from 1 to 30");
      process.exit(1);
    }
    await seed(days, opt("seed", Date.now() % 1e9));
    break;
  }
  case "publish":
    await publish();
    break;
  case "clear":
    clear();
    break;
  case "list":
    list();
    break;
  default:
    console.log(
      readFileSync(fileURLToPath(import.meta.url), "utf-8")
        .split("\n")
        .slice(1)
        .filter((line, i, all) => all.slice(0, i + 1).every((l) => l.startsWith("//")))
        .map((l) => l.replace(/^\/\/ ?/, ""))
        .join("\n"),
    );
}
