# NeoDocs — Platform Design

**Date:** 2026-05-29
**Status:** Approved
**Owner:** Neotel internal docs platform

## Summary

Internal documentation platform for Neotel. Next.js 15 (App Router) + Fumadocs for
MDX docs, Drizzle ORM over PostgreSQL (pgvector base image) for auth users, Auth.js v5
credentials login, hybrid i18n (Fumadocs for content routing, next-intl for UI chrome).
Dockerized for dev and VM production behind Nginx + TLS.

**Language policy:** all code, identifiers, comments, commit messages in English. Only
user-facing rendered text is localized (pt-BR default, en secondary).

## Resolved decisions

- **ORM:** Drizzle (drizzle-kit migrations). Postgres image `pgvector/pgvector:pg16`
  retained for future RAG, but **no vector/content tables now** — git is the only content
  source. Schema holds `users` only.
- **Auth:** Auth.js v5 Credentials provider (email + bcrypt password) against `users`.
  Provider list is an array so an OIDC provider can be appended later with no refactor.
  Credentials forces **JWT session strategy**, so no DB session rows now; Auth.js
  Drizzle-adapter tables (accounts/sessions/verificationTokens) are added only when OIDC
  is introduced.
- **i18n (hybrid):** Fumadocs built-in i18n owns locale routing (`/pt`, `/en`) and content
  resolution. next-intl supplies UI chrome strings (login, nav, errors) via messages loaded
  per `[lang]` segment. To avoid two routing middlewares fighting, Fumadocs i18n middleware
  is the only routing middleware; next-intl runs without its own middleware (messages loaded
  in a server `getRequestConfig` keyed off the route locale).
- **Content:** structured skeleton. Categories `documentation`, `processes`, `reports`.
  Each category: an index page + one sample page, in pt (default) and en. Plus a per-locale
  root landing page.
- **Docs visibility:** authed-only. All `/docs` routes require a session; unauthenticated
  users redirect to `/login`.

## Architecture

```
app/
  [lang]/
    (auth)/login/         # login page (next-intl strings)
    docs/[[...slug]]/      # Fumadocs renderer, authed-only
    layout.tsx            # NextIntlClientProvider + Fumadocs RootProvider
  api/auth/[...nextauth]/  # Auth.js route handler
  layout.tsx              # root html
components/                # shared React (login form, nav, locale switch)
content/docs/              # MDX, Fumadocs source (git-only content)
  documentation/  processes/  reports/
lib/
  db/         # schema.ts, index.ts (pooled pg), migrations/, seed.ts
  auth/       # config.ts (providers array), helpers
  source.ts   # Fumadocs loader({ i18n })
  i18n.ts     # Fumadocs i18n config { defaultLanguage:'pt', languages:['pt','en'] }
messages/      # next-intl JSON: pt.json, en.json (UI chrome only)
i18n/request.ts # next-intl getRequestConfig
middleware.ts   # Fumadocs i18n routing + auth guard
nginx/          # neodocs.conf, certs/ (gitignored)
secrets/        # db_password.txt (gitignored)
```

### Data flow

1. Request → `middleware.ts`: Fumadocs i18n resolves locale prefix; auth guard checks
   session for `/docs/*`, redirects to `/{lang}/login` if absent.
2. `app/[lang]/layout.tsx` loads next-intl messages for `lang`, wraps tree in
   `NextIntlClientProvider` + Fumadocs `RootProvider`.
3. Docs pages: `lib/source.ts` resolves MDX for `(lang, slug)` and renders via Fumadocs.
4. Login: form posts to Auth.js Credentials `authorize()` → bcrypt compare against
   `users.passwordHash` → JWT with `role` claim.

## Components / units

- `lib/db/schema.ts` — `users`: `id uuid pk`, `email unique`, `passwordHash`, `name`,
  `role` enum `admin|editor|viewer`, `createdAt`, `updatedAt`.
- `lib/db/index.ts` — `node-postgres` Pool + Drizzle instance from `DATABASE_URL`.
- `lib/db/seed.ts` — idempotent: upsert admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- `lib/auth/config.ts` — Auth.js config; `providers:[Credentials]`; JWT + session callbacks
  carry `role`. Exports `auth`, `signIn`, `signOut`, handlers.
- `lib/source.ts` + `lib/i18n.ts` — Fumadocs loader + i18n config.
- `i18n/request.ts` + `messages/*.json` — next-intl chrome strings.
- `middleware.ts` — compose Fumadocs i18n routing with auth redirect.

## Error handling

- Auth: `authorize()` returns `null` on bad credentials → generic "invalid credentials"
  (no user enumeration). Locked behind rate-aware login form (basic).
- DB: pool errors surface as 500; seed exits non-zero on missing env.
- i18n: unknown locale → redirect to default (`pt`) via Fumadocs middleware.
- Missing MDX page → Fumadocs `notFound()` → localized 404.

## Infrastructure

- `Dockerfile` — multi-stage standalone (deps → build → runner, non-root, `output:standalone`).
- `Dockerfile.dev` — hot-reload dev image.
- `docker-compose.dev.yml` — app + `pgvector/pgvector:pg16` (5432 exposed), `.env.dev`.
- `docker-compose.prod.yml` — app + db + nginx; db password via Docker secret file.
- `nginx/neodocs.conf` — TLS termination, reverse proxy to `app:3000`, HTTP→HTTPS redirect.
- `Makefile` — dev, prod, down, logs, build, db-migrate, db-seed, db-shell, shell, clean.
- `.env.dev.example`, `.env.prod.example`.
- `.gitignore` — replace current Python-only file with Node/Next.js + `.env.dev` `.env.prod`
  `secrets/db_password.txt` `nginx/certs/`.
- `next.config.ts` — `output:"standalone"`, Fumadocs MDX + next-intl plugins.

## Testing (final phase)

- **Vitest unit:** `authorize()` (valid → user, bad password → null, unknown email → null,
  role propagation); seed idempotency; next-intl message completeness (pt/en key parity);
  Fumadocs source resolves each category page per locale.
- **Migration smoke:** apply Drizzle migrations to ephemeral Postgres, assert `users` shape.
- **Playwright e2e:** login success/failure, protected `/docs` redirect when logged out,
  locale switch pt↔en preserves route.
- CI-runnable (compose-based ephemeral db or testcontainers).

## Out of scope (YAGNI)

- Vector/RAG tables, document versioning, DB-stored content.
- OIDC provider (pre-wired, not implemented).
- DB session strategy (JWT only until OIDC).
