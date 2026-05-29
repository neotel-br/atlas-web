# NeoDocs Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Neotel's internal documentation platform — authenticated Fumadocs MDX site with Drizzle/Postgres users, Auth.js credentials login, hybrid i18n, Dockerized for dev and VM production behind Nginx + TLS.

**Architecture:** Next.js 15 App Router with `[lang]` segment. Fumadocs i18n middleware owns locale routing and renders git-only MDX content. Drizzle ORM holds only a `users` table. Auth.js v5 Credentials provider (bcrypt) issues JWT sessions; provider list is an array for future OIDC. next-intl supplies UI chrome strings via `setRequestLocale`/`getMessages` (no next-intl routing middleware — Fumadocs owns routing). All `/docs` routes are authed-only.

**Tech Stack:** Next.js 15, fumadocs-core/ui/mdx (14.x), next-auth@5 (beta), next-intl@3, drizzle-orm + drizzle-kit, pg, bcryptjs, vitest, @playwright/test, gray-matter. Docker Compose + Nginx + Make.

**Language policy:** all code/identifiers/comments/commits in English; only rendered UI text localized (pt default, en).

---

## File Structure

```
package.json  tsconfig.json  next.config.ts  source.config.ts
drizzle.config.ts  vitest.config.ts  playwright.config.ts
middleware.ts
.gitignore  .env.dev.example  .env.prod.example
.dockerignore  Dockerfile  Dockerfile.dev
docker-compose.dev.yml  docker-compose.prod.yml  Makefile
app/
  layout.tsx                     # root <html>, no locale
  global.css
  [lang]/
    layout.tsx                   # setRequestLocale + NextIntlClientProvider + Fumadocs RootProvider
    page.tsx                     # localized landing (authed)
    (auth)/login/page.tsx        # login page
    docs/[[...slug]]/page.tsx    # Fumadocs renderer (authed)
  api/auth/[...nextauth]/route.ts
components/
  login-form.tsx                 # client form -> signIn
  locale-switch.tsx              # client locale toggle
lib/
  db/schema.ts  db/index.ts  db/seed.ts  db/migrations/
  auth/config.ts  auth/credentials.ts
  source.ts  i18n.ts
i18n/request.ts
messages/pt.json  messages/en.json
content/docs/
  index.mdx  index.en.mdx
  documentation/(meta.json,index.mdx,index.en.mdx,overview.mdx,overview.en.mdx)
  processes/(meta.json,index.mdx,index.en.mdx,onboarding.mdx,onboarding.en.mdx)
  reports/(meta.json,index.mdx,index.en.mdx,monthly.mdx,monthly.en.mdx)
nginx/neodocs.conf
tests/
  unit/credentials.test.ts  unit/seed.test.ts  unit/i18n-parity.test.ts  unit/content.test.ts
  unit/schema-migration.test.ts
  e2e/auth.spec.ts  e2e/i18n.spec.ts
README.md
```

---

## Phase 0 — Project scaffold

### Task 0.1: Initialize Next.js project files

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/global.css`, `postcss.config.mjs`, `.gitignore`, `.dockerignore`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "neodocs-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "postinstall": "fumadocs-mdx",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx lib/db/migrate.ts",
    "db:seed": "tsx lib/db/seed.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "fumadocs-ui": "^14.7.0",
    "fumadocs-core": "^14.7.0",
    "fumadocs-mdx": "^11.2.0",
    "next-auth": "5.0.0-beta.25",
    "next-intl": "^3.26.0",
    "drizzle-orm": "^0.38.0",
    "pg": "^8.13.0",
    "bcryptjs": "^2.4.3",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/pg": "^8.11.0",
    "@types/bcryptjs": "^2.4.6",
    "drizzle-kit": "^0.30.0",
    "tsx": "^4.19.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^2.1.0",
    "@playwright/test": "^1.49.0",
    "gray-matter": "^4.0.3",
    "dotenv": "^16.4.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".source/**/*"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `next.config.ts`**

```typescript
import { createMDX } from "fumadocs-mdx/next";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withMDX = createMDX();
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
};

export default withNextIntl(withMDX(nextConfig));
```

- [ ] **Step 4: Write `app/global.css`**

```css
@import "tailwindcss/preflight";
@tailwind utilities;
@import "fumadocs-ui/css/neutral.css";
@import "fumadocs-ui/css/preset.css";
```

- [ ] **Step 5: Write `postcss.config.mjs`**

```javascript
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 6: Write `app/layout.tsx`**

```tsx
import "./global.css";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
```
Note: the real `<html>` is emitted by `app/[lang]/layout.tsx` so it can set `lang`. This root layout is a passthrough required by Next.js.

- [ ] **Step 7: Write `.gitignore`** (replace existing Python-only file)

```gitignore
# dependencies
/node_modules
.pnp
.pnp.js

# next.js
/.next/
/out/
next-env.d.ts

# fumadocs generated
.source/

# production
/build

# misc
.DS_Store
*.pem
.idea/
.vscode/

# debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# env / secrets (NEVER commit)
.env
.env.local
.env.dev
.env.prod
secrets/db_password.txt
nginx/certs/

# test artifacts
/coverage
/playwright-report
/test-results
```

- [ ] **Step 8: Write `.dockerignore`**

```dockerignore
node_modules
.next
.git
.source
coverage
playwright-report
test-results
**/.env
**/.env.*
secrets/db_password.txt
nginx/certs/
docs/
```

- [ ] **Step 9: Install dependencies**

Run: `npm install`
Expected: completes; `postinstall` runs `fumadocs-mdx` (may warn no source yet — fine).

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts app/ postcss.config.mjs .gitignore .dockerignore
git commit -m "chore: scaffold Next.js 15 + Fumadocs + Tailwind project"
```

---

## Phase 1 — Database layer (Drizzle)

### Task 1.1: Schema + client + drizzle config

**Files:**
- Create: `lib/db/schema.ts`, `lib/db/index.ts`, `drizzle.config.ts`, `lib/db/migrate.ts`

- [ ] **Step 1: Write `lib/db/schema.ts`**

```typescript
import { pgTable, uuid, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "editor", "viewer"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: userRole("role").notNull().default("viewer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

- [ ] **Step 2: Write `lib/db/index.ts`**

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
```

- [ ] **Step 3: Write `drizzle.config.ts`**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
```

- [ ] **Step 4: Write `lib/db/migrate.ts`**

```typescript
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./lib/db/migrations" });
  await pool.end();
  console.log("migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 5: Generate the initial migration**

Run: `DATABASE_URL=postgres://x npx drizzle-kit generate`
Expected: creates `lib/db/migrations/0000_*.sql` containing `CREATE TABLE "users"` and `CREATE TYPE "user_role"`.

- [ ] **Step 6: Commit**

```bash
git add lib/db/ drizzle.config.ts
git commit -m "feat(db): add users schema, drizzle client, migration runner"
```

### Task 1.2: Migration smoke test

**Files:**
- Create: `vitest.config.ts`, `tests/unit/schema-migration.test.ts`

- [ ] **Step 1: Write `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
});
```

- [ ] **Step 2: Write the failing test `tests/unit/schema-migration.test.ts`**

```typescript
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
  afterAll(async () => { await pool?.end(); });

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
```

- [ ] **Step 3: Run to verify it fails (or skips without DB)**

Run: `npx vitest run tests/unit/schema-migration.test.ts`
Expected: SKIP when `TEST_DATABASE_URL` unset; with a DB set it should PASS once migrations exist. (This test guards migration shape.)

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts tests/unit/schema-migration.test.ts
git commit -m "test(db): add users migration smoke test"
```

---

## Phase 2 — Seed

### Task 2.1: Admin seed (TDD)

**Files:**
- Create: `lib/db/seed.ts`, `tests/unit/seed.test.ts`

- [ ] **Step 1: Write the failing test `tests/unit/seed.test.ts`**

```typescript
import { describe, it, expect, vi } from "vitest";
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/seed.test.ts`
Expected: FAIL — cannot find module `@/lib/db/seed`.

- [ ] **Step 3: Write `lib/db/seed.ts`**

```typescript
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
      set: { passwordHash: values.passwordHash, name: values.name, role: values.role, updatedAt: sql`now()` },
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/seed.test.ts`
Expected: PASS (2 tests). Note: importing `seed.ts` triggers `lib/db/index.ts` which throws if `DATABASE_URL` unset — set a dummy: `DATABASE_URL=postgres://x npx vitest run tests/unit/seed.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add lib/db/seed.ts tests/unit/seed.test.ts
git commit -m "feat(db): add idempotent admin seed with tested value builder"
```

---

## Phase 3 — Auth (Auth.js v5)

### Task 3.1: Credential verification (TDD)

**Files:**
- Create: `lib/auth/credentials.ts`, `tests/unit/credentials.test.ts`

- [ ] **Step 1: Write the failing test `tests/unit/credentials.test.ts`**

```typescript
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/credentials.test.ts`
Expected: FAIL — cannot find module `@/lib/auth/credentials`.

- [ ] **Step 3: Write `lib/auth/credentials.ts`**

```typescript
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/credentials.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/auth/credentials.ts tests/unit/credentials.test.ts
git commit -m "feat(auth): add tested credential verification helper"
```

### Task 3.2: Auth.js config + route handler

**Files:**
- Create: `lib/auth/config.ts`, `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Write `lib/auth/config.ts`**

```typescript
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
  return u ? { id: u.id, email: u.email, name: u.name, role: u.role, passwordHash: u.passwordHash } : null;
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
```

- [ ] **Step 2: Write `app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from "@/lib/auth/config";

export const { GET, POST } = handlers;
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in auth files (other files may not exist yet — focus on auth).

- [ ] **Step 4: Commit**

```bash
git add lib/auth/config.ts app/api/
git commit -m "feat(auth): add Auth.js v5 credentials config and route handler"
```

---

## Phase 4 — i18n (Fumadocs routing + next-intl chrome)

### Task 4.1: Fumadocs i18n config + next-intl messages

**Files:**
- Create: `lib/i18n.ts`, `i18n/request.ts`, `messages/pt.json`, `messages/en.json`

- [ ] **Step 1: Write `lib/i18n.ts`**

```typescript
import type { I18nConfig } from "fumadocs-core/i18n";

export const i18n: I18nConfig = {
  defaultLanguage: "pt",
  languages: ["pt", "en"],
};

export const locales = i18n.languages;
export type Locale = (typeof i18n.languages)[number];
```

- [ ] **Step 2: Write `messages/pt.json`**

```json
{
  "common": {
    "appName": "NeoDocs",
    "tagline": "Documentação interna da Neotel"
  },
  "nav": {
    "documentation": "Documentação",
    "processes": "Processos",
    "reports": "Relatórios",
    "signOut": "Sair"
  },
  "login": {
    "title": "Entrar",
    "email": "E-mail",
    "password": "Senha",
    "submit": "Entrar",
    "error": "Credenciais inválidas"
  },
  "landing": {
    "welcome": "Bem-vindo ao NeoDocs",
    "openDocs": "Abrir documentação"
  }
}
```

- [ ] **Step 3: Write `messages/en.json`**

```json
{
  "common": {
    "appName": "NeoDocs",
    "tagline": "Neotel internal documentation"
  },
  "nav": {
    "documentation": "Documentation",
    "processes": "Processes",
    "reports": "Reports",
    "signOut": "Sign out"
  },
  "login": {
    "title": "Sign in",
    "email": "Email",
    "password": "Password",
    "submit": "Sign in",
    "error": "Invalid credentials"
  },
  "landing": {
    "welcome": "Welcome to NeoDocs",
    "openDocs": "Open documentation"
  }
}
```

- [ ] **Step 4: Write `i18n/request.ts`**

```typescript
import { getRequestConfig } from "next-intl/server";
import { locales } from "@/lib/i18n";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = locales.includes(requested ?? "") ? (requested as string) : "pt";
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 5: Commit**

```bash
git add lib/i18n.ts i18n/ messages/
git commit -m "feat(i18n): add Fumadocs i18n config and next-intl chrome messages"
```

### Task 4.2: Message key parity test (TDD)

**Files:**
- Create: `tests/unit/i18n-parity.test.ts`

- [ ] **Step 1: Write the test `tests/unit/i18n-parity.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import pt from "@/messages/pt.json";
import en from "@/messages/en.json";

function flatKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object"
      ? flatKeys(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe("i18n message parity", () => {
  it("pt and en have identical key sets", () => {
    expect(flatKeys(pt).sort()).toEqual(flatKeys(en).sort());
  });
});
```

- [ ] **Step 2: Run to verify it passes**

Run: `npx vitest run tests/unit/i18n-parity.test.ts`
Expected: PASS (keys match). If it fails, the message files are out of sync — fix the JSON.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/i18n-parity.test.ts
git commit -m "test(i18n): assert pt/en message key parity"
```

---

## Phase 5 — Content + Fumadocs source

### Task 5.1: Content tree

**Files:**
- Create all MDX + meta files under `content/docs/` (see structure)

- [ ] **Step 1: Write root landing docs `content/docs/index.mdx`**

```mdx
---
title: NeoDocs
description: Documentação interna da Neotel
---

Bem-vindo à base de conhecimento interna da Neotel. Escolha uma categoria na barra lateral.
```

- [ ] **Step 2: Write `content/docs/index.en.mdx`**

```mdx
---
title: NeoDocs
description: Neotel internal documentation
---

Welcome to Neotel's internal knowledge base. Choose a category in the sidebar.
```

- [ ] **Step 3: Write `content/docs/documentation/meta.json`**

```json
{ "title": "Documentação", "pages": ["index", "overview"] }
```

- [ ] **Step 4: Write the four `documentation` pages**

`content/docs/documentation/index.mdx`:
```mdx
---
title: Documentação
description: Documentação técnica e de produto
---

Documentação técnica e de produto da Neotel.
```
`content/docs/documentation/index.en.mdx`:
```mdx
---
title: Documentation
description: Technical and product documentation
---

Neotel technical and product documentation.
```
`content/docs/documentation/overview.mdx`:
```mdx
---
title: Visão geral
description: Visão geral da documentação
---

Esta seção reúne guias técnicos e referências de produto.
```
`content/docs/documentation/overview.en.mdx`:
```mdx
---
title: Overview
description: Documentation overview
---

This section gathers technical guides and product references.
```

- [ ] **Step 5: Write `content/docs/processes/meta.json` + four pages**

`meta.json`:
```json
{ "title": "Processos", "pages": ["index", "onboarding"] }
```
`index.mdx`:
```mdx
---
title: Processos
description: Processos internos da Neotel
---

Processos internos e procedimentos operacionais.
```
`index.en.mdx`:
```mdx
---
title: Processes
description: Neotel internal processes
---

Internal processes and operating procedures.
```
`onboarding.mdx`:
```mdx
---
title: Onboarding
description: Processo de integração de novos colaboradores
---

Passos para integrar novos colaboradores na Neotel.
```
`onboarding.en.mdx`:
```mdx
---
title: Onboarding
description: New employee onboarding process
---

Steps to onboard new employees at Neotel.
```

- [ ] **Step 6: Write `content/docs/reports/meta.json` + four pages**

`meta.json`:
```json
{ "title": "Relatórios", "pages": ["index", "monthly"] }
```
`index.mdx`:
```mdx
---
title: Relatórios
description: Relatórios e métricas
---

Relatórios periódicos e indicadores da Neotel.
```
`index.en.mdx`:
```mdx
---
title: Reports
description: Reports and metrics
---

Periodic reports and Neotel indicators.
```
`monthly.mdx`:
```mdx
---
title: Relatório mensal
description: Modelo de relatório mensal
---

Modelo padrão de relatório mensal.
```
`monthly.en.mdx`:
```mdx
---
title: Monthly report
description: Monthly report template
---

Standard monthly report template.
```

- [ ] **Step 7: Commit**

```bash
git add content/
git commit -m "feat(content): add documentation/processes/reports skeleton (pt+en)"
```

### Task 5.2: Fumadocs source config + loader

**Files:**
- Create: `source.config.ts`, `lib/source.ts`

- [ ] **Step 1: Write `source.config.ts`**

```typescript
import { defineDocs, defineConfig } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "content/docs",
});

export default defineConfig();
```

- [ ] **Step 2: Write `lib/source.ts`**

```typescript
import { loader } from "fumadocs-core/source";
import { docs } from "@/.source";
import { i18n } from "./i18n";

export const source = loader({
  baseUrl: "/docs",
  i18n,
  source: docs.toFumadocsSource(),
});
```

- [ ] **Step 3: Generate `.source` and typecheck**

Run: `npx fumadocs-mdx && npx tsc --noEmit`
Expected: `.source/` generated; no type errors in `lib/source.ts`.

- [ ] **Step 4: Commit**

```bash
git add source.config.ts lib/source.ts
git commit -m "feat(content): add Fumadocs source config and i18n loader"
```

### Task 5.3: Content integrity test (TDD)

**Files:**
- Create: `tests/unit/content.test.ts`

- [ ] **Step 1: Write the test `tests/unit/content.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import matter from "gray-matter";

const categories = ["documentation", "processes", "reports"] as const;
const pages: Record<(typeof categories)[number], string[]> = {
  documentation: ["index", "overview"],
  processes: ["index", "onboarding"],
  reports: ["index", "monthly"],
};
const locales = [
  { suffix: "", lang: "pt" },
  { suffix: ".en", lang: "en" },
];

describe("content tree", () => {
  for (const cat of categories) {
    for (const page of pages[cat]) {
      for (const { suffix } of locales) {
        const file = `content/docs/${cat}/${page}${suffix}.mdx`;
        it(`${file} exists with a title`, () => {
          expect(existsSync(file)).toBe(true);
          const { data } = matter(readFileSync(file, "utf8"));
          expect(typeof data.title).toBe("string");
          expect(data.title.length).toBeGreaterThan(0);
        });
      }
    }
  }
  it("each category has meta.json", () => {
    for (const cat of categories) {
      expect(existsSync(`content/docs/${cat}/meta.json`)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run to verify it passes**

Run: `npx vitest run tests/unit/content.test.ts`
Expected: PASS — every category page exists in both locales with a title.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/content.test.ts
git commit -m "test(content): assert category pages exist with frontmatter in both locales"
```

---

## Phase 6 — App routes, layout, middleware

### Task 6.1: Locale layout + landing page

**Files:**
- Create: `app/[lang]/layout.tsx`, `app/[lang]/page.tsx`

- [ ] **Step 1: Write `app/[lang]/layout.tsx`**

```tsx
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { RootProvider } from "fumadocs-ui/provider";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { locales } from "@/lib/i18n";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function LangLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!locales.includes(lang)) notFound();
  setRequestLocale(lang);
  const messages = await getMessages();

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider messages={messages}>
          <RootProvider i18n={{ locale: lang, locales: [...locales].map((l) => ({ locale: l, name: l.toUpperCase() })) }}>
            {children}
          </RootProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Write `app/[lang]/page.tsx`**

```tsx
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { auth } from "@/lib/auth/config";

export default async function Landing({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  await auth(); // route is guarded by middleware; this primes session context
  const t = await getTranslations("landing");
  return (
    <main className="m-auto flex flex-col items-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold">{t("welcome")}</h1>
      <Link className="rounded bg-fd-primary px-4 py-2 text-fd-primary-foreground" href={`/${lang}/docs`}>
        {t("openDocs")}
      </Link>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/[lang]/layout.tsx app/[lang]/page.tsx
git commit -m "feat(app): add locale layout with next-intl + Fumadocs providers and landing"
```

### Task 6.2: Docs route

**Files:**
- Create: `app/[lang]/docs/[[...slug]]/page.tsx`, `app/[lang]/docs/layout.tsx`

- [ ] **Step 1: Write `app/[lang]/docs/layout.tsx`**

```tsx
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { source } from "@/lib/source";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <DocsLayout tree={source.pageTree[lang]} nav={{ title: "NeoDocs" }}>
      {children}
    </DocsLayout>
  );
}
```

- [ ] **Step 2: Write `app/[lang]/docs/[[...slug]]/page.tsx`**

```tsx
import { source } from "@/lib/source";
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from "fumadocs-ui/page";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string; slug?: string[] }>;
}) {
  const { lang, slug } = await params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();
  const MDX = page.data.body;
  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (requires `.source` generated from Task 5.2).

- [ ] **Step 4: Commit**

```bash
git add app/[lang]/docs/
git commit -m "feat(app): add authed Fumadocs docs route and layout"
```

### Task 6.3: Login page + form

**Files:**
- Create: `app/[lang]/(auth)/login/page.tsx`, `components/login-form.tsx`

- [ ] **Step 1: Write `components/login-form.tsx`**

```tsx
"use client";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({ lang }: { lang: string }) {
  const t = useTranslations("login");
  const router = useRouter();
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(false);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      redirect: false,
    });
    setPending(false);
    if (res?.error) {
      setError(true);
      return;
    }
    router.push(`/${lang}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="m-auto flex w-80 flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <label className="flex flex-col gap-1">
        {t("email")}
        <input name="email" type="email" required className="rounded border px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1">
        {t("password")}
        <input name="password" type="password" required className="rounded border px-2 py-1" />
      </label>
      {error && <p className="text-sm text-red-600">{t("error")}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-fd-primary px-4 py-2 text-fd-primary-foreground disabled:opacity-50"
      >
        {t("submit")}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Write `app/[lang]/(auth)/login/page.tsx`**

```tsx
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return (
    <main className="flex min-h-screen">
      <LoginForm lang={lang} />
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/[lang]/(auth)" components/login-form.tsx
git commit -m "feat(auth): add localized login page and client form"
```

### Task 6.4: Middleware — i18n routing + auth guard

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Write `middleware.ts`**

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { createI18nMiddleware } from "fumadocs-core/i18n/middleware";
import { i18n, locales } from "@/lib/i18n";

const i18nMiddleware = createI18nMiddleware(i18n);

// Paths that do not require authentication (locale prefix stripped before check).
const PUBLIC_PATHS = ["/login"];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strip the leading locale segment to inspect the logical path.
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  const hasLocale = locales.includes(maybeLocale);
  const lang = hasLocale ? maybeLocale : i18n.defaultLanguage;
  const rest = "/" + (hasLocale ? segments.slice(1) : segments).join("/");

  const isPublic = PUBLIC_PATHS.some((p) => rest === p || rest.startsWith(`${p}/`));

  if (!isPublic) {
    // Auth.js v5 sets this cookie for an active JWT session.
    const hasSession =
      request.cookies.has("authjs.session-token") ||
      request.cookies.has("__Secure-authjs.session-token");
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = `/${lang}/login`;
      return NextResponse.redirect(url);
    }
  }

  return i18nMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: Build to verify routing + guard compile**

Run: `npx fumadocs-mdx && DATABASE_URL=postgres://x npx next build`
Expected: build succeeds (standalone output produced). Auth guard logic compiles.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(app): add i18n routing + auth-guard middleware (docs authed-only)"
```

### Task 6.5: Locale switch component

**Files:**
- Create: `components/locale-switch.tsx`

- [ ] **Step 1: Write `components/locale-switch.tsx`**

```tsx
"use client";
import { usePathname, useRouter } from "next/navigation";
import { locales } from "@/lib/i18n";

export function LocaleSwitch({ current }: { current: string }) {
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: string) {
    const segments = pathname.split("/").filter(Boolean);
    if (locales.includes(segments[0])) segments[0] = next;
    else segments.unshift(next);
    router.push("/" + segments.join("/"));
  }

  return (
    <div className="flex gap-2">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          aria-current={l === current}
          className={l === current ? "font-bold underline" : "opacity-70"}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Wire into docs layout nav**

Modify `app/[lang]/docs/layout.tsx` — add to the `DocsLayout` `nav` children. Replace the `nav` prop:
```tsx
import { LocaleSwitch } from "@/components/locale-switch";
// ...
    <DocsLayout
      tree={source.pageTree[lang]}
      nav={{ title: "NeoDocs", children: <LocaleSwitch current={lang} /> }}
    >
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/locale-switch.tsx app/[lang]/docs/layout.tsx
git commit -m "feat(app): add locale switch in docs nav"
```

---

## Phase 7 — Docker, Nginx, Make, env

### Task 7.1: Dockerfiles

**Files:**
- Create: `Dockerfile`, `Dockerfile.dev`

- [ ] **Step 1: Write `Dockerfile` (production, standalone, non-root)**

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# DATABASE_URL is only needed at build for type-safe pages; use a dummy.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Migration tooling for `make db-migrate`/`db-seed` inside the container.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/package.json ./package.json
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
```

- [ ] **Step 2: Write `Dockerfile.dev`**

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

- [ ] **Step 3: Commit**

```bash
git add Dockerfile Dockerfile.dev
git commit -m "build: add production standalone and dev Dockerfiles"
```

### Task 7.2: Compose files

**Files:**
- Create: `docker-compose.dev.yml`, `docker-compose.prod.yml`

- [ ] **Step 1: Write `docker-compose.dev.yml`**

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: neodocs
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: neodocs
    ports:
      - "5432:5432"
    volumes:
      - neodocs_dev_db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U neodocs"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    env_file: .env.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      db:
        condition: service_healthy

volumes:
  neodocs_dev_db:
```

- [ ] **Step 2: Write `docker-compose.prod.yml`**

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: neodocs
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      POSTGRES_DB: neodocs
    secrets:
      - db_password
    volumes:
      - neodocs_prod_db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U neodocs"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  app:
    build:
      context: .
      dockerfile: Dockerfile
    env_file: .env.prod
    expose:
      - "3000"
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  nginx:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/neodocs.conf:/etc/nginx/conf.d/default.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - app
    restart: unless-stopped

secrets:
  db_password:
    file: ./secrets/db_password.txt

volumes:
  neodocs_prod_db:
```

- [ ] **Step 3: Validate compose syntax**

Run: `docker compose -f docker-compose.dev.yml config -q && docker compose -f docker-compose.prod.yml config -q`
Expected: no output (valid). `.env.dev`/`.env.prod` missing warnings are acceptable at this step.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.dev.yml docker-compose.prod.yml
git commit -m "build: add dev and prod docker compose stacks"
```

### Task 7.3: Nginx config

**Files:**
- Create: `nginx/neodocs.conf`

- [ ] **Step 1: Write `nginx/neodocs.conf`**

```nginx
server {
    listen 80;
    server_name neodocs.neotel.com.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name neodocs.neotel.com.br;

    ssl_certificate     /etc/nginx/certs/neodocs.neotel.com.br.crt;
    ssl_certificate_key /etc/nginx/certs/neodocs.neotel.com.br.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add nginx/neodocs.conf
git commit -m "build: add nginx TLS reverse-proxy config"
```

### Task 7.4: Makefile + env examples

**Files:**
- Create: `Makefile`, `.env.dev.example`, `.env.prod.example`

- [ ] **Step 1: Write `.env.dev.example`**

```bash
# Dev defaults — work out of the box with docker-compose.dev.yml
DATABASE_URL=postgres://neodocs:dev@db:5432/neodocs
NEXTAUTH_SECRET=dev_secret_change_me
AUTH_SECRET=dev_secret_change_me
AUTH_TRUST_HOST=true
NEXTAUTH_URL=http://localhost:3000
ADMIN_EMAIL=admin@neotel.com.br
ADMIN_PASSWORD=admin123
ADMIN_NAME=Admin
```

- [ ] **Step 2: Write `.env.prod.example`**

```bash
# Production — fill in real values. Do NOT commit the filled .env.prod
DATABASE_URL=postgres://neodocs:CHANGE_ME@db:5432/neodocs
# Must match secrets/db_password.txt
NEXTAUTH_SECRET=CHANGE_ME_RUN_openssl_rand_base64_32
AUTH_SECRET=CHANGE_ME_RUN_openssl_rand_base64_32
AUTH_TRUST_HOST=true
NEXTAUTH_URL=https://neodocs.neotel.com.br
ADMIN_EMAIL=admin@neotel.com.br
ADMIN_PASSWORD=CHANGE_ME
ADMIN_NAME=Admin
```

- [ ] **Step 3: Write `Makefile`** (uses tabs for recipe lines)

```makefile
.PHONY: dev prod down logs build db-migrate db-seed db-shell shell clean

DEV  := docker compose -f docker-compose.dev.yml
PROD := docker compose -f docker-compose.prod.yml

dev:
	$(DEV) up --build

prod:
	$(PROD) up --build -d

down:
	-$(DEV) down
	-$(PROD) down

logs:
	@if $(DEV) ps -q app >/dev/null 2>&1 && [ -n "$$($(DEV) ps -q app)" ]; then \
		$(DEV) logs -f; \
	else \
		$(PROD) logs -f; \
	fi

build:
	$(PROD) build

db-migrate:
	@if [ -n "$$($(DEV) ps -q app 2>/dev/null)" ]; then \
		$(DEV) exec app npm run db:migrate; \
	else \
		$(PROD) exec app npm run db:migrate; \
	fi

db-seed:
	@if [ -n "$$($(DEV) ps -q app 2>/dev/null)" ]; then \
		$(DEV) exec app npm run db:seed; \
	else \
		$(PROD) exec app npm run db:seed; \
	fi

db-shell:
	@if [ -n "$$($(DEV) ps -q db 2>/dev/null)" ]; then \
		$(DEV) exec db psql -U neodocs -d neodocs; \
	else \
		$(PROD) exec db psql -U neodocs -d neodocs; \
	fi

shell:
	@if [ -n "$$($(DEV) ps -q app 2>/dev/null)" ]; then \
		$(DEV) exec app sh; \
	else \
		$(PROD) exec app sh; \
	fi

clean:
	-$(DEV) down -v
	-$(PROD) down -v
```

- [ ] **Step 4: Verify Makefile parses**

Run: `make -n dev`
Expected: prints the `docker compose -f docker-compose.dev.yml up --build` command without executing.

- [ ] **Step 5: Commit**

```bash
git add Makefile .env.dev.example .env.prod.example
git commit -m "build: add Makefile and env examples for dev/prod"
```

---

## Phase 8 — End-to-end tests

### Task 8.1: Playwright config + global setup

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/global-setup.ts`

- [ ] **Step 1: Write `playwright.config.ts`**

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

- [ ] **Step 2: Write `tests/e2e/global-setup.ts`** (ensures admin exists)

```typescript
import { execSync } from "node:child_process";

export default async function globalSetup() {
  // Seed admin against the running stack's DB before e2e.
  // Assumes DATABASE_URL + ADMIN_* env vars are exported for the test run.
  if (process.env.E2E_SEED === "1") {
    execSync("npm run db:migrate && npm run db:seed", { stdio: "inherit" });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add playwright.config.ts tests/e2e/global-setup.ts
git commit -m "test(e2e): add Playwright config and seed global setup"
```

### Task 8.2: Auth + i18n e2e specs

**Files:**
- Create: `tests/e2e/auth.spec.ts`, `tests/e2e/i18n.spec.ts`

- [ ] **Step 1: Write `tests/e2e/auth.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@neotel.com.br";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

test("unauthenticated docs access redirects to login", async ({ page }) => {
  await page.goto("/pt/docs");
  await expect(page).toHaveURL(/\/pt\/login/);
});

test("wrong credentials show error", async ({ page }) => {
  await page.goto("/pt/login");
  await page.getByLabel(/e-?mail/i).fill(EMAIL);
  await page.locator('input[name="password"]').fill("wrongpass");
  await page.getByRole("button", { name: /entrar|sign in/i }).click();
  await expect(page.getByText(/credenciais inválidas|invalid credentials/i)).toBeVisible();
});

test("valid login reaches landing and docs", async ({ page }) => {
  await page.goto("/pt/login");
  await page.getByLabel(/e-?mail/i).fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /entrar|sign in/i }).click();
  await expect(page).toHaveURL(/\/pt$/);
  await page.goto("/pt/docs");
  await expect(page).not.toHaveURL(/login/);
});
```

- [ ] **Step 2: Write `tests/e2e/i18n.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@neotel.com.br";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/pt/login");
  await page.getByLabel(/e-?mail/i).fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /entrar|sign in/i }).click();
  await expect(page).toHaveURL(/\/pt$/);
}

test("locale switch pt -> en keeps the docs route", async ({ page }) => {
  await login(page);
  await page.goto("/pt/docs/processes/onboarding");
  await page.getByRole("button", { name: "EN" }).click();
  await expect(page).toHaveURL(/\/en\/docs\/processes\/onboarding/);
  await expect(page.getByText(/onboarding process|Steps to onboard/i)).toBeVisible();
});
```

- [ ] **Step 3: Document the e2e run command (no auto-run without a live stack)**

The e2e suite needs a running app + seeded DB. Run locally:
```bash
make dev            # in one terminal
make db-migrate && make db-seed
E2E_BASE_URL=http://localhost:3000 npx playwright test
```

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/auth.spec.ts tests/e2e/i18n.spec.ts
git commit -m "test(e2e): add auth flow and locale-switch specs"
```

---

## Phase 9 — Final verification + README

### Task 9.1: Full unit suite + build

- [ ] **Step 1: Run all unit tests**

Run: `DATABASE_URL=postgres://x npx vitest run`
Expected: PASS — credentials (4), seed (2), i18n-parity (1), content (13), schema-migration (skipped without `TEST_DATABASE_URL`).

- [ ] **Step 2: Production build**

Run: `npx fumadocs-mdx && DATABASE_URL=postgres://x npx next build`
Expected: build succeeds, `.next/standalone/server.js` produced.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve issues surfaced by full test + build run"
```

### Task 9.2: README

**Files:**
- Modify: `README.md` (replace stub)

- [ ] **Step 1: Write `README.md`** using the user-provided plan content verbatim (the Quick Start / Make table / structure / secrets sections), adjusting the `next.config.ts` note to reflect that standalone output and the MDX + next-intl plugins are already configured.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add NeoDocs README with dev/prod quick start"
```

---

## Self-Review Notes (resolved during planning)

- **Spec coverage:** content skeleton (Task 5.1), Fumadocs i18n routing (4.1/6.4), next-intl chrome (4.1/6.1), Drizzle users-only schema (1.1), bcrypt credentials auth with OIDC-ready provider array (3.1/3.2), authed-only docs (6.4), Docker dev+prod / Nginx / Make / env (Phase 7), pgvector image no vector tables (7.2 + 1.1), tests last (Phases 1-8 interleave unit, Phase 8 e2e). All covered.
- **Type consistency:** `verifyCredentials(email, password, findByEmail)`, `SafeUser`/`UserFinder`, `buildAdminValues`/`seedAdmin`, `source.getPage(slug, lang)` / `source.pageTree[lang]`, `locales` from `lib/i18n.ts` used consistently across tasks.
- **Known runtime caveats flagged in steps:** importing `lib/db/index.ts` requires `DATABASE_URL` (dummy used in tests/build); `.source` must be generated before typecheck/build; Auth.js session-cookie name differs by http/https (both checked in middleware).
```
