import { getDb } from "../../../lib/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return Response.json({ ok: true, database: "connected" });
  } catch (error) {
    const database = process.env.MONGODB_URI ? "connection_error" : "not_configured";
    return Response.json({ ok: false, database, message: error.message }, { status: 503 });
  }
}
