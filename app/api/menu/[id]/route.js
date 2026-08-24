import { cleanMenuPayload, getPosDb, serializeDoc, toObjectId } from "../../../../lib/pos-db";
import { saveMenuImage } from "../../../../lib/uploads";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const db = await getPosDb();
    const form = await request.formData();
    const payload = Object.fromEntries(form.entries());
    const uploadedImage = await saveMenuImage(form.get("imageFile"));
    const menuItem = cleanMenuPayload({
      ...payload,
      imageUrl: uploadedImage || payload.imageUrl || "",
    });

    await db.collection("menuItems").updateOne({ _id: toObjectId(id) }, { $set: { ...menuItem, updatedAt: new Date() } });
    const updated = await db.collection("menuItems").findOne({ _id: toObjectId(id) });
    return Response.json({ ok: true, menuItem: serializeDoc(updated) });
  } catch (error) {
    return Response.json({ ok: false, message: error.message }, { status: 400 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const db = await getPosDb();
    await db.collection("menuItems").deleteOne({ _id: toObjectId(id) });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ ok: false, message: error.message }, { status: 400 });
  }
}
