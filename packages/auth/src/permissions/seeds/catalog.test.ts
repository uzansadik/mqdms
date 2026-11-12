import { describe, expect, it } from "vitest";

import { isResourceActionKey, resources } from "../resources";
import { factoryRoleTemplates, getTemplateGrants } from "./catalog";

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
