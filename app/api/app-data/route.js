import { getPosDb, serializeList, uniqueLatestBy } from "../../../lib/pos-db";
import { STORE } from "../../../lib/pos-seed";

export async function GET() {
  try {
    const db = await getPosDb();
    const [tables, menuItems, orders, store] = await Promise.all([
      db.collection("tables").find({}).sort({ sort: 1 }).toArray(),
      db.collection("menuItems").find({}).sort({ category: 1, name: 1 }).toArray(),
      db.collection("orders").find({}).sort({ createdAt: -1 }).limit(80).toArray(),
      db.collection("settings").findOne({ key: "store" }),
    ]);

    return Response.json({
      ok: true,
      store: store ? { name: store.name, tagline: store.tagline, owner: store.owner } : STORE,
      tables: serializeList(uniqueLatestBy(tables, (table) => table.name).sort((a, b) => a.sort.localeCompare(b.sort))),
      menuItems: serializeList(uniqueLatestBy(menuItems, (item) => `${item.category}:${item.name}`).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))),
      orders: serializeList(uniqueLatestBy(orders, (order) => `${order.number}:${order.table}`).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))),
    });
  } catch (error) {
    return Response.json({ ok: false, message: error.message }, { status: 503 });
  }
}
