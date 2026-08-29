import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import { verifyPassword } from "./password";
import { getUserByEmail } from "./repo/users";
import type { Role, User } from "./types";

const COOKIE = "df_session";
const SESSION_DAYS = 30;

export function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  getDb()
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .run(token, userId, expires.toISOString());
  return { token, expires };
}

export async function login(email: string, password: string) {
  const user = getUserByEmail(email);
  if (!user || !user.active) return null;
  if (!verifyPassword(password, user.password_hash)) return null;

  const { token, expires } = createSession(user.id);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
  return user;
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const row = getDb()
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token = ? AND s.expires_at > ? AND u.active = 1`,
    )
    .get(token, new Date().toISOString()) as User | undefined;
  return row ?? null;
}

/** Guards a page: redirects to /login (and back afterwards) when signed out. */
export async function requireUser(next = "/dashboard"): Promise<User> {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireRole(role: Role, next = "/dashboard"): Promise<User> {
  const user = await requireUser(next);
  if (role === "owner" && user.role !== "owner") redirect("/app");
  return user;
}

export function purgeExpiredSessions() {
  getDb().prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());
}
