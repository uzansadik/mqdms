# @mqdms/config

Shared static configuration for the MQDMS monorepo.

## Purpose

`@mqdms/config` contains application-level configuration that can be reused across `apps/*` and other `@mqdms/*` packages.

Typical responsibilities:

* Application metadata
* Feature flags
* SaaS plan definitions
* Plan limits
* Shared configuration constants
* Small pure configuration helpers

Example usage:

```ts
import {
  appConfig,
  features,
  getPlan,
} from "@mqdms/config";
```

## Structure

```text
packages/config/
└── src/
    ├── app.ts
    ├── features.ts
    ├── plans.ts
    └── index.ts
```

### `app.ts`

Contains application identity and general metadata.

```ts
export const appConfig = {
  name: "MQDMS",
  slug: "mqdms",
  description: "A modern SaaS application.",
};
```

Application code should use `appConfig` instead of duplicating configurable values throughout the codebase.

### `features.ts`

Contains global product capability flags.

Examples:

```ts
export const features = {
  admin: true,
  billing: true,
  organizations: true,
  uploads: true,
  usage: true,
};
```

Keep these generic. Domain-specific functionality such as RFQ, 8D, inventory, or project management should normally stay inside the application's domain code.

### `plans.ts`

Contains SaaS plans, features, and usage limits.

```ts
export const plans = {
  free: {
    limits: {
      members: 1,
      storageMb: 100,
      usage: 20,
    },
  },
};
```

Use `null` for unlimited limits.

```ts
members: null
```

means unlimited members.

## Package Rules

`@mqdms/config` should stay lightweight and framework-agnostic.

It may contain:

* Plain TypeScript objects
* Types
* Constants
* Feature definitions
* Plan definitions
* Small pure helper functions

It should **not** contain:

* Database connections or queries
* Better Auth configuration
* S3 clients
* Billing provider clients
* Email clients
* React components
* Server actions
* API routes
* Runtime secrets

Those responsibilities belong in dedicated packages such as:

```text
@mqdms/db
@mqdms/auth
@mqdms/storage
@mqdms/billing
@mqdms/email
@mqdms/env
```

## Public API

Public configuration should be exported through `src/index.ts`.

Consumers should prefer:

```ts
import { plans } from "@mqdms/config";
```

instead of importing internal files directly.

## AI Agent Guidance

When modifying this package:

1. Keep it focused on static shared configuration.
2. Avoid adding infrastructure or framework-specific code.
3. Keep domain-specific business logic outside this package.
4. Prefer serializable configuration values.
5. Export public APIs through `src/index.ts`.
6. Avoid unnecessary dependencies.
7. Keep the package reusable across different products built from the MQDMS starter.

The main design principle is simple: **`@mqdms/config` describes the application; it should not run the application.**
