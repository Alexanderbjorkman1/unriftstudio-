import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { currentUser } from "@/lib/auth";
import { uploadsDir } from "@/lib/db";
import { addJobPhoto, jobPhotos } from "@/lib/repo/jobs";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/avif"]);
const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobId = Number((await params).id);
  const form = await request.formData();
  const kind = form.get("kind") === "after" ? "after" : "before";
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "No file" }, { status: 400 });

  const dir = uploadsDir();
  const saved: string[] = [];
  for (const file of files) {
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: `Unsupported type ${file.type}` }, { status: 415 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 12 MB)" }, { status: 413 });
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const name = `job${jobId}-${kind}-${randomBytes(6).toString("hex")}.${ext}`;
    await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    addJobPhoto(jobId, kind, name);
    saved.push(name);
  }

  return NextResponse.json({ saved, photos: jobPhotos(jobId) });
}
