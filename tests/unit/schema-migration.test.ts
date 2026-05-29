import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("users migration", () => {
  let pool: Pool;
  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await migrate(drizzle(pool), { migrationsFolder: "./lib/db/migrations" });
  });
  afterAll(async () => {
    await pool?.end();
  });

  it("creates users table with expected columns", async () => {
    const res = await pool.query(
      `select column_name from information_schema.columns where table_name='users'`,
    );
    const cols = res.rows.map((r) => r.column_name).sort();
    expect(cols).toEqual(
      ["created_at", "email", "id", "name", "password_hash", "role", "updated_at"].sort(),
    );
  });
});
