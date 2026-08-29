import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { currentUser } from "@/lib/auth";
import { uploadsDir } from "@/lib/db";
import { deleteJobPhoto } from "@/lib/repo/jobs";

export async function DELETE(request: Request, { params }: { params: Promise<{ photoId: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const photo = deleteJobPhoto(Number((await params).photoId));
  if (photo) {
    await fs.rm(path.join(uploadsDir(), path.basename(photo.filename)), { force: true });
  }
  return NextResponse.json({ ok: true });
}
