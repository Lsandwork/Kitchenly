import { mkdir, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { env, hasValue } from "@/lib/env";

export interface ObjectStore {
  put(key: string, bytes: Buffer, mimeType: string): Promise<{ key: string; url: string }>;
  delete(key: string): Promise<void>;
}

/** Writable upload directory — /tmp on Vercel/Lambda, local disk in dev. */
export function uploadRoot() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), "kf-uploads");
  }
  return path.join(process.cwd(), "data", "uploads");
}

class LocalDiskStore implements ObjectStore {
  private root = uploadRoot();

  async put(key: string, bytes: Buffer) {
    const full = path.join(this.root, key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, bytes);
    return { key, url: `/api/media/${key}` };
  }

  async delete(key: string) {
    await unlink(path.join(this.root, key)).catch(() => undefined);
  }
}

class S3Store implements ObjectStore {
  available() {
    return hasValue(env().STORAGE_BUCKET) && hasValue(env().STORAGE_ACCESS_KEY);
  }

  async put(): Promise<{ key: string; url: string }> {
    throw new Error("S3 adapter needs STORAGE_BUCKET plus working credentials before uploads can leave local disk.");
  }

  async delete() {}
}

export function objectStore(): ObjectStore {
  const s3 = new S3Store();
  if (s3.available()) return s3;
  return new LocalDiskStore();
}
