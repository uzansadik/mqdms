/**
 * MQDMS kaynak kataloğu.
 *
 * Kaynaklar ve aksiyonları kod içinde sabittir; çalışma zamanında
 * değiştirilemez. MQDMS alanı genişledikçe buraya eklenir — izin tanımlarının
 * tek kaynağı budur.
 *
 * Bir kaynak, birden fazla aksiyona sahip olabilir. Aksiyon adları
 * `resource:action` biçiminde ifade edilir.
 *
 * Katalogdaki bir aksiyon için henüz bir route veya mutation yoksa bile
 * tanım tutulur: katalog bir **sözleşmedir** ve ilgili modül geliştirildiğinde
 * guard zorunlu kılınır.
 */
export const resources = {
  fmea: {
    label: "FMEA",
    actions: ["create", "read", "update", "save", "submit", "approve", "reject", "delete"],
  },
  synoptic: {
    label: "Sinoptik",
    actions: ["read", "update"],
  },
  processFlow: {
    label: "Proses Akışı",
    actions: ["read", "create", "update", "submit", "approve", "reject", "delete"],
  },
  controlPlan: {
    label: "Kontrol Planı",
    actions: ["read", "create", "update", "submit", "approve", "reject", "delete"],
  },
  ncr: {
    label: "Düzeltici Faaliyet",
    actions: ["read", "create", "update", "close"],
  },
  projects: {
    label: "Projeler",
    actions: [
      "read",
      "create",
      "update",
      "delete",
      "archive",
      "restore",
      "manageMembers",
      "manageItems",
    ],
  },
  customers: {
    label: "Müşteriler",
    actions: ["read", "create", "update", "archive", "restore"],
  },
  plants: {
    label: "Tesisler",
    actions: ["read", "create", "update", "archive", "restore"],
  },
  items: {
    label: "Ürünler",
    actions: [
      "read",
      "create",
      "update",
      "archive",
      "restore",
      "manageRevisions",
      "releaseRevision",
    ],
  },
  itemGroups: {
    label: "Ürün Grupları",
    actions: ["read", "create", "update", "archive"],
  },
  boms: {
    label: "BOM",
    actions: ["read", "create", "update", "submit", "release", "archive", "compare"],
  },
  imports: {
    label: "İçe Aktarım",
    actions: ["read", "create", "execute"],
  },
  reports: {
    label: "Raporlar",
    actions: ["read", "export"],
  },
} as const;

export type ResourceKey = keyof typeof resources;

export type ResourceAction<K extends ResourceKey> = (typeof resources)[K]["actions"][number];

export type ResourceActionKey = {
  [K in ResourceKey]: `${K}:${ResourceAction<K>}`;
}[ResourceKey];

export const resourceKeys = Object.keys(resources) as ResourceKey[];

/**
 * Kaynak katalogda var mı?
 *
 * `Object.hasOwn` kullanılır: `"constructor"` gibi bir prototype anahtarı
 * `in` operatörüyle yanlışlıkla katalogda varmış gibi görünürdü.
 */
export function isResourceKey(value: string): value is ResourceKey {
  return Object.hasOwn(resources, value);
}

export function isResourceActionKey(value: string): value is ResourceActionKey {
  const separator = value.indexOf(":");

  if (separator === -1) {
    return false;
  }

  const resource = value.slice(0, separator);
  const action = value.slice(separator + 1);

  if (!isResourceKey(resource)) {
    return false;
  }

  return (resources[resource].actions as readonly string[]).includes(action);
}

/** Kaynağın tüm aksiyonları. */
export function getResourceActions(resource: ResourceKey): readonly string[] {
  return resources[resource].actions;
}

/** Kaynağın görünen adı. */
export function getResourceLabel(resource: ResourceKey): string {
  return resources[resource].label;
}

/**
 * Katalogdaki tüm `resource:action` çiftleri.
 *
 * Roller bu listeye göre doğrulanır: katalog dışı bir aksiyonla rol veya
 * grant üretilemez.
 */
export function getAllResourceActionKeys(): ResourceActionKey[] {
  const keys: ResourceActionKey[] = [];

  for (const resource of resourceKeys) {
    for (const action of resources[resource].actions) {
      keys.push(`${resource}:${action}` as ResourceActionKey);
    }
  }

  return keys;
}
