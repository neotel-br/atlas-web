import bcrypt from "bcryptjs";

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "editor" | "viewer";
}

interface UserWithHash extends SafeUser {
  passwordHash: string;
}

export type UserFinder = (email: string) => Promise<UserWithHash | null>;

/**
 * Verify an email/password pair against a stored bcrypt hash.
 * Returns a sanitized user (no hash) on success, null otherwise.
 * Never reveals whether the email exists (no user enumeration).
 */
export async function verifyCredentials(
  email: string,
  password: string,
  findByEmail: UserFinder,
): Promise<SafeUser | null> {
  if (!email || !password) return null;
  const record = await findByEmail(email.toLowerCase());
  if (!record) return null;
  const ok = await bcrypt.compare(password, record.passwordHash);
  if (!ok) return null;
  return { id: record.id, email: record.email, name: record.name, role: record.role };
}
