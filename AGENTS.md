# MQDMS — repository rules

## Architecture

There are **two web apps** that share one Better Auth instance (same database,
same secret, same session cookie):

| Deploy            | Package         | Responsibility                                              |
| ----------------- | --------------- | ----------------------------------------------------------- |
| `auth.mqdms.com`  | `apps/auth`     | Login, dashboard, profile, organization, member, role, permission, invitation |
| `app.mqdms.com`   | `apps/app`      | Business modules: FMEA, synoptic, …                        |

Do not copy the auth screens into the business app. Shared UI lives in
`@mqdms/ui`, shared i18n in `@mqdms/i18n`.

## Authorization

**UI visibility is not authorization.** Every server action and every
repository query must check permissions itself; a layout guard is not a
security boundary.

The permission engine lives in `packages/auth/src/permissions`:

- `resources.ts` — the typed catalog. A `resource:action` pair that is not in
  it fails closed.
- `evaluate.ts` — the pure evaluator. Order: catalog → owner → explicit
  `deny` → explicit `allow` → union of the member's roles → nothing.
- `repository.ts` / `service.ts` / `guards.ts` — server-only.
- `seeds/catalog.ts` — factory role templates (pure data).
- `seeds/factory.ts` — idempotent seeding (server-only).

Browser-safe code imports `@mqdms/auth/permissions`; server code imports
`@mqdms/auth/permissions/server`.

Never trust an `organizationId` that arrives from the client. Derive it from
the request context, and scope every business table and query by it.

## Two role layers

- Better Auth membership roles are `owner` and `member` — nothing else.
  `owner` is assigned once at bootstrap and cannot be granted by anyone.
- Functional roles are per-organization rows in `organization_role`, seeded
  from the factory catalog. They are never shared between organizations.

## Auth package rules

`packages/auth` must not import Next.js APIs (`next/headers`,
`next/navigation`, `redirect()`). It receives request headers as an argument.
Next-specific helpers belong in `apps/<app>/features/auth`.

Public registration is closed. Accounts are created only by
`/bootstrap-org` or through an invitation link. Use
`provisionUserWithPassword` from `@mqdms/auth/provisioning` for server-side
account creation — never insert into the `user` / `account` tables directly,
and never store a plaintext password.

## Environment

`packages/env` is split per concern. Use the module that matches the need:

```text
@mqdms/env/server   → APP_ENV, NODE_ENV, DATABASE_URL
@mqdms/env/auth     → BETTER_AUTH_*, AUTH_TRUSTED_ORIGINS, AUTH_COOKIE_DOMAIN, ORG_BOOTSTRAP_*
@mqdms/env/app      → NEXT_PUBLIC_* (server side)
@mqdms/env/client   → NEXT_PUBLIC_* (client side)
@mqdms/env/storage  → STORAGE_*
@mqdms/env/redis    → REDIS_URL
```

`NEXT_PUBLIC_APP_URL` is the deploy's **own** origin; `NEXT_PUBLIC_AUTH_URL`
is the canonical auth origin and is identical in both deploys.

`BETTER_AUTH_SECRET` and `AUTH_COOKIE_DOMAIN` must be identical in both
deploys, otherwise they do not share a session.

## Database

Do not write sql. use pnpm:db:generate
Drizzle. Schema lives in `packages/db/src/schema`. All business tables carry
`organizationId` with a composite FK where a child row references a
parent-scoped row.

The migration history is regenerated from scratch when the schema changes
wholesale:

```bash
pnpm db:reset:hard   # APP_ENV=local guard; drops the schema and the drizzle folder
```

Never reset migrations against a shared database.

## Checks

Run these before committing:

```bash
pnpm typecheck
pnpm test
pnpm exec biome format .
```

Biome is the source of truth for formatting and import order. The vendored
shadcn components in `packages/ui` carry known lint findings; lint is
informational, format is not.

Tests use Vitest from the repository root (`vitest.config.ts`).

## Conventions

- Conventional Commits (`feat(auth):`, `fix(db):`, `ci:`), in English.
- Code comments are written in Turkish, matching the existing style of
  `apps/` and `packages/`. Documentation (README) stays in English.
- LF line endings; `.gitattributes` enforces it and Biome expects it.
- Do not commit `.env` files. `.env.example` is the template.
