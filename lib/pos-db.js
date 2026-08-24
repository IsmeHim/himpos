import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { MENU_ITEMS, ORDERS, STORE, TABLES } from "./pos-seed";

export const ORDER_STATUSES = ["รอรับออเดอร์", "กำลังเตรียม", "พร้อมเสิร์ฟ", "เสิร์ฟแล้ว", "รอชำระเงิน", "ปิดบิลแล้ว"];
export const TABLE_STATUSES = ["ว่าง", "กำลังใช้งาน", "รอชำระเงิน", "ปิดใช้งาน"];

export async function getPosDb() {
  const db = await getDb();
  await seedIfNeeded(db);
  return db;
}

export async function seedIfNeeded(db) {
  const setup = db.collection("settings");
  const seeded = await setup.findOne({ key: "seeded" });
  if (seeded) return;

  const now = new Date();
  const lock = await setup.updateOne(
    { key: "seeded" },
    { $setOnInsert: { key: "seeded", value: "in_progress", createdAt: now, updatedAt: now } },
    { upsert: true }
  );
  if (!lock.upsertedCount) return;

  await db.collection("tables").insertMany(TABLES.map((table) => ({ ...table, createdAt: now, updatedAt: now })));
  await db.collection("menuItems").insertMany(MENU_ITEMS.map((item) => ({ ...item, createdAt: now, updatedAt: now })));
  await db.collection("orders").insertMany(
    ORDERS.map((order) => {
      const total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      return { ...order, total, createdAt: now, updatedAt: now };
    })
  );

  await Promise.all([
    db.collection("tables").createIndex({ name: 1 }, { unique: true }),
    db.collection("menuItems").createIndex({ name: 1 }),
    db.collection("orders").createIndex({ createdAt: -1 }),
    db.collection("settings").updateOne({ key: "store" }, { $set: { key: "store", ...STORE, updatedAt: now } }, { upsert: true }),
    setup.updateOne({ key: "seeded" }, { $set: { key: "seeded", value: true, updatedAt: now } }, { upsert: true }),
  ]);
}

export function uniqueLatestBy(list, keyFor) {
  const selected = new Map();
  for (const item of list) {
    const key = keyFor(item);
    const current = selected.get(key);
    const itemTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
    const currentTime = new Date(current?.updatedAt || current?.createdAt || 0).getTime();
    if (!current || itemTime >= currentTime) selected.set(key, item);
  }
  return [...selected.values()];
}

export function serializeDoc(doc) {
  if (!doc) return null;
  return {
    ...doc,
    id: doc._id?.toString(),
    _id: undefined,
    createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt,
    updatedAt: doc.updatedAt?.toISOString?.() ?? doc.updatedAt,
  };
}

export function serializeList(list) {
  return list.map(serializeDoc);
}

export function toObjectId(id) {
  if (!ObjectId.isValid(id)) throw new Error("Invalid id");
  return new ObjectId(id);
}

export function cleanMenuPayload(payload) {
  const name = String(payload.name || "").trim();
  const category = String(payload.category || "").trim();
  const price = Number(payload.price);
  if (!name) throw new Error("กรุณาใส่ชื่อเมนู");
  if (!category) throw new Error("กรุณาใส่หมวดหมู่");
  if (!Number.isFinite(price) || price < 0) throw new Error("ราคาต้องเป็นตัวเลข");

  return {
    name,
    category,
    price,
    description: String(payload.description || "").trim(),
    imageUrl: String(payload.imageUrl || "").trim(),
    emoji: String(payload.emoji || "🍽️").trim(),
    tone: String(payload.tone || "#fff0dd").trim(),
    available: payload.available === true || payload.available === "true" || payload.available === "on",
    bestseller: payload.bestseller === true || payload.bestseller === "true" || payload.bestseller === "on",
  };
}

export function cleanTablePayload(payload) {
  const name = String(payload.name || "").trim().toUpperCase();
  const seats = Number(payload.seats || 2);
  const status = TABLE_STATUSES.includes(payload.status) ? payload.status : "ว่าง";
  if (!name) throw new Error("กรุณาใส่ชื่อโต๊ะ");
  if (!Number.isFinite(seats) || seats < 1) throw new Error("จำนวนที่นั่งต้องมากกว่า 0");
  return { name, seats, status, zone: name[0] || "A", sort: name };
}

export function cleanOrderPayload(payload) {
  const table = String(payload.table || "").trim().toUpperCase();
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!table) throw new Error("ไม่พบเลขโต๊ะ");
  if (!items.length) throw new Error("กรุณาเลือกอาหารก่อนส่งออเดอร์");

  const cleanedItems = items.map((item) => ({
    menuItemId: item.menuItemId ? String(item.menuItemId) : "",
    name: String(item.name || "").trim(),
    price: Number(item.price || 0),
    quantity: Math.max(1, Number(item.quantity || 1)),
    note: String(item.note || "").trim(),
  }));
  const total = cleanedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { table, items: cleanedItems, total };
}
