import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT id, title, agency, doc_type, incident_date, location_text,
             lat, lng, description, file_url, dvids_id, redacted, color
      FROM gov_files
      ORDER BY incident_date DESC
    `).all();
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "gov_files table not found" }, { status: 500 });
  }
}
