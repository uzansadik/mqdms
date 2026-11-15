import pg from "pg";

const { Client } = pg;

/**
 * Legacy BOM verisini temizler.
 *
 * Yeni BOM modeli (tek revision, hiyerarşik satırlar) eski modelin ürettiği
 * veriyle birlikte kullanılamaz:
 *
 * - `bom_revision.revision_number` NOT NULL eklenir; eski satırlarda bu değer
 *   yoktur ve migration hata verir.
 * - Yeni kısmi unique index'ler (BOM başına tek aktif BOM, tek açık revision)
 *   eski modelin ürettiği mükerrer kayıtlarla çakışır.
 *
 * Bu script migration'lardan **önce** çalışır ve legacy şemayı tanıdığı
 * organizasyonlarda BOM verisini temizler. Yeni şema uygulandıktan sonra
 * `bom_line.child_bom_revision_id` kolonu yoktur; script bu durumda hiçbir
 * şeye dokunmadan çıkar.
 *
 * Sıralama önemlidir: önce proje bağlantıları çözülür, sonra alt satırlar,
 * sonra revision'lar, en son BOM başlıkları silinir. Yabancı anahtar
 * kısıtları `NO ACTION` olduğu için bu sıra zorunludur.
 */

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is missing");
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();

/** Legacy şema var mı? Yeni modelde `child_bom_revision_id` kaldırıldı. */
const legacy = await client.query(`
  select 1
  from information_schema.columns
  where table_name = 'bom_line' and column_name = 'child_bom_revision_id'
  limit 1
`);

if (legacy.rowCount === 0) {
  console.log("ℹ️  Legacy BOM şeması bulunamadı, temizlik atlanıyor.");

  await client.end();

  process.exit(0);
}

const counts = await client.query(`
  select
    (select count(*)::int from bom) as bom,
    (select count(*)::int from bom_revision) as revision,
    (select count(*)::int from bom_line) as line,
    (select count(*)::int from project_item where bom_revision_id is not null) as pinned
`);

const { bom, revision, line, pinned } = counts.rows[0];

if (bom === 0 && revision === 0 && line === 0) {
  console.log("ℹ️  Temizlenecek legacy BOM verisi yok.");

  await client.end();

  process.exit(0);
}

console.log(
  `🧹 Legacy BOM verisi temizleniyor: ${bom} BOM, ${revision} revision, ${line} satır, ${pinned} proje bağlantısı.`,
);

await client.query("begin");

try {
  await client.query(
    "update project_item set bom_revision_id = null where bom_revision_id is not null",
  );

  await client.query("delete from bom_line");
  await client.query("delete from bom_revision");
  await client.query("delete from bom");

  await client.query("commit");
} catch (error) {
  await client.query("rollback");

  console.error("❌ Legacy BOM temizliği başarısız:", error.message);

  await client.end();

  process.exit(1);
}

await client.end();

console.log("✅ Legacy BOM verisi temizlendi.");
