import { getPosDb, ORDER_STATUSES, serializeDoc, toObjectId } from "../../../../lib/pos-db";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const status = ORDER_STATUSES.includes(body.status) ? body.status : null;
    if (!status) throw new Error("สถานะออเดอร์ไม่ถูกต้อง");

    const db = await getPosDb();
    await db.collection("orders").updateOne({ _id: toObjectId(id) }, { $set: { status, updatedAt: new Date() } });
    const updated = await db.collection("orders").findOne({ _id: toObjectId(id) });
    if (status === "ปิดบิลแล้ว" && updated?.table) {
      await db.collection("tables").updateOne({ name: updated.table }, { $set: { status: "ว่าง", updatedAt: new Date() } });
    }
    return Response.json({ ok: true, order: serializeDoc(updated) });
  } catch (error) {
    return Response.json({ ok: false, message: error.message }, { status: 400 });
  }
}
