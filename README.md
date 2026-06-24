# docs

This is a Next.js application generated with
[Create Fumadocs](https://github.com/fuma-nama/fumadocs).

It is a Next.js app with [Static Export](https://nextjs.org/docs/app/guides/static-exports) configured.

Run development server:

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

Open http://localhost:3000 with your browser to see the result.

## Docker

Development with hot reload:

```bash
make dev
```

Production build served by `nginx`:

```bash
cp .env.prod.example .env.prod
make prod
```

Useful commands:

```bash
make down
make logs-dev
make logs-prod
make clean
make prod-validate
make prod-build
make prod-deploy
```

Default ports:

- dev: `http://localhost:3000`
- prod: `https://atlas.neotel.com.br` (via traefik, port `443`)

Optional overrides:

```bash
DEV_PORT=3001 make dev
```

## Production deploy

Production runs behind a `traefik` reverse proxy (TLS termination on `443`) in front of a dedicated `nginx` runtime image with:

- config generated from env vars at container startup;
- cache headers for static assets;
- security headers;
- `healthz` endpoint for post-deploy checks.

Recommended flow:

```bash
cp .env.prod.example .env.prod
make prod-validate
make prod-deploy
```

Main production vars:

- `SERVER_NAME`: domain routed by `traefik` (e.g. `atlas.neotel.com.br`)
- `PROD_IMAGE_NAME`: image repository/name
- `PROD_IMAGE_TAG`: release tag
- `NGINX_CLIENT_MAX_BODY_SIZE`: request size limit
- `TRAEFIK_CERT_PATH` / `TRAEFIK_KEY_PATH`: host paths to TLS cert/key

## Explore

In the project, you can see:

- `lib/source.ts`: Code for content source adapter, [`loader()`](https://fumadocs.dev/docs/headless/source-api) provides the interface to access your content.
- `lib/layout.shared.tsx`: Shared options for layouts, optional but preferred to keep.

| Route                     | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `app/(home)`              | The route group for your landing page and other pages. |
| `app/documentacao`        | The documentation layout and pages.                    |
| `app/api/search/route.ts` | The Route Handler for search.                          |

### Fumadocs MDX

A `source.config.ts` config file has been included, you can customise different options like frontmatter schema.

Read the [Introduction](https://fumadocs.dev/docs/mdx) for further details.

## Learn More

To learn more about Next.js and Fumadocs, take a look at the following
resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js
  features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [Fumadocs](https://fumadocs.dev) - learn about Fumadocs
