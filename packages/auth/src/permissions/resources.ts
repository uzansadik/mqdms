/**
 * MQDMS kaynak kataloğu.
 *
 * Kaynaklar ve aksiyonları kod içinde sabittir; çalışma zamanında değiştirilemez.
 * MQDMS alanı genişledikçe buraya eklenir — izin tanımlarının tek kaynağı budur.
 *
 * Bir kaynak, birden fazla aksiyona sahip olabilir. Aksiyon adları
 * `resource:action` biçiminde better-auth statement'ına çevrilir.
 */
export const resources = {
  fmea: {
    label: "FMEA",
    actions: ["create", "read", "update", "save", "submit", "approve", "reject", "delete"],
  },
} as const;

export type ResourceKey = keyof typeof resources;

export type ResourceAction<K extends ResourceKey> = (typeof resources)[K]["actions"][number];

export type ResourceActionKey = {
  [K in ResourceKey]: `${K}:${ResourceAction<K>}`;
}[ResourceKey];

export const resourceKeys = Object.keys(resources) as ResourceKey[];

export function isResourceKey(value: string): value is ResourceKey {
  return value in resources;
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
