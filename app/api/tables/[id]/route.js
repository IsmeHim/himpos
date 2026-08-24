import { cleanTablePayload, getPosDb, serializeDoc, toObjectId } from "../../../../lib/pos-db";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const db = await getPosDb();
    const payload = cleanTablePayload(await request.json());
    await db.collection("tables").updateOne({ _id: toObjectId(id) }, { $set: { ...payload, updatedAt: new Date() } });
    const updated = await db.collection("tables").findOne({ _id: toObjectId(id) });
    return Response.json({ ok: true, table: serializeDoc(updated) });
  } catch (error) {
    return Response.json({ ok: false, message: error.message }, { status: 400 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const db = await getPosDb();
    await db.collection("tables").deleteOne({ _id: toObjectId(id) });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ ok: false, message: error.message }, { status: 400 });
  }
}
