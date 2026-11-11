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

`SUPERADMIN_BOOTSTRAP_ENABLED` and `SUPERADMIN_BOOTSTRAP_KEY` are only needed
while the first superadmin is created — see
[Creating the first superadmin](#creating-the-first-superadmin). They are read
at runtime, so the GitHub build secrets are irrelevant for them.

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

The production stack runs on Coolify with `docker-compose.coolify.yml`. It
pulls the published images (never builds them) and applies pending migrations
through the one-shot `migrate` service before `auth` and `worker` start.

```text
merge into main → CI publishes latest + sha-<short-sha> → Coolify redeploys
```

Coolify side:

1. **Preview deployments off** — pull requests do not produce images, so a
   preview deployment would always fail.
2. **Registry credentials** — `ghcr.io` with a token that has `read:packages`.
3. **Environment variables** — everything `docker-compose.coolify.yml` marks
   as required (`DATABASE_URL`, `POSTGRES_PASSWORD`, `NEXT_PUBLIC_APP_URL`,
   `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`,
   `RESEND_FROM_EMAIL`, `STORAGE_*`) plus the optional bootstrap and OAuth
   variables.
4. **Auto deploy** — the stack's base branch is `main` and the GitHub webhook
   redeploys on push.

The image tag is `APP_TAG` and defaults to `latest`. Pin it to roll back to a
previous build:

```text
APP_TAG=sha-1bc322d
```

The same images can be run on a plain Docker host instead of Coolify.
`docker-compose.prod.yml` overrides `migrate`, `auth` and `worker` to use the
published images instead of building locally:

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
either by a superadmin or through an organization invitation link
(`/accept-invitation`), which is also where a user without an account sets their
password.

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

## Creating the first superadmin

The bootstrap flow is disabled by default. It is only enabled by two runtime
environment variables:

```text
SUPERADMIN_BOOTSTRAP_ENABLED=true
SUPERADMIN_BOOTSTRAP_KEY=<openssl rand -base64 32>
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
2. Open `/bootstrap-superadmin` and submit the bootstrap key together with the
   account details.
3. Verify the email address, then sign in.
4. Set `SUPERADMIN_BOOTSTRAP_ENABLED=false` again.

The page closes itself once a user with the `superadmin` role exists, and the
whole flow is refused for every other role — an existing regular user does not
block it. If the page reports that bootstrap is unavailable, the reason is
either that the variables above are missing or that a superadmin already
exists.

---

# OAuth provider (central identity provider)

The auth app is the identity provider of the platform. Other applications
(e.g. `app.example.com`) delegate authentication to it and receive the user's
roles and permissions as token claims.

It is built on `@better-auth/oauth-provider` (OAuth 2.1 + OpenID Connect) with
the `jwt` plugin for signing.

## Endpoints

All provider endpoints live under the Better Auth base path (`/api/auth`):

| Endpoint | Purpose |
| --- | --- |
| `GET /api/auth/oauth2/authorize` | Authorization request; redirects to the login page when there is no session |
| `POST /api/auth/oauth2/token` | Code (and refresh token) exchange; PKCE `S256` is required |
| `GET /api/auth/oauth2/userinfo` | Standard claims plus the published role/permission claims |
| `POST /api/auth/oauth2/consent` | Approval decision |
| `POST /api/auth/oauth2/continue` | Resumes the flow after the organization selection |
| `GET /api/auth/jwks` | Public signing keys for local token verification |

The discovery documents are mounted by hand, because the plugin only provides
the handlers:

* `GET /.well-known/oauth-authorization-server`
* `GET /.well-known/openid-configuration`

## Flow

1. The application redirects the user to `/api/auth/oauth2/authorize` with
   `client_id`, `redirect_uri`, `scope`, `state` and a PKCE `code_challenge`.
2. Without a session the provider redirects to `/login` with the signed
   authorization request. The user signs in; the flow continues.
3. If the user belongs to more than one organization, `/oauth/organizations`
   asks which organization the token belongs to.
4. `/oauth/consent` shows the requested scopes; the user approves or denies.
5. The provider redirects back to the application's `redirect_uri` with
   `code`, `state` and `iss`.
6. The application exchanges the code at `/api/auth/oauth2/token` and receives
   an access token, an ID token and (with `offline_access`) a refresh token.

## Published claims

| Claim | Content |
| --- | --- |
| `https://auth.mqdms.com/organization` | Id of the selected organization |
| `https://auth.mqdms.com/roles` | Role ids of the membership (`owner`, `quality-engineer`, …) |
| `https://auth.mqdms.com/permissions` | Effective permissions (`fmea:read`, `fmea:submit`, …) |
| `https://auth.mqdms.com/platform-role` | Platform role (`user` / `superadmin`) |

Permissions are computed from the same RBAC model the app uses internally
(`packages/auth/src/permissions`): an explicit `deny` grant wins over an
explicit `allow` grant, and the fixed role catalog is the fallback. The role
and permission claims are only added when the client requested the
`permissions:read` scope.

## Registering an application

Superadmins register applications in the admin panel under
`/admin/oauth-clients`. The panel writes the client id and the client secret;
the secret is shown only once.

Give the application a **resource** (the URI of its protected API). With a
resource the access token becomes a JWT whose audience is that resource, so
the application can verify it locally against `/api/auth/jwks` instead of
calling the introspection endpoint.

## Configuration

| Variable | Purpose |
| --- | --- |
| `OAUTH_TRUSTED_ORIGINS` | Comma separated origins of the consuming applications; Better Auth validates `callbackURL` redirects against this list |
| `OAUTH_PAIRWISE_SECRET` | Secret for pairwise subject ids (at least 32 characters) |
| `OAUTH_ISSUER` | Issuer URI; defaults to `BETTER_AUTH_URL` |

`NEXT_PUBLIC_APP_URL` must point at the auth app itself (`auth.mqdms.com`):
the client bundle talks to `/api/auth/*` on that origin.

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
