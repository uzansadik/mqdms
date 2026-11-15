-- Legacy ürün ve BOM verisi temizlenir.
--
-- Yeni BOM modeli eski modelin ürettiği veriyle birlikte kullanılamaz:
-- sınıflandırma alanları (is_sellable, structure_type) migration sırasında
-- varsayılan değerlerle eklendi ve hiçbir kart elle sınıflandırılmadı.
-- Böylece hiçbir ürün BOM kökü olamaz durumda kalır.
--
-- Sıralama yabancı anahtar kısıtlarını takip eder:
--
-- 1. Süreç kütüphanesi ve müşteri ürün revision'ları item'a "no action"
--    ile referans verir; bu referanslar önce null'lanır. Süreç tanımları
--    silinmez, yalnızca ürün bağlantıları boşaltılır.
-- 2. Proje bağlantıları (customer_item, customer_item_revision ve
--    bom_revision referansları "no action") temizlenir.
-- 3. BOM satırları (child_item referansı "no action"), revision'lar ve
--    başlıklar silinir.
-- 4. Ürün kartları silinir. item'a bağlı item_revision,
--    item_external_reference ve customer_item kayıtları cascade ile silinir.
--
-- Bu migration bir kez çalışır: Drizzle migration geçmişine yazılır.

update "process_io_definition"
set "item_id" = null
where "item_id" is not null;

update "process_work_element"
set "item_id" = null
where "item_id" is not null;

update "customer_item_revision"
set "internal_item_revision_id" = null
where "internal_item_revision_id" is not null;

delete from "project_item";

delete from "bom_line";

delete from "bom_revision";

delete from "bom";

delete from "item";
