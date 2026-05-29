import { describe, it, expect, vi } from "vitest";
import bcrypt from "bcryptjs";
import { verifyCredentials } from "@/lib/auth/credentials";

function makeFinder(hash: string) {
  return vi.fn(async (email: string) =>
    email === "user@neotel.com"
      ? { id: "1", email, name: "User", role: "editor" as const, passwordHash: hash }
      : null,
  );
}

describe("verifyCredentials", () => {
  it("returns sanitized user on correct password", async () => {
    const hash = await bcrypt.hash("good", 10);
    const u = await verifyCredentials("User@Neotel.com", "good", makeFinder(hash));
    expect(u).toEqual({ id: "1", email: "user@neotel.com", name: "User", role: "editor" });
  });

  it("returns null on wrong password", async () => {
    const hash = await bcrypt.hash("good", 10);
    expect(await verifyCredentials("user@neotel.com", "bad", makeFinder(hash))).toBeNull();
  });

  it("returns null on unknown email", async () => {
    const hash = await bcrypt.hash("good", 10);
    expect(await verifyCredentials("nobody@neotel.com", "good", makeFinder(hash))).toBeNull();
  });

  it("returns null on empty input", async () => {
    const hash = await bcrypt.hash("good", 10);
    expect(await verifyCredentials("", "", makeFinder(hash))).toBeNull();
  });
});
