# Inno Challenge

Monorepo containing the public/authenticated Next.js application and Fastify API.

## Applications

- `apps/web` — Next.js 16, React 19, Tailwind CSS 4
- `apps/api` — Node.js, Fastify, PostgreSQL-ready API

## Get started

```bash
cd code
pnpm install
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
pnpm dev:web
```

Environment configuration is read from `apps/web/.env` for the web app and `apps/api/.env` for the API.

Run the API separately with `pnpm dev:api`, or run the web and API servers together with `pnpm dev`.
