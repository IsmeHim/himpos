import { cleanMenuPayload, getPosDb, serializeDoc, serializeList } from "../../../lib/pos-db";
import { saveMenuImage } from "../../../lib/uploads";

export async function GET() {
  try {
    const db = await getPosDb();
    const menuItems = await db.collection("menuItems").find({}).sort({ category: 1, name: 1 }).toArray();
    return Response.json({ ok: true, menuItems: serializeList(menuItems) });
  } catch (error) {
    return Response.json({ ok: false, message: error.message }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const db = await getPosDb();
    const form = await request.formData();
    const payload = Object.fromEntries(form.entries());
    const uploadedImage = await saveMenuImage(form.get("imageFile"));
    const menuItem = cleanMenuPayload({
      ...payload,
      imageUrl: uploadedImage || payload.imageUrl || "",
    });

    const now = new Date();
    const result = await db.collection("menuItems").insertOne({ ...menuItem, createdAt: now, updatedAt: now });
    const created = await db.collection("menuItems").findOne({ _id: result.insertedId });
    return Response.json({ ok: true, menuItem: serializeDoc(created) }, { status: 201 });
  } catch (error) {
    return Response.json({ ok: false, message: error.message }, { status: 400 });
  }
}
