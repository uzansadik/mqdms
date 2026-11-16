/**
 * BOM mock verisi.
 *
 * Şema `packages/db/src/schema/inventory/bom.ts` ile birebir aynıdır:
 * `bom`, `bom_revision` ve `bom_line` kayıtlarının laboratuvar karşılığıdır.
 * Veritabanı yoktur; satırlar burada üretilir.
 */

/** Ürün kartı (`item` tablosunun sınıflandırma alanlarıyla). */
export type MockItem = {
  id: string;
  code: string;
  name: string;
  itemType:
    | "FINISHED_GOOD"
    | "SEMI_FINISHED"
    | "RAW_MATERIAL"
    | "COMPONENT"
    | "CONSUMABLE"
    | "OTHER";
  structureType: "ASSEMBLY" | "GROUP" | "PART";
  supplyType: "MANUFACTURED" | "PURCHASED" | "OUTSOURCED" | "MIXED" | "UNKNOWN";
  isSellable: boolean;
  unitOfMeasureId: string;
  unitOfMeasureCode: string;
};

/** BOM başlığı (`bom` tablosu). */
export type MockBom = {
  id: string;
  organizationId: string;
  itemId: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  archivedAt: Date | null;
};

/** BOM revision'ı (`bom_revision` tablosu). */
export type MockBomRevision = {
  id: string;
  organizationId: string;
  bomId: string;
  revisionNumber: number;
  revision: string;
  status: "DRAFT" | "IN_REVIEW" | "RELEASED" | "SUPERSEDED";
  lockVersion: number;
};

/** BOM satırı (`bom_line` tablosu). */
export type MockBomLine = {
  id: string;
  organizationId: string;
  bomRevisionId: string;
  parentLineId: string | null;
  lineageId: string;
  childItemId: string;
  childItemRevisionId: string | null;
  lineNumber: number;
  sortOrder: number;
  quantity: number;
  unitOfMeasureId: string | null;
};

/** Birimler (`item_unit` tablosu). */
export const MOCK_UNITS = [
  { id: "unit-adet", code: "AD", name: "Adet" },
  { id: "unit-kg", code: "KG", name: "Kilogram" },
  { id: "unit-m", code: "M", name: "Metre" },
  { id: "unit-set", code: "SET", name: "Set" },
];

/** Ürün kataloğu. */
export const MOCK_ITEMS: MockItem[] = [
  {
    id: "item-001",
    code: "001",
    name: "Elektrikli Bisiklet",
    itemType: "FINISHED_GOOD",
    structureType: "ASSEMBLY",
    supplyType: "MANUFACTURED",
    isSellable: true,
    unitOfMeasureId: "unit-adet",
    unitOfMeasureCode: "AD",
  },
  {
    id: "item-100",
    code: "100",
    name: "Gövde Grubu",
    itemType: "COMPONENT",
    structureType: "GROUP",
    supplyType: "MANUFACTURED",
    isSellable: false,
    unitOfMeasureId: "unit-adet",
    unitOfMeasureCode: "AD",
  },
  {
    id: "item-101",
    code: "101",
    name: "Alüminyum Kadro",
    itemType: "COMPONENT",
    structureType: "PART",
    supplyType: "PURCHASED",
    isSellable: false,
    unitOfMeasureId: "unit-adet",
    unitOfMeasureCode: "AD",
  },
  {
    id: "item-102",
    code: "102",
    name: "Ön Maşa",
    itemType: "COMPONENT",
    structureType: "PART",
    supplyType: "PURCHASED",
    isSellable: false,
    unitOfMeasureId: "unit-adet",
    unitOfMeasureCode: "AD",
  },
  {
    id: "item-103",
    code: "103",
    name: "Bağlantı Civatası M8x20",
    itemType: "COMPONENT",
    structureType: "PART",
    supplyType: "PURCHASED",
    isSellable: false,
    unitOfMeasureId: "unit-adet",
    unitOfMeasureCode: "AD",
  },
  {
    id: "item-200",
    code: "200",
    name: "Tahrik ve Güç Grubu",
    itemType: "COMPONENT",
    structureType: "GROUP",
    supplyType: "MANUFACTURED",
    isSellable: false,
    unitOfMeasureId: "unit-adet",
    unitOfMeasureCode: "AD",
  },
  {
    id: "item-201",
    code: "201",
    name: "Elektrik Motoru 250W",
    itemType: "COMPONENT",
    structureType: "PART",
    supplyType: "PURCHASED",
    isSellable: false,
    unitOfMeasureId: "unit-adet",
    unitOfMeasureCode: "AD",
  },
  {
    id: "item-202",
    code: "202",
    name: "Batarya Paketi 36V",
    itemType: "COMPONENT",
    structureType: "ASSEMBLY",
    supplyType: "MANUFACTURED",
    isSellable: false,
    unitOfMeasureId: "unit-adet",
    unitOfMeasureCode: "AD",
  },
  {
    id: "item-202-a",
    code: "202-A",
    name: "Lityum İyon Hücre 18650",
    itemType: "COMPONENT",
    structureType: "PART",
    supplyType: "PURCHASED",
    isSellable: false,
    unitOfMeasureId: "unit-adet",
    unitOfMeasureCode: "AD",
  },
  {
    id: "item-202-b",
    code: "202-B",
    name: "BMS Devre Kartı",
    itemType: "COMPONENT",
    structureType: "PART",
    supplyType: "PURCHASED",
    isSellable: false,
    unitOfMeasureId: "unit-adet",
    unitOfMeasureCode: "AD",
  },
  {
    id: "item-203",
    code: "203",
    name: "Koltuk Ana Grubu",
    itemType: "COMPONENT",
    structureType: "GROUP",
    supplyType: "MANUFACTURED",
    isSellable: false,
    unitOfMeasureId: "unit-adet",
    unitOfMeasureCode: "AD",
  },
  {
    id: "item-203-a",
    code: "203-A",
    name: "Koltuk Süngeri Grubu",
    itemType: "COMPONENT",
    structureType: "GROUP",
    supplyType: "MANUFACTURED",
    isSellable: false,
    unitOfMeasureId: "unit-adet",
    unitOfMeasureCode: "AD",
  },
  {
    id: "item-203-a-1",
    code: "203-A-1",
    name: "Koltuk Süngeri",
    itemType: "RAW_MATERIAL",
    structureType: "PART",
    supplyType: "PURCHASED",
    isSellable: false,
    unitOfMeasureId: "unit-kg",
    unitOfMeasureCode: "KG",
  },
  {
    id: "item-203-a-2",
    code: "203-A-2",
    name: "Koltuk Süngeri Tutucu Braket Grubu",
    itemType: "COMPONENT",
    structureType: "GROUP",
    supplyType: "MANUFACTURED",
    isSellable: false,
    unitOfMeasureId: "unit-adet",
    unitOfMeasureCode: "AD",
  },
  {
    id: "item-203-a-2-1",
    code: "203-A-2-1",
    name: "ST37-Braket",
    itemType: "COMPONENT",
    structureType: "PART",
    supplyType: "PURCHASED",
    isSellable: false,
    unitOfMeasureId: "unit-adet",
    unitOfMeasureCode: "AD",
  },
  {
    id: "item-203-a-2-2",
    code: "203-A-2-2",
    name: "M10 Civata",
    itemType: "COMPONENT",
    structureType: "PART",
    supplyType: "PURCHASED",
    isSellable: false,
    unitOfMeasureId: "unit-adet",
    unitOfMeasureCode: "AD",
  },
];

/** BOM başlığı. */
export const MOCK_BOM: MockBom = {
  id: "bom-1",
  organizationId: "org-1",
  itemId: "item-001",
  code: "BOM-001",
  name: "Elektrikli Bisiklet",
  status: "ACTIVE",
  archivedAt: null,
};

/** Revision. */
export const MOCK_REVISION: MockBomRevision = {
  id: "bom-rev-1",
  organizationId: "org-1",
  bomId: "bom-1",
  revisionNumber: 1,
  revision: "REV.01",
  status: "DRAFT",
  lockVersion: 1,
};

/** Ağaç tanımı: üst satır kodu → alt satırlar. */
type MockTreeSpec = {
  itemCode: string;
  quantity?: number;
  children?: MockTreeSpec[];
};

/** Bisiklet ağacı (plan §2). */
const MOCK_TREE: MockTreeSpec[] = [
  {
    itemCode: "100",
    children: [{ itemCode: "101" }, { itemCode: "102" }, { itemCode: "103", quantity: 4 }],
  },
  {
    itemCode: "200",
    children: [
      { itemCode: "201" },
      {
        itemCode: "202",
        children: [{ itemCode: "202-A", quantity: 40 }, { itemCode: "202-B" }],
      },
      {
        itemCode: "203",
        children: [
          {
            itemCode: "203-A",
            children: [
              { itemCode: "203-A-1" },
              {
                itemCode: "203-A-2",
                quantity: 2,
                children: [{ itemCode: "203-A-2-1" }, { itemCode: "203-A-2-2", quantity: 4 }],
              },
            ],
          },
        ],
      },
    ],
  },
];

/**
 * Ağaç tanımından `bom_line` satırlarını üretir.
 *
 * Satır numarası revision içinde globaldir (veritabanındaki
 * `bom_line.line_number` kısıtı), sıra numarası ise kardeşler arasındadır
 * (`bom_line.sort_order`).
 */
export function buildMockBomLines(): MockBomLine[] {
  const lines: MockBomLine[] = [];

  let lineNumber = 0;

  const walk = (specs: MockTreeSpec[], parentLineId: string | null) => {
    specs.forEach((spec, index) => {
      lineNumber += 1;

      const id = `line-${lineNumber}`;

      const item = MOCK_ITEMS.find((candidate) => candidate.code === spec.itemCode);

      lines.push({
        id,
        organizationId: "org-1",
        bomRevisionId: MOCK_REVISION.id,
        parentLineId,
        lineageId: `lineage-${lineNumber}`,
        childItemId: item?.id ?? "item-bilinmiyor",
        childItemRevisionId: null,
        lineNumber,
        sortOrder: index,
        quantity: spec.quantity ?? 1,
        unitOfMeasureId: item?.unitOfMeasureId ?? "unit-adet",
      });

      if (spec.children) {
        walk(spec.children, id);
      }
    });
  };

  walk(MOCK_TREE, null);

  return lines;
}

/** Kök ürün (`bom.header` bilgisiyle birlikte). */
export const MOCK_ROOT_ITEM = MOCK_ITEMS.find((item) => item.id === "item-001") as MockItem;

/** Stok koduna göre ürün arar. */
export function findMockItemByCode(code: string): MockItem | undefined {
  const normalized = code.trim().toLowerCase();

  return MOCK_ITEMS.find((item) => item.code.toLowerCase() === normalized);
}
