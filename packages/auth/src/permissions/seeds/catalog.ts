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

  /** Kaynak izinleri. */
  permissions: RolePermissions;
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
      projects: ["read", "create", "update"],
      items: ["read"],
      reports: ["read"],
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
      projects: ["read"],
      items: ["read"],
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
      projects: ["read"],
      items: ["read"],
      reports: ["read", "export"],
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
      reports: ["read"],
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
      reports: ["read"],
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
  },
];

/** Seed katalogunun sürümü. */
export const FACTORY_SEED_VERSION = "1";

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
