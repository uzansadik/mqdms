# mQDMS — Shared Session Refactor Plan

**Tarih:** 12 Kasım 2026  
**Repo:** https://github.com/uzansadik/mqdms  
**İncelenen branch:** `main` (`411628116fd8cca204eb00b70c18c1b23c01b92c`)  
**Durum:** Uygulama planı; kod veya sunucu değişikliği yapılmadı.

## 1. Hedef ve kapsam

OAuth/OIDC provider ve client mimarisi tamamen kaldırılacak. Email/password + Better Auth database session kullanılacak. Mevcut auth UI, davet, email, audit ve izin altyapısı yeniden kullanılacak. Veritabanı için backward compatibility, veri taşıma veya yedek alma çalışması yapılmayacak; yeni boş mQDMS veritabanı kurulacak. Bu karar yalnızca mQDMS verileri için geçerlidir; Coolify'nin kendi DB'si, başka uygulamaların volume'leri ve R2 nesneleri silinmeyecek.

| Deploy | Kaynak | Sorumluluk |
|---|---|---|
| auth.mqdms.com | `apps/auth` | Login, dashboard, profile, organization, member, role, permission, invitation |
| app.mqdms.com | `apps/app` | İş uygulaması: FMEA, sinoptik ve diğer kalite modülleri |
| worker | `apps/worker` | Email / BullMQ işleri |
| migrate | `packages/db` | Tek migration çalıştırıcısı |

**Kesin karar:** Yalnız iki web deploy: `auth.mqdms.com` ve `app.mqdms.com`. İş uygulaması sıfırdan `apps/app` altında geliştirilecek; başka repo inceleme veya kod taşıma yok. `auth.mqdms.com/dashboard` yönetim/uygulama erişim ekranı. Platform SUPERADMIN ve ADMIN rolleri/paneli tamamen kaldırılacak. Organizasyon yönetimi owner-only; Better Auth üyelik rolleri yalnız `owner` ve `member`. İlk owner + organizasyon `/bootstrap-org` ile tek seferde oluşturulur; sonraki üyeler invitation ile gelir. 
## 2. Repo incelemesi (doğrulanmış)

- [`packages/auth/src/server.ts`](https://github.com/uzansadik/mqdms/blob/main/packages/auth/src/server.ts): `admin`, `organization`, `apiKey`, `jwt`, `oauthProvider`; public signup zaten kapalı, email verification ve queue üzerinden email mevcut. Session cache aktif; session süresi için `maxAge` kullanımı düzeltilmeli (`expiresIn`).
- [`packages/auth/src/client.ts`](https://github.com/uzansadik/mqdms/blob/main/packages/auth/src/client.ts): `oauthProviderClient`, `NEXT_PUBLIC_APP_URL` üzerinden auth base URL. Ayrı app eklenince base URL ayrıştırılmalı.
- [`packages/auth/src/permissions`](https://github.com/uzansadik/mqdms/tree/main/packages/auth/src/permissions): `resources.ts` yalnızca FMEA içeriyor; `roles.ts` owner/member/project-engineer/quality-engineer sabit roller; `evaluate.ts` deny > allow > role; `statements.ts` Better Auth erişim kontrolü; `platform.ts` platform rolleri; `publish.ts` OAuth claim yayınıyla ilişkisi incelenip kaldırılacak.
- [`apps/auth/features/permissions/server.ts`](https://github.com/uzansadik/mqdms/blob/main/apps/auth/features/permissions/server.ts): DB grant okuma, aktif member, permission kontrolleri UI app içinde. Bunlar shared package'a taşınmalı. `actions.ts` ve matrix UI mevcut.
- [`packages/db/src/schema/initial/permissions.ts`](https://github.com/uzansadik/mqdms/blob/main/packages/db/src/schema/initial/permissions.ts): `member_permission` (organizationId, memberId, resource, action, effect). Ayrı FK'ler member ve organization eşleşmesini tek başına garanti etmiyor. Effect text, DB check constraint yok.
- `apps/auth/app/(app)/dashboard`, `settings/profile`, `settings/members`, `settings/permissions`, `settings/activity`, `settings/api-keys` mevcut. `apps/auth/app/(app)/layout.tsx` session + organization istiyor. `apps/auth/app/admin` platform paneli mevcut.
- `apps/auth/features/bootstrap/service.ts`: env flag/key, advisory lock, superadmin createUser. `features/organization/invitation-registration.ts`: pending/expiry doğrulaması, createUser, emailVerified işaretleme, audit; eşzamanlılık ve yarım kalan işlem senaryoları iyileştirilmeli.
- `apps/auth/features/auth/login-form.tsx`: OAuth branch, ilk organizasyonu otomatik seçme, superadmin için `/admin` redirect; `lib/auth-navigation.ts` sadece relative next kabul ediyor.
- `packages/db/src/schema/index.ts` audit/auth/oauth/permissions export ediyor. Dört migration ve snapshot mevcut; `packages/db/scripts/reset-migrations.mjs` local guard ile migration klasörünü kaldırıyor.
- `.github/workflows/ci.yml`: verify + auth/worker/migrate GHCR images + tek Coolify webhook. `docker-compose.coolify.yml`: postgres, redis, migrate, auth, worker; OAuth env var'ları var. `apps/app` ve `docker/app.Dockerfile` yok.
- `packages/auth/package.json`: Better Auth ve plugin sürümleri 1.7.20. Repo yorumlarında 1.7.1 referansı var; gerçek kurulu sürümle API davranışı test edilmeli.

## 3. Hedef mimari

```text
mqdms/
  apps/
    auth/                 # auth.mqdms.com
    app/                  # app.mqdms.com (yeni iş modülleri)
    worker/
  packages/
    auth/
      src/
        server.ts         # Better Auth instance
        client.ts         # browser, canonical auth URL
        next.ts           # handler / request guard yardımcıları
        session.ts        # server-only session & organization context
        permissions/
          resources.ts    # kodda typed permission katalogu
          roles.ts        # built-in roller ve tipler
          statements.ts   # Better Auth yönetim policy
          evaluate.ts     # saf evaluator
          repository.ts   # DB sorguları, server-only
          service.ts      # role/grant mutation ve yetki kuralları
          guards.ts       # requirePermission, requireOrganization
          index.ts        # browser-safe exports
          server.ts       # server-only exports
    db/
    env/
    queue/
    email/
    audit/
    ui/
  docker/
    auth.Dockerfile
    app.Dockerfile
    migrate.Dockerfile
    worker.Dockerfile
```

İlk sürüm için tek PostgreSQL DB ve tek migration sahibi. Ayrı deploy, ayrı DB zorunluluğu anlamına gelmez. İki app aynı Better Auth config/secret/DB ile `auth.api.getSession({headers})` çağırır. HTTP auth handler sadece auth app'te olur. Server Actions feature altında `server.ts` / mevcut `actions.ts` adaptöründe; business rules `packages/auth` içinde. Browser-safe exports DB, env secret veya Node-only modülleri import etmez.

### 3.1 Shared cookie/session

- `BETTER_AUTH_URL=https://auth.mqdms.com`, `NEXT_PUBLIC_AUTH_URL=https://auth.mqdms.com` her iki deploy'da aynı; `NEXT_PUBLIC_APP_URL` her deploy'un kendi origin'i.
- `advanced.crossSubDomainCookies.enabled=true`, `domain=.mqdms.com`, secure cookies production, HttpOnly, SameSite Lax, path `/`; ortak cookiePrefix `mqdms`. Localhost için secure/domain ayarları dev'e özel; farklı portlar aynı host cookie paylaşabilir.
- `trustedOrigins` kesin origin listesi; auth ve app. Wildcard kullanılmaz.
- `session.expiresIn` örnek 7 gün, `updateAge` 1 gün; ilk sürümde cookieCache kapalı, permission her istekte DB'den. Mevcut 30 günlük davranış istenirse `expiresIn` 30 gün seçilebilir.
- Browser client `credentials: include`; normal UI auth işlemleri auth domain'inde. App'te session hook gerekiyorsa credentialed CORS: yalnız izinli origin, `Access-Control-Allow-Credentials: true`, OPTIONS ve Vary Origin; Better Auth/Next handler davranışı E2E doğrulanır. Tercihen app server guard ile session alır, client'a minimal DTO geçirir; app'te cross-origin auth API çağrısı zorunlu değil.
- Logout merkezi auth üzerinden session revoke + cookie clear; tüm subdomain'lerde geçersiz. Cookie yenileme Set-Cookie yalnız uygun response üzerinden; Server Component okuması cookie yazamayabilir, refresh/expiry davranışı test edilecek.
- Her action ve repository query session + org membership + permission doğrular. Layout tek güvenlik katmanı değildir. DB private ağda; iki deploy aynı güven sınırında. Uygulama host'u kompromize olursa ortak cookie/secret riskine dikkat. Üçüncü taraf domain o7n.io bu mimarinin dışında.

## 4. Role / Permission — merkezi tasarım

### 4.1 Model

Better Auth `member.role` yalnız sistem yönetim rolleri (`owner`, `member`) için canonical kaynak olacak. Fonksiyonel roller (`project-engineer`, `quality-engineer`, yeni custom roller) ayrı DB ilişkisiyle tutulacak; Better Auth statik role hook'larına rastgele dinamik slug vermeyeceğiz. Böylece Better Auth yönetim endpoint'leri ile iş modülü authorization ayrışmaz. Bir üye birden çok fonksiyonel role sahip olabilir. Owner yönetim aksiyonları member permission override ile değiştirilemez.

- `organization_role`: id, organizationId, slug, name, description, createdById, createdAt, updatedAt; unique(org, slug). Öntanımlı fonksiyonel roller organizasyon bootstrap sırasında seed edilir.
- `organization_role_permission`: organizationId, roleId, resource, action; unique(roleId, resource, action); FK(org, roleId). Allow-only role grants.
- `member_role`: organizationId, memberId, roleId; unique(memberId, roleId); composite FK'ler aynı org'u garanti eder.
- `member_permission`: mevcut tablo korunur; enum/check allow/deny, unique(memberId, resource, action), composite FK(org, memberId). `inherit` satırın silinmesi demek.
- Better Auth `member` tablosunda unique(organizationId, userId) ve composite unique(organizationId,id) sağlanır. Role tablosunda da composite unique(org,id). Audit log actor/org/action/target ve önceki/yeni değerler.
- Permission katalogu kodda sabit ve typed: yeni modül eklemek geliştirici işi; owner bu katalogdaki aksiyonlardan rol oluşturur. İlk katalog mevcut FMEA aksiyonlarını değiştirmeden saklar; `synoptic:read,update`, `processFlow`, `controlPlan` gibi modüller gerçekten uygulanırken genişletilir.

### 4.2 Değerlendirme

1. Session yoksa unauthenticated; aktif org geçersiz/üyelik yoksa forbidden veya org seçimi.
2. Kaynak/aksiyon katalogda yoksa fail closed; prototype anahtarlarına karşı own-property kontrolü.
3. Owner tüm kayıtlı iş aksiyonlarına erişir; owner üzerinde deny/grant değişikliği yapılamaz. Yönetim yetkileri ayrı ve değiştirilemez.
4. Üye için explicit deny > explicit allow > atanmış rollerin birleşimi > default member policy. Yeni member varsayılanı boş: atanmış rol veya açık grant olmadan iş modülüne erişemez.
5. Her sorgu orgId ve memberId eşleşmesi ile; yanlış org'a ait role/grant hiçbir zaman etkili olmaz. Rol silinirse bağlı atamalar için UI önizleme ve açık onay; transaction + audit.

### 4.3 Shared API kontratı

```ts
// @mqdms/auth/permissions/server — yalnız server
getAuthContext(headers: Headers, organizationId?: string)
requireOrganization(headers: Headers, organizationId?: string)
hasPermission(context, resource, action): Promise<boolean>
requirePermission(context, resource, action): Promise<AuthContext>
listRoles(context)
createRole(context, input)
updateRole(context, roleId, input)
deleteRole(context, roleId)
assignMemberRoles(context, memberId, roleIds)
setMemberPermission(context, memberId, resource, action, effect)
getEffectivePermissions(context, memberId)
```

Context client'tan güvenilir kabul edilmez; sunucuda oluşturulur. Mutations actor identity, org membership, owner, hedef member/role scope ve input Zod validation kontrolü yapar. Member owner rolüne yükseltilemez; owner silinemez veya düşürülemez. Owner yönetim yetkileri role/grant ile değiştirilemez. Role create/update/delete, grants ve invite kabulü atomik/idempotent tasarlanır. Better Auth ham endpoint'leri ile policy bypass testi yapılır; gerekirse endpoint hook veya API kısıtlaması. UI gizleme sadece UX.

### 4.4 Factory role / permission seed (ilk organizasyon)

`packages/auth/src/permissions/seeds/factory.ts` typed rol şablonları, `seedFactoryRoles(tx, organizationId)` idempotent servis. Bootstrap sırasında her organizasyon için ayrı role kayıtları ve role-permission satırları oluşturulur; global rol paylaşımı yok. Owner sistem rolü seed fonksiyonel rolü değildir. Owner dışındaki kullanıcılar otomatik iş yetkisi almaz; davet sırasında owner uygun rolleri seçer. Seed edilen fonksiyonel roller owner tarafından düzenlenebilir; yeniden seed mevcut düzenlemeleri ezmez. `organization_role` için unique(org, slug), grant için unique(roleId, resource, action); seed sürümü/başarı bootstrap state ile kaydedilir.

**Permission katalogu (ilk release):** `fmea` mevcut create/read/update/save/submit/approve/reject/delete; `synoptic` read/update; `processFlow` ve `controlPlan` read/create/update/submit/approve/reject/delete; `ncr` read/create/update/close; `projects` read/create/update/delete; `items` read/create/update; `reports` read/export. Henüz uygulanmamış kaynaklar katalog/seed sözleşmesi olarak tanımlanır; route ve mutation geliştirildiğinde guard zorunlu. `reports:export` veri kapsamı kontrolü gerektirir. Aşağıdaki roller allow-only; tabloda olmayan yetki verilmez.

| Seed rol (slug) | Örnek yetkiler |
|---|---|
| Fabrika Müdürü (`plant-manager`) | Tüm iş kaynakları read; reports export; FMEA/processFlow/controlPlan approve/reject; NCR close; synoptic update |
| Proje Müdürü (`project-manager`) | projects read/create/update; items read; FMEA/processFlow/controlPlan read/create/update/submit; FMEA save; reports read |
| Proje Mühendisi (`project-engineer`) | projects/items read; FMEA read/create/update/save/submit; processFlow read/create/update/submit; controlPlan read; synoptic read |
| Kalite Müdürü (`quality-manager`) | projects/items read; FMEA/processFlow/controlPlan read/approve/reject; NCR read/create/update/close; reports read/export; synoptic read |
| Kalite Mühendisi (`quality-engineer`) | projects/items read; FMEA read/create/update/save/submit; processFlow read; controlPlan read/create/update/submit; NCR read/create/update; synoptic read; reports read |
| Üretim Sorumlusu (`production-supervisor`) | projects/items read; FMEA/processFlow/controlPlan read; synoptic read/update; NCR read/create/update; reports read |
| Üretim Operatörü (`production-operator`) | processFlow/controlPlan/synoptic read; NCR create; FMEA read |
| Bakım Sorumlusu (`maintenance-supervisor`) | items/processFlow/synoptic read; NCR read/create/update |
| Depo/Lojistik (`warehouse-logistics`) | items read/update; projects/processFlow/synoptic read; NCR create |
| Satın Alma (`purchasing`) | items/projects read; NCR read/create |
| Denetçi (`auditor`) | Tüm iş kaynakları read; reports export; hiçbir mutation |

**Ayrım:** Seed rollere `delete` verilmez; owner gerekiyorsa özel role veya member allow ile ekler. FMEA hazırlayan ve onaylayan ayrı roller; aynı kullanıcıya iki rol atanırsa kendi kaydını onaylamayı engelleyen workflow kuralı ayrıca uygulanır (permission tek başına yeterli değil). Owner dışında role/member/invitation/permission yönetimi hiçbir role verilmez. Örnek: kalite mühendisine FMEA delete member allow verilirse izinli; aynı grant deny olursa reddedilir; inherit olursa seed rolüne döner.

**Seed kabul testleri:** İlk bootstrap 11 fonksiyonel rol oluşturur; ikinci çağrı duplicate üretmez ve owner düzenlemelerini ezmez; iki org birbirinin rollerini göremez; member yetkisiz role atayamaz; seed katalog dışı action içeremez; tüm grant'ler typed katalog doğrulamasından geçer. Test fixture kullanıcıları production seed'de oluşturulmaz.

## 5. Auth ekranları ve akış

| Route | Yetki / davranış |
|---|---|
| `/login` | email/password, doğrulanmış email; güvenli next/returnTo |
| `/register` | 404 veya login redirect; API signup da kapalı |
| `/bootstrap-org` | sadece ilk kurulum, env enable + random key, boş kurulum kontrolü |
| `/dashboard` | session; org seçimi ve yetkili uygulama linki |
| `/profile` | profil/şifre/session yönetimi; mevcut settings/profile UI yeniden kullanılır |
| `/organization` | aktif üyelik; owner yönetim, member için salt okunur özet |
| `/organization/members` | owner |
| `/organization/roles` | owner, custom role CRUD + permission matrix |
| `/organization/permissions` | owner, üye bazlı allow/deny/inherit |
| `/organization/invitations` | owner |
| `/accept-invitation?id=...` | davet kabulü / davetli hesap oluşturma |
| `/forgot-password`, `/reset-password`, `/verify-email` | mevcut güvenli akışlar |

Eski `/settings/*` route'ları canonical yeni route'lara yönlendirilebilir. `/admin` platform paneli ve platform admin feature tamamen kaldırılır. Audit ve API key OAuth bağımsız; API key korunabilir, yalnız owner yönetir.

### Bootstrap

- Tek ekran: organization name, slug, owner name/email/password, bootstrap key. Public signup değildir. `ORG_BOOTSTRAP_ENABLED=false` varsayılan, `ORG_BOOTSTRAP_KEY` random >=32 karakter; rate limit, timing-safe kontrol, POST only. İlk kurulum state DB'de kilitli; mevcut organizasyon/başarılı bootstrap varsa reddet.
- Advisory lock + durable singleton bootstrap state; owner hesabı, organization, owner membership ve factory role seed atomik olmalı. Better Auth çağrıları kendi transaction'ını açıyorsa dış transaction tek başına atomiklik sağlamaz; desteklenen transaction veya idempotent state machine + recovery/compensation kullan. Şifre email'e gönderilmez. Email verify + login. Başarı sonrası flag kapat ve key'i kaldır.
- Platform admin plugin kaldırılır; eski `auth.api.createUser` çağrılarına bağımlı bootstrap/invitation provisioning yeniden yazılır. Pinned Better Auth 1.7.20'nin server-only internal adapter ve credential password hashing/account oluşturma sözleşmesi kaynak kodundan doğrulanır; supported internal provisioning yardımcı fonksiyonu kullanılır, public signup açılmaz, plaintext parola saklanmaz. Doğrudan tablo insert ile Better Auth credential formatı tahmin edilmez. Email doğrulama, login ve reset E2E test edilir.
- `user.role` platform yetki alanı, platform-only schema alanları ve admin plugin kaldırılır; core Better Auth alanları korunur. Owner yalnız `member.role=owner` üzerinden belirlenir. `allowUserToCreateOrganization=false` kalır; bootstrap server-only oluşturma yolu doğrulanır. Owner devri ve çoklu organizasyon provisioning bu sürümde kapsam dışı.

### Invitation

- Mevcut `invitation-registration.ts` ve `accept-invitation.tsx` reuse. Pending, expiry, org, normalized email, role yetkisi doğrulanır; kullanıcı email değiştiremez. Yeni kullanıcı ortak server-only credential provisioning helper; mevcut kullanıcı login + email match. Email doğrulama davet linki possession ile yapılacaksa token yeterli entropi ve tek kullanımlılık, race ve replay koruması şart; alternatif ayrı email verification.
- Better Auth invitation kabulü sonrası org membership ve custom role atamaları güvenli şekilde tamamlanır. `invitation_role` tablosu veya davet metadata'sı üzerinden role ID'leri server tarafından saklanır; client rol seçemez. Kabul sırasında roller hâlâ aynı org'a ait mi kontrol edilir. İptal/expired/replay, eşzamanlı kayıt, mevcut hesap, role silinmiş, email gönderimi başarısız test edilir.
- Davet kayıt başarısı login olmadan üyelik verildi anlamına gelmez; accept tamamlanana kadar app erişimi yok. Audit ve retry.

### Login / redirect

- `apps/auth/features/auth/login-form.tsx`: OAuth branch kaldır; ilk org'u körlemesine seçme. Tek üyelik varsa seç, birden fazla varsa picker, hiç yoksa org erişimi yok/davet bekliyor. Active org her işlemde doğrulanır.
- `lib/auth-navigation.ts`: relative path veya exact allowlist origin + path kabul eden ortak server/client safeReturnTo; URL credentials, protocol-relative, backslash, yanlış scheme/host ve encoded bypass reddedilir. Varsayılan `/dashboard`. Query/hash korunabilir; callbackURL ve password reset için güvenli ayrı doğrulama.
- `app.mqdms.com/fmea/123` -> session yok -> `auth.mqdms.com/login?returnTo=...` -> login -> aynı sayfa. Auth dashboard'dan app linki; app'ten profile/organization linki auth'a. Cross-origin navigation `window.location.assign` veya normal anchor; Next router internal path için.

## 6. OAuth ve platform yönetimi kaldırma dosya planı

- [ ] `packages/auth/src/permissions/platform.ts`, platform rol exportları, `apps/auth/features/admin/**`, `/bootstrap-superadmin`, eski bootstrap service/schema ve SUPERADMIN env değişkenleri kaldırılır veya org bootstrap olarak yeniden yazılır. `admin` plugin/client ve user platform role/ban/impersonation alanlarının kullanımını tarayıp yalnız plugin-specific alanları temizle. `roles.ts`/`statements.ts` yönetim rolleri owner/member; hooks owner atamasını engeller; mevcut role UI ve invite schema yeni fonksiyonel role ID'lerine uyarlanır. API key yönetimi owner-only. `rg -n -i 'superadmin|platformRoles|adminClient|bootstrap-superadmin|SUPERADMIN_'` ile kalan referansları doğrula.
- [ ] `packages/auth/src/server.ts`: oauthProvider, jwt, oauth options, disabledPaths token ve OAuth yorumlarını kaldır. organization/apiKey ve email hooks korunur; admin plugin ve platform role config kaldırılır. `expiresIn`, shared cookies, trusted origins ekle.
- [ ] `packages/auth/src/client.ts`: oauthProviderClient ve adminClient kaldır, canonical auth env kullan. `packages/auth/src/oauth.ts` kaldır; `permissions/publish.ts` ve export'unu kullanım taramasıyla kaldır.
- [ ] `packages/auth/package.json`: `@better-auth/oauth-provider` kaldır; Better Auth/API key sürümlerini tutarlı tut, pnpm lockfile güncelle.
- [ ] `apps/auth/app/oauth/**`, `apps/auth/app/admin/**`, `apps/auth/features/oauth/**`, `apps/auth/app/.well-known/oauth-authorization-server/**`, `openid-configuration/**` kaldır.
- [ ] Login page/form, auth utils, i18n, docs, env örnekleri, testler ve navigation'daki OAuth referanslarını kaldır. `rg -n -i 'oauth|oidc|jwks|pairwise|consent|OAUTH_'` ile takip; genel bağımlılıktaki unrelated OAuth referanslarını yanlışlıkla silme.
- [ ] `packages/db/src/schema/initial/oauth.ts` ve schema index export kaldır; JWT JWKS tabloları yalnız JWT için kullanılıyorsa kaldır. Better Auth core account tablosundaki standart alanları sırf adı token diye silme.
- [ ] `packages/env/src/server.ts`, client env, Docker/Compose/CI: OAuth env kaldır, auth URL ayrıştır. Server env modüler hale getir; app sadece gereken değişkenleri doğrulasın, worker ve migrate gereksiz auth/storage secrets istemesin.
- [ ] Mevcut debug DB/queue route'larını production'dan kaldır veya güvenli admin kontrolü; profile/organization özel API route'larını Server Actions'a taşı (upload presign/complete gerçek ihtiyaç varsa korunur).

## 7. apps/app — sıfırdan iş uygulaması

- [ ] `apps/app` Next.js App Router, workspace package name `@mqdms/app`, tsconfig, next.config, shared UI/i18n; auth app'i kopyalayıp auth ekranları çoğaltma.
- [ ] `(protected)/layout.tsx` shared requireSession + requireOrganization; doğru returnTo; dashboard, FMEA ve synoptic route'ları.
- [ ] Başka repo veya legacy kod taşıması yok. İlk commit app shell, dashboard, FMEA/sinoptik route placeholder ve erişim guard; gerçek iş modülleri yeni feature olarak geliştirilir. Placeholder, gerçek FMEA/sinoptik işlevi tamamlandı anlamına gelmez.
- [ ] Her domain entity orgId ile scoped; cross-org relation FK ve query filtreleri; server actions input orgId'ye güvenmez. Business DB şemaları mevcut auth tablolarıyla isim çakışmasına karşı incelenir.
- [ ] FMEA read/create/update/save/submit/approve/reject/delete aynı permission engine; synoptic için read/update. Menu visibility effective permissions; API/action enforcement ayrıca.

## 8. Temiz DB kurulumu (yedek yok)

- [ ] Eski mQDMS auth ve iş app container'larını durdur; deploy webhook'u geçici kapat. Kesin hedef DB ve volume adını doğrula. Coolify sistem DB/Redis ve o7n volume'lerine dokunma.
- [ ] Şema ve migration değişikliklerini tamamla. Local `APP_ENV=local` guard ile mevcut reset-migrations script'ini repo root'tan çalıştır; fresh initial migration üret (`packages/db` package scripts doğrulanarak). SQL + meta journal/snapshot birlikte commit edilir.
- [ ] Eski mQDMS DB/volume yalnız açıkça belirlenmiş hedef üzerinde silinir veya yeni boş DB adı/volume ile değiştirilir. Yeni DB yaratılır; eski kullanıcılar/org'lar/session'lar/grant'ler geri getirilmeyecek. Yeni secret ile eski cookie geçersiz. Redis gerekiyorsa yalnız mQDMS queue namespace temizlenir.
- [ ] Migration tek servis/job tarafından boş DB'ye uygulanır. `drizzle-kit migrate` exit 0; tablolar ve unique/check/FK test. Auth/app aynı anda migrate çalıştırmaz. DB role/password, DB URL ve Docker network gerçek değerleri uyumlu olmalı.
- [ ] Bootstrap, owner login, davet ve ilk iş modülü smoke test. Eski OAuth verileri korunmaz. DB reset işlemi bu planın parçası olarak henüz yapılmadı.

## 9. CI/CD ve Coolify

- [ ] `docker/app.Dockerfile` Next standalone build; mevcut auth Dockerfile pattern'ini uyarlayıp app package filter ve runtime server.js doğrula. `docker-compose.coolify.yml` auth stack için sadeleşir; app ayrı Coolify resource/compose, ortak private DB bağlantısı. Local ve prod compose dosyaları da güncellenir.
- [ ] Aynı VPS ise external private Docker network veya Coolify managed DB network; farklı VPS ise private network/TLS, firewall yalnız app sunucusu; DB internet public port açılmaz. Redis worker auth stack'te. App DB credentials gerektiği kadar; auth secret server-only.
- [ ] CI verify: pnpm frozen lockfile, typecheck, Biome format, lint, unit/integration test, iki Next build. PR preview varsa prod `.mqdms.com` cookie paylaşmayacak izolasyon (ayrı domain/DB/secret).
- [ ] CI build: GHCR `mqdms/auth`, `mqdms/app`, `mqdms/worker`, `mqdms/migrate`; immutable SHA tag, latest opsiyonel. Gerçek secrets Docker build args'a gönderilmez; mevcut workflow'daki secret fallback'leri kaldır, build placeholders/validation split veya BuildKit secret gerekiyorsa kullan. NEXT_PUBLIC_AUTH_URL ve app URL build-time doğru.
- [ ] CI deploy: iki Coolify webhook/resource; migration başarısı -> auth healthy -> app deploy. Deploy webhook kabulü tamamlanmış deploy değildir; health/status bekle ve başarısızsa app deploy'u durdur. Sadece main merge/push; deploy concurrency ile çakışma önle. Başlangıçta iki app aynı SHA deploy; ileride path filters, shared package değişince ikisini de deploy.
- [ ] Cloudflare Tunnel iki hostname'i doğru servis portuna bağlar; forwarded host/proto, HTTPS, secure cookie, cache bypass auth/session routes, redirect loops test. Wildcard trusted origin/cookie dışındaki tüm subdomain'ler güvenilir olmalı.

## 10. Uygulama sırası / Definition of Done

| Faz | İş | Çıkış kriteri |
|---|---|---|
| 1 | OAuth + platform temizliği, shared session, env | auth build, login, cookie domain, no OAuth routes |
| 2 | DB role/grant şema + shared services + factory seed | permission unit/integration, tenant isolation |
| 3 | Bootstrap + invitation + auth dashboard/profile/org UI | ilk owner, davet, custom role, deny/allow test |
| 4 | apps/app shell + yeni FMEA/sinoptik shell | app deep link login, FMEA/sinoptik guards |
| 5 | Migration reset + CI/Docker + Coolify | fresh migration, iki deploy, smoke test |

### Kabul testleri (zorunlu)

- [ ] Public register page ve raw signup API kapalı; OAuth consent/discovery/client endpoints yok.
- [ ] Bootstrap yanlış key/disabled/ikinci kez/eşzamanlı istek reddedilir; yarım kurulum recover edilir.
- [ ] Owner davet eder, yeni kullanıcı password belirler, email verify, accept; existing user aynı email ile accept; wrong email/expired/replay reddedilir.
- [ ] Login auth -> app deep link; auth profile ve app arasında yeniden giriş yok; logout her ikisinde geçersiz; expired/revoked cookie reddedilir.
- [ ] Owner custom role ekler, üye rolü değişir; member role/grant yönetemez. Member owner rolüne yükseltemez; raw Better Auth endpoint bypass yok.
- [ ] Role allow + member deny reddeder; member allow rol dışı aksiyon verir; inherit rol varsayılanına döner. Unknown resource/action fail closed; invalid effect fail closed.
- [ ] A org üyesi B org member/role/record ID ile read/update/delete yapamaz. Active org değişimi ve üyelik kaldırma sonrası sonraki istek doğru sonuç.
- [ ] FMEA delete yalnız yetkili, approval ayrı aksiyon; synoptic read/update ayrımı; Server Action doğrudan çağrıda da kontrol.
- [ ] Fresh DB migration, auth/app/worker images build, deploy order, runtime env, cloudflare HTTPS, CORS ve cookie flags. Email ve audit çalışır.

## 11. Sınırlamalar ve doğrulama

- Session süresi 7 gün önerisi korunur; owner-only, tek bootstrap, iki web deploy ve boş member varsayılanı kesin karardır.
- İnceleme belirtilen main commit'indeki seçili dosyalar ve repo ağacına dayanır; build, migration veya E2E çalıştırılmadı. Better Auth 1.7.20 provisioning/API davranışları implementasyon sırasında doğrulanacaktır. Bu dosya kod patch'i değildir.
- Fabrika seed rolleri örnek başlangıç şablonlarıdır; gerçek modüller geliştirilmeden bunlara karşılık gelen iş ekranları var sayılmaz.
