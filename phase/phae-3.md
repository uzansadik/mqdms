# mQDMS – Phase 3: Master Process Library, Flow Editor & Process Work Elements

## 1. Objective

Phase 3'ün amacı mQDMS içerisinde organizasyon seviyesinde tekrar kullanılabilir proses bilgi kütüphanesi oluşturmaktır.

Bu fazda fabrikadaki üretim, montaj, kalite kontrol, depolama ve diğer prosesler tanımlanabilecek; bu proseslerin jenerik ve özelleştirilmiş uygulamaları yönetilebilecektir.

Her proses varyantı kendi Flow diyagramına, Process Work Element'lerine, girdilerine, çıktılarına, fonksiyonlarına ve gerekliliklerine sahip olabilecektir.

Önceki fazlar:

- Phase 1: Customer, Plant & Project Management
- Phase 2: Item & BOM Management

Bu fazda geliştirilecek modüller:

- Master Process Library
- Generic Process Variant
- Specialized Process Variant
- Process Variant Revision Management
- Process Derivation & Controlled Updates
- Reusable Flow Editor
- Flow Node & Flow Edge Management
- Process Work Element Management
- Process Functions & Requirements
- Process Inputs & Outputs
- Process Applicability Definition
- Process Step Foundation

Bu fazın sonunda GKK Metal, GKK Kimyasal, Gelcoat, Vakum İnfüzyon, Trim ve Bonding gibi prosesler organizasyonun ortak kütüphanesinde tanımlanabilmelidir.

Bu bilgiler Phase 4'te proje Process Flow'larına aktarılacaktır.

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
- `@mqdms/ui`
- Mevcut Türkçe ve İngilizce i18n altyapısı

Uygulamalar:

- `apps/auth`: Authentication, organization, user, role ve permission yönetimi.
- `apps/app`: Quality Management Application.

Implementation başlamadan önce Phase 1 ve Phase 2'nin mevcut repository durumunu incele.

Özellikle aşağıdaki entity'lerin gerçek schema ve isimlerini kontrol et:

- Organization
- Plant
- Customer
- Project
- Item
- Item Group
- Item Revision
- BOM
- BOM Revision
- Project Item

Önceki instruction'lardaki önerilen isimleri mevcut repository ile karşılaştır. Aynı entity'yi farklı isimle yeniden oluşturma.

Authentication mimarisini değiştirme.

## 3. Mandatory Domain Terminology

Aşağıdaki terminoloji kullanıcı tarafından kararlaştırılmıştır. Uygulamanın bütün katmanlarında bu kavramları tutarlı kullan.

| Entity | Meaning | Example |
|---|---|---|
| Master Process | Organizasyonun ana proses tanımı | Girdi Kalite Kontrol |
| Process Variant | Ana prosesin belirli uygulaması | GKK Metal |
| Process Step | Proje üretim rotasındaki operasyon | OP10 GKK Metal |
| Process Flow | Ürün veya ürün ailesinin üretim rotası | FRP Üretim Sinoptiği |
| Flow | Faaliyet ve karar diyagramı | Metal GKK iç akışı |
| Flow Node | Diyagram içerisindeki düğüm | Sertifika kontrolü |
| Flow Edge | Diyagram düğümleri arasındaki bağlantı | OK / NOK |
| Process Work Element | Prosesin analiz edilen iş unsuru | Operatör, kumpas, reçine |

Önemli:

- OP10, OP20, OP30 gibi operasyonları `Process Step` olarak adlandır.
- Faaliyet ve karar diyagramını `Flow` olarak adlandır.
- Flow içerisindeki kutuları Process Step olarak adlandırma. Bunlar `Flow Node` olacaktır.
- Process Work Element ve Flow Node aynı entity değildir.
- Process Work Element, AIAG–VDA PFMEA yapı ve fonksiyon analizinde kullanılacaktır.

Process Flow ile Flow kavramlarını karıştırma.

Process Flow, üretim rotasını ve kapsamını yönetir. Flow ise o rotanın veya bir Process Step'in grafiksel gösterimini sağlar.

## 4. Architecture Principles

### 4.1 Three-Level Process Knowledge Model

Proses kütüphanesinde aşağıdaki üç seviyeli yapı kullanılacaktır:

Generic Process Variant → Specialized Process Variant → Project Process Step

Örnek:

Master Process: Girdi Kalite Kontrol

- Generic Variant: GKK Jenerik
- Specialized Variant: GKK Metal
- Specialized Variant: GKK Kimyasal
- Specialized Variant: GKK Cam Elyaf

GKK Metal, GKK Jenerik'in belirli bir revizyonundan türetilebilir.

Project Process Step olan OP10 GKK Metal ise GKK Metal'in belirli bir revizyonundan türetilecektir.

Her seviyede kaynak revizyonu ve türetme bilgisi korunmalıdır.

### 4.2 Independent Customization

Bir varyant jenerik varyanttan türetildikten sonra bağımsız olarak özelleştirilebilmelidir.

Örnek:

GKK Jenerik:

- Malzeme teslim alma
- Sipariş doğrulama
- Kabul / Ret

GKK Metal:

- Jenerik adımlar
- Malzeme sertifikası doğrulama
- Boyutsal kontrol
- Görsel kontrol

GKK Kimyasal:

- Jenerik adımlar
- Parti numarası kontrolü
- Raf ömrü kontrolü
- Analiz sertifikası kontrolü

Jenerik kayıtta yapılan değişiklikler mevcut varyantların yayınlanmış içeriklerini otomatik değiştirmemelidir.

### 4.3 Multi-tenancy

Bütün proses verileri organizasyon kapsamında yönetilecektir.

- `organizationId` mevcut Better Auth organization ID tipiyle uyumlu `text` olmalıdır.
- Business entity primary key'leri UUID olabilir.
- Her sorgu active organization kapsamında çalışmalıdır.
- Client tarafından gönderilen organizationId'ye güvenilmemelidir.
- Proses, varyant, Flow, Work Element ve Item Group ilişkilerinde tenant isolation uygulanmalıdır.
- Organizasyonlar arası foreign key ilişkileri database constraint seviyesinde engellenmelidir.

### 4.4 Documentation, Not Workflow Execution

Bu fazda geliştirilecek Flow Editor bir proses tasarım ve dokümantasyon aracıdır.

Flow Node içerisindeki "NCR oluştur" ifadesi gerçek NCR kaydı oluşturmamalıdır.

Flow Edge içerisindeki OK/NOK koşulları gerçek üretim kontrolü çalıştırmamalıdır.

Bu fazda BPMN execution engine, otomatik üretim iş akışı veya MES execution engine oluşturma.

İleride gerekli olduğunda kalite kayıtları ve üretim uygulamalarıyla entegrasyon yapılabilecektir.

## 5. Master Process Management

Master Process, organizasyonun ortak proses tanımıdır.

Örnek prosesler:

- Girdi Kalite Kontrol
- Malzeme Depolama
- Kalıp Hazırlığı
- Gelcoat
- Vakum İnfüzyon
- RTM
- Hand Lay-up
- Kürleme
- Trim
- Ara Kalite Kontrol
- Bonding
- Boya
- Montaj
- Final Kalite Kontrol
- Paketleme
- Sevkiyat

### 5.1 Database Entity

`processes`

Fields:

- id
- organizationId
- code
- name
- description
- category
- status
- createdById
- createdAt
- updatedAt
- archivedAt

Process Category examples:

- MANUFACTURING
- INSPECTION
- ASSEMBLY
- STORAGE
- TRANSPORT
- OUTSOURCED
- PACKAGING
- OTHER

### 5.2 Business Rules

- Process code organizasyon içerisinde unique olmalıdır.
- Master Process bir projeye ait olmamalıdır.
- Aynı Master Process birçok müşteri projesinde kullanılabilmelidir.
- Bir Master Process birden fazla Process Variant'a sahip olabilir.
- Master Process oluşturulduğunda proje operasyon numarası girilmesi zorunlu olmamalıdır.
- Master Process üzerinde OP10, OP20 gibi operasyon numaraları saklanmamalıdır.
- Operasyon numarası gelecekte Project Process Step üzerinde tanımlanacaktır.
- Kullanılan proses kayıtları fiziksel olarak silinmemelidir.
- Archive ve Restore desteklenmelidir.

## 6. Process Variant Management

Process Variant, Master Process'in belirli uygulamasıdır.

### 6.1 Database Entity

`process_variants`

Fields:

- id
- organizationId
- processId
- code
- name
- description
- variantType
- status
- createdById
- createdAt
- updatedAt
- archivedAt

Variant Type:

- GENERIC
- SPECIALIZED

### 6.2 Example

Master Process:

GKK – Girdi Kalite Kontrol

Variants:

- GKK-GENERIC
- GKK-METAL
- GKK-CHEMICAL
- GKK-FIBER
- GKK-STANDARD

### 6.3 Business Rules

- Bir Master Process en fazla bir varsayılan GENERIC varyanta sahip olabilir.
- Bir Master Process birden fazla SPECIALIZED varyanta sahip olabilir.
- SPECIALIZED varyant, GENERIC varyantın belirli bir revision'ından türetilebilir.
- Specialized varyantların tamamen bağımsız oluşturulması da desteklenmelidir.
- Generic varyant bulunması tüm Master Process kayıtları için zorunlu değildir.
- Varyant code organizasyon kapsamında unique olmalıdır.
- Varyantlar farklı Master Process kayıtları arasında kontrolsüz taşınmamalıdır.
- Varyantlar kendi revision geçmişine sahip olmalıdır.
- Varyant içeriği yalnızca kod, ad ve açıklamadan ibaret olmamalıdır.

## 7. Process Variant Revision Management

Process Variant'ın teknik içeriği revision üzerinden yönetilmelidir.

### 7.1 Database Entity

`process_variant_revisions`

Fields:

- id
- organizationId
- processVariantId
- revision
- description
- changeReason
- status
- sourceVariantRevisionId
- supersedesRevisionId
- createdById
- createdAt
- updatedAt
- submittedAt
- submittedById
- approvedAt
- approvedById
- releasedAt
- releasedById

Revision statuses:

- DRAFT
- IN_REVIEW
- APPROVED
- RELEASED
- SUPERSEDED

### 7.2 Revision Content

Her Process Variant Revision aşağıdaki teknik bilgileri sahiplenebilmelidir:

- Flow
- Process Work Elements
- Process Functions
- Process Requirements
- Process Inputs
- Process Outputs
- Applicable Item Groups
- Applicable Supply Types
- Related Document References

Generic PFMEA ve Generic Control Plan ileride bu revizyona bağlanabilecektir.

### 7.3 Revision Rules

- Revision değeri aynı Process Variant içerisinde unique olmalıdır.
- Revision değeri text olarak saklanmalıdır.
- DRAFT revision düzenlenebilir.
- IN_REVIEW revision doğrudan kontrolsüz değiştirilememelidir.
- RELEASED revision teknik içerik açısından immutable olmalıdır.
- Yeni değişiklikler yeni DRAFT revision üzerinden yapılmalıdır.
- Önceki revision geçmişi korunmalıdır.
- Bir varyantın aynı anda en fazla bir güncel RELEASED revision'ı olmalıdır.
- Yeni revision'ın release işlemi transaction içerisinde yapılmalıdır.
- Mevcut yayınlanmış revision uygun şekilde SUPERSEDED durumuna geçirilmelidir.
- Yayınlanmış bir revision'ın altındaki Flow, Work Element, Function veya Requirement kayıtları doğrudan güncellenememelidir.

Revision lifecycle geçişlerini açık bir state machine üzerinden yönet.

Önerilen geçişler:

DRAFT → IN_REVIEW → APPROVED → RELEASED → SUPERSEDED

IN_REVIEW → DRAFT

APPROVED → DRAFT, gerekçeli geri alma işlemiyle.

Bu fazda karmaşık, organizasyon tarafından tasarlanabilen approval workflow engine geliştirme.

### 7.4 Revision Identity

Master Process Variant'ın stabil kimliği ile revision kimliğini ayır.

Örnek:

- Variant ID: GKK-METAL
- Variant Revision ID: GKK-METAL REV.02

Gelecekte Project Process Step doğrudan variant'ın değişken current revision'ına değil, belirli variant revision'ına bağlanmalıdır.

## 8. Generic-to-Specialized Derivation

Bu fazın temel özelliklerinden biri kontrollü proses türetme mekanizmasıdır.

### 8.1 Derivation Workflow

Kullanıcı:

1. GKK Jenerik varyantını oluşturur.
2. Flow ve Process Work Element'lerini tanımlar.
3. Jenerik revision'ı yayınlar.
4. GKK Metal isimli specialized varyant oluşturur.
5. Kaynak olarak GKK Jenerik REV.01'i seçer.
6. Jenerik bilgileri yeni specialized DRAFT revision'a aktarır.
7. Metal prosesine özel bilgileri ekler.
8. GKK Metal revision'ını bağımsız olarak yayınlar.

### 8.2 Copy Strategy

Phase 3 için materialized snapshot yaklaşımını kullan.

Türetilen varyant kendi düzenlenebilir teknik kayıtlarına sahip olmalıdır.

Jenerik varyantın verilerini runtime sırasında canlı olarak birleştiren karmaşık inheritance engine oluşturma.

Türetme sırasında:

- Flow Node ve Flow Edge kayıtları kopyalanır.
- Process Work Elements kopyalanır.
- Function ve Requirement kayıtları kopyalanır.
- Inputs ve Outputs kopyalanır.
- İlgili applicability bilgileri kopyalanabilir.
- Kopyalanan kayıtların kaynak kimlikleri korunur.
- Kopyalama sırasında yeni entity ID'leri oluşturulur.
- Entity'ler arasındaki bütün referanslar yeni ID'lere doğru şekilde eşleştirilir.

Örneğin:

Generic Flow Node N01 → Specialized Flow Node N101

Generic Work Element WE01 → Specialized Work Element WE101

N01 ile WE01 arasındaki ilişki, specialized revision'da N101 ile WE101 arasında kurulmalıdır.

### 8.3 Stable Lineage

Kopyalanan teknik kayıtların kaynaklarını takip edebilmek için lineage bilgisi tanımla.

Önerilen kavramlar:

- `logicalId`: Aynı teknik kaydın revision'lar boyunca stabil kimliği.
- `derivedFromId`: Türetilen kaydın doğrudan kaynak kaydı.
- `originLogicalId`: Kaynak kütüphane kaydının stabil kimliği.

Bu alanların fiziksel schema detaylarını mevcut repository convention'larına göre tasarla.

Revision'dan revision'a kopyalanan kayıtlar ile farklı varyantlara türetilen kayıtlar birbirinden ayırt edilebilmelidir.

Sadece isim veya açıklama üzerinden kaynak eşleştirmesi yapma.

### 8.4 Controlled Updates

GKK Jenerik REV.02 yayınlandığında:

- Sistem REV.01'den türeyen varyantları bulabilmelidir.
- Kaynak revision ile yeni revision arasındaki değişiklikleri gösterebilmelidir.
- Kullanıcı yeni revision'ı inceleyebilmelidir.
- Specialized varyant için değişiklik önerisi sunulabilmelidir.
- Yayınlanmış specialized revision otomatik değiştirilmemelidir.

Phase 3'te en az aşağıdaki fonksiyonlar desteklenmelidir:

- Kaynak revision bilgisini görüntüleme.
- Yeni kaynak revision bulunduğunu gösterme.
- Eski ve yeni kaynak revision'ları karşılaştırma.
- Seçilen kaynak değişikliklerini specialized DRAFT revision'a kontrollü aktarma.
- Çakışan değişikliklerde kullanıcıya karar verme imkânı.

Örnek:

GKK Jenerik'te "Sertifika gerekliliğini doğrula" adımı değiştirildi.

GKK Metal'de aynı adım daha önce müşteriye özel olarak değiştirilmişse sistem kullanıcının düzenlemesini otomatik ezmemelidir.

Kaynak eski revision, kaynak yeni revision ve mevcut specialized içerik karşılaştırılmalıdır.

Silinen bir kaynak kaydını başka kayıtlar tarafından kullanılıyorsa otomatik silme.

Complex automatic merge engine veya bütün projeleri otomatik güncelleyen mekanizma bu fazın kapsamı dışındadır.

## 9. Reusable Flow Architecture

Flow, mQDMS'nin ortak diyagram altyapısıdır.

Aynı Flow Editor ileride şu alanlarda kullanılacaktır:

- Master Process Variant Flow
- Project Process Step Flow
- Main Process Flow
- Gerektiğinde problem çözme diyagramları

Bu fazda ilk gerçek kullanım Master Process Variant Flow olacaktır.

### 9.1 Database Entity

`flows`

Fields:

- id
- organizationId
- name
- description
- flowType
- createdById
- createdAt
- updatedAt

Flow Type examples:

- PROCESS_VARIANT
- PROCESS_STEP
- PROCESS_FLOW

İlk fazda PROCESS_VARIANT türünü işlevsel olarak geliştir.

PROCESS_STEP ve PROCESS_FLOW entegrasyonu Phase 4'te tamamlanacaktır.

Flow sahipliğini açık foreign key ilişkileriyle yönet.

Sadece `ownerType` ve `ownerId` içeren foreign key doğrulaması olmayan polymorphic yapı kullanma.

Önerilen yaklaşım:

`process_variant_revision_flows`

- organizationId
- processVariantRevisionId
- flowId

Bir Process Variant Revision'ın en fazla bir primary Flow'u olabilir.

Flow Editor'ın veri modeli başka entity'ler tarafından da yeniden kullanılabilir olmalıdır.

### 9.2 Flow Nodes

`flow_nodes`

Fields:

- id
- organizationId
- flowId
- logicalId
- derivedFromId
- nodeType
- title
- description
- positionX
- positionY
- width
- height
- config
- sortOrder
- createdAt
- updatedAt

Node Types:

- START
- END
- ACTIVITY
- INSPECTION
- DECISION
- STORAGE
- TRANSPORT
- DOCUMENT
- SUBPROCESS
- PROCESS_STEP_REFERENCE
- PROCESS_FLOW_REFERENCE

Bu fazda son iki reference türünün proje entegrasyonunu implement etme.

Node `config` alanı yalnızca türe özel, validate edilmiş yapılandırma için JSONB olabilir.

Temel ilişkisel bilgileri tamamıyla JSONB içerisinde saklama.

### 9.3 Flow Edges

`flow_edges`

Fields:

- id
- organizationId
- flowId
- logicalId
- derivedFromId
- sourceNodeId
- targetNodeId
- sourceHandle
- targetHandle
- label
- condition
- edgeType
- sortOrder
- createdAt
- updatedAt

Edge Type examples:

- DEFAULT
- YES
- NO
- OK
- NOK
- CONDITIONAL
- REWORK
- MATERIAL_FLOW

Condition alanı dokümantasyon amaçlıdır.

JavaScript veya başka çalıştırılabilir kod kabul etme.

### 9.4 Graph Integrity

- Edge source ve target aynı Flow'a ait olmalıdır.
- Edge başka organizasyona ait Node'a bağlanmamalıdır.
- Bir Node silindiğinde ilişkili Edge'ler transaction içerisinde yönetilmelidir.
- Referans verilen Node silinmeden önce diğer bağımlılıklar kontrol edilmelidir.
- Geçersiz veya dangling edge'ler engellenmelidir.
- DECISION Node için anlamlı çıkış koşulları tanımlanabilmelidir.
- DRAFT Flow eksik olabilir.
- Release sırasında gerekli grafik tutarlılık kontrolleri uygulanmalıdır.
- START ve END noktaları validate edilmelidir.
- Erişilemeyen Node'lar tespit edilmelidir.
- Paralel dallar ve birden fazla geçerli bitiş noktası desteklenmelidir.

Önemli:

Flow içerisindeki kontrollü rework döngüleri geçerli olabilir.

Örneğin:

Ölçüm → NOK → Yeniden işleme → Ölçüm

Bu nedenle bütün grafik döngülerini otomatik hata olarak değerlendirme.

Ancak sonsuz veya hiçbir geçerli çıkışa ulaşamayan akışlar için uyarı üret.

## 10. Flow Editor UI

React Flow / `@xyflow/react` tabanlı, yeniden kullanılabilir Flow Editor geliştir.

Dependency eklemeden önce mevcut monorepo içerisinde uygun bir diagram library olup olmadığını kontrol et.

### 10.1 Editor Layout

Flow Editor üç ana alandan oluşmalıdır:

Left Panel:

- Node Palette
- START
- ACTIVITY
- INSPECTION
- DECISION
- STORAGE
- TRANSPORT
- DOCUMENT
- SUBPROCESS
- END

Center:

- Flow Canvas
- Nodes
- Edges
- Zoom
- Pan
- Fit View
- Mini Map

Right Panel:

- Selected Node Properties
- Selected Edge Properties
- Node Title
- Description
- Condition
- Work Element Associations
- Function Associations

### 10.2 Required Editor Features

- Node ekleme.
- Node taşıma.
- Drag-and-drop.
- Node seçme.
- Node düzenleme.
- Node silme.
- Edge oluşturma.
- Edge silme.
- Edge condition tanımlama.
- YES / NO çıkışları.
- OK / NOK çıkışları.
- Paralel dallar.
- Rework bağlantıları.
- Zoom in / zoom out.
- Fit view.
- Canvas konumunu kaydetme.
- Undo / redo.
- Read-only mode.
- Draft save.
- Unsaved changes uyarısı.
- Node ve edge validation.

Diyagramın canvas konumu ve teknik içeriği ayrı değerlendirilmelidir.

Sadece Node konumlarının değişmesi bir teknik proses değişikliğiyle aynı kabul edilmemelidir.

Yayınlanmış Flow görüntülenebilir ancak doğrudan düzenlenemez.

### 10.3 Rendering Requirements

Flow Editor aşağıdaki örnek diyagramı desteklemelidir:

Malzeme geldi

→ Malzeme bilgilerini doğrula

→ Sertifika gerekli mi?

YES → Sertifika mevcut mu?

NO → Diğer kontroller

Sertifika mevcut değil → Malzemeyi beklemeye al → Sertifika talep et

Sertifika mevcut → Sertifika içeriğini doğrula

→ Ölçüsel ve görsel kontrol

→ Uygun mu?

OK → Kabul → Onaylı stok

NOK → Karantina → NCR değerlendirmesi

Bu sadece örnek bir proses akışıdır.

Gerçek sertifika gereklilikleri kullanıcı tarafından tanımlanmalıdır.

### 10.4 Export Foundation

Flow diyagramının daha sonra müşteri dokümanlarına dahil edilebilmesi için export edilebilir bir model kullan.

Phase 3 için en az:

- Diyagramın görsel çıktısı.
- Read-only print görünümü.

desteklenebilir.

Tam müşteri formatlı PDF veya Excel doküman motoru bu fazın kapsamı dışındadır.

## 11. Process Work Element Management

Process Work Element, AIAG–VDA PFMEA yapı ve fonksiyon analizinde kullanılacak gerçek proses unsurudur.

Work Element'i Flow Node ile karıştırma.

Örnek:

Process Variant: GKK Metal

- MAN: Girdi kalite kontrol operatörü
- MACHINE: Kumpas
- MACHINE: Mikrometre
- MACHINE: Ölçüm fikstürü
- MATERIAL: Metal braket
- ENVIRONMENT: Kontrol ortamı

Bir prosesin birden fazla MACHINE veya MATERIAL Work Element'i olabilir.

### 11.1 Database Entity

`process_work_elements`

Fields:

- id
- organizationId
- processVariantRevisionId
- logicalId
- derivedFromId
- code
- name
- description
- category
- sortOrder
- createdAt
- updatedAt

Work Element Category:

- MAN
- MACHINE
- MATERIAL
- ENVIRONMENT

AIAG–VDA PFMEA için 4M sınıflandırmasını başlangıç olarak destekle.

Gelecekte METHOD, MEASUREMENT veya diğer organizasyon sınıflandırmalarının eklenmesine engel olacak mimari kurma.

Ancak farklı bir sınıflandırmayı otomatik olarak AIAG–VDA'nın zorunlu 4M yapısı olarak gösterme.

### 11.2 Optional References

Work Element'ler gerektiğinde organizasyonun diğer kayıtlarına bağlanabilmelidir.

Örnek:

MATERIAL → Item veya Item Group

MACHINE → Gelecekte Equipment Management

MAN → Rol veya pozisyon tanımı

ENVIRONMENT → Proses ortamı tanımı

Bu fazda:

- Item ve Item Group bağlantısı desteklenebilir.
- Equipment Management modülü oluşturma.
- Çalışan, makine veya kalibrasyon veritabanlarını yeniden geliştirme.
- Work Element MAN kaydını zorunlu olarak belirli bir çalışan hesabına bağlama.

Örneğin GKK operatörü bir görev tanımıdır; belirli bir mQDMS kullanıcısı olmak zorunda değildir.

### 11.3 Flow Node Associations

Flow Node ve Process Work Element arasında many-to-many ilişki kur.

`flow_node_work_elements`

Fields:

- id
- organizationId
- flowNodeId
- processWorkElementId
- description
- createdAt

Örnek:

Flow Node: Ölçüsel kontrol

Work Elements:

- GKK operatörü
- Kumpas
- Metal braket

Aynı Work Element birden fazla Flow Node ile ilişkilendirilebilir.

Aynı Flow Node birden fazla Work Element ile ilişkilendirilebilir.

İlişkilendirilen kayıtlar aynı teknik revision kapsamına ait olmalıdır.

Bu tablo ileride PFMEA risk nedenlerinin ilgili faaliyet ve Work Element'e bağlanabilmesini sağlayacaktır.

### 11.4 Work Element UI

Process Variant detay ekranında Work Elements sekmesi bulunmalıdır.

Kullanıcı:

- Work Element oluşturabilmeli.
- Kategori seçebilmeli.
- Ad ve açıklama tanımlayabilmeli.
- Aynı kategori altında birden fazla kayıt oluşturabilmeli.
- Flow Node ile ilişkilendirebilmeli.
- İlgili Function ve Requirement'ları görebilmelidir.

Process Work Elements modülü Phase 3'te mutlaka geliştirilmelidir.

Ancak bütün proseslerde dört kategorinin her biri için en az bir kayıt bulunmasını veritabanı zorunluluğu yapma.

İleride PFMEA kapsamı ve metodolojisi doğrultusunda analiz yeterliliği değerlendirilecektir.

## 12. Process Functions & Requirements

AIAG–VDA PFMEA fonksiyon analizi için gerekli veri temelini oluştur.

Bu fazda proses fonksiyonları ve gereklilikleri tanımlanabilecek ancak tam PFMEA fonksiyon ağı ve hata analizi geliştirilmeyecektir.

### 12.1 Process Functions

`process_functions`

Fields:

- id
- organizationId
- processVariantRevisionId
- logicalId
- derivedFromId
- name
- description
- functionScope
- processWorkElementId
- createdAt
- updatedAt

Function Scope examples:

- PROCESS
- WORK_ELEMENT

Process-level function örneği:

Uygunsuz metal malzemenin üretime girişini önlemek.

Work Element-level function örnekleri:

- GKK operatörü: Teknik resimdeki ölçü gerekliliklerini doğru yorumlamak.
- Kumpas: Gerekli doğrulukta boyutsal ölçüm yapmak.
- Kontrol ortamı: Görsel kontrol için yeterli aydınlatmayı sağlamak.

### 12.2 Process Requirements

`process_requirements`

Fields:

- id
- organizationId
- processVariantRevisionId
- logicalId
- derivedFromId
- code
- name
- description
- requirementType
- sourceReference
- isMandatory
- createdAt
- updatedAt

Requirement Type examples:

- PRODUCT
- PROCESS
- CUSTOMER
- REGULATORY
- INTERNAL
- DOCUMENTATION

Örnek gereklilikler:

- Teknik resimdeki boyutsal toleranslara uygunluk.
- Gerekli durumlarda malzeme sertifikası bulunması.
- Ölçüm ekipmanının geçerli kalibrasyona sahip olması.
- Kimyasal malzemelerin raf ömrü içerisinde bulunması.

### 12.3 Associations

Önerilen ilişki tabloları:

- `process_function_requirements`
- `flow_node_functions`

Fonksiyonlar bir veya daha fazla gereklilikle ilişkilendirilebilir.

Flow Node'lar ilgili proses fonksiyonlarına bağlanabilir.

Bir fonksiyon birden fazla faaliyet tarafından gerçekleştirilebilir.

### 12.4 Future PFMEA Compatibility

Bu kayıtlardan ileride aşağıdaki AIAG–VDA yapısı oluşturulabilecektir:

- Process Item
- Process Step
- Process Work Element
- Functions
- Requirements
- Failure Effects
- Failure Modes
- Failure Causes

Process Variant düzeyindeki fonksiyonların proje bağlamına aktarılması mümkün olmalıdır.

Müşteri ve proje bağlamına ait gerçek karakteristik değerlerini jenerik kütüphanede zorunlu tutma.

Örneğin:

Generic Requirement:

Braket konumu teknik resimdeki toleransa uygun olmalıdır.

Project Requirement:

Braket X konumu 150 ±0,5 mm olmalıdır.

İkinci değer proje ürününe özgüdür ve sonraki fazlarda tanımlanacaktır.

## 13. Process Inputs & Outputs

Bir prosesin girdileri ve çıktıları tanımlanabilmelidir.

Bu özellik opsiyonel olmalıdır.

Kullanıcı her Process Step sonrasında yeni Item veya yarı mamul oluşturmak zorunda olmamalıdır.

### 13.1 Database Entity

`process_io_definitions`

Fields:

- id
- organizationId
- processVariantRevisionId
- logicalId
- derivedFromId
- direction
- resourceType
- name
- description
- itemGroupId
- itemId
- processState
- isRequired
- sortOrder
- createdAt
- updatedAt

Direction:

- INPUT
- OUTPUT

Resource Type examples:

- PRODUCT
- MATERIAL
- SEMI_FINISHED
- DOCUMENT
- INFORMATION
- TOOLING
- OTHER

### 13.2 Examples

Process Variant: Vakum İnfüzyon

Inputs:

- Reçine
- Cam Elyaf
- Hazırlanmış kalıp
- Vakum sarf malzemeleri

Outputs:

- İnfüzyonu tamamlanmış FRP
- Proses kontrol kayıtları

Process Variant: GKK Metal

Inputs:

- Satın alınan metal parça
- Sipariş bilgisi
- Teknik resim
- Malzeme sertifikası, gerekiyorsa

Outputs:

- Onaylanmış metal parça
- Girdi kalite kontrol kaydı

### 13.3 Business Rules

- Inputs ve Outputs zorunlu değildir.
- Process State zorunlu değildir.
- Yeni yarı mamul Item oluşturmak zorunlu değildir.
- Girdi veya çıktı sadece açıklayıcı bir tanım olabilir.
- Gerektiğinde Item veya Item Group ile ilişkilendirilebilir.
- Aynı Item farklı proses durumlarına sahip olabilir.
- Girdi ve çıktı tanımları inventory stock movement oluşturmamalıdır.

Bu fazda gerçek lot, seri numarası veya üretim emri hareketlerini implement etme.

## 14. Process Applicability Definitions

Process Variant'ın hangi malzeme ve üretim koşullarında uygulanabilir olduğunu tanımla.

Bu özellik Phase 4'te geliştirilecek proses öneri mekanizmasının temelini oluşturacaktır.

### 14.1 Example

GKK Metal:

- Item Group: METAL
- Supply Type: PURCHASED

GKK Kimyasal:

- Item Group: CHEMICAL
- Supply Type: PURCHASED

GKK Cam Elyaf:

- Item Group: GLASS_FIBER
- Supply Type: PURCHASED

Bonding:

- Joining Method: BONDING
- Input Groups: FRP, METAL, ADHESIVE

### 14.2 Database Entities

Önerilen yapılar:

`process_variant_applicability`

- id
- organizationId
- processVariantRevisionId
- name
- description
- supplyType
- joiningMethod
- isActive
- createdAt
- updatedAt

`process_variant_applicability_item_groups`

- id
- organizationId
- applicabilityId
- itemGroupId
- includeDescendants

### 14.3 Business Rules

- Phase 2 Item Group yapısını kullan.
- Item Group enum'larını yeniden oluşturma.
- Bir applicability kuralı birden fazla Item Group kapsayabilmelidir.
- Alt Item Group'ların dahil edilip edilmediği tanımlanabilmelidir.
- Supply Type tek başına yeterli olmayan durumları destekle.
- Joining Method gerektiğinde ek koşul olabilir.
- Bilinmeyen Supply Type otomatik olarak PURCHASED kabul edilmemelidir.
- GKK Metal varyantı yalnızca metal kapsamı tanımlanmışsa kimyasal malzemeyi otomatik kapsıyor sayılmamalıdır.

Applicability, prosesin önerilebileceği kapsamı temsil eder. Gerçek proje operasyonuna atanmış malzeme kapsamı ayrı bir kavram olacaktır.

Bu fazda bütün proje BOM'larını tarayan öneri motorunu implement etme.

## 15. Process Step Foundation

Proje seviyesindeki OP10, OP20, OP30 kayıtları Process Step olarak adlandırılacaktır.

Phase 3'te Master Process Variant'ın teknik bilgilerinin gelecekte Process Step'e aktarılabilecek şekilde tasarlanması gereklidir.

Ancak tam Project Process Flow modülü Phase 4'te geliştirilecektir.

### 15.1 Future Process Step Model

Gelecekteki Process Step aşağıdaki ilişkilere sahip olacaktır:

- Process Flow Revision
- Master Process
- Source Process Variant Revision
- Operation Number
- Process Step Name
- Flow
- Process Work Elements
- Product Applicability
- Material Applicability
- Inputs / Outputs
- Process State

### 15.2 Operation Number Rules

Operasyon numarası yalnızca Project Process Step'e ait olacaktır.

Örnek:

- OP10 – GKK Metal
- OP10 – GKK Kimyasal
- OP10 – GKK Cam Elyaf
- OP20 – Gelcoat
- OP30 – Vakum İnfüzyon

Aynı operasyon numarası farklı Process Step kayıtlarında kullanılabilmelidir.

Bu nedenle Process Step'in gerçek identity değeri operationNumber değil, stabil UUID olmalıdır.

Aynı OP10 numarasına sahip iki farklı Process Step, PFMEA ve Control Plan tarafında birbirinden ayırt edilebilmelidir.

### 15.3 Scope Boundary

Bu fazda:

- Gerçek proje Process Flow kayıtlarını oluşturma.
- Process Step'i Project Item'lara bağlama.
- 50 FRP'yi ortak Process Flow'a atama.
- Process Flow referanslarını proje seviyesinde çalıştırma.

Bunlar Phase 4 kapsamındadır.

Bu fazın sonunda ortak teknik kopyalama, Flow ve Work Element altyapısı Project Process Step oluşturmak için hazır olmalıdır.

## 16. Future Generic PFMEA & Generic Control Plan

Master Process Library gelecekte Generic PFMEA ve Generic Control Plan içerecektir.

Bu kararın mimari etkisini koru.

Örnek:

GKK Metal REV.02

- Flow
- Work Elements
- Functions
- Requirements
- Generic PFMEA
- Generic Control Plan

Ancak Phase 3'te:

- PFMEA risk assessment schema oluşturma.
- Failure Effect, Failure Mode, Failure Cause editörü oluşturma.
- S/O/D veya Action Priority hesaplaması geliştirme.
- Control Plan satır editörü oluşturma.
- Generic PFMEA/Control Plan için boş ve işlevsiz database tabloları oluşturma.

Gelecekte Generic PFMEA ve Generic Control Plan belirli Process Variant Revision'a bağlanabilmelidir.

Bu nedenle Process Variant Revision içerisindeki Flow, Work Element, Function ve Requirement kimliklerini stabil ve izlenebilir tasarla.

PFMEA ve Control Plan sekmelerini gerçek modüller tamamlandığında ekle.

## 17. UI / UX

### 17.1 Navigation

Sidebar içerisinde:

Engineering Library

- Master Processes

Mevcut `synoptic`, `processFlow` ve diğer permission resource'larını kontrol et.

Bu fazda mevcut proje FMEA ve Sinoptik sayfalarını gereksiz yere değiştirme.

### 17.2 Master Process List

Columns:

- Code
- Process Name
- Category
- Variant Count
- Status
- Last Updated
- Actions

Features:

- Search
- Category filter
- Status filter
- Pagination
- Create process
- Archive
- Restore

### 17.3 Master Process Detail

Tabs:

- Overview
- Variants
- History

Variant list columns:

- Variant Code
- Name
- Variant Type
- Current Revision
- Source Revision
- Status
- Update Availability

### 17.4 Process Variant Detail

Tabs:

- Overview
- Flow
- Work Elements
- Functions
- Requirements
- Inputs / Outputs
- Applicability
- Revisions

Header:

- Master Process name
- Variant name
- Variant code
- Variant type
- Current revision
- Revision status
- Source variant revision

Actions:

- Create revision
- Derive variant
- Edit draft
- Submit for review
- Approve
- Return for changes
- Release
- Compare revisions

### 17.5 Derive Variant Screen

Kullanıcı:

1. Master Process seçer.
2. Kaynak Generic Variant seçer.
3. Kaynak revision seçer.
4. Yeni Specialized Variant code ve name tanımlar.
5. Aktarılacak teknik bilgileri seçer.
6. Önizlemeyi inceler.
7. Türetmeyi onaylar.

Aktarım seçenekleri:

- Flow
- Work Elements
- Functions
- Requirements
- Inputs / Outputs
- Applicability

Seçilen kayıtların bağımlılıkları korunmalıdır.

Örneğin Flow aktarılıyorsa ve Flow Node'lar Work Element kayıtlarına bağlıysa gerekli kayıtlar birlikte aktarılmalı veya kullanıcı bağımlılık hakkında uyarılmalıdır.

Kırık referanslar oluşturma.

### 17.6 Revision Compare Screen

İki revision karşılaştırılabilmelidir.

Değişiklik kategorileri:

- Added Node
- Removed Node
- Updated Node
- Added Edge
- Removed Edge
- Updated Edge
- Added Work Element
- Removed Work Element
- Updated Work Element
- Function Changes
- Requirement Changes
- Input / Output Changes
- Applicability Changes
- Layout Changes

Teknik değişiklikler ve yalnızca görsel düzen değişiklikleri ayrı gösterilmelidir.

## 18. Role & Permission

Mevcut `packages/auth` permission catalog sistemini genişlet.

Önerilen resources:

### masterProcesses

- read
- create
- update
- archive
- restore
- manageVariants
- derive

### processVariants

- read
- create
- update
- submit
- approve
- reject
- release
- archive
- restore
- compare

Flow, Work Element, Function ve Requirement düzenlemeleri bağlı oldukları Process Variant Revision'ın update yetkisi kapsamında değerlendirilebilir.

Ayrı ve gereksiz permission resource'ları oluşturma.

Revision yayınlama işlemi update izninden bağımsız olmalıdır.

Mevcut organizasyonların custom role ve member grant kayıtlarını overwrite etme.

Factory Role template'lerine yeni permission eklenmesi ile mevcut organizasyonlardaki rollerin güncellenmesi aynı işlem değildir.

Mevcut role seed mekanizmasını incele ve yeni izinlerin kontrollü şekilde atanabilmesini sağla.

Her protected page, Server Action ve repository işlemi organizasyon ve permission kontrolü yapmalıdır.

## 19. Database & Feature Architecture

Önerilen database domain:

`packages/db/src/schema/mes/`

veya mevcut repository'de proses yönetimi için belirlenen domain.

Önerilen schema grupları:

- processes
- process_variants
- process_variant_revisions
- flows
- flow_nodes
- flow_edges
- process_variant_revision_flows
- process_work_elements
- flow_node_work_elements
- process_functions
- process_requirements
- process_function_requirements
- flow_node_functions
- process_io_definitions
- process_variant_applicability
- process_variant_applicability_item_groups

Bu tablo isimleri öneridir. Mevcut schema convention'larıyla uyumlu hale getir.

Feature architecture:

- `apps/app/features/master-processes/`
- `apps/app/features/process-variants/`
- `apps/app/features/flow-editor/`
- `apps/app/features/process-work-elements/`

Her feature ihtiyaçlarına göre:

- server.ts
- service.ts
- repository.ts
- schema.ts
- types.ts
- components/

dosyalarını içerebilir.

Flow Editor'ı doğrudan yalnızca Master Process ekranına bağımlı geliştirme.

Graph Editor bileşenleri yeniden kullanılabilir olmalıdır.

Domain-specific Node renderer, inspector ve save işlemleri Master Process Variant bağlamından sağlanabilir.

Uygulama işlemleri için Server Actions kullan.

Gereksiz REST API endpoint'leri oluşturma.

## 20. Save, Concurrency & Data Integrity

Flow graph kaydetme işlemi transaction içerisinde yapılmalıdır.

- Flow metadata.
- Nodes.
- Edges.
- Node ilişkileri.

birbirleriyle tutarlı şekilde kaydedilmelidir.

Kaydetme sırasında revision durumunu tekrar doğrula.

Başka bir kullanıcı revision'ı yayınladıysa eski edit ekranından gelen mutation işlemi reddedilmelidir.

Optimistic concurrency kontrolü için revision version veya benzer bir mekanizma kullan.

İki kullanıcının değişikliklerinin birbirini sessizce ezmesini engelle.

Autosave uygulanacaksa debounce, validation ve concurrency kontrolü bulunmalıdır.

Her küçük Node hareketi için ayrı database transaction ve audit kaydı oluşturma.

Node ve Edge payload boyutlarını sınırla.

Kullanıcıdan gelen tüm graph verisini Zod veya mevcut validation mekanizması ile doğrula.

JSONB içerisindeki kullanıcı kontrollü alanları çalıştırılabilir kod olarak yorumlama.

## 21. Audit Logging

Mevcut audit altyapısını kullan.

Kayıt altına alınacak işlemler:

- Master Process created/updated/archived/restored
- Process Variant created/updated/archived/restored
- Variant derived
- Revision created
- Revision submitted
- Revision approved/rejected
- Revision released
- Flow saved
- Work Element created/updated/removed
- Function created/updated/removed
- Requirement created/updated/removed
- Applicability changed
- Source revision update applied

Audit kaydında gerekli olduğunda:

- organizationId
- actorId
- action
- targetType
- targetId
- sourceRevisionId
- targetRevisionId
- changeSummary

bulunmalıdır.

Flow içerisindeki her koordinat değişikliği için ayrı audit log üretme.

Teknik değişiklikleri revision ve anlamlı kayıt işlemleri seviyesinde izlenebilir tut.

## 22. Seed & Demo Data

Opsiyonel bir proses kütüphanesi başlangıç şablonu hazırla.

Örnek Master Processes:

1. Girdi Kalite Kontrol
2. Gelcoat
3. Vakum İnfüzyon
4. Kürleme
5. Trim
6. Bonding
7. Boya
8. Final Kalite Kontrol

GKK varyantları:

- GKK Jenerik
- GKK Metal
- GKK Kimyasal

Demo GKK Jenerik içeriği:

Flow:

Malzeme teslim al → Siparişi doğrula → Kontrol yap → Uygun mu? → Kabul / Ret

Work Elements:

- GKK operatörü
- Kontrol ekipmanı
- Gelen malzeme
- Kontrol ortamı

Demo GKK Metal:

- GKK Jenerik'ten türetilmiş.
- Sertifika kontrolü eklenecek.
- Boyutsal kontrol eklenecek.
- Kumpas ve metal parça Work Element'leri tanımlanacak.

Demo GKK Kimyasal:

- GKK Jenerik'ten türetilmiş.
- Parti ve raf ömrü kontrolü eklenecek.
- Analiz sertifikası değerlendirmesi eklenecek.

Bu verileri bütün production organizasyonlarına otomatik olarak yükleme.

Kullanıcı tarafından seçilebilen başlangıç şablonu veya development seed olarak sun.

Örnek kalite gerekliliklerini gerçek müşteri tarafından onaylanmış gereklilikler gibi gösterme.

## 23. Implementation Order

1. Phase 1 ve Phase 2 repository durumunu doğrula.
2. Mevcut schema ve permission yapılarını incele.
3. Master Process ve Process Variant entity'lerini tasarla.
4. Process Variant Revision lifecycle'ını oluştur.
5. Flow, Flow Node ve Flow Edge modelini oluştur.
6. Revision ownership ve graph integrity kurallarını uygula.
7. Process Work Element schema ve ilişkilerini oluştur.
8. Function ve Requirement schema'larını oluştur.
9. Inputs/Outputs ve Applicability modelini oluştur.
10. Generic-to-Specialized derivation servisini geliştir.
11. Stable lineage ve revision copy işlemlerini geliştir.
12. Additive database migration hazırla.
13. Permission catalog ve role template'lerini genişlet.
14. Master Process ve Variant CRUD ekranlarını geliştir.
15. Reusable Flow Editor geliştir.
16. Work Element ve Function/Requirement ekranlarını geliştir.
17. Inputs/Outputs ve Applicability ekranlarını geliştir.
18. Revision history ve revision compare geliştir.
19. Controlled source update mekanizmasını geliştir.
20. Audit, tenant isolation ve concurrency testlerini tamamla.
21. TypeScript, Biome, test ve build kontrollerini çalıştır.

## 24. Acceptance Criteria

### Scenario A – Master Process Library

- Kullanıcı GKK Master Process oluşturabilir.
- GKK Jenerik, GKK Metal ve GKK Kimyasal varyantlarını tanımlayabilir.
- Her varyant bağımsız revision geçmişine sahiptir.
- Master Process üzerinde OP10 veya OP20 numarası oluşturulması zorunlu değildir.

### Scenario B – Flow Editor

- GKK Jenerik için Flow oluşturulabilir.
- START, ACTIVITY, INSPECTION, DECISION ve END Node'ları eklenebilir.
- YES/NO ve OK/NOK bağlantıları oluşturulabilir.
- Paralel dallar desteklenir.
- Rework döngüsü oluşturulabilir.
- Diyagram kaydedilip tekrar açıldığında Node ve Edge ilişkileri korunur.
- Başka Flow'a ait Node kullanılarak Edge oluşturulamaz.

### Scenario C – Process Work Elements

- GKK Metal için MAN, MACHINE, MATERIAL ve ENVIRONMENT kayıtları oluşturulabilir.
- MACHINE kategorisinde birden fazla ekipman tanımlanabilir.
- Flow Node birden fazla Work Element'e bağlanabilir.
- Work Element'e Function ve Requirement ilişkilendirilebilir.
- Flow Node ile Work Element birbirinden bağımsız entity olarak çalışır.

### Scenario D – Derivation

- GKK Jenerik REV.01 yayınlanabilir.
- GKK Metal bu revision'dan türetilebilir.
- Kopyalanan Flow Node, Edge, Work Element ve Function ilişkileri korunur.
- GKK Metal içerikleri bağımsız düzenlenebilir.
- GKK Jenerik kaydı bu değişikliklerden etkilenmez.
- GKK Kimyasal aynı jenerik revision'dan ayrıca türetilebilir.

### Scenario E – Controlled Update

- GKK Jenerik REV.02 oluşturulabilir ve yayınlanabilir.
- GKK Metal'in eski source revision kullandığı görüntülenebilir.
- REV.01 ile REV.02 arasındaki farklar gösterilebilir.
- Yeni bilgiler GKK Metal'in yeni DRAFT revision'ına seçilerek aktarılabilir.
- Specialized varyantın kendine özgü değişiklikleri otomatik ezilmez.
- Yayınlanmış revision'lar otomatik değiştirilmez.

### Scenario F – Applicability

- GKK Metal, METAL Item Group ile ilişkilendirilebilir.
- GKK Kimyasal, CHEMICAL Item Group ile ilişkilendirilebilir.
- PURCHASED Supply Type koşulu tanımlanabilir.
- Item Group alt gruplarının dahil edilmesi seçilebilir.
- Inputs ve Outputs opsiyonel olarak oluşturulabilir.
- Process State tanımlamak veya ayrı yarı mamul oluşturmak zorunlu değildir.

### Scenario G – Security & Revision

- Yetkisiz kullanıcı Master Process oluşturamaz.
- Update izni bulunması release izni vermez.
- Başka organizasyona ait Flow, Variant veya Item Group bağlanamaz.
- RELEASED revision içeriği değiştirilemez.
- Eski bir edit ekranı yayınlanmış revision'ı değiştiremez.
- Revision publish ve derivation işlemleri audit kayıtlarında bulunur.
- Mevcut Phase 1 ve Phase 2 özellikleri çalışmaya devam eder.

## 25. Restrictions

- Bu fazda tam Project Process Flow modülünü implement etme.
- Process Flow referanslarının proje entegrasyonunu implement etme.
- Project Item'ları ortak Process Flow'a bağlama.
- BOM tabanlı otomatik Process Step öneri motorunu geliştirme.
- AIAG–VDA PFMEA editörünü geliştirme.
- Action Priority hesaplamasını geliştirme.
- Control Plan editörünü geliştirme.
- NCR, 8D veya REX modüllerini geliştirme.
- Equipment, calibration veya MES execution modüllerini oluşturma.
- Flow diyagramlarını gerçek otomatik iş akışı olarak çalıştırma.
- Authentication mimarisini değiştirme.
- Mevcut production database'i resetleme.
- Migration geçmişini silme.
- Production rol ve permission kayıtlarını kontrolsüz güncelleme.
- RELEASED teknik içerikleri doğrudan değiştirme.
- Kullanıcı onayı olmadan main branch'e merge veya production deployment yapma.

Implementation başlamadan önce:

- Mevcut Phase 1 ve Phase 2 durumunu incele.
- Önerilen entity ilişkilerini sun.
- Flow ownership modelini açıkla.
- Revision lifecycle modelini açıkla.
- Generic-to-Specialized copy ve lineage modelini açıkla.
- Permission değişikliklerini listele.
- Değiştirilecek dosyaları belirt.
- Belirsiz iş kurallarını ve teknik riskleri raporla.

Plan onaylandıktan sonra implementation'a geç.

Phase 3 tamamlandıktan sonra kendiliğinden sonraki faza geçme.