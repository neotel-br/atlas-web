import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyCredentials, type UserFinder } from "./credentials";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: "admin" | "editor" | "viewer" } & DefaultSession["user"];
  }
  interface User {
    role?: "admin" | "editor" | "viewer";
  }
}

const findByEmail: UserFinder = async (email) => {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const u = rows[0];
  return u
    ? { id: u.id, email: u.email, name: u.name, role: u.role, passwordHash: u.passwordHash }
    : null;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Provider list is an array so an OIDC provider can be appended later without refactor.
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const user = await verifyCredentials(
          String(creds?.email ?? ""),
          String(creds?.password ?? ""),
          findByEmail,
        );
        return user ?? null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as "admin" | "editor" | "viewer";
      return session;
    },
  },
});
