import { describe, expect, it } from "vitest";

import { isResourceActionKey, resources } from "../resources";
import {
  FACTORY_SEED_VERSION,
  factoryRoleTemplates,
  getPendingVersionGrants,
  getTemplateGrants,
  getVersionGrants,
} from "./catalog";

/** Slug ile şablon bulur; yoksa testi anlaşılır biçimde durdurur. */
function findTemplate(slug: string) {
  const template = factoryRoleTemplates.find((item) => item.slug === slug);

  if (!template) {
    throw new Error(`Unknown factory role template: ${slug}`);
  }

  return template;
}

describe("fabrika rol kataloğu", () => {
  it("11 fonksiyonel rol içerir", () => {
    expect(factoryRoleTemplates).toHaveLength(11);
  });

  it("slug'lar benzersizdir", () => {
    const slugs = factoryRoleTemplates.map((template) => template.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("slug'lar kebab-case ve lowercase'tir", () => {
    for (const template of factoryRoleTemplates) {
      expect(template.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("her rolün en az bir izni vardır", () => {
    for (const template of factoryRoleTemplates) {
      expect(getTemplateGrants(template).length).toBeGreaterThan(0);
    }
  });

  it("tüm izinler permission kataloğunda yer alır", () => {
    for (const template of factoryRoleTemplates) {
      for (const grant of getTemplateGrants(template)) {
        expect(
          isResourceActionKey(`${grant.resource}:${grant.action}`),
          `${template.slug}: ${grant.resource}:${grant.action}`,
        ).toBe(true);
      }
    }
  });

  it("seed rollere delete yetkisi verilmez", () => {
    for (const template of factoryRoleTemplates) {
      for (const grant of getTemplateGrants(template)) {
        expect(grant.action, `${template.slug}: ${grant.resource}:${grant.action}`).not.toBe(
          "delete",
        );
      }
    }
  });

  it("her kaynak en az bir seed rolde okunabilir", () => {
    for (const resource of Object.keys(resources)) {
      const readable = factoryRoleTemplates.some((template) =>
        getTemplateGrants(template).some(
          (grant) => grant.resource === resource && grant.action === "read",
        ),
      );

      expect(readable, resource).toBe(true);
    }
  });

  it("FMEA hazırlayan ve onaylayan roller ayrıdır", () => {
    const canSubmit = factoryRoleTemplates.filter((template) =>
      getTemplateGrants(template).some(
        (grant) => grant.resource === "fmea" && grant.action === "submit",
      ),
    );

    const canApprove = factoryRoleTemplates.filter((template) =>
      getTemplateGrants(template).some(
        (grant) => grant.resource === "fmea" && grant.action === "approve",
      ),
    );

    expect(canSubmit.length).toBeGreaterThan(0);
    expect(canApprove.length).toBeGreaterThan(0);

    /*
     * "Quality Engineer" FMEA hazırlar ama onaylamaz; onay yetkisi kalite
     * yöneticilerinde ve fabrika müdüründedir.
     */
    const qualityEngineer = findTemplate("quality-engineer");

    const qualityEngineerGrants = getTemplateGrants(qualityEngineer);

    expect(
      qualityEngineerGrants.some((grant) => grant.resource === "fmea" && grant.action === "submit"),
    ).toBe(true);

    expect(
      qualityEngineerGrants.some(
        (grant) => grant.resource === "fmea" && grant.action === "approve",
      ),
    ).toBe(false);
  });

  it("denetçi hiçbir kaydı değiştiremez", () => {
    const auditor = findTemplate("auditor");

    for (const grant of getTemplateGrants(auditor)) {
      expect(["read", "export"]).toContain(grant.action);
    }
  });
});

describe("fabrika rol seed sürümleri", () => {
  it("her şablon güncel sürüm için bir delta tanımlar", () => {
    for (const template of factoryRoleTemplates) {
      expect(
        template.versionPermissions[FACTORY_SEED_VERSION],
        `${template.slug}: ${FACTORY_SEED_VERSION}`,
      ).toBeDefined();
    }
  });

  it("güncel sürüm dördtür", () => {
    expect(FACTORY_SEED_VERSION).toBe("4");
  });

  it("sürüm izinleri permission kataloğunda yer alır", () => {
    for (const template of factoryRoleTemplates) {
      for (const version of Object.keys(template.versionPermissions)) {
        for (const grant of getVersionGrants(template, version)) {
          expect(
            isResourceActionKey(`${grant.resource}:${grant.action}`),
            `${template.slug} v${version}: ${grant.resource}:${grant.action}`,
          ).toBe(true);
        }
      }
    }
  });

  it("sürüm izinleri hedef durumun bir parçasıdır", () => {
    /*
     * Delta, rolün hedef izin setinin alt kümesi olmalıdır: aksi halde
     * yükseltme, hedef durumda olmayan bir izin eklerdi.
     */
    for (const template of factoryRoleTemplates) {
      const target = getTemplateGrants(template);
      const targetKeys = new Set(target.map((grant) => `${grant.resource}:${grant.action}`));

      for (const version of Object.keys(template.versionPermissions)) {
        for (const grant of getVersionGrants(template, version)) {
          expect(
            targetKeys.has(`${grant.resource}:${grant.action}`),
            `${template.slug} v${version}: ${grant.resource}:${grant.action}`,
          ).toBe(true);
        }
      }
    }
  });

  it("yükseltme yalnızca uygulanmış sürümden sonrasını ekler", () => {
    const template = findTemplate("project-manager");

    const fromV1 = getPendingVersionGrants(template, "1", FACTORY_SEED_VERSION);
    const fromCurrent = getPendingVersionGrants(
      template,
      FACTORY_SEED_VERSION,
      FACTORY_SEED_VERSION,
    );

    expect(fromV1.length).toBeGreaterThan(0);
    expect(fromCurrent).toHaveLength(0);
  });

  it("yükseltme sürüm 1'den önceki izinleri geri getirmez", () => {
    /*
     * Sürüm 1'de projeyi okuyabilen roller bu izinleri almış durumdadır.
     * Yükseltme yalnızca yeni eklenenleri uygular; eski izinler geri gelmez.
     */
    const template = findTemplate("project-engineer");

    const pending = getPendingVersionGrants(template, "1", FACTORY_SEED_VERSION);

    expect(pending.some((grant) => grant.resource === "projects" && grant.action === "read")).toBe(
      false,
    );

    expect(pending.some((grant) => grant.resource === "customers")).toBe(true);
    expect(pending.some((grant) => grant.resource === "plants")).toBe(true);
  });

  it("bilinmeyen sürüm için hiçbir izin uygulanmaz", () => {
    const template = findTemplate("auditor");

    expect(getPendingVersionGrants(template, "9", "10")).toHaveLength(0);
  });

  it("yeni kaynaklar seed rollerinde okunabilir", () => {
    for (const resource of ["customers", "plants"]) {
      const readable = factoryRoleTemplates.some((template) =>
        getTemplateGrants(template).some(
          (grant) => grant.resource === resource && grant.action === "read",
        ),
      );

      expect(readable, resource).toBe(true);
    }
  });

  it("yeni kaynaklar sürüm 3 deltasıyla mevcut organizasyonlara verilir", () => {
    /*
     * Yeni kaynaklar (ürün grupları, BOM, içe aktarım) sürüm 3 deltasında
     * yer almalıdır: aksi halde mevcut organizasyonların seed rolleri bu
     * kaynaklara erişemez.
     */
    for (const resource of ["itemGroups", "boms", "imports"]) {
      const covered = factoryRoleTemplates.some((template) =>
        getVersionGrants(template, "3").some((grant) => grant.resource === resource),
      );

      expect(covered, resource).toBe(true);
    }
  });

  it("yönetim rolleri yeni kaynakları yönetebilir", () => {
    const plantManager = getTemplateGrants(findTemplate("plant-manager"));

    expect(
      plantManager.some((grant) => grant.resource === "plants" && grant.action === "create"),
    ).toBe(true);

    const projectManager = getTemplateGrants(findTemplate("project-manager"));

    expect(
      projectManager.some(
        (grant) => grant.resource === "projects" && grant.action === "manageMembers",
      ),
    ).toBe(true);
  });

  it("uzman rolleri yalnızca okur", () => {
    for (const slug of ["project-engineer", "quality-engineer", "production-supervisor"]) {
      const grants = getTemplateGrants(findTemplate(slug));

      const writes = grants.filter(
        (grant) =>
          (grant.resource === "customers" || grant.resource === "plants") &&
          grant.action !== "read",
      );

      expect(writes, slug).toHaveLength(0);
    }
  });
});
