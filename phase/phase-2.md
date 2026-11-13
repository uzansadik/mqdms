# mQDMS – Phase 2: Item & BOM Management

## 1. Objective

Phase 2'nin amacı mQDMS içerisinde organizasyon bazlı ürün kütüphanesi, müşteri ürün kodu eşleştirmesi, ürün revizyon yönetimi, çok seviyeli BOM ve proje ürünleri altyapısını oluşturmaktır.

Bu faz, Phase 1 – Customer, Plant & Project Management üzerine geliştirilecektir.

mQDMS bir ERP değildir. Ürün ve BOM verilerini kalite mühendisliği süreçlerinde kullanmak için yönetir.

İlk pilot organizasyon Alpin Kimya'dır. Alpin Kimya mevcutta Dinamo ERP kullanmaktadır. Ürün kartları, şirket içi ürün kodları, müşteri parça kodları ve çok seviyeli BOM kayıtları ERP içerisinde bulunmaktadır.

Sistem bu bilgileri tekrar manuel oluşturmayı zorunlu kılmamalıdır.

Geliştirilecek modüller:

- Item Group Management
- Item Management
- Item Revision Management
- Customer Item Reference Management
- BOM Management
- BOM Revision Management
- Project Item Management
- Excel / CSV Import
- Product Structure Analysis

## 2. Existing Architecture

Repository: `uzansadik/mqdms`

Mevcut mimariyi koru:

- Turborepo + pnpm
- Next.js
- TypeScript
- PostgreSQL
- Drizzle ORM
- Better Auth
- Organization-based multi-tenancy
- Merkezi Role/Permission sistemi
- Feature-based architecture
- React Hook Form + Zod
- Mevcut `@mqdms/ui` ve i18n altyapısı

Uygulamalar:

- `apps/auth`: Authentication, organization, user, role ve permission yönetimi.
- `apps/app`: Quality Management Application.

Bu fazda authentication mimarisini değiştirme.

Implementation başlamadan önce Phase 1'in mevcut repository içerisinde gerçekten tamamlanıp tamamlanmadığını kontrol et. Mevcut Customer, Plant ve Project schema ve servislerini kullan. Aynı entity'leri yeniden oluşturma.

## 3. Architecture Principles

### 3.1 Item Ownership

Item'lar bir projeye değil, organizasyona aittir.

Örnek:

Organization: Alpin Kimya

Items:

- Reçine A
- Cam Elyaf B
- Metal Braket C
- FRP-001
- Driver Desk Assembly

Aynı Item birden fazla müşteri projesinde kullanılabilmelidir.

Bir Item başka projeye eklendiğinde yeni bir Item oluşturulmamalıdır. Mevcut Item'a ilişki kurulmalıdır.

### 3.2 Separation of Concepts

Aşağıdaki kavramları birbirinden ayır:

1. Item: Şirketin ortak ürün kartı.
2. Item Revision: Ürünün belirli teknik sürümü.
3. Customer Item: Müşterinin ürün tanımı ve parça kodu.
4. BOM: Bir ürünün bileşen yapısı.
5. BOM Revision: Bileşen yapısının belirli sürümü.
6. Project Item: Ürünün belirli bir müşteri projesindeki kullanımı.
7. ERP Reference: Ürünün harici ERP sistemindeki referansı.

Internal Item Code, Customer Part Number, Item Revision ve BOM Revision birbirinin yerine kullanılmamalıdır.

### 3.3 Multi-tenancy

Bütün iş verileri organizasyon kapsamında yönetilmelidir.

- Business entity primary key'leri UUID olabilir.
- `organizationId` mevcut Better Auth organization ID tipiyle uyumlu `text` olmalıdır.
- Her sorgu ve mutation active organization kapsamında çalışmalıdır.
- Client tarafından gönderilen organizationId'ye güvenilmemelidir.
- İlişkili entity'lerin aynı organizasyona ait olduğu hem service hem database seviyesinde doğrulanmalıdır.
- Composite foreign key kullanıldığında gerekli composite unique constraint'ler tanımlanmalıdır.

## 4. Item Group Management

Item Group, organizasyonun ürün ve malzeme sınıflandırma kütüphanesidir.

Sabit ve değiştirilemez bir enum yerine organizasyon tarafından yönetilebilen hiyerarşik bir yapı oluştur.

### 4.1 Database Entity

`item_groups`

Fields:

- id
- organizationId
- parentId
- code
- name
- description
- sortOrder
- status
- createdAt
- updatedAt
- archivedAt

### 4.2 Example Hierarchy

Organizasyon aşağıdaki gibi bir sınıflandırma oluşturabilmelidir:

- RAW_MATERIAL
  - CHEMICAL
    - RESIN
    - GELCOAT
    - HARDENER
    - ADHESIVE
  - REINFORCEMENT
    - GLASS_FIBER
    - CARBON_FIBER
- METAL
  - BRACKET
  - SHEET_METAL
  - WELDED_PART
  - MACHINED_PART
- STANDARD_COMPONENT
  - BOLT
  - NUT
  - HINGE
  - LOCK
- FRP
- ASSEMBLY
- CONSUMABLE

Bu örnek gruplar bütün organizasyonlara zorunlu olarak oluşturulmamalıdır. Başlangıç şablonu olarak sunulabilir.

### 4.3 Business Rules

- Group code organizasyon kapsamında unique olmalıdır.
- Parent Group aynı organizasyona ait olmalıdır.
- Bir grup kendi alt grubunun parent'ı olamaz.
- Döngüsel grup ilişkileri engellenmelidir.
- Alt grupları veya aktif Item'ları bulunan grubun arşivlenmesi kontrollü olmalıdır.
- Item Group ileride Process Applicability Rules tarafından kullanılacaktır.

Örnek gelecek kuralı:

CHEMICAL + PURCHASED → GKK Kimyasal önerisi.

Bu fazda Process Applicability Rule motorunu implement etme.

## 5. Item Management

Item, organizasyonun şirket içi ürün veya malzeme kartıdır.

Örnek:

- Internal Code: 30.0001234
- Name: DRIVER DESK RH
- Item Group: ASSEMBLY
- Item Type: FINISHED_GOOD
- Supply Type: MANUFACTURED

### 5.1 Database Entity

`items`

| Field | Requirement |
|---|---|
| id | UUID |
| organizationId | Required |
| code | Required |
| name | Required |
| description | Optional |
| itemGroupId | Optional |
| itemType | Required |
| supplyType | Optional |
| unitOfMeasure | Required |
| status | Required |
| createdById | Optional |
| createdAt | Required |
| updatedAt | Required |
| archivedAt | Optional |

Item Type examples:

- FINISHED_GOOD
- SEMI_FINISHED
- RAW_MATERIAL
- COMPONENT
- CONSUMABLE
- OTHER

Supply Type examples:

- MANUFACTURED
- PURCHASED
- OUTSOURCED
- MIXED
- UNKNOWN

Item Type ve Supply Type birbirinden bağımsız olmalıdır.

Örneğin:

- FRP parça, SEMI_FINISHED ve MANUFACTURED olabilir.
- Metal braket, COMPONENT ve PURCHASED olabilir.
- Metal braket başka bir tesiste COMPONENT ve MANUFACTURED olabilir.

Item üzerindeki supplyType varsayılan tedarik şeklidir. Gelecekte proje veya Plant kapsamında override edilebilmelidir.

Item Group, Item Type ve Supply Type aynı kavram değildir.

### 5.2 Unit of Measure

Miktar birimleri yönetilebilir ve tutarlı olmalıdır.

Örnek:

- PCS
- KG
- G
- M
- MM
- M2
- L

ERP'den gelen birim kodlarının mQDMS birimlerine eşleştirilmesini destekle.

Miktar hesabında floating point yerine uygun PostgreSQL numeric/decimal tipi kullan.

Birim dönüşümlerini doğrulanmış dönüşüm tanımları olmadan otomatik yapma.

### 5.3 Business Rules

- Internal Item Code organizasyon içerisinde unique olmalıdır.
- Kodlar metin olarak saklanmalıdır.
- Başındaki sıfırlar, noktalar ve tireler korunmalıdır.
- Aynı ürün farklı projelerde yeniden oluşturulmamalıdır.
- Item'ın BOM sahibi olması zorunlu değildir.
- Item'ın müşteri parça koduna sahip olması zorunlu değildir.
- Item Group eksikse taslak ürün oluşturulabilir ancak kullanıcıya eksik sınıflandırma gösterilmelidir.
- İlişkili kayıtları bulunan Item fiziksel olarak silinmemelidir.
- Archive ve Restore desteklenmelidir.

Bir Item, satılan ürün olabileceği gibi üretimde kullanılan bir alt bileşen de olabilir.

## 6. ERP References

mQDMS, Dinamo ERP'ye bağımlı tasarlanmamalıdır.

Dinamo Alpin Kimya için kullanılan ERP sistemidir. Diğer organizasyonlar başka ERP sistemleri kullanabilir veya hiçbir ERP kullanmayabilir.

### 6.1 Proposed Database Entity

`item_external_references`

Fields:

- id
- organizationId
- itemId
- sourceSystem
- sourceInstanceKey
- externalId
- externalCode
- lastImportedAt
- createdAt
- updatedAt

Örnek:

- sourceSystem: DINAMO
- sourceInstanceKey: ALPIN-DINAMO
- externalCode: 30.0001234

Business rules:

- Item'ın UUID değeri ERP kodu olmamalıdır.
- ERP kodu değişirse Item ilişkileri bozulmamalıdır.
- Bir Item birden fazla harici sistem referansına sahip olabilir.
- Aynı source instance içerisindeki aynı external identity birden fazla Item'a bağlanmamalıdır.
- ERP referansları organizasyonlar arasında paylaşılmamalıdır.
- Harici sistemin değişmez ID'si bulunuyorsa öncelikle bu ID kullanılmalıdır.
- Değişmez ERP ID'si bulunmuyorsa kod üzerinden eşleştirme yapılmalı, kod değişiklikleri kullanıcı onayıyla yönetilmelidir.

Bu fazda Dinamo API entegrasyonu oluşturma.

ERP bilgileri başlangıçta Excel veya CSV üzerinden aktarılacaktır.

## 7. Item Revision Management

Ürün kartı ile ürünün teknik revizyonu ayrı olmalıdır.

### 7.1 Database Entity

`item_revisions`

Fields:

- id
- organizationId
- itemId
- revision
- description
- changeReason
- status
- sourceReference
- effectiveFrom
- createdById
- createdAt
- updatedAt
- releasedAt
- releasedById
- supersedesRevisionId

Revision statuses:

- DRAFT
- RELEASED
- SUPERSEDED

### 7.2 Business Rules

- Revision değeri aynı Item içerisinde unique olmalıdır.
- Revision değeri text olarak saklanmalıdır. Sayısal artış zorunlu değildir.
- DRAFT revision düzenlenebilir.
- RELEASED revision teknik içerik açısından immutable olmalıdır.
- Yeni teknik değişiklik için yeni revision oluşturulmalıdır.
- Önceki revision silinmemelidir.
- Bir Item kartı revizyon bilgisi olmadan başlangıçta oluşturulabilir.
- Ancak yayınlanmış teknik yapılarda kullanılan ürün revizyonu veya doğrulanmış teknik tanım açıkça belirlenmelidir.

ERP'de revizyon bilgisi bulunmuyorsa sistem gerçek olmayan bir revizyon numarası üretip bunu müşteri tarafından onaylanmış gibi göstermemelidir.

Item revizyonu ile müşteri revizyonu arasında zorunlu birebir eşitlik bulunmamalıdır.

## 8. Customer Item Reference Management

Şirket içi ürün kodu ve müşteri parça kodu bağımsız yönetilmelidir.

### 8.1 Database Entity

`customer_items`

Fields:

- id
- organizationId
- customerId
- itemId
- customerPartNumber
- customerPartName
- description
- status
- createdAt
- updatedAt
- archivedAt

### 8.2 Customer Item Revisions

`customer_item_revisions`

Fields:

- id
- organizationId
- customerItemId
- customerRevision
- internalItemRevisionId
- drawingReference
- drawingRevision
- description
- status
- effectiveFrom
- createdAt
- updatedAt

Internal Item Revision eşleştirmesi taslakta opsiyonel olabilir.

### 8.3 Business Rules

- Bir Item birden fazla müşteri parça numarasına sahip olabilir.
- Aynı müşteri parça numarası farklı müşterilerde kullanılabilir.
- Customer Part Number, müşteri kapsamında unique olarak yönetilmelidir.
- Müşteri aynı kodu farklı tesis veya katalog kapsamında tekrar kullanıyorsa açık bir kapsam tanımıyla desteklenmelidir.
- Customer ve Item aynı organizasyona ait olmalıdır.
- Customer Item Revision ilgili internal Item'ın revision kaydına bağlanmalıdır.
- Yanlış Item'a ait revision eşleştirmesi engellenmelidir.
- Müşteri teknik resim revizyonu, müşteri ürün revizyonu ve iç ürün revizyonu gerektiğinde ayrı saklanmalıdır.

### 8.4 Example

Internal Item:

30.0001234 – DRIVER DESK RH

Customer:

Alstom

Customer Part Number:

DTRF-100123

Customer Revision:

C

Internal Item Revision:

03

BOM Revision:

05

Bu kodların tümü örnektir.

İleride müşteri doküman çıktılarında müşteri parça numarası, iç raporlarda ise ERP kodu kullanılabilecektir.

## 9. BOM Management

BOM, bir ürünün üretiminde veya montajında kullanılan bileşen yapısını temsil eder.

### 9.1 Core Requirement

Multi-level BOM desteklenmelidir.

Bir BOM'un sahibi bir Item'dır.

Bir BOM satırında başka bir Item bulunabilir. Bu Item kendi BOM'una sahip olabilir veya olmayabilir.

Her FRP için ayrı BOM oluşturulması zorunlu değildir.

Örnek:

Driver Desk Assembly

- FRP-001
  - Reçine A
  - Cam Elyaf B
- FRP-002
- Bracket Assembly
  - Braket 1
  - Braket 2
- Menteşe
- Yapıştırıcı

FRP-002'nin alt BOM'u bulunmayabilir.

Sistem bu durumda ürün ağacını oluşturmayı engellememelidir.

### 9.2 BOM Header

`boms`

Fields:

- id
- organizationId
- itemId
- code
- name
- description
- bomType
- status
- createdAt
- updatedAt
- archivedAt

BOM Type examples:

- MANUFACTURING
- ENGINEERING
- OTHER

Bir Item birden fazla BOM tanımına sahip olabilir.

Ancak ilk sürümde bir kullanım kapsamı için geçerli ana BOM seçimi açık olmalıdır. Birden fazla alternatif BOM bulunuyorsa sistem bunlardan hangisinin kullanılacağını tahmin etmemelidir.

### 9.3 BOM Revision

`bom_revisions`

Fields:

- id
- organizationId
- bomId
- parentItemRevisionId
- revision
- description
- changeReason
- status
- effectiveFrom
- sourceSystem
- sourceRevision
- createdById
- createdAt
- updatedAt
- releasedAt
- releasedById
- supersedesRevisionId

Statuses:

- DRAFT
- IN_REVIEW
- RELEASED
- SUPERSEDED

Business rules:

- BOM revision ve Item revision birbirinden bağımsızdır.
- BOM revision ilgili Item'ın teknik revizyonuyla ilişkilendirilebilir.
- Aynı BOM altında revision değeri unique olmalıdır.
- RELEASED BOM içeriği doğrudan değiştirilemez.
- Yeni değişiklik DRAFT revision üzerinde yapılmalıdır.
- ERP'den yeni veri gelmesi önceki yayınlanmış BOM'u değiştirmemelidir.

### 9.4 BOM Lines

`bom_lines`

Fields:

- id
- organizationId
- bomRevisionId
- childItemId
- childItemRevisionId
- childBomRevisionId
- lineNumber
- quantity
- unitOfMeasure
- description
- referenceDesignation
- sortOrder
- createdAt
- updatedAt

Optional fields:

- joiningMethod
- notes
- positionReference

Örnek Joining Method:

- BONDING
- BOLTING
- WELDING
- RIVETING
- OTHER

Bu alanlar ileride Process Step önerileri için kullanılabilir.

### 9.5 Multi-level BOM Rules

- Aynı Item birden fazla BOM içerisinde kullanılabilir.
- Aynı Item bir BOM içerisinde farklı pozisyonlarda birden fazla kez bulunabilir.
- Bu nedenle sadece childItemId üzerinden unique constraint oluşturma.
- BOM line numarası veya stabil occurrence kimliği üzerinden satırları ayırt et.
- Child Item farklı bir BOM'un sahibi olabilir.
- Child BOM Revision alanı opsiyonel olmalıdır.
- Child BOM Revision tanımlanmışsa ilgili child Item'a ait BOM olması zorunludur.
- Released BOM içerisindeki alt BOM referansları belirli revision'a bağlanmalıdır.
- Yayınlanmış BOM görüntülenirken alt BOM'un en son revision'ı otomatik kullanılmamalıdır.
- Bir Item kendisini doğrudan veya dolaylı olarak bileşen olarak kullanamaz.
- Döngüsel BOM ilişkileri engellenmelidir.
- Quantity sıfırdan büyük olmalıdır.
- Quantity ve unit ilişkisi doğrulanmalıdır.
- BOM ağacını sınırsız derinlik varsayımıyla UI üzerinde kontrolsüz render etme. Lazy loading veya uygun ağaç görüntüleme kullan.

### 9.6 BOM Explosion

Çok seviyeli BOM'un bütün alt bileşenlerini çözümleyebilen bir servis oluştur.

İki görünüm destekle:

1. Hierarchical BOM: Parent-child ürün ağacı.
2. Flattened BOM: Bütün alt bileşenlerin toplulaştırılmış listesi.

Örnek:

Driver Desk içerisinde:

- FRP-001 → 5 kg Reçine A
- FRP-002 → 7 kg Reçine A

Flattened BOM:

- Reçine A → 12 kg

Miktar hesaplamasında parent quantity değerlerini ve seviyeleri dikkate al.

Aynı Item farklı revision veya farklı birim ile kullanılıyorsa doğrulanmadan tek satırda birleştirme.

Ara mamul ile onun altındaki hammaddelerin aynı toplamda çift sayılmaması için exploded BOM görünümünün kapsamı açıkça belirtilmelidir.

Alt BOM bulunmadığında veya revision belirlenmediğinde ilgili dalı unresolved olarak göster. Sistem eksik veriyi tahmin etmemelidir.

## 10. Project Item Management

Project Item, organizasyonun ortak Item kaydının müşteri projesindeki kullanımını temsil eder.

### 10.1 Database Entity

`project_items`

Fields:

- id
- organizationId
- projectId
- itemId
- itemRevisionId
- customerItemId
- customerItemRevisionId
- bomRevisionId
- itemRole
- supplyTypeOverride
- description
- status
- createdAt
- updatedAt
- archivedAt

Item Role examples:

- DELIVERABLE
- COMPONENT
- RAW_MATERIAL
- AUXILIARY

### 10.2 Business Rules

- Bir Item birden fazla projeye bağlanabilir.
- Projeye Item eklemek yeni Item kartı oluşturmamalıdır.
- Satılan ürün DELIVERABLE olarak işaretlenebilmelidir.
- DELIVERABLE olması BOM zorunluluğu oluşturmamalıdır.
- Proje BOM üzerinden alt bileşenleri görüntüleyebilmelidir.
- Alt bileşenlerin tamamı zorunlu olarak manuel Project Item kaydı oluşturularak yönetilmemelidir.
- Kalite çalışması yapılacak alt bileşenler gerektiğinde Project Item olarak seçilebilmelidir.
- Customer Item seçildiyse projenin müşterisiyle uyumlu olmalıdır.
- Item Revision ilgili Item'a ait olmalıdır.
- BOM Revision ilgili Item'ın BOM'una ait olmalıdır.
- Customer Item Revision, Customer Item ve seçilen teknik tanımla uyumlu olmalıdır.
- Aynı aktif Item'ın projeye gereksiz tekrar eklenmesi engellenmelidir.
- Aynı ürünün birden fazla teknik revision'ı gerektiğinde açık bir geçerlilik kapsamıyla yönetilebilmelidir.

### 10.3 Plant Compatibility

Phase 1'deki Project Plant yapısını kullan.

İleride aynı Project Item için farklı Plant'larda farklı üretim rotaları tanımlanabilecektir.

Bu fazda Process Flow ilişkisini implement etme.

Ancak model aşağıdaki gelecek kuralını engellememelidir:

Bir Project Item'ın belirli bir üretim tesisi kapsamında yalnızca bir aktif ana Process Flow'u olabilir.

### 10.4 Bulk Operations

Kullanıcı:

- Organizasyonun Item kütüphanesinden çoklu Item seçebilmeli.
- Seçilen Item'ları bir projeye toplu ekleyebilmeli.
- Bir Deliverable BOM'unu açabilmeli.
- BOM içerisindeki FRP, metal veya diğer alt bileşenleri toplu seçebilmeli.
- Daha sonra kalite çalışması yapmak için bu bileşenleri Project Item kapsamına alabilmeli.

Örnek:

50 FRP seç → Projeye ekle.

Bu özellik ileride 50 FRP'yi tek ortak Process Flow'a bağlamanın temelini oluşturacaktır.

## 11. Excel / CSV Import

Bu fazın en önemli kullanıcı özelliklerinden biridir.

Alpin Kimya mevcut ürün bilgilerini ve BOM'larını Dinamo ERP'de tutmaktadır. mQDMS kullanıcıya bu verileri tekrar elle girdirmemelidir.

### 11.1 Import Types

Aşağıdaki import işlemlerini destekle:

- Item Import
- Item Group Mapping
- Customer Item Reference Import
- Multi-level BOM Import

### 11.2 Import Workflow

1. Kullanıcı Excel veya CSV dosyası yükler.
2. Dosya ve kolonlar okunur.
3. Kullanıcı kolon eşleştirmesini yapar.
4. Dosyadaki veriler doğrulanır.
5. Eklenecek, güncellenecek ve hatalı satırlar önizlenir.
6. Kullanıcı çakışmaları çözer.
7. Kullanıcı import işlemini onaylar.
8. Veriler kontrollü transaction içerisinde kaydedilir.
9. Import sonuç raporu oluşturulur.

Import işlemi önizleme ve onay olmadan mevcut verileri değiştirmemelidir.

### 11.3 Item Import Fields

Örnek kolonlar:

- Internal Item Code
- Item Name
- Item Group
- Item Type
- Supply Type
- Unit
- Revision
- ERP Reference

### 11.4 Customer Item Import Fields

Örnek kolonlar:

- Internal Item Code
- Customer Code
- Customer Part Number
- Customer Part Name
- Customer Revision
- Internal Revision

### 11.5 BOM Import Fields

Örnek parent-child format:

- Parent Item Code
- Child Item Code
- Quantity
- Unit
- Line Number
- BOM Revision
- Parent Item Revision
- Child Item Revision

Çok seviyeli BOM için hierarchy level, parent-child veya path bazlı kaynak formatları değerlendirilebilir.

Dinamo'nun gerçek Excel export kolonları henüz incelenmediği için bunları Dinamo'nun kesin formatı olarak kabul etme.

İlk aşamada genel bir mQDMS import şablonu ve kolon eşleştirme ekranı geliştir.

### 11.6 Validation

- Eksik zorunlu kolonlar tespit edilmeli.
- Ürün kodları text olarak işlenmeli.
- Başındaki sıfırlar korunmalı.
- Kodlardaki nokta ve tireler kaybolmamalı.
- Sayısal kolonlarda locale farklılıkları doğrulanmalı.
- Bilinmeyen Item Group ve Unit değerleri gösterilmeli.
- Var olmayan Parent veya Child Item tespit edilmeli.
- Aynı Item'ın tekrar oluşturulması engellenmeli.
- Döngüsel BOM kontrolü yapılmalı.
- Geçersiz miktarlar reddedilmeli.
- Başka organizasyona ait kayıtlar eşleştirilmemeli.
- Mevcut yayınlanmış BOM doğrudan değiştirilmemeli.
- Excel formülleri çalıştırılmamalı.
- Upload boyutu ve satır limitleri uygulanmalı.

Aynı dosya tekrar import edildiğinde gereksiz duplicate kayıt veya yeni BOM revision oluşmamalıdır.

### 11.7 Import Tracking

Önerilen entity'ler:

- `import_jobs`
- `import_job_errors`

Import Job içerisinde:

- organizationId
- importType
- sourceSystem
- fileName
- fileHash
- status
- totalRows
- createdCount
- updatedCount
- skippedCount
- errorCount
- createdById
- createdAt
- completedAt

Import history kullanıcı tarafından görüntülenebilmelidir.

Büyük import işlemleri gerekiyorsa mevcut queue/worker altyapısını değerlendir. Yeni queue sistemi oluşturma.

## 12. BOM Revision Comparison

BOM revision'ları karşılaştırılabilmelidir.

Örnek:

BOM REV.01 → BOM REV.02

- Yeni yapıştırıcı eklendi.
- Metal Braket 3 kaldırıldı.
- Reçine A miktarı 5 kg'dan 6 kg'a değişti.
- FRP-001 revision değişti.

Değişiklik tipleri:

- ITEM_ADDED
- ITEM_REMOVED
- QUANTITY_CHANGED
- UNIT_CHANGED
- ITEM_REVISION_CHANGED
- CHILD_BOM_REVISION_CHANGED
- POSITION_CHANGED

Karşılaştırmada stabil BOM line identity veya güvenilir satır eşleştirmesi kullanılmalıdır.

Aynı Item'ın birden fazla pozisyonda bulunabileceği unutulmamalıdır.

Bu fazda BOM değişikliklerini görüntüle ve kaydet.

Process Flow, PFMEA ve Control Plan üzerinde otomatik değişiklik veya aksiyon oluşturma. İleride bu değişiklik kayıtları kalite etki değerlendirme sisteminin girdisi olacaktır.

## 13. Product Structure Analysis

Kullanıcı bir Project Deliverable'ın ürün ağacını açtığında sistem aşağıdaki bilgileri gösterebilmelidir:

- Toplam benzersiz Item sayısı
- FRP ürünleri
- Metal parçalar
- Kimyasallar
- Elyaf malzemeleri
- Standart elemanlar
- Üretilen parçalar
- Satın alınan parçalar
- Tedarik şekli bilinmeyen parçalar
- Sınıflandırılmamış Item'lar
- Alt BOM'u bulunan ürünler
- Eksik veya çözümlenmemiş BOM referansları

Aynı reçinenin 50 farklı FRP altında kullanılması halinde benzersiz Item sayısında bir kez sayılmalıdır.

Ancak kullanım sayısı ve BOM occurrence bilgileri ayrıca gösterilebilmelidir.

Bu analiz ileride aşağıdaki özelliklerin veri temelini oluşturacaktır:

- GKK Kimyasal önerisi
- GKK Metal önerisi
- Eksik Process Step tespiti
- Ürün ailesi Process Flow önerisi
- BOM değişikliğinin PFMEA etkisi
- REX yatay yayılımı

Bu fazda söz konusu kalite öneri motorlarını implement etme.

## 14. UI / UX

Mevcut `@mqdms/ui` component'lerini kullan.

### 14.1 Navigation

Management:

- Customers
- Plants
- Projects

Product Management:

- Items
- Item Groups
- BOMs
- Imports

Navigation mevcut permission sistemine göre filtrelenmelidir.

### 14.2 Item Screens

- Item List
- Create Item
- Edit Item
- Item Detail
- Archived Items

Item List Columns:

- Internal Code
- Name
- Item Group
- Item Type
- Supply Type
- Unit
- Customer References
- Current Revision
- Status

Item Detail Tabs:

- Overview
- Revisions
- Customer References
- BOMs
- Used In
- Projects

Used In sekmesi Item'ın hangi BOM'larda doğrudan veya dolaylı olarak kullanıldığını göstermelidir.

### 14.3 BOM Screens

- BOM List
- Create BOM
- BOM Detail
- BOM Revision History
- BOM Revision Comparison
- BOM Tree Editor

BOM Tree Editor:

- Expand / Collapse
- Add Existing Item
- Remove Line
- Edit Quantity
- Change Unit
- Select Child BOM Revision
- Search Item
- Hierarchical / Flattened view

Yeni bir alt Item eklemek gerektiğinde organizasyon Item kütüphanesinden seçim yapılabilmelidir.

Aynı ürün tekrar oluşturulmamalıdır.

### 14.4 Project Detail

Phase 1 Project Detail ekranına şu sekmeleri ekle:

- Items
- Product Structure
- BOMs

Kullanıcı:

- Deliverable ekleyebilmeli.
- Customer Item eşleştirebilmeli.
- Item Revision seçebilmeli.
- BOM Revision seçebilmeli.
- Alt bileşenleri görüntüleyebilmeli.
- 50 FRP'yi filtreleyip toplu seçebilmelidir.

Henüz Process Flow, PFMEA veya Control Plan sekmelerini implement etme.

### 14.5 Import Screen

- File Upload
- Column Mapping
- Validation Preview
- Conflict Resolution
- Import Confirmation
- Import Result
- Import History

Mevcut Türkçe ve İngilizce i18n altyapısını kullan.

## 15. Role & Permission

Mevcut `packages/auth` permission catalog sistemini genişlet.

Önerilen resources:

### items

- read
- create
- update
- archive
- restore
- manageRevisions
- releaseRevision

### itemGroups

- read
- create
- update
- archive

### boms

- read
- create
- update
- submit
- release
- archive
- compare

### imports

- read
- create
- execute

### projects

Mevcut izinleri koru.

Project Item yönetimi için:

- manageItems

Customer Item Reference yönetimi items:update kapsamında değerlendirilebilir.

Yeni permission'ların mevcut production organizasyonlarına nasıl ekleneceğini planla.

Mevcut organizasyonların özel rollerini ve kullanıcı bazlı grant'larını overwrite etme.

Import işlemi için imports:execute izni tek başına yeterli olmamalıdır. Oluşturulan veya güncellenen entity'lerin ilgili mutation izinleri de doğrulanmalıdır.

Her Server Action ve repository işlemi organizasyon ve permission kontrolü yapmalıdır.

## 16. Audit Logging

Mevcut audit altyapısını kullan.

Aşağıdaki işlemleri kaydet:

- Item created/updated/archived/restored
- Item Group created/updated/archived
- Item Revision created/released
- Customer Item Reference created/updated
- Customer Revision mapping changed
- BOM created
- BOM Revision created/released
- BOM Line added/updated/removed
- Project Item assigned/removed
- Import started/completed/failed

Import sırasında binlerce satır için kontrolsüz audit log üretme.

Import Job seviyesinde özet kaydı ve gerekli detay izlenebilirliği sağla.

## 17. Feature Architecture

Önerilen feature yapısı:

- `apps/app/features/items/`
- `apps/app/features/item-groups/`
- `apps/app/features/boms/`
- `apps/app/features/imports/`
- `apps/app/features/projects/`

Her feature mevcut repository convention'larına uygun şekilde:

- server.ts
- service.ts
- repository.ts
- schema.ts
- types.ts
- components/

dosyalarını içerebilir.

Database schema için önerilen domain:

- `packages/db/src/schema/inventory/`

İlgili schema export'larını güncelle.

Mevcut auth ve Phase 1 schema yapısını gereksiz yere refactor etme.

## 18. Implementation Order

1. Phase 1'in repository durumunu kontrol et.
2. Item, Item Group ve Customer Item ilişkilerini tasarla.
3. Item Revision ve Customer Revision schema'larını oluştur.
4. ERP Reference altyapısını oluştur.
5. BOM Header, Revision ve Line schema'larını oluştur.
6. Multi-level BOM validation ve explosion servisini oluştur.
7. Project Item ilişkilerini oluştur.
8. Database constraints ve additive migration hazırla.
9. Permission catalog ve role template'lerini genişlet.
10. Item ve Item Group ekranlarını tamamla.
11. Customer Item Reference ekranlarını tamamla.
12. BOM Tree Editor ve revision management geliştir.
13. Project Item ve Product Structure ekranlarını tamamla.
14. Excel/CSV import altyapısını geliştir.
15. BOM revision comparison geliştir.
16. Audit, validation, concurrency ve tenant isolation testlerini tamamla.
17. TypeScript, Biome ve build kontrollerini çalıştır.

## 19. Acceptance Criteria

Phase 2 aşağıdaki senaryoları desteklediğinde tamamlanmış sayılır:

### Scenario A – Product Management

- Organizasyon Item Group oluşturabilir.
- Item Group altında hiyerarşik alt gruplar oluşturabilir.
- 50 FRP ürün kartı toplu import edilebilir.
- Aynı dosyanın yeniden import edilmesi duplicate Item oluşturmaz.
- Şirket içi ERP kodu ve müşteri parça kodu ayrı saklanır.
- Aynı Item farklı projelerde kullanılabilir.

### Scenario B – Multi-level BOM

- Satılan Driver Desk ürününün BOM'u oluşturulabilir.
- Alt FRP ve metal montajlar BOM'a eklenebilir.
- Alt bileşenlerin kendi BOM'ları opsiyonel olarak tanımlanabilir.
- Aynı reçine farklı BOM satırlarında kullanılabilir.
- BOM ağacı çok seviyeli görüntülenebilir.
- Toplam malzeme miktarları doğru hesaplanabilir.
- Döngüsel BOM ilişkileri engellenir.

### Scenario C – Revision Management

- Item Revision oluşturulabilir.
- Customer Revision ayrı eşleştirilebilir.
- BOM Revision oluşturulabilir ve yayınlanabilir.
- Yayınlanmış BOM içeriği doğrudan düzenlenemez.
- Yeni BOM Revision oluşturulabilir.
- İki BOM Revision arasındaki farklar görüntülenebilir.
- Yayınlanmış üst BOM, alt BOM revision değişikliğinden kontrolsüz etkilenmez.

### Scenario D – Project Product Scope

- Alstom SBR projesine satılan ürün eklenebilir.
- Müşteri ürün kodu eşleştirilebilir.
- İlgili BOM Revision seçilebilir.
- BOM içerisindeki 50 FRP filtrelenebilir.
- 50 FRP kalite çalışmaları için toplu olarak Project Item kapsamına alınabilir.
- Aynı Item farklı projelerde tekrar kullanılabilir.
- Hangi ürünlerin satın alındığı veya üretildiği görüntülenebilir.

### Scenario E – Import & Security

- Excel veya CSV dosyası yüklenebilir.
- Kolon eşleştirmesi yapılabilir.
- Hatalı satırlar import öncesinde gösterilir.
- Kullanıcı onayı olmadan mevcut kayıtlar değiştirilmez.
- Başka organizasyona ait Item, Customer veya Project kullanılamaz.
- Yetkisiz kullanıcı import, release veya mutation yapamaz.
- Import ve revision işlemleri audit kayıtlarında izlenebilir.

## 20. Restrictions

- Bu fazda Process Flow implement etme.
- Master Process Library implement etme.
- Process Work Elements implement etme.
- PFMEA ve Control Plan implement etme.
- NCR, 8D ve REX implement etme.
- Dinamo'ya doğrudan API veya database entegrasyonu yapma.
- Gerçek Dinamo export formatı incelenmeden özel adapter oluşturma.
- ERP write-back veya ERP üzerinde veri değişikliği yapma.
- Authentication mimarisini değiştirme.
- Production database resetleme.
- Mevcut migration geçmişini silme.
- Mevcut custom role ve permission kayıtlarını overwrite etme.
- Released BOM veya Item Revision verilerini kontrolsüz güncelleme.
- Kullanıcı onayı olmadan production deployment veya main branch merge yapma.

Implementation başlamadan önce:

- Mevcut repository durumunu incele.
- Önerilen entity ilişkilerini sun.
- Database constraint'leri ve revision modelini açıkla.
- Değiştirilecek dosyaları listele.
- Import stratejisini açıkla.
- Belirsiz iş kurallarını belirt.

Plan onaylandıktan sonra implementation'a geç.

Phase 2 tamamlandıktan sonra kendiliğinden sonraki faza geçme.