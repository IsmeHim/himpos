import { getPosDb } from "../../../lib/pos-db";

export async function GET() {
  try {
    const db = await getPosDb();
    const [menuCategories, savedCategories] = await Promise.all([
      db.collection("menuItems").distinct("category"),
      db.collection("categories").find({}).sort({ name: 1 }).toArray(),
    ]);
    const categories = [...new Set([...menuCategories, ...savedCategories.map((category) => category.name)])]
      .map((name) => String(name).trim())
      .filter(Boolean)
      .sort((first, second) => first.localeCompare(second, "th"));
    return Response.json({ ok: true, categories });
  } catch (error) {
    return Response.json({ ok: false, message: error.message }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const db = await getPosDb();
    const { name: rawName } = await request.json();
    const name = String(rawName || "").trim();
    if (!name) throw new Error("กรุณาใส่ชื่อหมวดหมู่");

    const existing = await db.collection("categories").findOne({ name });
    const usedByMenu = await db.collection("menuItems").findOne({ category: name }, { projection: { _id: 1 } });
    if (existing || usedByMenu) throw new Error("หมวดหมู่นี้มีอยู่แล้ว");

    await db.collection("categories").insertOne({ name, createdAt: new Date(), updatedAt: new Date() });
    return Response.json({ ok: true, category: name }, { status: 201 });
  } catch (error) {
    return Response.json({ ok: false, message: error.message }, { status: 400 });
  }
}

export async function PATCH(request) {
  try {
    const db = await getPosDb();
    const { name: rawName, nextName: rawNextName } = await request.json();
    const name = String(rawName || "").trim();
    const nextName = String(rawNextName || "").trim();
    if (!name || !nextName) throw new Error("กรุณาใส่ชื่อหมวดหมู่");
    if (name === nextName) return Response.json({ ok: true, category: nextName });

    const duplicate = await db.collection("categories").findOne({ name: nextName });
    const usedByOtherMenu = await db.collection("menuItems").findOne({ category: nextName }, { projection: { _id: 1 } });
    if (duplicate || usedByOtherMenu) throw new Error("ชื่อหมวดหมู่นี้มีอยู่แล้ว");

    await db.collection("menuItems").updateMany({ category: name }, { $set: { category: nextName, updatedAt: new Date() } });
    await db.collection("categories").updateOne({ name }, { $set: { name: nextName, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
    return Response.json({ ok: true, category: nextName });
  } catch (error) {
    return Response.json({ ok: false, message: error.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  try {
    const db = await getPosDb();
    const { name: rawName } = await request.json();
    const name = String(rawName || "").trim();
    if (!name) throw new Error("ไม่พบหมวดหมู่");
    const usedByMenu = await db.collection("menuItems").findOne({ category: name }, { projection: { _id: 1 } });
    if (usedByMenu) throw new Error("ลบไม่ได้ เพราะยังมีเมนูใช้หมวดหมู่นี้อยู่");
    await db.collection("categories").deleteOne({ name });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ ok: false, message: error.message }, { status: 400 });
  }
}
