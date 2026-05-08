#!/usr/bin/env python3
"""Seed the gov_files table from the WAR.GOV PURSUE release CSV."""

import csv, sqlite3, urllib.request, io, re, sys, os

DB_PATH = os.path.join(os.path.dirname(__file__), "../data/sightings.db")
CSV_URL = "https://raw.githubusercontent.com/DenisSergeevitch/UFO-USA/main/metadata/uap-csv.csv"

# Hardcoded geocodes for locations that appear in the dataset.
# Skips space/moon locations — those have no map coordinates.
GEOCODES = {
    "iraq":                  (33.22, 43.68),
    "syria":                 (34.80, 38.99),
    "persian gulf":          (26.50, 53.50),
    "arabian gulf":          (26.50, 53.50),
    "gulf of oman":          (23.50, 58.50),
    "gulf of aden":          (12.50, 47.00),
    "arabian sea":           (18.00, 65.00),
    "north arabian sea":     (21.00, 65.00),
    "strait of hormuz":      (26.50, 56.30),
    "mediterranean sea":     (35.00, 18.00),
    "aegean sea":            (38.50, 25.00),
    "iran":                  (32.43, 53.69),
    "germany":               (51.17, 10.45),
    "netherlands":           (52.13, 5.29),
    "azerbaijan":            (40.14, 47.58),
    "detroit, mi":           (42.33, -83.05),
    "united states":         (37.09, -95.71),
    "western united states": (39.50, -110.00),
    "southern united states":(32.00, -95.00),
    "north america":         (40.00, -95.00),
    "vandenberg afb":        (34.74, -120.57),
    "kazakhstan":            (48.02, 66.92),
    "papua new guinea":      (-6.31, 143.96),
    "georgia":               (42.32, 43.36),
    "georgia (kodori gorge)":(43.36, 41.57),
    "turkmenistan":          (38.97, 59.56),
    "mexico":                (23.63, -102.55),
    "djibouti":              (11.83, 42.59),
    "east china sea":        (29.00, 125.00),
    "indo-pacific":          (10.00, 120.00),
    "japan":                 (36.20, 138.25),
    "pacific ocean":         (0.00, -160.00),
    "pacific time zone":     (37.09, -120.00),
    "kuwait":                (29.37, 47.98),
    "united arab emirates":  (23.42, 53.85),
}

SKIP_LOCATIONS = {"n/a", "", "moon", "low earth orbit", "space"}

AGENCY_COLORS = {
    "fbi":               "#ef4444",
    "department of war": "#f97316",
    "nasa":              "#38bdf8",
    "department of state": "#a78bfa",
}


def normalize_location(loc: str) -> str:
    return loc.strip().lower()


def geocode(location: str):
    key = normalize_location(location)
    if key in SKIP_LOCATIONS:
        return None, None
    # exact match
    if key in GEOCODES:
        return GEOCODES[key]
    # partial match
    for k, v in GEOCODES.items():
        if k in key or key in k:
            return v
    return None, None


def parse_date(raw: str) -> str:
    raw = raw.strip()
    if not raw or raw == "N/A":
        return None
    # formats: 5/8/26, 12/5/65, 3/18/45, 11/7/57, 10/31/23
    m = re.match(r"(\d+)/(\d+)/(\d+)", raw)
    if m:
        mo, day, yr = m.groups()
        yr_int = int(yr)
        yr_full = 1900 + yr_int if yr_int >= 40 else 2000 + yr_int
        return f"{yr_full}-{int(mo):02d}-{int(day):02d}"
    return raw


def main():
    local = "/tmp/uap-csv.csv"
    print("Fetching CSV from GitHub mirror…")
    import subprocess
    subprocess.run(["curl", "-s", CSV_URL, "-o", local], check=True)
    with open(local, encoding="utf-8-sig") as f:
        raw = f.read()

    rows = list(csv.DictReader(io.StringIO(raw)))
    print(f"  {len(rows)} rows found")

    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS gov_files (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT,
            agency      TEXT,
            doc_type    TEXT,
            incident_date TEXT,
            location_text TEXT,
            lat         REAL,
            lng         REAL,
            description TEXT,
            file_url    TEXT,
            dvids_id    TEXT,
            redacted    INTEGER DEFAULT 0,
            color       TEXT
        )
    """)
    cur.execute("DELETE FROM gov_files")

    inserted = skipped = 0
    for row in rows:
        title    = (row.get("Title") or "").strip().replace("\n", " ").strip()
        agency   = (row.get("Agency") or "").strip()
        doc_type = (row.get("Type") or "PDF").strip()
        inc_date = parse_date(row.get("Incident Date") or "")
        location = (row.get("Incident Location") or "").strip()
        desc     = (row.get("Description Blurb") or "").strip()
        file_url = (row.get("PDF | Image Link") or "").strip()
        dvids_id = (row.get("DVIDS Video ID") or "").strip()
        redacted = 1 if (row.get("Redaction") or "").strip() else 0
        color    = AGENCY_COLORS.get(agency.lower(), "#a78bfa")

        lat, lng = geocode(location)
        if lat is None:
            skipped += 1
            continue

        cur.execute("""
            INSERT INTO gov_files
              (title, agency, doc_type, incident_date, location_text,
               lat, lng, description, file_url, dvids_id, redacted, color)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        """, (title, agency, doc_type, inc_date, location,
              lat, lng, desc, file_url, dvids_id, redacted, color))
        inserted += 1

    con.commit()
    con.close()
    print(f"  Inserted {inserted} records, skipped {skipped} (no map coordinates)")
    print("Done.")


if __name__ == "__main__":
    main()
