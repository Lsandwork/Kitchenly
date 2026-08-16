import sharp from "sharp";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

export async function processUpload(file: File) {
  if (!ALLOWED.has(file.type)) {
    throw new Error("Please upload a JPEG, PNG, or WebP photo.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("That photo is too large. Keep it under 10MB.");
  }
  const input = Buffer.from(await file.arrayBuffer());
  const image = sharp(input).rotate();
  const meta = await image.metadata();
  const output = await image
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return {
    bytes: output,
    mimeType: "image/jpeg",
    width: meta.width ?? null,
    height: meta.height ?? null,
    originalBytes: file.size,
  };
}

export function toBase64(bytes: Buffer) {
  return bytes.toString("base64");
}
