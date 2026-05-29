import "dotenv/config";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db, pool } from "./index";
import { users, type NewUser } from "./schema";

export async function buildAdminValues(
  email: string,
  password: string,
  name: string,
): Promise<NewUser> {
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  return { email: email.toLowerCase(), passwordHash, name: name || "Admin", role: "admin" };
}

export async function seedAdmin(): Promise<void> {
  const values = await buildAdminValues(
    process.env.ADMIN_EMAIL ?? "",
    process.env.ADMIN_PASSWORD ?? "",
    process.env.ADMIN_NAME ?? "Admin",
  );
  await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash: values.passwordHash,
        name: values.name,
        role: values.role,
        updatedAt: sql`now()`,
      },
    });
  console.log(`seeded admin: ${values.email}`);
}

// Run directly via `tsx lib/db/seed.ts`
if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  seedAdmin()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
