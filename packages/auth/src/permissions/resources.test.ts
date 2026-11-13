import { describe, expect, it } from "vitest";

import {
  getAllResourceActionKeys,
  isResourceActionKey,
  isResourceKey,
  type ResourceKey,
  resources,
} from "./resources";

describe("permission kataloğu", () => {
  it("müşteri, tesis ve proje kaynaklarını içerir", () => {
    expect(isResourceKey("customers")).toBe(true);
    expect(isResourceKey("plants")).toBe(true);
    expect(isResourceKey("projects")).toBe(true);
  });

  it("müşteri ve tesis kaynaklarında arşiv aksiyonları vardır", () => {
    for (const resource of ["customers", "plants"] as const) {
      expect(resources[resource].actions).toContain("archive");
      expect(resources[resource].actions).toContain("restore");
      expect(resources[resource].actions).toContain("read");
      expect(resources[resource].actions).toContain("create");
      expect(resources[resource].actions).toContain("update");
    }
  });

  it("proje kaynağı ekip yönetimi aksiyonunu içerir", () => {
    expect(resources.projects.actions).toContain("manageMembers");
    expect(resources.projects.actions).toContain("archive");
    expect(resources.projects.actions).toContain("restore");
  });

  it("ürün kaynağı revision aksiyonlarını içerir", () => {
    for (const action of ["archive", "restore", "manageRevisions", "releaseRevision"] as const) {
      expect(resources.items.actions).toContain(action);
    }
  });

  it("ürün grubu, BOM ve içe aktarım kaynakları tanımlıdır", () => {
    expect(isResourceKey("itemGroups")).toBe(true);
    expect(isResourceKey("boms")).toBe(true);
    expect(isResourceKey("imports")).toBe(true);

    expect(resources.itemGroups.actions).toContain("archive");
    expect(resources.boms.actions).toContain("submit");
    expect(resources.boms.actions).toContain("release");
    expect(resources.boms.actions).toContain("compare");
    expect(resources.imports.actions).toContain("execute");
  });

  it("proje kaynağı ürün kapsamı yönetimini içerir", () => {
    expect(resources.projects.actions).toContain("manageItems");
  });

  it("katalogdaki her kaynak en az bir aksiyona sahiptir", () => {
    for (const key of Object.keys(resources) as ResourceKey[]) {
      expect(resources[key].actions.length, key).toBeGreaterThan(0);
    }
  });

  it("bir kaynağın aksiyonları benzersizdir", () => {
    for (const key of Object.keys(resources) as ResourceKey[]) {
      const actions = resources[key].actions;

      expect(new Set(actions).size, key).toBe(actions.length);
    }
  });

  it("aksiyon çiftleri resource:action biçiminde çözülür", () => {
    for (const key of getAllResourceActionKeys()) {
      const separator = key.indexOf(":");

      const resource = key.slice(0, separator);
      const action = key.slice(separator + 1);

      expect(isResourceKey(resource)).toBe(true);
      expect(isResourceActionKey(key)).toBe(true);
      expect(resources[resource as ResourceKey].actions).toContain(action);
    }
  });

  it("katalog dışı kaynak ve aksiyon fail closed", () => {
    expect(isResourceKey("customers:read")).toBe(false);
    expect(isResourceActionKey("customers:publish")).toBe(false);
    expect(isResourceActionKey("constructor:read")).toBe(false);
    expect(isResourceActionKey("toString")).toBe(false);
  });
});
