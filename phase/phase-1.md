# mQDMS – Phase 1: Customer, Plant & Project Management

## 1. Objective

mQDMS, üretim yapan fabrikalar için geliştirilen multi-tenant bir Quality Management SaaS uygulamasıdır.

Bu fazın amacı kalite yönetim sisteminin temel organizasyonel yapısını oluşturmaktır.

Bu fazda geliştirilecek modüller:

- Customer Management
- Customer Site Management
- Customer Contact Management
- Plant Management
- Project Management
- Project Team Management

Bu faz tamamlandığında bir organizasyon müşteri oluşturabilmeli, müşterinin tesislerini ve temsilcilerini tanımlayabilmeli, kendi üretim tesislerini yönetebilmeli ve müşteriye bağlı üretim projesi oluşturabilmelidir.

## 2. Existing Architecture

Repository: `uzansadik/mqdms`

Mevcut mimariyi koru:

- Turborepo + pnpm monorepo
- Next.js
- TypeScript
- PostgreSQL
- Drizzle ORM
- Better Auth
- Organization-based multi-tenancy
- Merkezi Role/Permission sistemi
- Feature-based application architecture
- React Hook Form + Zod
- `@mqdms/ui` component library
- Mevcut Türkçe ve İngilizce i18n altyapısı

Uygulamalar:

- `apps/auth`: Kullanıcı, organizasyon, rol ve izin yönetimi.
- `apps/app`: Kalite yönetim uygulaması.

Shared packages:

- `packages/db`: Database schema ve database client.
- `packages/auth`: Authentication, authorization ve permission catalog.
- `packages/ui`: Shared UI components.
- `packages/i18n`: Çeviriler.

Authentication mimarisini değiştirme. Yeni OAuth provider, ayrı authentication sistemi veya ayrı database oluşturma.

## 3. Architecture Principles

### 3.1 Multi-tenancy

Bütün iş verileri bir organizasyona ait olmalıdır.

- Her iş tablosunda `organizationId` bulunmalı.
- `organizationId` mevcut Better Auth organizasyon kaydına bağlanmalı.
- Better Auth organization ve member ID'leri mevcut şemada `text` tipindedir.
- Yeni business entity primary key'leri UUID olabilir.
- Organizasyon bilgisi client request body üzerinden kabul edilmemeli.
- Active organization, server-side authentication context üzerinden alınmalı.
- Her database query ve mutation organizasyon kapsamında çalışmalı.
- Organizasyonlar arası ilişki kurulması database constraint ve service validation ile engellenmeli.

Composite foreign key kullanılan tablolarda gerekli composite unique constraint'leri tanımla.

### 3.2 Feature-based Architecture

Yeni modülleri `apps/app/features/` altında geliştir.

Önerilen yapı:

- `features/customers/`
- `features/plants/`
- `features/projects/`

Her feature ihtiyaçlarına göre aşağıdaki dosyaları içerebilir:

- `server.ts`
- `service.ts`
- `repository.ts`
- `schema.ts`
- `types.ts`
- `components/`

Application işlemleri için Server Actions kullan.

Gereksiz REST API endpoint'leri oluşturma.

Business rules UI component'leri içerisinde bulunmamalıdır.

### 3.3 Database

Database schema dosyalarını `packages/db/src/schema/` altında domain bazlı organize et.

Önerilen domain'ler:

- `crm`: Customer, Customer Site ve Customer Contact
- `organization`: Plant
- `pms`: Project ve Project Team

Mevcut auth, permission ve audit tablolarını taşıma veya yeniden oluşturma.

Yeni schema'ları mevcut schema export sistemine dahil et.

## 4. Customer Management

### 4.1 Customer

Customer bir müşteri firmasını temsil eder.

Örnek: Alstom, Karsan, MAN.

Database alanları:

| Field | Type | Requirement |
|---|---|---|
| id | UUID | Primary key |
| organizationId | Text | Required |
| code | Text | Required |
| name | Text | Required |
| legalName | Text | Optional |
| description | Text | Optional |
| website | Text | Optional |
| countryCode | Text | Optional |
| preferredLanguage | Text | Optional |
| status | Enum | Required |
| createdAt | Timestamp | Required |
| updatedAt | Timestamp | Required |
| createdById | Text | Optional |
| archivedAt | Timestamp | Optional |

Business rules:

- Customer code organizasyon içerisinde unique olmalı.
- Customer code trim ve normalize edilmeli.
- Aynı müşteri adı farklı organizasyonlarda kullanılabilir.
- Bir müşteri birden fazla projeye sahip olabilir.
- Bir müşteri birden fazla site'a sahip olabilir.
- Müşteri oluştururken site veya contact zorunlu olmamalı.
- Status: ACTIVE veya INACTIVE.
- Archive işlemi desteklenmeli.
- Aktif projeleri bulunan müşterinin arşivlenmesi engellenmeli veya açık bir iş kuralıyla yönetilmeli.
- İlişkili müşteri kayıtları fiziksel olarak silinmemeli.

### 4.2 Customer Site

Customer Site müşterinin fabrikasını, üretim tesisini veya teslimat lokasyonunu temsil eder.

Örnek:

Customer: Alstom

Customer Sites:

- Alstom Salzgitter
- Alstom Hennigsdorf

Fields:

- id
- organizationId
- customerId
- code
- name
- countryCode
- city
- address
- postalCode
- description
- status
- createdAt
- updatedAt
- archivedAt

Business rules:

- Bir müşteri birden fazla site'a sahip olabilir.
- Site code aynı müşteri içerisinde unique olmalı.
- Site ve customer aynı organizasyona ait olmalı.
- Customer Site, organizasyonun kendi Plant kaydıyla karıştırılmamalı.
- Projelerde Customer Site seçimi opsiyonel olmalı.

### 4.3 Customer Contact

Müşteri temsilcilerini yönet.

Fields:

- id
- organizationId
- customerId
- customerSiteId (optional)
- firstName
- lastName
- jobTitle
- department
- email
- phone
- contactType
- notes
- status
- createdAt
- updatedAt
- archivedAt

Contact Type examples:

- QUALITY
- PROJECT
- PURCHASING
- ENGINEERING
- LOGISTICS
- OTHER

Customer Contact, mQDMS authentication user değildir.

Customer Contact oluşturulduğunda otomatik kullanıcı veya organizasyon üyeliği oluşturma.

Contact bir müşteri geneline veya belirli Customer Site'a bağlı olabilir.

## 5. Plant Management

Plant, organizasyonun kendi üretim tesisini temsil eder.

Örnek:

Organization: Alpin Kimya

Plants:

- Ovaakça
- Teknosab

Fields:

- id
- organizationId
- code
- name
- description
- countryCode
- city
- address
- postalCode
- timezone
- status
- createdAt
- updatedAt
- archivedAt

Business rules:

- Bir organizasyon birden fazla Plant oluşturabilmeli.
- Plant code organizasyon içerisinde unique olmalı.
- Plant yalnızca ait olduğu organizasyon tarafından kullanılabilmeli.
- Plant, Customer Site'tan bağımsız bir entity olmalı.
- Plant timezone opsiyonel olarak tanımlanabilmeli.
- İlişkili aktif projeler bulunan Plant'ın arşivlenmesi kontrol edilmeli.

Gelecekte aynı organizasyon içerisinde farklı fabrikaların farklı üretim Process Flow'ları olabileceği dikkate alınmalıdır.

## 6. Project Management

Project, müşteriye ait üretim veya ürün geliştirme projesini temsil eder.

Örnek:

- Customer: Alstom
- Customer Site: Salzgitter
- Project: S-Bahn Rheinland Driver Desk
- Manufacturing Plant: Ovaakça

### 6.1 Project Fields

| Field | Requirement |
|---|---|
| id | UUID |
| organizationId | Required |
| customerId | Required |
| customerSiteId | Optional |
| code | Required |
| name | Required |
| customerProjectCode | Optional |
| description | Optional |
| status | Required |
| projectManagerMemberId | Optional |
| startDate | Optional |
| targetCompletionDate | Optional |
| actualCompletionDate | Optional |
| createdById | Optional |
| createdAt | Required |
| updatedAt | Required |
| archivedAt | Optional |

Project statuses:

- DRAFT
- ACTIVE
- ON_HOLD
- COMPLETED
- CANCELLED

### 6.2 Project Plants

Projelerin gelecekte birden fazla üretim tesisinde yürütülebilmesini destekle.

`project_plants` ilişki tablosu oluştur:

- id
- organizationId
- projectId
- plantId
- isPrimary
- createdAt

Business rules:

- Bir proje bir veya birden fazla Plant ile ilişkilendirilebilir.
- DRAFT projede Plant tanımlanması zorunlu değildir.
- ACTIVE proje için en az bir aktif Plant bulunmalıdır.
- Bir proje en fazla bir primary Plant'a sahip olabilir.
- Aynı Plant aynı projeye iki kez eklenemez.
- Proje ve Plant aynı organizasyona ait olmalıdır.

### 6.3 Project Business Rules

- Project code organizasyon içerisinde unique olmalı.
- Project code müşterinin proje kodundan bağımsız olmalı.
- Customer zorunlu olmalı.
- Customer Site seçildiyse seçilen Customer'a ait olmalı.
- Project Manager mevcut organizasyonun bir üyesi olmalı.
- Bir müşteri birden fazla Project'e sahip olabilir.
- Tarih alanları opsiyonel olmalı.
- Başlangıç ve hedef bitiş tarihleri mantıksal olarak doğrulanmalı.
- Project archive ve restore desteklenmeli.
- İlişkili kalite kayıtları bulunan Project fiziksel olarak silinmemeli.

Project status ile archive durumunu ayrı kavramlar olarak yönet.

COMPLETED proje arşivlenmeden de görüntülenebilmelidir.

## 7. Project Team

Organizasyondaki mevcut üyeler projelere atanabilmeli.

Database entity: `project_members`

Fields:

- id
- organizationId
- projectId
- memberId
- projectRole
- responsibility
- joinedAt
- removedAt

Project Role examples:

- PROJECT_MANAGER
- PROJECT_ENGINEER
- QUALITY_MANAGER
- QUALITY_ENGINEER
- PROCESS_ENGINEER
- PRODUCTION_RESPONSIBLE
- OTHER

Business rules:

- Bir organizasyon üyesi birden fazla projede bulunabilir.
- Bir proje birden fazla üyeye sahip olabilir.
- Aynı aktif üye aynı projeye tekrar eklenemez.
- Project Role, merkezi authentication permission rolünden bağımsızdır.
- Bir üyeyi Project Manager yapmak otomatik olarak yeni auth permission vermemelidir.
- Üye organizasyondan ayrılırsa geçmiş proje ilişkileri ve audit kayıtları korunmalıdır.

## 8. Role & Permission

Mevcut `packages/auth` permission altyapısını kullan.

Mevcut `projects` resource'unu koru ve ihtiyaç duyulan yeni action'ları ekle.

Yeni kaynaklar:

### customers

- read
- create
- update
- archive
- restore

### plants

- read
- create
- update
- archive
- restore

### projects

- read
- create
- update
- archive
- restore
- manageMembers

Customer Site ve Contact işlemleri customers permission kapsamından yönetilebilir.

Project Plants işlemleri projects:update kapsamında yönetilebilir.

Mevcut projects:delete action'ını kontrolsüz hard delete işlemi için kullanma.

Permission catalog, role seed ve ilgili permission UI'ları birbiriyle uyumlu olmalıdır.

Önemli:

Mevcut factory role seed mekanizması var olan rolleri yeniden seed ederken değiştirmiyor. Yeni permission'ların mevcut production organizasyonlarına nasıl atanacağını ayrıca planla.

Kullanıcının mevcut custom role ve member permission ayarlarını overwrite etme.

Sidebar permission kontrolü tek başına yeterli değildir.

Her Server Action ve protected page gerekli permission'ı server-side doğrulamalıdır.

## 9. UI / UX

Mevcut `@mqdms/ui` component'lerini kullan.

### 9.1 Navigation

Sidebar'a aşağıdaki bölümleri ekle:

Management

- Customers
- Plants
- Projects

Menü görünürlüğü mevcut permission sistemi üzerinden yönetilmeli.

### 9.2 Customer Screens

- Customer list
- Create customer
- Edit customer
- Customer detail
- Archived customers

Customer detail tabs:

- Overview
- Sites
- Contacts
- Projects

Customer list columns:

- Code
- Customer Name
- Country
- Site Count
- Active Project Count
- Status
- Actions

Search, pagination ve status filtering destekle.

### 9.3 Plant Screens

- Plant list
- Create plant
- Edit plant
- Plant detail
- Archived plants

Plant detail içerisinde bağlı projeler gösterilebilmeli.

### 9.4 Project Screens

- Project list
- Create project
- Edit project
- Project detail
- Archived projects

Project create form:

1. Customer seçimi
2. Customer Site seçimi
3. Project code
4. Project name
5. Customer project code
6. Manufacturing Plant seçimi
7. Project Manager seçimi
8. Project status ve tarihler

Customer Site seçimi Customer'a göre filtrelenmeli.

Project detail tabs:

- Overview
- Team
- Plants

Items, BOM, Process Flow, PFMEA ve Control Plan sekmelerini bu fazda işlevsel olarak geliştirme.

Bunlar gelecekte ilgili modüller tamamlandığında eklenecektir.

### 9.5 Form Standards

- React Hook Form + Zod
- Server-side validation
- Field-level validation messages
- Loading states
- Empty states
- Error states
- Confirmation dialogs for archive
- Success/error toast notifications
- Turkish and English translations

## 10. Audit Logging

Mevcut audit altyapısını kullan.

Aşağıdaki işlemleri kayıt altına al:

- Customer created/updated/archived/restored
- Customer Site created/updated/archived
- Customer Contact created/updated/archived
- Plant created/updated/archived/restored
- Project created/updated/archived/restored
- Project status changed
- Project member assigned/removed
- Project Plant assigned/removed

Audit kayıtları şu bilgileri içermeli:

- organizationId
- actorId
- action
- targetType
- targetId
- timestamp
- Gerekli değişiklik bilgileri

Gereksiz kişisel verileri ve hassas bilgileri audit metadata içerisinde saklama.

## 11. Future Architecture Compatibility

Bu fazı geliştirirken aşağıdaki kesinleşmiş gelecek mimarisi dikkate alınmalıdır.

Ancak ilgili modüller henüz implement edilmemelidir.

### Item Management

- Items organizasyon seviyesinde ortak kütüphanede bulunacak.
- Şirket içi ERP kodu ile müşteri parça kodu ayrı tutulacak.
- Item, customer item ve revision kavramları ayrılacak.
- Items birden fazla projede kullanılabilecek.

### BOM Management

- Multi-level BOM desteklenecek.
- Satılan ürünün altında BOM oluşturulabilecek.
- Her FRP için ayrı BOM oluşturulması zorunlu olmayacak.
- Dinamo ERP ve Excel import desteklenecek.

### Process Management

- Master Process Library bulunacak.
- Generic Process Variant → Specialized Variant → Project Process Step türetme modeli kullanılacak.
- OP10, OP20, OP30 seviyesine Process Step denilecek.
- Diyagramlar Flow olarak adlandırılacak.
- FlowNode ve FlowEdge ayrı kavramlar olacak.
- Process Work Elements ayrı bir yapı olacak.
- Bir Process Flow birden fazla ürün kapsayabilecek.
- Bir proje ürünü, tesis kapsamında tek aktif ana Process Flow'a sahip olacak.
- Process Flow'lar diğer Flow'ları referans alabilecek.
- Inputs/Outputs ve Process State opsiyonel olacak.

### Quality Engineering

- AIAG–VDA PFMEA
- Control Plan
- Action Management
- NCR
- 8D
- REX / Lessons Learned

Bütün bu modüller ileride Customer, Project, Plant ve Item altyapısını kullanacaktır.

## 12. Implementation Order

1. Mevcut repository, auth context ve permission sistemini incele.
2. Database domain yapılarını belirle.
3. Customer, Customer Site ve Customer Contact schema'larını oluştur.
4. Plant schema'sını oluştur.
5. Project, Project Plant ve Project Member schema'larını oluştur.
6. Foreign key, unique constraint ve index'leri doğrula.
7. Additive database migration hazırla.
8. Permission catalog ve rol şablonlarını genişlet.
9. Customer feature ve sayfalarını tamamla.
10. Plant feature ve sayfalarını tamamla.
11. Project feature ve sayfalarını tamamla.
12. Sidebar ve i18n entegrasyonunu tamamla.
13. Audit, validation ve security testlerini tamamla.
14. TypeScript, Biome ve build kontrollerini çalıştır.

## 13. Acceptance Criteria

Phase 1 tamamlandığında aşağıdaki senaryo uçtan uca çalışmalıdır:

1. Kullanıcı mevcut mQDMS hesabıyla giriş yapar.
2. Alpin Kimya organizasyonuna erişir.
3. Alstom müşterisini oluşturur.
4. Alstom'a bir Customer Site ekler.
5. Müşterinin proje ve kalite temsilcilerini oluşturur.
6. Ovaakça ve Teknosab Plant kayıtlarını oluşturur.
7. SBR Driver Desk projesini oluşturur.
8. Customer ve Customer Site eşleştirmesini yapar.
9. Ovaakça'yı projenin primary Plant'ı olarak tanımlar.
10. Proje mühendisi ve kalite mühendisini proje ekibine ekler.
11. Projeyi ACTIVE durumuna geçirir.
12. Customer detay ekranından projeyi görüntüler.
13. Plant detay ekranından projeyi görüntüler.
14. Yetkisiz kullanıcı mutation işlemi yapamaz.
15. Başka organizasyondaki Customer, Plant veya Member ID'si kullanılarak ilişki kurulamaz.
16. Archive ve restore işlemleri çalışır.
17. Audit kayıtları oluşturulur.
18. Mevcut auth uygulaması ve permission sistemi çalışmaya devam eder.

## 14. Restrictions

- Bu fazda Item, BOM, Process Flow, PFMEA ve Control Plan implement etme.
- Authentication mimarisini değiştirme.
- Yeni superadmin mekanizması oluşturma.
- Mevcut production veritabanını resetleme.
- Mevcut migration geçmişini silme.
- Manuel veya otomatik production deployment yapma.
- Kullanıcı talebi olmadan doğrudan main branch'e merge etme.
- İş verilerinde organizasyon izolasyonunu ihlal eden sorgular oluşturma.
- Yeni dependency eklemeden önce mevcut monorepo paketlerini kontrol et.
- Mevcut çalışan özellikleri bozan refactoring yapma.

Implementation başlamadan önce önerilen database ilişkilerini, değiştirilecek dosyaları ve mevcut permission sistemine yapılacak eklemeleri özetleyen bir plan sun.

Plan onaylandıktan sonra implementation'a geç.

Phase 1 tamamlandıktan sonra sonraki faza kendiliğinden geçme.