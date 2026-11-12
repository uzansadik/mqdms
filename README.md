# MQDMS

MQDMS is a reusable SaaS starter built for creating new applications without rebuilding authentication, organizations, storage, email, and common account management features.

## Stack

* Next.js
* Turborepo
* pnpm
* PostgreSQL
* Drizzle ORM
* Better Auth
* Better Auth Organizations
* Cloudflare R2 / S3-compatible storage
* Resend
* shadcn/ui
* React Hook Form
* Zod
* Biome

## Project structure

```text
apps/
  auth/      → auth.mqdms.com (kimlik, organizasyon yönetimi)
  app/       → app.mqdms.com  (iş uygulaması: FMEA, sinoptik, ...)
  worker/    → e-posta / BullMQ işleri

packages/
  audit/
  auth/
  config/
  db/
  email/
  env/
  i18n/
  queue/
  redis/
  storage/
  typescript-config/
  ui/
```

There are exactly **two web deployments**. They share the same database, the
same Better Auth secret and the same session cookie, so a single login covers
both:

| Deploy            | App          | Responsibility                                                              |
| ----------------- | ------------ | --------------------------------------------------------------------------- |
| `auth.mqdms.com`  | `apps/auth`  | Login, dashboard, profile, organization, member, role, permission, invitation |
| `app.mqdms.com`   | `apps/app`   | The business application: FMEA, synoptic and the other quality modules       |

Application-specific features live inside `apps/<app>/features`.

Infrastructure packages should remain framework-independent where possible.

For example:

```text
apps/auth
    ↓
@mqdms/storage
    ↓
S3-compatible provider
```

and:

```text
apps/auth
    ↓
@mqdms/auth
    ↓
Better Auth
```

---

# Getting started

## 1. Requirements

Install:

* Node.js
* pnpm
* PostgreSQL

Optional external services used by the starter:

* Resend
* Cloudflare R2

For local development, PostgreSQL should preferably run locally.

---

## 2. Install dependencies

From the repository root:

```bash
pnpm install
```

---

## 3. Environment variables

Copy:

```text
.env.example
```

to:

```text
.env
```

The root `.env` file is the canonical environment file.

MQDMS synchronizes it to:

```text
apps/auth/.env
apps/app/.env
```

when development starts.

Do not manually maintain separate copies of the same variables.

---

# Database

Create a local PostgreSQL database.

Example:

```text
Database: mqdms
Host: localhost
Port: 5432
```

Then configure:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mqdms
```

Run the repository's Drizzle database initialization/migration command before starting the application.

Local development should use a local PostgreSQL instance whenever possible.

The application and database should also be deployed in the same or a nearby region in production.

---

# Development

Start the complete monorepo:

```bash
pnpm dev
```

The root command first synchronizes environment variables and then starts the Turborepo development tasks.

Web application:

```text
http://localhost:3000   → auth
http://localhost:3001   → app
```

Locally both apps run on `localhost`, so they share the same host-only
session cookie even though the ports differ.

---

# Docker

The stack can be run without a local Node.js installation:

```bash
docker compose up --build
```

This starts:

```text
postgres   → localhost:5432 (database: mqdms)
redis      → localhost:6379
migrate    → runs Drizzle migrations once, then exits
auth       → http://localhost:3000
app        → http://localhost:3001
worker     → queue worker (default,email)
```

`migrate` runs before `auth` and `app` start, so the schema is always up to date.

Useful commands:

```bash
docker compose logs -f auth      # Uygulama logları
docker compose logs -f app       # İş uygulaması logları
docker compose logs -f worker   # Worker logları
docker compose ps               # Servis durumu
docker compose down             # Servisleri durdur
docker compose down -v          # Servisleri durdur ve verileri sil
docker compose run --rm migrate # Migration'ları yeniden çalıştır
```

The images are built from:

```text
docker/auth.Dockerfile      → Next.js standalone sunucusu (auth.mqdms.com)
docker/app.Dockerfile       → Next.js standalone sunucusu (app.mqdms.com)
docker/worker.Dockerfile   → BullMQ worker
docker/migrate.Dockerfile  → Drizzle migration çalıştırıcı
```

`.env` is not copied into the image. The values are passed at build time as build
arguments and at runtime through `env_file`. The database and Redis URLs are
overridden inside `docker-compose.yml` so that the containers use the `postgres`
and `redis` services instead of the host values.

The application ports can be changed with `APP_PORT` and `BUSINESS_APP_PORT`:

```bash
APP_PORT=3000 BUSINESS_APP_PORT=3001 docker compose up -d
```

---

# CI/CD

Pull requests only verify the code. The production images are built and
published to GitHub Container Registry when a pull request is merged into
`main`; the deployment itself is done by Coolify.

Workflow:

```text
.github/workflows/ci.yml
```

| Event                       | Verify | Build | Push to GHCR |
| --------------------------- | ------ | ----- | ------------ |
| Push to `main`              | yes    | yes   | yes          |
| Pull request to `main`      | yes    | no    | no           |
| Manual (`workflow_dispatch`) | yes    | only on `main` | yes (on `main`) |

Images:

```text
ghcr.io/uzansadik/mqdms/auth
ghcr.io/uzansadik/mqdms/app
ghcr.io/uzansadik/mqdms/worker
ghcr.io/uzansadik/mqdms/migrate
```

Tags produced by a build:

```text
latest          → the newest build on main
sha-<short-sha> → the commit the image was built from
```

The `sha-…` tag is what you pin for a rollback; `latest` always moves forward.

The build job needs the `packages: write` permission. It is declared on the job
itself (the verify job only needs `contents: read`), and `GITHUB_TOKEN` is used
for the registry login, so no registry password secret is required.

## Verify job

Before any image is built:

```text
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm exec biome format .
pnpm exec biome lint .
```

Typecheck, tests and format are blocking. Lint is currently informational
(`continue-on-error`) because the vendored shadcn components and a few legacy
files carry known findings.

Tests run with Vitest from the repository root:

```bash
pnpm test          # vitest run
pnpm test:watch    # vitest
```

They cover the permission engine (evaluation order, fail-closed behaviour), the
factory role catalog and the safe `returnTo` handling.

## Where each environment variable lives

There are three separate places, and mixing them up is the usual source of
"works locally, fails in CI" problems.

| Place                                    | What goes there                                                | When it is read |
| ---------------------------------------- | -------------------------------------------------------------- | --------------- |
| `.env` in the repo root                  | Every real value for local development and Docker               | Runtime         |
| `.env` on the deployment host            | Every real value for production                                 | Runtime         |
| GitHub Actions → Variables / Secrets     | Only the values that must exist while the image is being built  | Build time      |

### Build time (GitHub)

`next build` evaluates route handlers, and `@mqdms/env` validates the
environment when those modules are imported. The workflow therefore passes
build-only placeholders for every variable that is not defined, so a missing
secret never breaks the build.

`NEXT_PUBLIC_APP_URL` is the exception: it is inlined into the client bundle at
build time, so it has to be a real value. Without it the client keeps pointing
at `http://localhost:3000`.

Settings → Secrets and variables → Actions → Variables:

```text
NEXT_PUBLIC_APP_URL=https://auth.mqdms.com
NEXT_PUBLIC_AUTH_URL=https://auth.mqdms.com
NEXT_PUBLIC_BUSINESS_APP_URL=https://app.mqdms.com
BETTER_AUTH_URL=https://auth.mqdms.com
AUTH_TRUSTED_ORIGINS=https://auth.mqdms.com,https://app.mqdms.com
AUTH_COOKIE_DOMAIN=.mqdms.com
```

`NEXT_PUBLIC_APP_URL` is the deploy's **own** origin: `auth.mqdms.com` for the
auth image, `app.mqdms.com` for the app image. `NEXT_PUBLIC_AUTH_URL` is the
canonical auth origin and is identical in both.

Everything else is optional on GitHub. If you do define them, put them in
**Secrets** (they are masked in logs):

```text
BETTER_AUTH_SECRET
RESEND_API_KEY
RESEND_FROM_EMAIL
STORAGE_BUCKET
STORAGE_REGION
STORAGE_ACCESS_KEY_ID
STORAGE_SECRET_ACCESS_KEY
STORAGE_ENDPOINT
STORAGE_PUBLIC_URL
```

Secrets are never baked into the image. They are passed to the containers at
runtime through `env_file`.

### Runtime (deployment host)

The real values live in a `.env` file next to `docker-compose.yml` on the
deployment host. Copy `.env.example` there and fill it in:

```text
APP_ENV=production
NEXT_PUBLIC_APP_URL=https://auth.mqdms.com
NEXT_PUBLIC_AUTH_URL=https://auth.mqdms.com
NEXT_PUBLIC_BUSINESS_APP_URL=https://app.mqdms.com
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=https://auth.mqdms.com
AUTH_TRUSTED_ORIGINS=https://auth.mqdms.com,https://app.mqdms.com
AUTH_COOKIE_DOMAIN=.mqdms.com
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=...
STORAGE_BUCKET=...
STORAGE_REGION=auto
STORAGE_ACCESS_KEY_ID=...
STORAGE_SECRET_ACCESS_KEY=...
STORAGE_ENDPOINT=
STORAGE_PUBLIC_URL=
```

`ORG_BOOTSTRAP_ENABLED` and `ORG_BOOTSTRAP_KEY` are only needed while the first
organization is created — see
[Creating the first organization](#creating-the-first-organization). They are
read at runtime, so the GitHub build secrets are irrelevant for them.

`docker-compose.yml` overrides `DATABASE_URL`, `REDIS_URL` and `QUEUE_PREFIX`
with the in-network service names, so those three are not read from the host
`.env`. `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` fall back to
`http://localhost:3000` but are read from the host `.env` when it defines them.

Note that `NEXT_PUBLIC_APP_URL` has to be correct in **both** places: the
GitHub variable decides what is baked into the image, and the host `.env`
decides what the running container reports.

## Package visibility

GHCR packages are private by default. To pull the images on a deployment host,
either log in:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u uzansadik --password-stdin
```

or change the package visibility to public in the package settings. Coolify
pulls the images with `pull_policy: always`, so the registry credentials have
to be registered there as well (see [Deployment](#deployment)).

## Deployment

The production stack runs on Coolify as **two** Docker Compose Applications:

| Compose file                       | Coolify resource | Services                                |
| ---------------------------------- | ---------------- | --------------------------------------- |
| `docker-compose.coolify.yml`       | auth stack       | postgres, redis, migrate, auth, worker |
| `docker-compose.coolify.app.yml`   | app stack        | app                                     |

Both pull the published images (never build them) and share the same database
over the private network. The auth stack applies pending migrations through the
one-shot `migrate` service before `auth`, `app` and `worker` start.

```text
merge into main → CI publishes latest + sha-<short-sha> → CI calls the
Coolify deploy webhook of each resource → Coolify pulls the new images and
redeploys
```

The deploy is triggered **by CI**, not by Coolify's push webhook: the webhook
call happens after the images are pushed, so Coolify can never pull a stale
`latest`. Coolify's own "Auto Deploy" therefore stays **off**.

Coolify side:

1. **Preview deployments off** — pull requests do not produce images, so a
   preview deployment would always fail.
2. **Registry credentials** — `ghcr.io` with a token that has `read:packages`.
3. **Environment variables** — everything the compose file marks as required
   (`DATABASE_URL`, `POSTGRES_PASSWORD`, `NEXT_PUBLIC_APP_URL`,
   `NEXT_PUBLIC_AUTH_URL`, `NEXT_PUBLIC_BUSINESS_APP_URL`, `BETTER_AUTH_URL`,
   `BETTER_AUTH_SECRET`, `AUTH_TRUSTED_ORIGINS`, `AUTH_COOKIE_DOMAIN`,
   `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `STORAGE_*`) plus the optional
   bootstrap variables.
4. **Deploy webhooks** — copy the URL from Application → Deploy Webhook of
   each resource and register both as repository secrets:

   ```bash
   gh secret set COOLIFY_AUTH_DEPLOY_WEBHOOK
   gh secret set COOLIFY_APP_DEPLOY_WEBHOOK
   ```

   The webhooks are authenticated with a Coolify API token (Keys & Tokens → API
   Tokens, `deploy` permission). Register it as a second secret:

   ```bash
   gh secret set COOLIFY_API_TOKEN
   ```

   Without the secrets the images are still published, but no deployment is
   triggered.

`BETTER_AUTH_SECRET` and `AUTH_COOKIE_DOMAIN` **must** be identical in both
stacks; otherwise the two deployments do not share a session.

The image tag is `APP_TAG` and defaults to `latest`. Pin it to roll back to a
previous build:

```text
APP_TAG=sha-1bc322d
```

The same images can be run on a plain Docker host instead of Coolify.
`docker-compose.prod.yml` overrides `migrate`, `auth`, `app` and `worker` to
use the published images instead of building locally:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

The deployment host needs Docker only; no Node.js and no source checkout.

---

# Authentication

Authentication is implemented with Better Auth.

Included flows:

* Login
* Email verification
* Forgot password
* Reset password
* Change password
* Session management
* Sign out
* Organization invitations

Public registration is disabled: `/register` returns 404 and the Better Auth
`/sign-up/email` endpoint is closed (`disableSignUp: true`). Accounts are created
either during the [first organization setup](#creating-the-first-organization) or
through an organization invitation link (`/accept-invitation`), which is also
where a user without an account sets their password.

The `@mqdms/auth` package must not depend on Next.js APIs such as:

```text
next/headers
next/navigation
redirect()
```

Next.js-specific authentication helpers belong in:

```text
apps/<app>/features/auth
```

## Shared session

The two web deployments share one session:

* `BETTER_AUTH_URL` is the same in both (`https://auth.mqdms.com`); it is where
  the session cookie is written and where sign-in and sign-out happen.
* `AUTH_COOKIE_DOMAIN` is the shared cookie domain (`.mqdms.com`). When it is
  set, the cookie is written for the whole domain and both deployments read it.
  Left empty, the cookie is host-only — which is what local development uses,
  where both apps run on `localhost` and therefore share it anyway.
* `BETTER_AUTH_SECRET` must be identical in both; a different secret means a
  different session.
* `AUTH_TRUSTED_ORIGINS` is the exact list of origins Better Auth accepts a
  `callbackURL` redirect to. Wildcards are not used.

Session cookies are `HttpOnly`, `SameSite=Lax`, `Path=/` and `Secure` in
production. The session lasts 7 days and is refreshed once a day. The cookie
cache is **off**: permissions are read from the database on every request, so a
revoked role takes effect immediately.

## Creating the first organization

The bootstrap flow is disabled by default. It is only enabled by two runtime
environment variables:

```text
ORG_BOOTSTRAP_ENABLED=true
ORG_BOOTSTRAP_KEY=<openssl rand -base64 32>
```

Both are read at **runtime**, not at build time: they are not `NEXT_PUBLIC_`
prefixed, so the auth container reads them from its own environment. Adding
them to the GitHub build secrets has no effect — and the key should not be
passed as a Docker build argument, because build arguments end up in the
image layers and in the GitHub Actions build cache.

Where they have to be defined depends on how the stack is deployed:

* `docker-compose.yml` reads them from the host `.env` (`env_file: .env`).
* `docker-compose.coolify.yml` lists every variable explicitly, so they have
  to be added to the Coolify stack environment (or to the host `.env` that
  Compose interpolates).

The flow itself:

1. Enable both variables and restart (or redeploy) the `auth` container.
2. Open `/bootstrap-org` and submit the bootstrap key together with the
   organization and owner details.
3. Verify the email address, then sign in.
4. Set `ORG_BOOTSTRAP_ENABLED=false` again and remove the key.

The bootstrap creates the owner account, the organization, the owner
membership and the factory roles. It is protected by a PostgreSQL advisory
lock and a durable `bootstrap_state` row, so a second attempt is refused and a
half-finished setup is resumed rather than duplicated.

---

# Organizations

Organizations are the primary application workspace / tenant abstraction.

Included functionality:

* Create organization (first setup only)
* Switch active organization
* Organization name
* Organization slug
* Organization logo
* Invite members
* Pending invitations
* Accept invitation
* Assign and remove member roles
* Manage member permissions
* Create, edit and delete custom roles
* Delete organization

## Roles and permissions

There are two separate layers:

**Better Auth membership roles** are the management roles. They live in
`member.role` and there are exactly two:

```text
owner   → full access; manages members, roles and permissions
member  → access comes from the functional roles assigned to them
```

**Functional roles** (Plant Manager, Project Engineer, Quality Engineer, …)
are per-organization records in `organization_role`. They are seeded from the
factory catalog in `packages/auth/src/permissions/seeds/factory.ts` when the
organization is created, and the owner can edit them afterwards. Roles are
never shared between organizations.

A member can hold several functional roles at once. The evaluation order for
a single `resource:action` pair is:

1. A resource/action that is not in the catalog fails closed.
2. The owner has access to every registered business action; the owner's
   grants cannot be changed.
3. An explicit `deny` grant on the member rejects the action.
4. An explicit `allow` grant on the member permits the action.
5. Otherwise the union of the member's assigned roles decides.
6. A member without a role and without an explicit grant has **no** access.

The permission catalog is code, not configuration
(`packages/auth/src/permissions/resources.ts`): adding a module means adding
its resources and actions there.

Every server action and every repository query performs this check. The
layout is not a security boundary on its own, and hiding a menu item is never
authorization.

Application resources should generally belong to an organization rather than directly to a user.

Example:

```text
project.organizationId
document.organizationId
```

instead of:

```text
project.userId
document.userId
```

when the resource belongs to a workspace.

---

# Storage

Storage is exposed through `@mqdms/storage`.

The web application does not depend directly on AWS SDK or Cloudflare R2.

Uploads use presigned URLs:

```text
Browser
    ↓
POST presign
    ↓
signed PUT URL
    ↓
Browser → R2 / S3
    ↓
POST complete
    ↓
server-side object verification
```

Current examples:

```text
user-avatar/{userId}/{uuid}
organization-logo/{organizationId}/{uuid}
```

Uploaded image types:

* JPEG
* PNG
* WebP

Default maximum image size:

```text
5 MB
```

The server verifies uploaded objects before they are persisted to application records.

---

# Email

Email is exposed through `@mqdms/email`.

Current provider:

```text
Resend
```

Included examples:

* Email verification
* Password reset
* Organization invitation

Application code should use the email package instead of importing Resend directly.

---

# Profile and account

Included account functionality:

* Update name
* Upload avatar
* Change password
* List active sessions
* Revoke a session
* Revoke other sessions

Profile images are uploaded through the same verified storage pipeline used by organization logos.

---

# UI conventions

Use the existing shadcn components from:

```text
@mqdms/ui/components/*
```

Do not recreate Button, Input, Field, or other shared UI components inside the web application.

Forms use:

```text
react-hook-form
+
zod
+
zodResolver
+
Controller
+
Field
FieldLabel
FieldError
FieldGroup
```

Do not use the deprecated shadcn `Form` / `FormField` pattern.

---

# TypeScript conventions

The repository uses:

```text
module: ESNext
moduleResolution: Bundler
```

Relative TypeScript imports do not include `.js` extensions.

Correct:

```ts
import { something } from "./something";
```

Avoid:

```ts
import { something } from "./something.js";
```

Biome is the source of truth for formatting and import organization.

---

# Environment conventions

Deployment environment is represented by:

```env
APP_ENV=local
```

Supported values:

```text
local
staging
production
```

Do not use `NODE_ENV` as a custom deployment environment selector.

---

# Design principles

## Keep infrastructure isolated

Application code should not know unnecessary provider details.

Examples:

```text
apps/auth
→ @mqdms/storage
→ S3-compatible provider
```

```text
apps/auth
→ @mqdms/email
→ Resend
```

```text
apps/auth
→ @mqdms/auth
→ Better Auth
```

## Prefer provider capabilities

Do not rebuild features that Better Auth, PostgreSQL, R2, or another provider already implements well.

## Keep business rules application-specific

MQDMS may provide examples such as:

```text
storage limits
```

but these examples should not become mandatory framework rules.

The application developer owns domain-specific decisions.

## Server-side authorization

UI visibility is not authorization.

Protect sensitive functionality on the server, including:

* Organization settings
* Organization deletion
* Member management
* Upload verification

---

# Current starter scope

MQDMS currently provides a working reference for:

```text
Authentication
Organizations
Memberships
Roles and permissions
Invitations
Profiles
Password management
Sessions
Email
Storage
Organization branding
```

The goal is to provide a clean SaaS foundation while leaving product-specific domain logic to the application built on top of it. The business modules of `apps/app` (FMEA, synoptic, …) are route and guard shells: the access control is in place, the domain behaviour is developed as separate features.
