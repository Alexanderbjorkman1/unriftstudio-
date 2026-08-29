import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { currentUser } from "@/lib/auth";
import { uploadsDir } from "@/lib/db";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".heic": "image/heic",
};

export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const user = await currentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { name } = await params;
  // Only ever serve a plain filename from the uploads directory.
  if (name !== path.basename(name)) return new NextResponse("Not found", { status: 404 });

  const file = path.join(uploadsDir(), name);
  try {
    const data = await fs.readFile(file);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[path.extname(name).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
