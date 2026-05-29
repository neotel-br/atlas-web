# NeoDocs

Internal documentation platform for Neotel.
Built with Next.js 15 + Fumadocs + PostgreSQL.

---

## Quick Start

### Prerequisites

- Docker + Docker Compose
- Make
- `openssl` (for generating secrets)

---

### Development

```bash
# 1. Clone and enter the repo
git clone <repo-url> neodocs && cd neodocs

# 2. Copy and review the dev env file (defaults work out of the box)
cp .env.dev.example .env.dev

# 3. Start everything
make dev
```

App runs at **http://localhost:3000**
PostgreSQL exposed at **localhost:5432** (user: `neodocs`, password: `dev`, db: `neodocs`)

On first run, run migrations in a separate terminal:
```bash
make db-migrate
make db-seed       # creates initial admin user from ADMIN_* env vars
```

Default seeded admin (dev): `admin@neotel.com.br` / `admin123`. Log in at
**http://localhost:3000/pt/login** — all docs routes require authentication.

---

### Production (VM deploy)

```bash
# 1. Copy and fill in production secrets
cp .env.prod.example .env.prod
# Edit .env.prod — fill in NEXTAUTH_SECRET/AUTH_SECRET and DATABASE_URL password
#   Generate a secret with: openssl rand -base64 32

# 2. Create the DB password secret file (must match DATABASE_URL in .env.prod)
mkdir -p secrets
printf 'your_strong_password_here' > secrets/db_password.txt
chmod 600 secrets/db_password.txt

# 3. Place SSL certificate files
mkdir -p nginx/certs
# Copy:  nginx/certs/neodocs.neotel.com.br.crt
# Copy:  nginx/certs/neodocs.neotel.com.br.key

# 4. Start production
make prod

# 5. Run migrations + seed against the prod stack
make db-migrate
make db-seed
```

App is served at **https://neodocs.neotel.com.br** via Nginx.

---

### Build configuration

The production Dockerfile uses Next.js standalone output. This is already configured in
`next.config.ts` (`output: "standalone"`), together with the Fumadocs MDX and next-intl
plugins:

```typescript
import { createMDX } from "fumadocs-mdx/next";
import createNextIntlPlugin from "next-intl/plugin";

const withMDX = createMDX();
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
};

export default withNextIntl(withMDX(nextConfig));
```

---

## All Make commands

| Command | Description |
|---|---|
| `make dev` | Start development (hot reload, logs in foreground) |
| `make prod` | Build and start production (detached) |
| `make down` | Stop all containers |
| `make logs` | Tail logs (auto-detects dev or prod) |
| `make build` | Build production image only |
| `make db-migrate` | Run pending database migrations |
| `make db-seed` | Seed initial admin user |
| `make db-shell` | Open psql shell |
| `make shell` | Shell inside app container |
| `make clean` | Remove containers and volumes (destructive) |

---

## Internationalization

Locale routing is handled by Fumadocs i18n (`/pt` default, `/en` secondary); UI chrome
strings come from next-intl (`messages/pt.json`, `messages/en.json`). MDX content lives in
git only — there is no database-backed content. Add a localized page by creating both
`page.mdx` (pt) and `page.en.mdx` (en) under `content/docs/`.

---

## Testing

```bash
npm test                 # unit tests (Vitest)
TEST_DATABASE_URL=postgres://... npm test   # also runs the migration smoke test
npm run test:e2e         # Playwright e2e (needs a running, seeded stack)
```

For e2e, start the stack and seed first:
```bash
make dev
make db-migrate && make db-seed
E2E_BASE_URL=http://localhost:3000 npx playwright test
```

---

## Project structure

```
neodocs/
├── app/                    # Next.js App Router ([lang] segment)
├── components/             # React components
├── content/docs/           # MDX content (documentation, processes, reports)
├── lib/                    # db (Drizzle), auth (Auth.js), source, i18n
├── i18n/                   # next-intl request config
├── messages/               # i18n UI strings (pt, en)
├── nginx/
│   ├── neodocs.conf        # Nginx config
│   └── certs/              # SSL certificates (not committed)
├── secrets/                # DB password file (not committed)
├── tests/                  # unit (Vitest) + e2e (Playwright)
├── Dockerfile              # Production multi-stage build (standalone)
├── Dockerfile.dev          # Development image
├── docker-compose.dev.yml  # Dev stack
├── docker-compose.prod.yml # Production stack
├── Makefile
├── .env.dev.example
└── .env.prod.example
```

---

## Secrets and sensitive files

The following are listed in `.gitignore` and must **never** be committed:

- `.env.dev`
- `.env.prod`
- `secrets/db_password.txt`
- `nginx/certs/`
