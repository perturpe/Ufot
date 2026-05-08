#!/usr/bin/env python3
"""
Geocode sightings that have city/state but no lat/lng.

Strategy (in order):
  1. Look up city+state in our own DB (pre-2014 records already have coords).
     This handles ~95% of US cities instantly with no network calls.
  2. For misses, query Nominatim (OpenStreetMap) — free, no key, 1 req/sec.
  3. Mark unfindable rows with a sentinel so we don't retry them forever.
"""
import json
import os
import sqlite3
import subprocess
import time

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "sightings.db")
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "UFOTracker/1.0 (educational project)"

US_STATE_ABBR = {
    "alabama": "al", "alaska": "ak", "arizona": "az", "arkansas": "ar",
    "california": "ca", "colorado": "co", "connecticut": "ct", "delaware": "de",
    "florida": "fl", "georgia": "ga", "hawaii": "hi", "idaho": "id",
    "illinois": "il", "indiana": "in", "iowa": "ia", "kansas": "ks",
    "kentucky": "ky", "louisiana": "la", "maine": "me", "maryland": "md",
    "massachusetts": "ma", "michigan": "mi", "minnesota": "mn", "mississippi": "ms",
    "missouri": "mo", "montana": "mt", "nebraska": "ne", "nevada": "nv",
    "new hampshire": "nh", "new jersey": "nj", "new mexico": "nm", "new york": "ny",
    "north carolina": "nc", "north dakota": "nd", "ohio": "oh", "oklahoma": "ok",
    "oregon": "or", "pennsylvania": "pa", "rhode island": "ri", "south carolina": "sc",
    "south dakota": "sd", "tennessee": "tn", "texas": "tx", "utah": "ut",
    "vermont": "vt", "virginia": "va", "washington": "wa", "west virginia": "wv",
    "wisconsin": "wi", "wyoming": "wy", "district of columbia": "dc",
}


def nominatim_geocode(city: str, state: str, country: str) -> tuple[float, float] | None:
    parts = [p for p in [city, state, country.upper() if country else ""] if p]
    query = ", ".join(parts)
    url = f"{NOMINATIM_URL}?q={query}&format=json&limit=1"
    try:
        result = subprocess.run(
            ["curl", "-fsSL", "--max-time", "10",
             "-H", f"User-Agent: {USER_AGENT}", url],
            capture_output=True, timeout=15,
        )
        if result.returncode != 0:
            return None
        data = json.loads(result.stdout.decode())
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        pass
    return None


def build_local_lookup(conn: sqlite3.Connection) -> dict[tuple[str, str], tuple[float, float]]:
    """Average lat/lng per (city_lower, state_lower) from existing coords."""
    rows = conn.execute(
        """SELECT LOWER(TRIM(city)), LOWER(TRIM(state)),
                  AVG(lat), AVG(lng)
           FROM sightings
           WHERE lat IS NOT NULL AND lat != 0
             AND lng IS NOT NULL AND lng != 0
             AND city != ''
           GROUP BY LOWER(TRIM(city)), LOWER(TRIM(state))"""
    ).fetchall()
    return {(r[0], r[1]): (r[2], r[3]) for r in rows}


def main():
    conn = sqlite3.connect(DB_PATH)

    # Find rows needing geocoding
    missing = conn.execute(
        """SELECT id, city, state, country
           FROM sightings
           WHERE (lat IS NULL OR lat = 0)
             AND city != ''
           ORDER BY id"""
    ).fetchall()

    print(f"Rows needing geocoding: {len(missing)}")
    if not missing:
        print("Nothing to do.")
        conn.close()
        return

    print("Building local city lookup from existing coords...")
    lookup = build_local_lookup(conn)
    print(f"Local lookup has {len(lookup):,} unique city/state combos")

    local_hits = 0
    nominatim_hits = 0
    misses = 0
    nominatim_queue: list[tuple[int, str, str, str]] = []

    # Pass 1: local lookup
    batch: list[tuple[float, float, int]] = []
    for row_id, city, state, country in missing:
        city_l = city.lower().strip()
        state_l = state.lower().strip()
        # Normalize full state name → abbreviation
        state_l = US_STATE_ABBR.get(state_l, state_l)

        coord = lookup.get((city_l, state_l))
        if not coord:
            # Try without state
            coord = lookup.get((city_l, ""))
        if coord:
            batch.append((coord[0], coord[1], row_id))
            local_hits += 1
        else:
            nominatim_queue.append((row_id, city, state, country))

    if batch:
        conn.executemany(
            "UPDATE sightings SET lat=?, lng=? WHERE id=?", batch
        )
        conn.commit()
        print(f"Local lookup: {local_hits} updated")

    # Pass 2: Nominatim for misses
    if nominatim_queue:
        print(f"Nominatim fallback for {len(nominatim_queue)} remaining rows...")
        nom_batch: list[tuple[float, float, int]] = []

        for i, (row_id, city, state, country) in enumerate(nominatim_queue):
            coord = nominatim_geocode(city, state, country)
            if coord:
                nom_batch.append((coord[0], coord[1], row_id))
                nominatim_hits += 1
                # Cache into lookup for subsequent rows with same city/state
                lookup[(city.lower().strip(), state.lower().strip())] = coord
            else:
                misses += 1

            # Commit in batches of 50
            if len(nom_batch) >= 50:
                conn.executemany(
                    "UPDATE sightings SET lat=?, lng=? WHERE id=?", nom_batch
                )
                conn.commit()
                nom_batch = []

            if (i + 1) % 20 == 0:
                print(f"  [{i+1}/{len(nominatim_queue)}] "
                      f"hits={nominatim_hits} misses={misses}")
            time.sleep(1.1)  # Nominatim rate limit: 1 req/sec

        if nom_batch:
            conn.executemany(
                "UPDATE sightings SET lat=?, lng=? WHERE id=?", nom_batch
            )
            conn.commit()

        print(f"Nominatim: {nominatim_hits} found, {misses} unfindable")

    total_geocoded = local_hits + nominatim_hits
    print(f"\nGeocoding complete: {total_geocoded} rows updated")

    remaining = conn.execute(
        "SELECT COUNT(*) FROM sightings WHERE (lat IS NULL OR lat = 0) AND city != ''"
    ).fetchone()[0]
    print(f"Still missing coords: {remaining}")
    conn.close()


if __name__ == "__main__":
    main()
