import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// Bucket sightings into ~1° grid cells and return top hotspots
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const yearFrom = searchParams.get("yearFrom") ?? "1900";
  const yearTo = searchParams.get("yearTo") ?? "2100";
  const shape = searchParams.get("shape");

  try {
    const db = getDb();
    const conditions = ["year >= ?", "year <= ?"];
    const params: (string | number)[] = [parseInt(yearFrom), parseInt(yearTo)];

    if (shape && shape !== "all") {
      conditions.push("shape = ?");
      params.push(shape);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const rows = db
      .prepare(
        `SELECT
           ROUND(lat, 0) AS lat,
           ROUND(lng, 0) AS lng,
           COUNT(*) AS count
         FROM sightings ${where}
         GROUP BY ROUND(lat, 0), ROUND(lng, 0)
         HAVING count >= 3
         ORDER BY count DESC
         LIMIT 500`
      )
      .all(...params);

    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
