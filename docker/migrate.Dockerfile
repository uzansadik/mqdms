FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Corepack'in cache'i build sırasında doldurulur ve `node` kullanıcısı için
# okunabilir hale getirilir; aksi halde container ilk çalıştığında pnpm'i
# indirmeye çalışıp ağa bağımlı olurdu.
ENV COREPACK_HOME="/corepack"

RUN corepack enable \
  && corepack install --global pnpm@11.23.0 \
  && chmod -R a+rwX "$COREPACK_HOME"

WORKDIR /app


FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/auth/package.json ./apps/auth/package.json
COPY apps/worker/package.json ./apps/worker/package.json

COPY packages ./packages

# Sadece `@mqdms/db` ve bağımlılıkları kuruluyor. `drizzle-kit` ve `dotenv`
# dev dependency; prod install kullanılırsa migration çalıştırılamaz.
RUN pnpm install --frozen-lockfile --filter @mqdms/db...


# Runner, `deps` katmanından DEĞİL `base` katmanından türetiliyor. pnpm'in
# content-addressable store'u `deps` katmanında kalıyor; sadece gerçek
# `node_modules` kopyalanıyor. Aksi halde store'daki dosyalar image'a iki kez
# (hardlink + kopya) yazılıp image'ı gereksiz yere iki kat büyütüyor.
FROM base AS runner

ENV NODE_ENV=production

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=deps --chown=node:node /app/packages ./packages

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY --chown=node:node packages/db ./packages/db
COPY --chown=node:node packages/env ./packages/env

# `pnpm` çalışma dizininde geçici dosya oluşturuyor; dizin `node`
# kullanıcısına yazılabilir olmalı.
RUN chown node:node /app

USER node

# `verify-deps-before-run=false`: `node_modules` build sırasında kopyalandığı
# için pnpm'in "bağımlılıklar güncel mi?" kontrolü yanlışlıkla kurulum
# tetikliyordu; image içinde kurulum yapılmamalı.
CMD ["pnpm", "--config.verify-deps-before-run=false", "--filter", "@mqdms/db", "db:migrate"]
