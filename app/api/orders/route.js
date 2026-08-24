import { cleanOrderPayload, getPosDb, serializeDoc, serializeList } from "../../../lib/pos-db";

export async function GET() {
  try {
    const db = await getPosDb();
    const orders = await db.collection("orders").find({}).sort({ createdAt: -1 }).limit(100).toArray();
    return Response.json({ ok: true, orders: serializeList(orders) });
  } catch (error) {
    return Response.json({ ok: false, message: error.message }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const db = await getPosDb();
    const payload = cleanOrderPayload(await request.json());
    const lastOrder = await db.collection("orders").find({}).sort({ number: -1 }).limit(1).next();
    const now = new Date();
    const order = {
      ...payload,
      number: (lastOrder?.number || 1042) + 1,
      status: "รอรับออเดอร์",
      paymentStatus: "ยังไม่ชำระ",
      source: "qr",
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("orders").insertOne(order);
    await db.collection("tables").updateOne({ name: payload.table }, { $set: { status: "กำลังใช้งาน", updatedAt: now } });
    const created = await db.collection("orders").findOne({ _id: result.insertedId });
    return Response.json({ ok: true, order: serializeDoc(created) }, { status: 201 });
  } catch (error) {
    return Response.json({ ok: false, message: error.message }, { status: 400 });
  }
}
