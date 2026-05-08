#!/usr/bin/env python3
"""
Scrape recent NUFORC sighting reports (2015–present) and append to SQLite.
NUFORC publishes a monthly index at https://nuforc.org/webreports/ndxevent.html
Each row links to a report page with full details.

Run periodically to keep the DB fresh.
"""
import html
import os
import re
import sqlite3
import subprocess
import time

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "sightings.db")
INDEX_URL = "https://nuforc.org/webreports/ndxevent.html"


def fetch(url: str) -> str:
    result = subprocess.run(
        ["curl", "-fsSL", "--max-time", "30", "-A",
         "Mozilla/5.0 (compatible; UFOTracker/1.0)"],
        capture_output=True, timeout=35
    )
    # curl positional arg must be last
    result = subprocess.run(
        ["curl", "-fsSL", "--max-time", "30", "-A",
         "Mozilla/5.0 (compatible; UFOTracker/1.0)", url],
        capture_output=True, timeout=35
    )
    if result.returncode != 0:
        raise RuntimeError(f"curl failed for {url}: {result.stderr.decode()[:200]}")
    return result.stdout.decode("utf-8", errors="replace")


def parse_index(html_text: str) -> list[tuple[str, str]]:
    """Return list of (year_month_label, relative_url) for all monthly pages."""
    pattern = r'<a\s+href="([^"]+ndxe\d+\.html)"[^>]*>([^<]+)</a>'
    matches = re.findall(pattern, html_text, re.IGNORECASE)
    return [(label.strip(), href.strip()) for href, label in matches]


def parse_monthly_page(html_text: str) -> list[dict]:
    """Parse a monthly NUFORC page and extract sighting rows."""
    sightings = []
    # Each row: Date/Time | City | State | Shape | Duration | Summary | Posted | Images
    row_pattern = re.compile(
        r'<tr[^>]*>.*?</tr>', re.DOTALL | re.IGNORECASE
    )
    cell_pattern = re.compile(r'<td[^>]*>(.*?)</td>', re.DOTALL | re.IGNORECASE)
    link_pattern = re.compile(r'href="([^"]+)"', re.IGNORECASE)
    tag_pattern = re.compile(r'<[^>]+>')

    for row in row_pattern.finditer(html_text):
        cells = cell_pattern.findall(row.group())
        if len(cells) < 6:
            continue
        def clean(s: str) -> str:
            return html.unescape(tag_pattern.sub("", s)).strip()

        datetime_raw = clean(cells[0])
        if not re.match(r'\d{1,2}/\d{1,2}/\d{2,4}', datetime_raw):
            continue  # skip header rows

        city = clean(cells[1])
        state = clean(cells[2])
        shape = clean(cells[3]).lower() or "unknown"
        duration = clean(cells[4])
        summary = clean(cells[5])[:500]
        posted = clean(cells[6]) if len(cells) > 6 else ""

        # Try to extract year from datetime
        m = re.search(r'(\d{2,4})\s*$', datetime_raw.split(" ")[0])
        year = 0
        if m:
            y = int(m.group(1))
            year = y if y > 100 else (2000 + y if y < 50 else 1900 + y)

        sightings.append({
            "datetime": datetime_raw,
            "year": year,
            "city": city,
            "state": state,
            "country": "us",  # NUFORC is primarily US
            "shape": shape,
            "duration_seconds": None,
            "comments": summary,
            "date_posted": posted,
            "lat": None,
            "lng": None,
        })

    return sightings


def get_existing_years(conn: sqlite3.Connection) -> set[int]:
    rows = conn.execute("SELECT DISTINCT year FROM sightings").fetchall()
    return {r[0] for r in rows}


def insert_sightings(conn: sqlite3.Connection, rows: list[dict]) -> int:
    inserted = 0
    for r in rows:
        if r["lat"] is None:
            continue  # skip rows without coordinates for now
        conn.execute(
            """INSERT OR IGNORE INTO sightings
               (datetime, year, city, state, country, shape,
                duration_seconds, comments, date_posted, lat, lng)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (r["datetime"], r["year"], r["city"], r["state"], r["country"],
             r["shape"], r["duration_seconds"], r["comments"],
             r["date_posted"], r["lat"], r["lng"])
        )
        inserted += conn.execute("SELECT changes()").fetchone()[0]
    conn.commit()
    return inserted


def main():
    conn = sqlite3.connect(DB_PATH)
    existing_years = get_existing_years(conn)
    print(f"Existing years in DB: {min(existing_years) if existing_years else '?'} – {max(existing_years) if existing_years else '?'}")

    print("Fetching NUFORC monthly index...")
    index_html = fetch(INDEX_URL)
    months = parse_index(index_html)
    print(f"Found {len(months)} monthly pages in index")

    # Filter to pages after 2014
    target_months = [
        (label, href) for label, href in months
        if re.search(r'(201[5-9]|202\d)', label)
    ]
    print(f"Scraping {len(target_months)} months from 2015–present...")

    base_url = "https://nuforc.org/webreports/"
    total_new = 0

    for label, href in target_months:
        url = base_url + href if not href.startswith("http") else href
        try:
            page_html = fetch(url)
            sightings = parse_monthly_page(page_html)
            new = insert_sightings(conn, sightings)
            total_new += new
            print(f"  {label}: {len(sightings)} reports parsed, {new} new inserted")
            time.sleep(0.5)  # be polite
        except Exception as e:
            print(f"  {label}: ERROR — {e}")

    print(f"\nDone. {total_new} new sightings added.")
    final = conn.execute("SELECT COUNT(*) FROM sightings").fetchone()[0]
    print(f"Total sightings in DB: {final}")
    conn.close()


if __name__ == "__main__":
    main()
