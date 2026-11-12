# mQDMS'i sunucuya deploy etme (Coolify)

Bu rehber, boş bir sunucudan `auth.mqdms.com` ve `app.mqdms.com` üzerinde
canlıya alınmış bir kuruluma götürür. Coolify ve Cloudflare Tunnel kullanılır.

Rehber, repodun zaten `main` branch'inde olduğunu ve CI'ın image'ları GitHub
Container Registry'ye yayımladığını varsayar. Hiçbir verinin **var olduğunu**
varsaymaz: veritabanı boş olarak kurulur ve ilk organizasyon elle bootstrap
edilir.

---

## Topoloji

İki web uygulaması tek bir Better Auth instance'ı paylaşır — tek veritabanı,
tek secret, tek oturum cookie'si. HTTP auth handler'ı yalnızca auth stack'te
bulunur; iş uygulaması oturumu doğrudan veritabanından okur.

```text
                        Cloudflare edge (TLS)
                                 │
                    ┌────────────┴────────────┐
             auth.mqdms.com            app.mqdms.com
                    │                           │
        ┌───────────┴───────────────────────────┴───────────┐
        │              mqdms-net  (external Docker network)  │
        │                                                   │
   ┌────┴─────┐   ┌──────────────┐   ┌────────────┐  ┌─────┴──────┐
   │ cloudflared│   │  auth stack  │   │ app stack  │  │  postgres  │
   │ (tunnel)  │──▶│  auth :3000  │   │ app :3000  │──│  redis     │
   └───────────┘   │  worker      │   └────────────┘  └────────────┘
                   │  migrate     │
                   └──────────────┘
```

`mqdms-net`, üç Coolify kaynağı arasındaki **tek** bağlantıdır. Veritabanı
hiçbir zaman internete açılmaz; origin portları da yayımlanmaz.

| Coolify kaynağı | Compose dosyası                      | Servisler                                |
| ---------------- | ------------------------------------- | ---------------------------------------- |
| auth stack       | `docker-compose.coolify.yml`          | postgres, redis, migrate, auth, worker  |
| app stack        | `docker-compose.coolify.app.yml`      | app                                      |
| tunnel           | `docker-compose.coolify.tunnel.yml`   | cloudflared                              |

Coolify her Docker Compose kaynağına kendi proje ağını verir; bu yüzden iki
kaynak varsayılan olarak birbirinin servis adlarını çözemez. Bu nedenle iki
stack de aynı **external** ağa (`mqdms-net`) bağlanır. Ağı host'ta bir kez
senin oluşturursun (Adım 1).

---

## Ön koşullar

| Gereksinim          | Not                                                                     |
| ------------------- | ----------------------------------------------------------------------- |
| Linux VPS           | Docker ve Docker Compose, Coolify tarafından kurulur.                 |
| Coolify             | O VPS'te kurulu, GitHub App bu repo için yüklenmiş olmalı.            |
| Alan adı            | Cloudflare'da `mqdms.com`, `auth` ve `app` alt alan adları boş.       |
| Cloudflare hesabı   | Zero Trust ücretsizdir ve tunnel için yeterlidir.                       |
| GitHub token'ı      | `read:packages` — Coolify'ın image'ları GHCR'dan çekmesi için.        |
| Resend hesabı       | İşlemsel e-posta (davet, doğrulama, parola sıfırlama).                 |
| S3/R2 bucket       | Profil görselleri. R2, Cloudflare'ın yanında rahat çalışır.            |

---

## Adım 1 — Host'u hazırlama

Sunucuya SSH ile bağlan ve paylaşımlı ağı oluştur:

```bash
docker network create mqdms-net
docker network ls | grep mqdms-net
```

Bu ağ ilk deploy'dan **önce** var olmalı. Compose dosyaları onu
`external: true` olarak tanımlar; ağ yoksa deploy şu hatayla hemen başarısız
olur:

```text
network mqdms-net declared as external, but could not be found
```

Host'ta başka hiçbir şeye gerek yok: Node.js yok, kaynak kopyası yok.
Deploy host'u yalnızca image çeker.

---

## Adım 2 — GitHub değişkenleri ve secret'ları

İki deploy aynı şekilde derlenir ama farklı public URL'ler kullanır;
`NEXT_PUBLIC_*` değerleri build sırasında client bundle'a işlenir. Bu
değerlerin hem **GitHub'da** (image'a gömülen) hem de **Coolify'da** (çalışan
container'ın bildirdiği) doğru olması gerekir.

### Değişkenler (Variables)

Settings → Secrets and variables → Actions → **Variables**:

```bash
gh variable set NEXT_PUBLIC_APP_URL          -b https://auth.mqdms.com
gh variable set NEXT_PUBLIC_AUTH_URL         -b https://auth.mqdms.com
gh variable set NEXT_PUBLIC_BUSINESS_APP_URL -b https://app.mqdms.com
gh variable set BETTER_AUTH_URL              -b https://auth.mqdms.com
gh variable set AUTH_TRUSTED_ORIGINS         -b "https://auth.mqdms.com,https://app.mqdms.com"
gh variable set AUTH_COOKIE_DOMAIN           -b ".mqdms.com"
```

Buradaki `NEXT_PUBLIC_APP_URL` **auth** origin'idir. Workflow, app image'ını
derlerken bunu `NEXT_PUBLIC_BUSINESS_APP_URL` ile ezer; böylece tek değişken
adı iki deploy'u da kapsar.

### Secret'lar

Settings → Secrets and variables → Actions → **Secrets**:

| Secret                         | Ne için            | Ne zaman                                              |
| ------------------------------ | ------------------ | ----------------------------------------------------- |
| `COOLIFY_AUTH_DEPLOY_WEBHOOK` | Adım 10            | Auth stack deploy tetikleyicisi                       |
| `COOLIFY_APP_DEPLOY_WEBHOOK`  | Adım 10            | App stack deploy tetikleyicisi                        |
| `COOLIFY_API_TOKEN`            | Adım 10            | Her iki webhook çağrısını doğrular                    |

```bash
gh secret set COOLIFY_AUTH_DEPLOY_WEBHOOK
gh secret set COOLIFY_APP_DEPLOY_WEBHOOK
gh secret set COOLIFY_API_TOKEN
```

### Uygulama secret'larını GitHub'a koyma

`BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` ve `STORAGE_*`
credential'ları **çalışma zamanı** değerleridir. Workflow bunları build'e
Docker build argümanı olarak geçiriyor ve build argümanları build cache'inin
içine gömülüyor — yani GitHub'da saklanan bir secret cache'den geri
kazanılabilir.

Build'in gerçek değerlere ihtiyacı yok: `next build` yalnızca ortamın bir
değere *sahip* olduğunu doğrular ve workflow, secret eksik olduğunda zaten
placeholder'a düşüyor. Gerçek değerleri GitHub'dan çıkar, Coolify'da tanımla
(Adım 5).

```bash
# Yalnızca zaten tanımlıysalar — kaldır:
gh secret delete BETTER_AUTH_SECRET
gh secret delete RESEND_API_KEY
gh secret delete RESEND_FROM_EMAIL
```

---

## Adım 3 — Cloudflare tunnel

Tunnel iki hostname'i de yayınlar. `mqdms-net` üzerinde bir container'dır;
servis URL'leri düz Docker servis adlarıdır — public port yok, IP yok.

1. Cloudflare paneli → **Zero Trust** → **Networks** → **Tunnels** →
   *Create a tunnel* → `cloudflared` → adını `mqdms` ver.
2. Kurulum hedefi olarak **Docker**'ı seç. Cloudflare tunnel token'ını içeren
   bir komut gösterir:

   ```text
   docker run cloudflare/cloudflared:latest tunnel --no-autoupdate run --token eyJhIjoi...
   ```

   `--token` sonrasındaki token'ı kopyala. Tunnel'ı **remotely managed**
   modunda bırak — ingress kuralları panelde durur, container'ın ihtiyacı
   yalnızca token'dır.
3. Hâlâ tunnel sihirbazındayken **public hostname**'leri ekle:

   | Alt alan adı       | Servis             |
   | ------------------ | ------------------ |
   | `auth.mqdms.com`   | `http://auth:3000` |
   | `app.mqdms.com`    | `http://app:3000`  |

   Cloudflare DNS kayıtlarını (tunnel'a CNAME) otomatik oluşturur. İki kayıt
   da **proxied** (turuncu bulut) olmalıdır.
4. Tunnel'ı şimdilik "connector bekleniyor" durumunda bırak — container
   Adım 7'de deploy edilir.

Servis URL'leri `mqdms-net` üzerindeki Docker DNS ile çözülür. Tunnel'ın bu
ağa bağlanması ve servis adlarının compose servis adlarıyla **birebir**
örtüşmesi bu yüzden gereklidir.

---

## Adım 4 — Coolify: registry credential'ları

Image'lar GHCR'da private olduğu için Coolify'ın bunları çekmek için
credential'a ihtiyacı var.

1. GitHub → Settings → Developer settings → Personal access tokens →
   **Fine-grained** (ya da `read:packages` scope'lu klasik token).
2. Coolify → **Registries** → *Add Registry*:
   - Name: `ghcr`
   - Type: `GitHub Container Registry` (ya da host `ghcr.io` olan `Custom`)
   - Username: GitHub kullanıc adın
   - Password: 1. adımdaki token

---

## Adım 5 — Coolify: auth stack

Bu kaynak veritabanına, queue broker'a, migration'lara ve auth uygulamasına
sahiptir.

### Kaynağı oluştur

Projects → *New Resource* → **Docker Compose**:

| Alan                    | Değer                           |
| ----------------------- | ------------------------------- |
| Repository              | `uzansadik/mqdms`               |
| Branch                  | `main`                          |
| Docker Compose Location | `docker-compose.coolify.yml`    |
| Docker Context          | `.`                             |

**Auto Deploy**'u **kapalı** bırak — deploy'ları CI tetikler (Adım 10), böylece
Coolify hiçbir zaman bayat bir `latest` çekmez.

### Ortam değişkenleri

Bunları kaynağın **Environment Variables** sekmesine ekle. Repoda `.env`
dosyası yok, dolayısıyla her değer buraya girilmelidir.

| Değişken                       | Değer                                                          | Zorunlu |
| ------------------------------ | -------------------------------------------------------------- | ------- |
| `POSTGRES_PASSWORD`            | ürettiğin güçlü bir parola                                      | evet    |
| `DATABASE_URL`                 | `postgresql://postgres:<POSTGRES_PASSWORD>@postgres:5432/mqdms` | evet    |
| `NEXT_PUBLIC_APP_URL`          | `https://auth.mqdms.com`                                       | evet    |
| `NEXT_PUBLIC_AUTH_URL`         | `https://auth.mqdms.com`                                       | evet    |
| `NEXT_PUBLIC_BUSINESS_APP_URL` | `https://app.mqdms.com`                                        | evet    |
| `BETTER_AUTH_URL`              | `https://auth.mqdms.com`                                       | evet    |
| `BETTER_AUTH_SECRET`           | `openssl rand -base64 32`                                      | evet    |
| `AUTH_TRUSTED_ORIGINS`         | `https://auth.mqdms.com,https://app.mqdms.com`                 | evet    |
| `AUTH_COOKIE_DOMAIN`           | `.mqdms.com`                                                   | evet    |
| `RESEND_API_KEY`               | `re_…`                                                         | evet    |
| `RESEND_FROM_EMAIL`            | Resend'de doğrulanmış bir gönderen                             | evet    |
| `STORAGE_BUCKET`               | `mqdms`                                                        | evet    |
| `STORAGE_REGION`               | `auto`                                                         | evet    |
| `STORAGE_ACCESS_KEY_ID`        | R2 access key id'n                                             | evet    |
| `STORAGE_SECRET_ACCESS_KEY`    | R2 secret access key'in                                        | evet    |
| `STORAGE_ENDPOINT`             | `https://<account>.r2.cloudflarestorage.com`                   | hayır   |
| `STORAGE_PUBLIC_URL`           | `https://cdn.mqdms.com`                                        | hayır   |
| `QUEUE_PREFIX`                 | `mqdms`                                                        | hayır   |
| `WORKER_QUEUES`                | `default,email`                                                | hayır   |
| `ORG_BOOTSTRAP_ENABLED`        | `false` (bkz. Adım 8)                                         | hayır   |
| `ORG_BOOTSTRAP_KEY`            | boş (bkz. Adım 8)                                              | hayır   |
| `APP_TAG`                      | `latest`                                                       | hayır   |

Bunlardan ikisi diğerlerinden daha önemli:

- **`BETTER_AUTH_SECRET`** auth stack ve app stack'te **birebir aynı** olmalı.
  Farklı secret farklı oturum demektir; kullanıcı iki alan adından birinde
  oturum açmış görünür ama oturumu taşınmaz.
- **`AUTH_COOKIE_DOMAIN`** her ikisinde de `.mqdms.com` olmalı. Cookie'nin
  `app.mqdms.com` tarafından okunabilmesini bu sağlar. Boş bırakılırsa
  cookie host'a özel yazılır ve iki deploy oturumu paylaşmaz.

### Deploy

**Deploy**'a bas. `migrate` servisi tek seferlik bir iştir: bekleyen Drizzle
migration'larını uygular ve çıkar. `auth` ve `worker`, onun başarıyla
bitmesini bekler.

`migrate` container'ının *exited* görünmesi beklenen son durumdur, hata değil.
Devam etmeden önce exit code'unun `0` olduğunu doğrula:

```bash
docker ps -a --filter name=migrate --format '{{.Names}} {{.Status}}'
```

---

## Adım 6 — Coolify: app stack

İş uygulaması. Aynı repo, farklı compose dosyası.

Projects → *New Resource* → **Docker Compose**:

| Alan                    | Değer                             |
| ----------------------- | --------------------------------- |
| Repository              | `uzansadik/mqdms`                 |
| Branch                  | `main`                            |
| Docker Compose Location | `docker-compose.coolify.app.yml`  |
| Docker Context          | `.`                               |

### Ortam değişkenleri

| Değişken                       | Değer                                                          | Zorunlu |
| ------------------------------ | -------------------------------------------------------------- | ------- |
| `DATABASE_URL`                 | **auth stack'tekiyle aynı değer**                               | evet    |
| `REDIS_URL`                    | `redis://redis:6379`                                            | evet    |
| `NEXT_PUBLIC_BUSINESS_APP_URL` | `https://app.mqdms.com`                                        | evet    |
| `NEXT_PUBLIC_AUTH_URL`         | `https://auth.mqdms.com`                                       | evet    |
| `BETTER_AUTH_URL`              | `https://auth.mqdms.com`                                       | evet    |
| `BETTER_AUTH_SECRET`           | **auth stack'tekiyle aynı değer**                               | evet    |
| `AUTH_TRUSTED_ORIGINS`         | `https://auth.mqdms.com,https://app.mqdms.com`                 | evet    |
| `AUTH_COOKIE_DOMAIN`           | `.mqdms.com`                                                   | evet    |
| `RESEND_API_KEY`               | `re_…`                                                         | evet    |
| `RESEND_FROM_EMAIL`            | Resend'de doğrulanmış bir gönderen                             | evet    |
| `STORAGE_BUCKET`               | `mqdms`                                                        | evet    |
| `STORAGE_REGION`               | `auto`                                                         | evet    |
| `STORAGE_ACCESS_KEY_ID`        | R2 access key id'n                                             | evet    |
| `STORAGE_SECRET_ACCESS_KEY`    | R2 secret access key'in                                        | evet    |
| `STORAGE_ENDPOINT`             | `https://<account>.r2.cloudflarestorage.com`                   | hayır   |
| `STORAGE_PUBLIC_URL`           | `https://cdn.mqdms.com`                                        | hayır   |
| `QUEUE_PREFIX`                 | `mqdms`                                                        | hayır   |
| `APP_TAG`                      | `latest`                                                       | hayır   |

Bu kaynak için iki not:

- Burada `NEXT_PUBLIC_APP_URL` **gerekmez**. App compose dosyası onu
  `NEXT_PUBLIC_BUSINESS_APP_URL`'den türetir; yani app'in kendi origin'i her
  zaman iş uygulaması URL'idir.
- `RESEND_*` ve `STORAGE_*` compose dosyası tarafından zorunlu işaretlidir,
  ama iş uygulaması henüz e-posta göndermiyor ve dosya yüklemiyor. İki stack
  asla ayrışmasın diye auth stack'teki değerlerin aynısını kullan.

### Deploy

App stack'i auth stack'ten **sonra** deploy et; böylece migration'lar
veritabanına uygulanmış olur.

---

## Adım 7 — Coolify: tunnel

Projects → *New Resource* → **Docker Compose**:

| Alan                    | Değer                                 |
| ----------------------- | ------------------------------------- |
| Repository              | `uzansadik/mqdms`                     |
| Branch                  | `main`                                |
| Docker Compose Location | `docker-compose.coolify.tunnel.yml`   |
| Docker Context          | `.`                                   |

Ortam değişkenleri:

| Değişken                  | Değer                        | Zorunlu |
| ------------------------- | ---------------------------- | ------- |
| `CLOUDFLARE_TUNNEL_TOKEN` | Adım 3'teki token           | evet    |

Deploy et. Container kendini Cloudflare'a kaydeder ve tunnel "connector bekleniyor"
durumundan bağlı duruma geçer. Logda aranacak satır `Registered tunnel
connection`.

---

## Adım 8 — İlk organizasyonu oluşturma

Public kayıt kapalı olduğu için ilk hesap bootstrap akışıyla oluşturulur.

1. **Auth stack** üzerinde `ORG_BOOTSTRAP_ENABLED=true` ve
   `ORG_BOOTSTRAP_KEY=<openssl rand -base64 32>` ayarla, sonra redeploy et.
2. <https://auth.mqdms.com/bootstrap-org> adresini aç ve anahtarı; organizasyon
   adı, slug ve owner bilgileriyle birlikte gönder.
3. Owner e-posta adresini doğrula ve giriş yap.
4. `ORG_BOOTSTRAP_ENABLED=false` yap, `ORG_BOOTSTRAP_KEY`'i temizle ve auth
   stack'i redeploy et.

Bootstrap; owner hesabını, organizasyonu, owner üyeliğini ve fabrika rollerini
(fabrika müdürü, kalite mühendisi, …) tek seferde oluşturur. PostgreSQL
advisory lock ve kalıcı bir state satırı ile korunur: ikinci deneme reddedilir
ve yarım kalan kurulum veri kopyalamak yerine kaldığı yerden devam eder.

---

## Adım 9 — Deploy'u doğrula

Bu listeyi sırayla tara. Tunnel'dan sonraki adımlar ancak öncekiler geçtiyse
anlamlıdır.

### Container'lar tek ağı paylaşıyor

```bash
docker network inspect mqdms-net --format '{{range .Containers}}{{.Name}} {{end}}'
```

Üç stack'in hepsi görünmeli: `postgres`, `redis`, `auth`, `worker`, `migrate`
(auth stack), `app` (app stack) ve `cloudflared` (tunnel).

### App container'ı veritabanını çözebiliyor ve erişebiliyor

```bash
docker exec <app-container> node -e "require('dns').promises.lookup('postgres').then(console.log)"
docker exec <app-container> node -e "
const {Client}=require('pg');
const c=new Client({connectionString:process.env.DATABASE_URL});
c.connect().then(()=>c.query('select count(*) from \"user\"'))
 .then(r=>{console.log('db ok, users:',r.rows[0].count);c.end()})
 .catch(e=>{console.error('db fail:',e.message);process.exit(1)});
"
```

Arama başarısız olursa app container'ı `mqdms-net` üzerinde değildir —
compose dosyasındaki `networks:` bloğunun deploy'da kaldığını doğrula.

### Hostname'ler yanıt veriyor

```bash
curl -sS -o /dev/null -w 'auth: %{http_code}\n' https://auth.mqdms.com/
curl -sS -o /dev/null -w 'app:  %{http_code}\n' https://app.mqdms.com/
```

`auth` 200 döner. `app` 307 döner — oturum yokken auth alan adındaki login
sayfasına yönlendirir; bu istenen davranıştır.

### Oturum paylaşılıyor

<https://auth.mqdms.com/login> adresini aç, giriş yap, sonra **tekrar giriş
yapmadan** <https://app.mqdms.com> adresini aç. App seni login sayfasına
göndermemeli.

Gönderiyorsa cookie paylaşılmıyor. Sırayla kontrol et:

1. `AUTH_COOKIE_DOMAIN` **her iki** stack'te `.mqdms.com` mu?
2. `BETTER_AUTH_SECRET` **her iki** stack'te bayt bayt aynı mı?
3. Tarayıcı, `auth.mqdms.com` için `__Secure-mqdms.session_token` adlı ve
   `Domain=.mqdms.com` olan bir cookie gösteriyor mu?

### E-posta akışı çalışıyor

Organizasyon sayfasından bir kullanıcıyı davet et. Davet e-postasının ulaşması,
Resend'in, queue'nun, worker'ın ve veritabanının birlikte çalıştığını kanıtlar.

---

## Adım 10 — CI deploy'unu bağla

CI image'ları yayımlar, sonra deploy'ları tetikler. Sıra önemlidir: auth
deploy tetiklenemezse app deploy'u atlanır; böylece app, migration'ı
uygulanmamış bir veritabanına karşı başlamaz.

Her iki web kaynağı için Coolify'da **Advanced → Deploy Webhook**'u aç ve bir
tane üret. İki URL'yi secret olarak kaydet:

```bash
gh secret set COOLIFY_AUTH_DEPLOY_WEBHOOK   # auth stack webhook URL'si
gh secret set COOLIFY_APP_DEPLOY_WEBHOOK    # app stack webhook URL'si
```

Webhook çağrısı bir Coolify API token'ıyla doğrulanır. **Settings → API
Tokens** altından `deploy` izniyle bir tane oluştur ve kaydet:

```bash
gh secret set COOLIFY_API_TOKEN
```

Bu üç secret olmadan image'lar yine yayımlanır ama hiçbir şey deploy edilmez.
CI logu bunu açıkça söyler:

```text
::warning::auth deploy webhook tanımlı değil, atlanıyor.
```

Secret'lar yerine girdikten sonra `main`'e merge et ve koşuyu izle:

```bash
gh run list --workflow CI --limit 5
gh run watch
```

---

## Rollback

Her build `latest` yanında `sha-<short-sha>` etiketi yayımlar. Bir stack'i
eski bir etikete sabitlemek için o stack'te `APP_TAG` ayarla ve redeploy et:

```text
APP_TAG=sha-1bc322d
```

Auth stack ve app stack'i **aynı** etikete sabitle. Karışık bir çift, eski
image'ın anlamadığı bir şema üretebilir.

Rollback veritabanını geri almaz. Migration'lar ileri yönlüdür — aşağıdaki
[Rollback ve veritabanı](#rollback-ve-veritabanı) bölümüne bak.

---

## Sorun giderme

| Belirti                                                  | Sebep                                                           | Çözüm                                                                                          |
| -------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `network mqdms-net declared as external, but could not be found` | Paylaşımlı ağ host'ta yok                             | `docker network create mqdms-net` (Adım 1)                                                     |
| `migrate` sıfırdan farklı kodla çıkıyor                   | Bekleyen migration başarısız; genelde bayat image veya erişilemeyen DB | Container log'unu oku; `DATABASE_URL` ile `POSTGRES_PASSWORD`'ün eşleştiğini doğrula |
| `auth`, `migrate`'i sonsuza dek bekliyor                    | Migrate işi hiç tamamlanmadı                                  | `docker ps -a --filter name=migrate` ve exit code'unu kontrol et                               |
| App container log'u `ENOTFOUND postgres`                   | App stack `mqdms-net` üzerinde değil                           | `docker-compose.coolify.app.yml` içinde `networks:` bloğunun olduğunu doğrula                   |
| App container log'u `password authentication failed`       | `DATABASE_URL` ile `POSTGRES_PASSWORD` uyuşmuyor                | `DATABASE_URL` içindeki parola, auth stack'teki `POSTGRES_PASSWORD` ile aynı olmalı            |
| Tunnel log'u `Failed to dial` diyor                        | Tunnel `auth`/`app` adlarını çözemiyor                          | Tunnel `mqdms-net` üzerinde olmalı; servis adları `auth` ve `app`                              |
| Cloudflare'dan 502 geliyor                                 | Hedef container çalışmıyor veya sağlıklı değil                  | `docker ps` kontrol et; healthcheck `http://127.0.0.1:3000/` adresine gidiyor                    |
| Auth'da girişliyim, app'te çıkışlıyım                     | Stack'ler arasında cookie alan adı veya secret uyuşmazlığı      | Her iki stack'te `AUTH_COOKIE_DOMAIN` ve `BETTER_AUTH_SECRET` değerlerini karşılaştır           |
| Login sayfasına geri dönüp duruyor                         | `AUTH_TRUSTED_ORIGINS`, yönlendirilen origin'i içermiyor        | Hem `https://auth.mqdms.com` hem `https://app.mqdms.com` listelenmeli                           |
| Davet e-postası hiç gelmiyor                               | Worker düştü ya da Resend göndereni reddetti                    | Worker log'larını ve `RESEND_FROM_EMAIL`'in doğrulanmış bir Resend göndereni olduğunu kontrol et |
| Cloudflare challenge/error sayfası gösteriyor              | Bir WAF kuralı veya "Under Attack Mode" isteği yakalıyor        | `/api/auth/*` yolunu challenge dışında bırak; aşağıdaki notu incele                            |

### Kontrol edilmesi gereken Cloudflare ayarları

- **Under Attack Mode** ve JS challenge, uygulamanın sunucu tarafı
  isteklerini ve Better Auth API'sini bozar. `/api/auth/*` yolunu challenge
  dışında bırak ya da iki hostname için challenge'i kapat.
- **Caching**: hiçbir cache kuralı `/api/auth/*` ya da kimlik doğrulama
  gerektiren bir sayfayı kapsamamalı.
- **SSL/TLS modu**: `Full (strict)` uygundur — tunnel TLS'i sonlandırır ve
  container'lara düz HTTP konuşur, dolayısıyla kurulacak origin sertifikası
  yoktur.

---

## Rollback ve veritabanı

Drizzle migration'ları ileri yönlüdür. *Image'ları* eski bir etikete geri
almak, yeni bir migration'ın uyguladığı şema değişikliklerini geri almaz.

Bir migration geri alınacaksa, telafi eden migration'ı elle yaz ve
image'ları geri almadan önce uygula. Üretim veritabanında `db:reset:hard`
çalıştırma — şemayı ve migration klasörünü siler ve tam olarak bu yüzden
`APP_ENV=local` guard'ı ile korunur.

---

## Secret rotasyonu

| Secret                | Rotasyonun etkisi                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`  | **Tüm oturumları geçersiz kılar.** Kullanıcılar her iki alan adında da oturum açmak zorunda kalır. İki stack'i **aynı anda** değiştir. |
| `AUTH_COOKIE_DOMAIN`  | İki stack'i aynı anda değiştir; tarayıcılar eski cookie'yi süresi dolana kadar tutar.                     |
| `POSTGRES_PASSWORD`   | `POSTGRES_PASSWORD`'ü **ve** `DATABASE_URL` içindeki parolayı birlikte, iki stack'te de değiştir, sonra redeploy et. |
| `RESEND_API_KEY`      | İki stack'te de değiştir.                                                                                   |

`BETTER_AUTH_SECRET`'ü değiştirdikten sonra iki stack'i de redeploy et. İkisi
redeploy olana kadar iki alan adı "kim oturum açmış" konusunda anlaşamaz.

---

## Referans

| Dosya                             | Amaç                                                |
| --------------------------------- | --------------------------------------------------- |
| `docker-compose.coolify.yml`     | Auth stack: postgres, redis, migrate, auth, worker  |
| `docker-compose.coolify.app.yml` | App stack                                           |
| `docker-compose.coolify.tunnel.yml` | Cloudflare Tunnel                                |
| `.github/workflows/ci.yml`       | Build, yayımlama ve deploy tetikleme               |

README mimariyi, izin modelini ve ortam değişkenlerini daha ayrıntılı anlatır;
bu rehber yalnızca sunucuya çıkma kısmını kapsar.
