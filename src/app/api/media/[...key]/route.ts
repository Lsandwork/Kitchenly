import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function GET(request: NextRequest, context: { params: Promise<{ key: string[] }> }) {
  const user = await requireUser();
  const { key } = await context.params;
  const relative = key.join("/");
  if (!relative.startsWith(user.id)) {
    return NextResponse.json({ error: "Nope." }, { status: 403 });
  }
  const full = path.join(process.cwd(), "data", "uploads", relative);
  try {
    const bytes = await readFile(full);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Gone." }, { status: 404 });
  }
}
