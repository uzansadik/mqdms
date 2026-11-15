/**
 * Kolon eşleştirme önerileri.
 *
 * Kullanıcı dosyanın kolonlarını hedef alanlara eşler. Öneri, başlık adlarının
 * normalize karşılaştırmasıyla yapılır: kullanıcı elle eşleştirmeden önce
 * doğru eşleşmeleri görmek ister.
 *
 * Bu modül saf fonksiyonlardan oluşur: eşleştirme kuralları veritabanından
 * bağımsız test edilir.
 */

/**
 * Türkçe harflerin ASCII karşılıkları.
 *
 * Aksanlar karşılaştırma sırasında yok sayılır; ancak önce ASCII'ye
 * çevrilir: aksi halde "Ürün" → "rn" gibi okunmayan değerler oluşur.
 */
const TRANSLITERATIONS: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  İ: "i",
  ö: "o",
  ş: "s",
  ü: "u",
};

/**
 * Başlık adını karşılaştırma için normalize eder.
 *
 * Büyük/küçük harf, aksan, boşluk ve ayraçlar dikkate alınmaz:
 * `"Ürün Kodu"`, `"ürün_kodu"` ve `"ÜrünKodu"` aynı normalize değere düşer.
 */
export function normalizeHeader(value: string): string {
  const transliterated = value
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/[çğıİöşü]/g, (char) => TRANSLITERATIONS[char] ?? char);

  return transliterated.replace(/[^a-z0-9]+/g, "");
}

/**
 * Hedef alan adları için bilinen başlık takma adları.
 *
 * Dosyalar genellikle Türkçe başlıklar kullanır; hedef alan adları ise
 * veritabanı kolon adlarıdır.
 */
const FIELD_ALIASES: Record<string, readonly string[]> = {
  code: ["kod", "ürünkodu", "malzemekodu", "itemcode", "stokkodu", "partnumber"],
  name: ["ad", "isim", "ürünadı", "malzemeadı", "itemname", "açıklama", "description"],
  itemGroup: ["ürüngrubu", "grup", "itemgroup", "grupp adi", "grubadi"],
  itemType: ["ürüntipi", "tip", "itemtype", "tür"],
  supplyType: ["tedariktipi", "tedarik", "supplytype", "kaynak"],
  unit: ["birim", "unit", "birimkodu", "ölçübirim"],
  revision: ["revizyon", "revision", "versiyon", "sürüm"],
  erpReference: ["erpreference", "erpkodu", "erp", "referans", "erp referans"],
  itemCode: ["ürünkodu", "itemcode", "stokkodu", "malzemekodu"],
  groupCode: ["grupkodu", "groupcode", "ürüngrubukodu"],
  customerCode: ["müşterikodu", "customercode", "carikod", "müşteri"],
  customerPartNumber: ["müşteriparçano", "customerpartnumber", "parçano", "partnumber"],
  customerPartName: ["müşteriparçaadı", "customerpartname", "parçaadı"],
  customerRevision: ["müşterirevizyon", "customerrevision"],
  internalRevision: ["şirketrevizyon", "internalrevision", "ürünrevizyon"],
  parentItemCode: ["üstürünkodu", "parentitemcode", "üst", "anaürün"],
  childItemCode: ["altürünkodu", "childitemcode", "alt", "bileşen"],
  quantity: ["miktar", "adet", "quantity", "qty"],
  lineNumber: ["satırsıra", "linenumber", "sıra"],
  bomRevision: ["bomrevizyon", "bomrevision", "revizyon"],
  parentItemRevision: ["üstürünrevizyon", "parentitemrevision"],
  childItemRevision: ["altürünrevizyon", "childitemrevision"],
};

/** Bir başlığın hedef alan adına eşleşip eşleşmediğini kontrol eder. */
function matchesField(header: string, field: string): boolean {
  const normalizedHeader = normalizeHeader(header);
  const normalizedField = normalizeHeader(field);

  if (normalizedHeader === normalizedField) {
    return true;
  }

  const aliases = FIELD_ALIASES[field] ?? [];

  return aliases.some((alias) => normalizeHeader(alias) === normalizedHeader);
}

/**
 * Başlıklara göre önerilen eşleştirme.
 *
 * Önce birebir ad eşleşmesi aranır; bulunamayan alanlar için takma adlar
 * denenir. Bir başlık yalnızca bir alana eşlenir.
 *
 * @param fields hedef alan adları.
 * @param headers dosyadaki kolon başlıkları.
 */
export function suggestMapping(
  fields: readonly string[],
  headers: readonly string[],
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedHeaders = new Set<string>();

  for (const field of fields) {
    const header = headers.find((entry) => !usedHeaders.has(entry) && matchesField(entry, field));

    if (!header) {
      continue;
    }

    mapping[field] = header;
    usedHeaders.add(header);
  }

  return mapping;
}
