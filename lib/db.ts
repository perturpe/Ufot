import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "sightings.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("query_only = true");
  }
  return _db;
}

export interface Sighting {
  id: number;
  datetime: string;
  year: number;
  city: string;
  state: string;
  country: string;
  shape: string;
  duration_seconds: number | null;
  comments: string;
  date_posted: string;
  lat: number;
  lng: number;
}

export interface GovFile {
  id: number;
  title: string;
  agency: string;
  doc_type: string;
  incident_date: string | null;
  location_text: string;
  lat: number;
  lng: number;
  description: string;
  file_url: string;
  dvids_id: string;
  redacted: number;
  color: string;
}

export interface HotspotCell {
  lat: number;
  lng: number;
  count: number;
}
