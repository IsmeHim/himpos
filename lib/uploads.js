import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const allowedTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

export async function saveMenuImage(file) {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) return "";
  const ext = allowedTypes.get(file.type);
  if (!ext) throw new Error("รองรับรูปเฉพาะ JPG, PNG, WEBP หรือ GIF");
  if (file.size > 4 * 1024 * 1024) throw new Error("รูปต้องไม่เกิน 4MB");

  const uploadDir = path.join(process.cwd(), "public", "uploads", "menu");
  await mkdir(uploadDir, { recursive: true });

  const filename = `${Date.now()}-${randomUUID()}${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), bytes);
  return `/uploads/menu/${filename}`;
}
