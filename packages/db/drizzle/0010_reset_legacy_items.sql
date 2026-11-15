-- Legacy ürün ve BOM verisi temizlenir.
--
-- Yeni BOM modeli eski modelin ürettiği veriyle birlikte kullanılamaz:
-- sınıflandırma alanları (is_sellable, structure_type) migration sırasında
-- varsayılan değerlerle eklendi ve hiçbir kart elle sınıflandırılmadı.
-- Böylece hiçbir ürün BOM kökü olamaz durumda kalır.
--
-- Sıralama yabancı anahtar kısıtlarını takip eder: önce proje bağlantıları
-- (customer_item ve item referansları "no action"), sonra BOM satırları
-- (child_item referansı "no action"), revision'lar ve başlıklar, en son ürün
-- kartları. item'a bağlı item_revision, item_external_reference ve
-- customer_item kayıtları cascade ile silinir.
--
-- Bu migration bir kez çalışır: Drizzle migration geçmişine yazılır.

delete from "project_item";

delete from "bom_line";

delete from "bom_revision";

delete from "bom";

delete from "item";
