FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Corepack'in cache'i build sırasında doldurulur ve `nodejs` kullanıcısı için
# okunabilir hale getirilir.
ENV COREPACK_HOME="/corepack"

RUN corepack enable \
  && corepack install --global pnpm@11.23.0 \
  && chmod -R a+rwX "$COREPACK_HOME"

WORKDIR /app


FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/app/package.json ./apps/app/package.json
COPY apps/auth/package.json ./apps/auth/package.json
COPY apps/worker/package.json ./apps/worker/package.json

COPY packages ./packages

RUN pnpm install --frozen-lockfile


FROM base AS builder

# Build sırasında `@mqdms/env` modülleri import edildiği için env şeması
# build anında da doğrulanıyor. Değerler image'a gömülmez, compose build
# argümanlarından gelir.
ARG DATABASE_URL
ARG REDIS_URL
ARG QUEUE_PREFIX
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_AUTH_URL
ARG NEXT_PUBLIC_BUSINESS_APP_URL
ARG BETTER_AUTH_URL
ARG BETTER_AUTH_SECRET
ARG AUTH_TRUSTED_ORIGINS
ARG AUTH_COOKIE_DOMAIN
ARG RESEND_API_KEY
ARG RESEND_FROM_EMAIL
ARG STORAGE_BUCKET
ARG STORAGE_REGION
ARG STORAGE_ENDPOINT
ARG STORAGE_ACCESS_KEY_ID
ARG STORAGE_SECRET_ACCESS_KEY
ARG STORAGE_PUBLIC_URL

ENV DATABASE_URL=$DATABASE_URL
ENV REDIS_URL=$REDIS_URL
ENV QUEUE_PREFIX=$QUEUE_PREFIX
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_AUTH_URL=$NEXT_PUBLIC_AUTH_URL
ENV NEXT_PUBLIC_BUSINESS_APP_URL=$NEXT_PUBLIC_BUSINESS_APP_URL
ENV BETTER_AUTH_URL=$BETTER_AUTH_URL
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
ENV AUTH_TRUSTED_ORIGINS=$AUTH_TRUSTED_ORIGINS
ENV AUTH_COOKIE_DOMAIN=$AUTH_COOKIE_DOMAIN
ENV RESEND_API_KEY=$RESEND_API_KEY
ENV RESEND_FROM_EMAIL=$RESEND_FROM_EMAIL
ENV STORAGE_BUCKET=$STORAGE_BUCKET
ENV STORAGE_REGION=$STORAGE_REGION
ENV STORAGE_ENDPOINT=$STORAGE_ENDPOINT
ENV STORAGE_ACCESS_KEY_ID=$STORAGE_ACCESS_KEY_ID
ENV STORAGE_SECRET_ACCESS_KEY=$STORAGE_SECRET_ACCESS_KEY
ENV STORAGE_PUBLIC_URL=$STORAGE_PUBLIC_URL

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/app/node_modules ./apps/app/node_modules
COPY --from=deps /app/packages ./packages

COPY . .

RUN pnpm --filter @mqdms/app build


FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs \
  /app/apps/app/.next/standalone ./

COPY --from=builder --chown=nextjs:nodejs \
  /app/apps/app/.next/static ./apps/app/.next/static

# `output: "standalone"` statik dosyaları kopyalamaz, `public/` elle taşınmalı.
COPY --from=builder --chown=nextjs:nodejs \
  /app/apps/app/public ./apps/app/public

USER nextjs

EXPOSE 3000

CMD ["node", "apps/app/server.js"]
