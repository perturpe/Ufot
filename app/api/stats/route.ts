import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();

    const total = (db.prepare("SELECT COUNT(*) as n FROM sightings").get() as { n: number }).n;
    const byShape = db
      .prepare(
        `SELECT shape, COUNT(*) as count FROM sightings
         GROUP BY shape ORDER BY count DESC LIMIT 20`
      )
      .all();
    const byYear = db
      .prepare(
        `SELECT year, COUNT(*) as count FROM sightings
         WHERE year >= 1940 AND year <= 2026
         GROUP BY year ORDER BY year`
      )
      .all();
    const byCountry = db
      .prepare(
        `SELECT country, COUNT(*) as count FROM sightings
         WHERE country != ''
         GROUP BY country ORDER BY count DESC LIMIT 10`
      )
      .all();

    return NextResponse.json({ total, byShape, byYear, byCountry });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
