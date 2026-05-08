#!/usr/bin/env node
/**
 * Scrape recent NUFORC sighting reports using Playwright (headless Chromium).
 * NUFORC's site is now a JS SPA, so curl can't read it.
 *
 * Navigates to each monthly report page, waits for the table to render,
 * extracts rows, geocodes via local DB lookup, inserts into SQLite.
 *
 * Usage: node scripts/scrape_nuforc_playwright.js [--year 2024]
 */

const { chromium } = require("playwright");
const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "data", "sightings.db");
// NUFORC now redirects to: https://nuforc.org/subndx/?id=e{YYYY}{MM}
function monthUrls(fromYear = 2015, toYear = new Date().getFullYear()) {
  const urls = [];
  for (let y = fromYear; y <= toYear; y++) {
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, "0");
      urls.push({
        label: `${y}-${mm}`,
        url: `https://nuforc.org/subndx/?id=e${y}${mm}`,
      });
    }
  }
  return urls;
}

function buildLookup(db) {
  const rows = db
    .prepare(
      `SELECT LOWER(TRIM(city)) as c, LOWER(TRIM(state)) as s,
              AVG(lat) as lat, AVG(lng) as lng
       FROM sightings
       WHERE lat IS NOT NULL AND lat != 0
         AND city != ''
       GROUP BY LOWER(TRIM(city)), LOWER(TRIM(state))`
    )
    .all();
  const map = new Map();
  for (const r of rows) map.set(`${r.c}||${r.s}`, { lat: r.lat, lng: r.lng });
  return map;
}

function geocode(lookup, city, state) {
  const key = `${city.toLowerCase().trim()}||${state.toLowerCase().trim()}`;
  return lookup.get(key) ?? lookup.get(`${city.toLowerCase().trim()}||`) ?? null;
}

function parseYear(dateStr) {
  if (!dateStr) return 0;
  const m = dateStr.match(/(\d{4})/);
  return m ? parseInt(m[1]) : 0;
}

async function scrapePage(page, url) {
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  } catch {
    return [];
  }

  // Wait for table rows to appear
  try {
    await page.waitForSelector("table tr", { timeout: 10000 });
  } catch {
    return [];
  }

  const rows = await page.evaluate(() => {
    const trs = Array.from(document.querySelectorAll("table tr"));
    return trs.slice(1).map((tr) => {
      const tds = Array.from(tr.querySelectorAll("td")).map((td) =>
        td.innerText?.trim() ?? ""
      );
      return tds;
    });
  });

  // col[0] = "Open" or "Open .", col[1] = date — filter by date in col[1]
  return rows.filter((r) => r.length >= 7 && /\d{1,2}\/\d{1,2}\/\d{4}/.test(r[1]));
}

async function main() {
  const args = process.argv.slice(2);
  const yearIdx = args.indexOf("--year");
  const fromYear = yearIdx >= 0 ? parseInt(args[yearIdx + 1]) : 2015;

  const db = new Database(DB_PATH);
  const lookup = buildLookup(db);
  console.log(`Local geocode lookup: ${lookup.size} city/state combos`);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO sightings
      (datetime, year, city, state, country, shape,
       duration_seconds, comments, date_posted, lat, lng)
    VALUES (@datetime, @year, @city, @state, @country, @shape,
            @duration_seconds, @comments, @date_posted, @lat, @lng)
  `);

  const urls = monthUrls(fromYear);
  console.log(`Scraping ${urls.length} monthly pages (${fromYear}–present)...`);

  // Use the system-installed Chromium if the expected version isn't present
  const chromiumPaths = [
    "/Users/omar/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  const executablePath = chromiumPaths.find((p) => {
    try { require("fs").accessSync(p); return true; } catch { return false; }
  });

  const browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  });
  const page = await context.newPage();

  let totalInserted = 0;
  let totalParsed = 0;

  for (const { label, url } of urls) {
    const rows = await scrapePage(page, url);
    if (rows.length === 0) {
      process.stdout.write(`  ${label}: no data\n`);
      continue;
    }

    let inserted = 0;
    const insertMany = db.transaction((items) => {
      for (const item of items) insert.run(item);
    });

    const items = [];
    for (const cols of rows) {
      // Columns: LINK | OCCURRED | CITY | STATE | COUNTRY | SHAPE | SUMMARY | REPORTED | MEDIA | EXPLANATION
      const datetime = cols[1] || "";
      const city     = cols[2] || "";
      const state    = cols[3] || "";
      const country  = cols[4] || "usa";
      const shape    = cols[5] || "unknown";
      const summary  = cols[6] || "";
      const posted   = cols[7] || "";

      const year = parseYear(datetime);
      const coords = geocode(lookup, city, state);

      // Normalize country code
      const countryCode = country.toLowerCase() === "usa" ? "us"
        : country.toLowerCase() === "united kingdom" ? "gb"
        : country.toLowerCase() === "canada" ? "ca"
        : country.toLowerCase() === "australia" ? "au"
        : country.toLowerCase().slice(0, 2);

      items.push({
        datetime,
        year,
        city,
        state,
        country: countryCode,
        shape: shape.toLowerCase(),
        duration_seconds: null,
        comments: summary.slice(0, 500),
        date_posted: posted,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });
    }

    insertMany(items);

    // Count how many were actually new
    const before = db.prepare("SELECT changes()").get();
    inserted = items.length; // approximate
    totalParsed += rows.length;
    totalInserted += inserted;

    console.log(`  ${label}: ${rows.length} parsed, ~${inserted} inserted`);
  }

  await browser.close();

  const total = db.prepare("SELECT COUNT(*) as n FROM sightings").get().n;
  console.log(`\nDone. Total sightings in DB: ${total}`);
  db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
