import { type ResourceAction, type ResourceKey, resources } from "../resources";

/**
 * Fabrika rol kataloğu.
 *
 * Bu modül saf veridir: veritabanına, ortama veya Node'a özgü modüllere
 * bağımlı değildir. Seed işleminin kendisi `factory.ts` içindedir.
 *
 * Bunlar **başlangıç** şablonlarıdır: organizasyon açıldığında seed edilir ve
 * owner tarafından düzenlenebilir. Yeniden seed mevcut düzenlemeleri ezmez.
 *
 * Roller allow-only'dir: `delete` yetkisi hiçbir seed role verilmez. Bir
 * yetki gerekiyorsa owner özel bir rol oluşturur veya üye bazlı allow
 * grant'ı verir.
 */
export type RolePermissions = {
  [K in ResourceKey]?: readonly ResourceAction<K>[];
};

export type FactoryRoleTemplate = {
  /** Değişmez tanımlayıcı. */
  slug: string;

  /** Görünen ad. */
  name: string;

  /** Kısa açıklama. */
  description: string;

  /**
   * Seed'in hedef durumu: tüm sürümlerin birleşimi.
   *
   * Yeni bir organizasyon bu izinlerin tamamıyla seed edilir.
   */
  permissions: RolePermissions;

  /**
   * Sürüm sürüm eklenen izinler.
   *
   * Anahtar seed sürümüdür (`"2"`, `"3"`, ...). Bir organizasyonun rolü
   * `seed_version` değerini `1`'den `2`'ye taşıdığında **yalnızca** `"2"`
   * anahtarındaki izinler uygulanır.
   *
   * Bu ayrım önemlidir: owner'ın seed rolünden **kaldırdığı** bir izin
   * yeni sürümde yeniden tanımlanmadıkça geri gelmez. Yalnızca o sürümde
   * açıkça tanımlanan izinler eklenir.
   */
  versionPermissions: Record<string, RolePermissions>;
};

/**
 * Tüm iş kaynaklarının okuma izni.
 *
 * `plant-manager` ve `auditor` rollerinde kullanılır.
 */
function allRead(): RolePermissions {
  const permissions = {} as Record<ResourceKey, readonly string[]>;

  for (const key of Object.keys(resources) as ResourceKey[]) {
    permissions[key] = resources[key].actions.filter((action) => action === "read");
  }

  return permissions as RolePermissions;
}

/**
 * Fabrika rol kataloğu.
 *
 * Bu bir *sözleşmedir*: katalogdaki kaynak/aksiyon çiftleri permission
 * kataloguyla doğrulanır. Katalog dışı bir aksiyon seed edilemez.
 */
export const factoryRoleTemplates: readonly FactoryRoleTemplate[] = [
  {
    slug: "plant-manager",
    name: "Fabrika Müdürü",
    description:
      "Tüm iş kaynaklarını okur, rapor dışa aktarır, FMEA/proses/kontrol planı onaylar ve NCR kapatır.",
    permissions: {
      ...allRead(),
      fmea: ["read", "approve", "reject"],
      synoptic: ["read", "update"],
      processFlow: ["read", "approve", "reject"],
      controlPlan: ["read", "approve", "reject"],
      ncr: ["read", "close"],
      reports: ["read", "export"],
      customers: ["read"],
      plants: ["read", "create", "update", "archive", "restore"],
      projects: ["read", "create", "update", "archive", "restore", "manageMembers", "manageItems"],
      items: [
        "read",
        "create",
        "update",
        "archive",
        "restore",
        "manageRevisions",
        "releaseRevision",
      ],
      itemGroups: ["read", "create", "update", "archive"],
      boms: ["read", "create", "update", "submit", "release", "archive", "compare"],
      imports: ["read", "create", "execute"],

      masterProcesses: ["read"],
      processVariants: ["read", "approve", "release"],
    },
    versionPermissions: {
      "2": {
        customers: ["read"],
        plants: ["read", "create", "update", "archive", "restore"],
        projects: ["create", "update", "archive", "restore", "manageMembers"],
      },
      "3": {
        projects: ["manageItems"],
        items: ["create", "update", "archive", "restore", "manageRevisions", "releaseRevision"],
        itemGroups: ["read", "create", "update", "archive"],
        boms: ["read", "create", "update", "submit", "release", "archive", "compare"],
        imports: ["read", "create", "execute"],
      },

      "4": {
        masterProcesses: ["read"],
        processVariants: ["read", "approve", "release"],
      },
    },
  },
  {
    slug: "project-manager",
    name: "Proje Müdürü",
    description:
      "Proje ve ürün kayıtlarını yönetir; FMEA, proses akışı ve kontrol planı kayıtlarını hazırlar ve gönderir.",
    permissions: {
      fmea: ["read", "create", "update", "save", "submit"],
      synoptic: ["read"],
      processFlow: ["read", "create", "update", "submit"],
      controlPlan: ["read", "create", "update", "submit"],
      ncr: ["read"],
      projects: ["read", "create", "update", "archive", "restore", "manageMembers", "manageItems"],
      items: ["read", "create", "update"],
      itemGroups: ["read"],
      boms: ["read", "create", "update", "submit"],
      imports: ["read", "execute"],
      reports: ["read"],
      customers: ["read"],
      plants: ["read"],

      masterProcesses: ["read"],
      processVariants: ["read"],
    },
    versionPermissions: {
      "2": {
        customers: ["read"],
        plants: ["read"],
        projects: ["archive", "restore", "manageMembers"],
      },
      "3": {
        projects: ["manageItems"],
        items: ["create", "update"],
        itemGroups: ["read"],
        boms: ["read", "create", "update", "submit"],
        imports: ["read", "execute"],
      },

      "4": {
        masterProcesses: ["read"],
        processVariants: ["read"],
      },
    },
  },
  {
    slug: "project-engineer",
    name: "Proje Mühendisi",
    description: "FMEA ve proses akışı kayıtlarını hazırlar, gönderir; kontrol planını okur.",
    permissions: {
      fmea: ["read", "create", "update", "save", "submit"],
      synoptic: ["read"],
      processFlow: ["read", "create", "update", "submit"],
      controlPlan: ["read"],
      ncr: ["read"],
      projects: ["read", "manageItems"],
      items: ["read"],
      itemGroups: ["read"],
      boms: ["read"],
      imports: ["read"],
      reports: ["read"],
      customers: ["read"],
      plants: ["read"],

      masterProcesses: ["read"],
      processVariants: ["read"],
    },
    versionPermissions: {
      "2": {
        customers: ["read"],
        plants: ["read"],
      },
      "3": {
        projects: ["manageItems"],
        itemGroups: ["read"],
        boms: ["read"],
        imports: ["read"],
      },

      "4": {
        masterProcesses: ["read"],
        processVariants: ["read"],
      },
    },
  },
  {
    slug: "quality-manager",
    name: "Kalite Müdürü",
    description:
      "FMEA/proses/kontrol planı kayıtlarını onaylar ve reddeder; NCR yönetir ve rapor üretir.",
    permissions: {
      fmea: ["read", "approve", "reject"],
      synoptic: ["read"],
      processFlow: ["read", "approve", "reject"],
      controlPlan: ["read", "approve", "reject"],
      ncr: ["read", "create", "update", "close"],
      projects: ["read", "manageItems"],
      items: ["read"],
      itemGroups: ["read"],
      boms: ["read"],
      imports: ["read"],
      reports: ["read", "export"],
      customers: ["read"],
      plants: ["read"],

      masterProcesses: ["read"],
      processVariants: ["read", "approve", "reject"],
    },
    versionPermissions: {
      "2": {
        customers: ["read"],
        plants: ["read"],
      },
      "3": {
        projects: ["manageItems"],
        itemGroups: ["read"],
        boms: ["read"],
        imports: ["read"],
      },

      "4": {
        masterProcesses: ["read"],
        processVariants: ["read", "approve", "reject"],
      },
    },
  },
  {
    slug: "quality-engineer",
    name: "Kalite Mühendisi",
    description: "FMEA kaydı hazırlar ve gönderir; kontrol planı oluşturur; NCR açar ve günceller.",
    permissions: {
      fmea: ["read", "create", "update", "save", "submit"],
      synoptic: ["read"],
      processFlow: ["read"],
      controlPlan: ["read", "create", "update", "submit"],
      ncr: ["read", "create", "update"],
      projects: ["read"],
      items: ["read"],
      itemGroups: ["read"],
      boms: ["read"],
      imports: ["read"],
      reports: ["read"],
      customers: ["read"],
      plants: ["read"],

      masterProcesses: [
        "read",
        "create",
        "update",
        "archive",
        "restore",
        "manageVariants",
        "derive",
      ],
      processVariants: ["read", "create", "update", "submit", "compare"],
    },
    versionPermissions: {
      "2": {
        customers: ["read"],
        plants: ["read"],
      },
      "3": {
        itemGroups: ["read"],
        boms: ["read"],
        imports: ["read"],
      },

      "4": {
        masterProcesses: [
          "read",
          "create",
          "update",
          "archive",
          "restore",
          "manageVariants",
          "derive",
        ],
        processVariants: ["read", "create", "update", "submit", "compare"],
      },
    },
  },
  {
    slug: "production-supervisor",
    name: "Üretim Sorumlusu",
    description: "Üretim kayıtlarını okur, sinoptiği günceller ve NCR işlemlerini yürütür.",
    permissions: {
      fmea: ["read"],
      synoptic: ["read", "update"],
      processFlow: ["read"],
      controlPlan: ["read"],
      ncr: ["read", "create", "update"],
      projects: ["read"],
      items: ["read"],
      itemGroups: ["read"],
      boms: ["read"],
      reports: ["read"],
      customers: ["read"],
      plants: ["read"],

      masterProcesses: ["read"],
      processVariants: ["read"],
    },
    versionPermissions: {
      "2": {
        customers: ["read"],
        plants: ["read"],
      },
      "3": {
        itemGroups: ["read"],
        boms: ["read"],
      },

      "4": {
        masterProcesses: ["read"],
        processVariants: ["read"],
      },
    },
  },
  {
    slug: "production-operator",
    name: "Üretim Operatörü",
    description: "Proses akışı, kontrol planı ve sinoptiği okur; NCR açar.",
    permissions: {
      fmea: ["read"],
      synoptic: ["read"],
      processFlow: ["read"],
      controlPlan: ["read"],
      ncr: ["create"],
    },
    versionPermissions: {
      // Bu rol proje, ürün ve tesis kayıtlarına erişmez; sürüm 3'te izni yok.
      "2": {},
      "3": {},

      // Bu rol proses kütüphanesine erişmez.
      "4": {},
    },
  },
  {
    slug: "maintenance-supervisor",
    name: "Bakım Sorumlusu",
    description: "Ürün, proses ve sinoptik kayıtlarını okur; NCR açar ve günceller.",
    permissions: {
      fmea: ["read"],
      synoptic: ["read"],
      processFlow: ["read"],
      controlPlan: ["read"],
      ncr: ["read", "create", "update"],
      projects: ["read"],
      items: ["read"],
      itemGroups: ["read"],
      boms: ["read"],
      customers: ["read"],
      plants: ["read"],

      masterProcesses: ["read"],
      processVariants: ["read"],
    },
    versionPermissions: {
      "2": {
        customers: ["read"],
        plants: ["read"],
      },
      "3": {
        itemGroups: ["read"],
        boms: ["read"],
      },

      "4": {
        masterProcesses: ["read"],
        processVariants: ["read"],
      },
    },
  },
  {
    slug: "warehouse-logistics",
    name: "Depo / Lojistik",
    description: "Ürün kayıtlarını günceller; NCR açar.",
    permissions: {
      fmea: ["read"],
      synoptic: ["read"],
      processFlow: ["read"],
      controlPlan: ["read"],
      ncr: ["create"],
      projects: ["read"],
      items: ["read", "update"],
      itemGroups: ["read"],
      boms: ["read"],
      customers: ["read"],
      plants: ["read"],

      masterProcesses: ["read"],
      processVariants: ["read"],
    },
    versionPermissions: {
      "2": {
        customers: ["read"],
        plants: ["read"],
      },
      "3": {
        itemGroups: ["read"],
        boms: ["read"],
      },

      "4": {
        masterProcesses: ["read"],
        processVariants: ["read"],
      },
    },
  },
  {
    slug: "purchasing",
    name: "Satın Alma",
    description: "Ürün ve proje kayıtlarını okur; NCR açar ve okur.",
    permissions: {
      fmea: ["read"],
      synoptic: ["read"],
      processFlow: ["read"],
      controlPlan: ["read"],
      ncr: ["read", "create"],
      projects: ["read"],
      items: ["read"],
      itemGroups: ["read"],
      boms: ["read"],
      customers: ["read"],
      plants: ["read"],

      masterProcesses: ["read"],
      processVariants: ["read"],
    },
    versionPermissions: {
      "2": {
        customers: ["read"],
        plants: ["read"],
      },
      "3": {
        itemGroups: ["read"],
        boms: ["read"],
      },

      "4": {
        masterProcesses: ["read"],
        processVariants: ["read"],
      },
    },
  },
  {
    slug: "auditor",
    name: "Denetçi",
    description: "Tüm iş kaynaklarını okur ve rapor dışa aktarır; hiçbir kaydı değiştirmez.",
    permissions: {
      ...allRead(),
      reports: ["read", "export"],
    },
    versionPermissions: {
      "2": {
        customers: ["read"],
        plants: ["read"],
      },
      "3": {
        itemGroups: ["read"],
        boms: ["read"],
        imports: ["read"],
      },

      "4": {
        masterProcesses: ["read"],
        processVariants: ["read"],
      },
    },
  },
];

/** Seed katalogunun sürümü. */
export const FACTORY_SEED_VERSION = "4";

/**
 * Seed rolünün izin çiftleri.
 *
 * Her izin katalogda doğrulanır; katalog dışı bir aksiyon seed edilemez.
 */
export function getTemplateGrants(template: FactoryRoleTemplate): {
  resource: string;
  action: string;
}[] {
  const grants: { resource: string; action: string }[] = [];

  for (const [resource, actions] of Object.entries(template.permissions)) {
    for (const action of actions ?? []) {
      grants.push({ resource, action });
    }
  }

  return grants;
}

/**
 * Belirli bir seed sürümünün eklediği izin çiftleri.
 *
 * Bir rolün `seed_version` değeri `fromVersion`'dan küçükse, bu izinler
 * organizasyona uygulanır. Böylece owner'ın daha önce kaldırdığı izinler
 * yeni sürümde açıkça tanımlanmadıkça geri gelmez.
 */
export function getVersionGrants(
  template: FactoryRoleTemplate,
  version: string,
): { resource: string; action: string }[] {
  const grants: { resource: string; action: string }[] = [];

  for (const [resource, actions] of Object.entries(template.versionPermissions[version] ?? {})) {
    for (const action of actions ?? []) {
      grants.push({ resource, action });
    }
  }

  return grants;
}

/**
 * Bir rolün uygulanmış seed sürümünden sonraki tüm sürümlerin izinleri.
 *
 * `currentVersion` sürümüne kadar olan tüm sürümler birleştirilir; böylece
 * bir organizasyon birden fazla sürümü atladığında da eksik izinler tamamlanır.
 */
export function getPendingVersionGrants(
  template: FactoryRoleTemplate,
  fromVersion: string,
  toVersion: string,
): { resource: string; action: string }[] {
  const grants: { resource: string; action: string }[] = [];

  const versions = Object.keys(template.versionPermissions)
    .map((version) => Number.parseInt(version, 10))
    .filter((version) => Number.isFinite(version))
    .sort((a, b) => a - b);

  const from = Number.parseInt(fromVersion, 10);
  const to = Number.parseInt(toVersion, 10);

  for (const version of versions) {
    if (Number.isFinite(from) && version <= from) {
      continue;
    }

    if (Number.isFinite(to) && version > to) {
      continue;
    }

    grants.push(...getVersionGrants(template, String(version)));
  }

  return grants;
}
