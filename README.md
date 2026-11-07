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
  auth/
  worker/

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

Application-specific features live inside `apps/auth/features`.

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
http://localhost:3000
```

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
auth        → http://localhost:3000
worker     → queue worker (default,email)
```

`migrate` runs before `auth` starts, so the schema is always up to date.

Useful commands:

```bash
docker compose logs -f auth      # Uygulama logları
docker compose logs -f worker   # Worker logları
docker compose ps               # Servis durumu
docker compose down             # Servisleri durdur
docker compose down -v          # Servisleri durdur ve verileri sil
docker compose run --rm migrate # Migration'ları yeniden çalıştır
```

The images are built from:

```text
docker/auth.Dockerfile      → Next.js standalone sunucusu
docker/worker.Dockerfile   → BullMQ worker
docker/migrate.Dockerfile  → Drizzle migration çalıştırıcı
```

`.env` is not copied into the image. The values are passed at build time as build
arguments and at runtime through `env_file`. The database and Redis URLs are
overridden inside `docker-compose.yml` so that the containers use the `postgres`
and `redis` services instead of the host values.

The application port can be changed with `APP_PORT`:

```bash
APP_PORT=3001 docker compose up -d
```

---

# CI/CD

Every push to `main` (and every merge into `main`) builds the production images
and publishes them to GitHub Container Registry.

Workflow:

```text
.github/workflows/docker-images.yml
```

| Event                       | Verify | Build | Push to GHCR |
| --------------------------- | ------ | ----- | ------------ |
| Push to `main`              | yes    | yes   | yes          |
| Pull request to `main`      | yes    | yes   | no           |
| Manual (`workflow_dispatch`) | yes    | yes   | yes (on `main`) |

Images:

```text
ghcr.io/uzansadik/mqdms/auth
ghcr.io/uzansadik/mqdms/worker
ghcr.io/uzansadik/mqdms/migrate
```

Tags produced for every build:

```text
latest          → only for main
main            → branch name
<short-sha>     → commit SHA
```

The workflow needs the `packages: write` permission. It is declared inside the
workflow file, and `GITHUB_TOKEN` is used for the registry login, so no registry
password secret is required.

## Verify job

Before any image is built:

```text
pnpm install --frozen-lockfile
pnpm typecheck
pnpm exec biome format .
pnpm exec biome lint .
```

Typecheck and format are blocking. Lint is currently informational
(`continue-on-error`) because the vendored shadcn components and a few legacy
files carry known findings.

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
NEXT_PUBLIC_APP_URL=https://app.example.com
```

Everything else is optional on GitHub. If you do define them, put them in
**Secrets** (they are masked in logs):

```text
BETTER_AUTH_SECRET
BETTER_AUTH_URL
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
NEXT_PUBLIC_APP_URL=https://app.example.com
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=https://app.example.com
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=...
STORAGE_BUCKET=...
STORAGE_REGION=auto
STORAGE_ACCESS_KEY_ID=...
STORAGE_SECRET_ACCESS_KEY=...
STORAGE_ENDPOINT=
STORAGE_PUBLIC_URL=
```

`docker-compose.yml` overrides `DATABASE_URL`, `REDIS_URL` and `QUEUE_PREFIX`
with the in-network service names, so those three are not read from the host
`.env`. `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` fall back to
`http://localhost:3000` but are read from the host `.env` when it defines them.

Note that `NEXT_PUBLIC_APP_URL` has to be correct in **both** places: the
GitHub variable decides what is baked into the image, and the host `.env`
decides what the running container reports.

## Package visibility

GHCR packages are private by default. To pull the images from a deployment
host, either log in:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u uzansadik --password-stdin
```

or change the package visibility to public in the package settings.

## Deployment

`docker-compose.prod.yml` overrides `migrate`, `auth` and `worker` to use the
published images instead of building locally:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

The deployment host needs Docker only; no Node.js and no source checkout.

Pin a specific build with `APP_TAG`:

```bash
APP_TAG=main docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
APP_TAG=main docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

# Authentication

Authentication is implemented with Better Auth.

Included flows:

* Register
* Login
* Email verification
* Forgot password
* Reset password
* Change password
* Session management
* Sign out
* Organization invitations

The `@mqdms/auth` package must not depend on Next.js APIs such as:

```text
next/headers
next/navigation
redirect()
```

Next.js-specific authentication helpers belong in:

```text
apps/auth/features/auth
```

---

# Organizations

Organizations are the primary application workspace / tenant abstraction.

Included functionality:

* Organization onboarding
* Create organization
* Switch active organization
* Organization name
* Organization slug
* Organization logo
* Invite members
* Pending invitations
* Accept invitation
* Promote member to admin
* Demote admin to member
* Remove member
* Delete organization

Roles:

```text
owner
admin
member
```

Sensitive organization settings such as organization deletion are owner-only.

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
Invitations
Profiles
Password management
Sessions
Email
Storage
Organization branding
```

The goal is to provide a clean SaaS foundation while leaving product-specific domain logic to the application built on top of it.
