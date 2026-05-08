import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const shape = searchParams.get("shape");
  const yearFrom = searchParams.get("yearFrom");
  const yearTo = searchParams.get("yearTo");
  const country = searchParams.get("country");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "5000"), 10000);

  try {
    const db = getDb();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (shape && shape !== "all") {
      conditions.push("shape = ?");
      params.push(shape);
    }
    if (yearFrom) {
      conditions.push("year >= ?");
      params.push(parseInt(yearFrom));
    }
    if (yearTo) {
      conditions.push("year <= ?");
      params.push(parseInt(yearTo));
    }
    if (country && country !== "all") {
      conditions.push("country = ?");
      params.push(country);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = db
      .prepare(
        `SELECT id, datetime, year, city, state, country, shape,
                duration_seconds, comments, lat, lng
         FROM sightings ${where}
         ORDER BY datetime DESC
         LIMIT ?`
      )
      .all(...params, limit);

    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
