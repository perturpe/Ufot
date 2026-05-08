#!/usr/bin/env python3
"""
Download NUFORC UFO sightings CSV and seed into SQLite.
Source: https://github.com/planetsig/ufo-reports
~80k records with lat/lng, shape, duration, comments.
"""
import csv
import io
import os
import sqlite3
import subprocess

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "sightings.db")
CSV_URL = "https://raw.githubusercontent.com/planetsig/ufo-reports/master/csv-data/ufo-scrubbed-geocoded-time-standardized.csv"

SHAPES = [
    "light", "triangle", "circle", "fireball", "unknown", "other",
    "sphere", "disk", "oval", "formation", "cigar", "flash", "rectangle",
    "cylinder", "diamond", "chevron", "egg", "changing", "cone", "cross",
    "delta", "round", "teardrop",
]

CREATE_SQL = """
CREATE TABLE IF NOT EXISTS sightings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    datetime TEXT,
    year INTEGER,
    city TEXT,
    state TEXT,
    country TEXT,
    shape TEXT,
    duration_seconds REAL,
    comments TEXT,
    date_posted TEXT,
    lat REAL,
    lng REAL
);
CREATE INDEX IF NOT EXISTS idx_year ON sightings(year);
CREATE INDEX IF NOT EXISTS idx_shape ON sightings(shape);
CREATE INDEX IF NOT EXISTS idx_country ON sightings(country);
CREATE INDEX IF NOT EXISTS idx_latlng ON sightings(lat, lng);
"""

def main():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    local_csv = os.path.join(os.path.dirname(__file__), "..", "data", "nuforc.csv")
    if os.path.exists(local_csv):
        print(f"Using local CSV: {local_csv}")
        with open(local_csv, encoding="utf-8", errors="replace") as f:
            raw = f.read()
    else:
        print(f"Downloading NUFORC CSV from GitHub...")
        result = subprocess.run(["curl", "-fsSL", "--max-time", "300", CSV_URL], capture_output=True, timeout=310)
        if result.returncode != 0:
            raise RuntimeError(f"curl failed: {result.stderr.decode()}")
        raw = result.stdout.decode("utf-8", errors="replace")
    print("Download complete. Parsing...")

    rows = list(csv.reader(io.StringIO(raw)))
    print(f"Total rows: {len(rows)}")

    conn = sqlite3.connect(DB_PATH)
    conn.executescript(CREATE_SQL)

    insert_sql = """
    INSERT INTO sightings
        (datetime, year, city, state, country, shape, duration_seconds, comments, date_posted, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    batch = []
    skipped = 0
    for row in rows:
        if len(row) < 11:
            skipped += 1
            continue
        datetime_str, city, state, country, shape, dur_sec, _dur_hm, comments, date_posted, lat_s, lng_s = row[:11]
        try:
            lat = float(lat_s)
            lng = float(lng_s)
        except ValueError:
            skipped += 1
            continue
        # skip clearly bad coords
        if lat == 0.0 and lng == 0.0:
            skipped += 1
            continue
        try:
            year = int(datetime_str.split("/")[-1].split(" ")[0]) if "/" in datetime_str else 0
        except Exception:
            year = 0
        try:
            dur = float(dur_sec) if dur_sec else None
        except ValueError:
            dur = None
        shape_norm = shape.lower().strip() if shape else "unknown"
        batch.append((
            datetime_str, year, city, state,
            country.lower().strip() if country else "",
            shape_norm, dur,
            comments[:500] if comments else "",
            date_posted, lat, lng,
        ))
        if len(batch) >= 1000:
            conn.executemany(insert_sql, batch)
            batch = []

    if batch:
        conn.executemany(insert_sql, batch)
    conn.commit()

    count = conn.execute("SELECT COUNT(*) FROM sightings").fetchone()[0]
    print(f"Inserted {count} sightings ({skipped} skipped). DB: {DB_PATH}")
    conn.close()

if __name__ == "__main__":
    main()
