# UFO Tracker 🛸

**Live at [ufot.tech](https://ufot.tech)**

An interactive map of 96,000+ UFO sightings from the [NUFORC database](https://nuforc.org), combined with 97 declassified U.S. government UAP documents from the [PURSUE program (war.gov/UFO)](https://www.war.gov/UFO/). Data is updated nightly.

---

## Features

- **96,763 civilian sightings** (1940–2026) from NUFORC, plotted as color-coded dots by shape
- **97 declassified government UAP files** from the May 8, 2026 PURSUE release — FBI, Department of War, NASA, and State Dept. — each linking to the official source document
- Filter by shape, year range, and country
- Recent sightings feed
- Mobile-responsive with bottom sheet navigation
- Dark map, no ads, free

---

## Data Sources

| Source | Records | Coverage |
|--------|---------|----------|
| [NUFORC](https://nuforc.org) | 96,763 sightings | 1940–2026 |
| [war.gov/UFO (PURSUE)](https://www.war.gov/UFO/) | 162 documents (97 geolocated) | 1944–2026 |

### NUFORC Data

The civilian sighting data comes from the National UFO Reporting Center. The 1940–2014 records are seeded from the [TidyTuesday NUFORC CSV](https://github.com/rfordatascience/tidytuesday). Records from 2015–2026 are scraped directly from [nuforc.org](https://nuforc.org/subndx/) using Playwright.

### Government UAP Files

The PURSUE program (Presidential Unsealing and Reporting System for UAP Encounters) released 162 declassified documents on May 8, 2026. The structured index is mirrored at [DenisSergeevitch/UFO-USA](https://github.com/DenisSergeevitch/UFO-USA). Records without mappable coordinates (Moon, Low Earth Orbit, classified locations) are excluded from the map.

---

## Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Map**: Leaflet.js (imperative, no react-leaflet due to React 19 peer conflict)
- **Database**: SQLite via better-sqlite3
- **Scraping**: Playwright (Chromium) for post-2014 NUFORC data
- **Geocoding**: Nominatim (OpenStreetMap) for missing coordinates
- **Deployment**: Docker + nginx on DigitalOcean, Let's Encrypt SSL

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Seed the database

```bash
# Seed NUFORC civilian sightings (downloads CSV ~80k records)
python3 scripts/seed.py

# Seed government UAP files (downloads from GitHub mirror of war.gov CSV)
python3 scripts/seed_gov_files.py

# Optional: scrape post-2014 NUFORC records (requires Playwright + Chromium)
npx playwright install chromium
node scripts/scrape_nuforc_playwright.js
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
app/
  page.tsx              # Main page
  api/
    sightings/          # Filtered sightings endpoint
    recent/             # Latest 20 sightings
    gov-files/          # Declassified government UAP files
    stats/              # DB health check
components/
  UFOMap.tsx            # Leaflet map (imperative)
  FilterPanel.tsx       # Shape / country / year filters
  RecentFeed.tsx        # Live sightings sidebar
  SightingPopup.tsx     # Civilian sighting detail modal
  GovFilePopup.tsx      # Government file detail modal
  SupportModal.tsx      # Solana donation modal
lib/
  db.ts                 # SQLite singleton + TypeScript interfaces
scripts/
  seed.py               # Seed NUFORC CSV → SQLite
  seed_gov_files.py     # Seed PURSUE CSV → SQLite gov_files table
  scrape_nuforc_playwright.js  # Scrape nuforc.org post-2014
  geocode.py            # Geocode missing coordinates via Nominatim
public/
  logo.svg              # UFO Tracker logo
data/
  sightings.db          # SQLite database (not committed — run seed scripts)
```

---

## Database Schema

```sql
-- Civilian sightings
CREATE TABLE sightings (
  id INTEGER PRIMARY KEY,
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

-- Declassified government UAP files
CREATE TABLE gov_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  agency TEXT,
  doc_type TEXT,        -- PDF, VID, IMG
  incident_date TEXT,
  location_text TEXT,
  lat REAL,
  lng REAL,
  description TEXT,
  file_url TEXT,        -- Direct link to war.gov PDF/image
  dvids_id TEXT,        -- DVIDS video ID if applicable
  redacted INTEGER,     -- 0 or 1
  color TEXT            -- Hex color by agency
);
```

---

## Deployment

See [`server-setup.sh`](server-setup.sh) for one-time DigitalOcean droplet setup and [`deploy.sh`](deploy.sh) for redeployment.

```bash
./deploy.sh
```

The deploy script rsyncs source files, builds the Docker image on the server, and restarts the container.

---

## License

Data is sourced from public government and nonprofit databases. Code is MIT.
