import { cleanTablePayload, getPosDb, serializeDoc, serializeList } from "../../../lib/pos-db";

export async function GET() {
  try {
    const db = await getPosDb();
    const tables = await db.collection("tables").find({}).sort({ sort: 1 }).toArray();
    return Response.json({ ok: true, tables: serializeList(tables) });
  } catch (error) {
    return Response.json({ ok: false, message: error.message }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const db = await getPosDb();
    const payload = cleanTablePayload(await request.json());
    const now = new Date();
    const result = await db.collection("tables").insertOne({ ...payload, createdAt: now, updatedAt: now });
    const created = await db.collection("tables").findOne({ _id: result.insertedId });
    return Response.json({ ok: true, table: serializeDoc(created) }, { status: 201 });
  } catch (error) {
    return Response.json({ ok: false, message: error.message }, { status: 400 });
  }
}
