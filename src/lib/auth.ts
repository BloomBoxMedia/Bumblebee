import "server-only";
import { timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isValidSessionToken } from "./session";

/** Re-checks the session inside server actions and pages (the proxy is only a first gate). */
export async function requireSession(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await isValidSessionToken(token))) redirect("/login");
}

export function passwordMatches(attempt: string): boolean {
  return secretMatches(attempt, process.env.APP_PASSWORD);
}

/** Constant-time comparison; hashing first makes the lengths equal. */
export function secretMatches(attempt: string | null, expected: string | undefined): boolean {
  if (!attempt || !expected) return false;
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(attempt), digest(expected));
}
