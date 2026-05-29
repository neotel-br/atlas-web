import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { buildAdminValues } from "@/lib/db/seed";

describe("buildAdminValues", () => {
  it("hashes the password and lowercases email with admin role", async () => {
    const v = await buildAdminValues("Admin@Neotel.com", "s3cret", "Admin");
    expect(v.email).toBe("admin@neotel.com");
    expect(v.role).toBe("admin");
    expect(v.name).toBe("Admin");
    expect(v.passwordHash).not.toBe("s3cret");
    expect(await bcrypt.compare("s3cret", v.passwordHash)).toBe(true);
  });

  it("throws when email or password missing", async () => {
    await expect(buildAdminValues("", "x", "A")).rejects.toThrow();
    await expect(buildAdminValues("a@b.com", "", "A")).rejects.toThrow();
  });
});
