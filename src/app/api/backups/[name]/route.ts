import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { currentUser } from "@/lib/auth";
import { backupsDir } from "@/lib/backup";

/** Backups contain every customer record, so only a signed-in owner may fetch one. */
export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const user = await currentUser();
  if (!user || user.role !== "owner") return new NextResponse("Unauthorized", { status: 401 });

  const { name } = await params;
  // Only ever a plain filename from the backups directory.
  if (name !== path.basename(name) || !name.endsWith(".db")) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const data = await fs.readFile(path.join(backupsDir(), name));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
