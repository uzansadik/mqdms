import { describe, expect, it } from "vitest";

import {
  evaluatePermission,
  getEffectivePermissionList,
  getPermissionState,
  type PermissionEvaluationInput,
} from "./evaluate";
import { isResourceActionKey, resources } from "./resources";

function input(overrides: Partial<PermissionEvaluationInput> = {}): PermissionEvaluationInput {
  return {
    isOwner: false,
    grants: [],
    roleGrants: [],
    ...overrides,
  };
}

describe("evaluatePermission", () => {
  it("reddetmeyen varsayılan: rol ve grant yoksa izin yok", () => {
    expect(evaluatePermission(input(), "fmea", "read")).toBe(false);
  });

  it("bilinmeyen kaynak veya aksiyon fail closed", () => {
    expect(evaluatePermission(input({ isOwner: true }), "fmea", "explode")).toBe(false);
    expect(evaluatePermission(input({ isOwner: true }), "unknown", "read")).toBe(false);
    expect(evaluatePermission(input(), "constructor", "read")).toBe(false);
  });

  it("owner tüm kayıtlı iş aksiyonlarına erişir", () => {
    for (const resource of Object.keys(resources) as (keyof typeof resources)[]) {
      for (const action of resources[resource].actions) {
        expect(evaluatePermission(input({ isOwner: true }), resource, action)).toBe(true);
      }
    }
  });

  it("owner'ın deny grant'i yetkiyi kaldırmaz", () => {
    expect(
      evaluatePermission(
        input({
          isOwner: true,
          grants: [{ resource: "fmea", action: "read", effect: "deny" }],
        }),
        "fmea",
        "read",
      ),
    ).toBe(true);
  });

  it("açık deny, açık allow'dan baskındır", () => {
    expect(
      evaluatePermission(
        input({
          grants: [
            { resource: "fmea", action: "read", effect: "allow" },
            { resource: "fmea", action: "read", effect: "deny" },
          ],
        }),
        "fmea",
        "read",
      ),
    ).toBe(false);
  });

  it("açık allow, rol izinlerinden baskındır", () => {
    expect(
      evaluatePermission(
        input({
          grants: [{ resource: "fmea", action: "read", effect: "allow" }],
          roleGrants: [{ resource: "fmea", action: "read" }],
        }),
        "fmea",
        "read",
      ),
    ).toBe(true);
  });

  it("rol izinleri birleşiktir", () => {
    expect(
      evaluatePermission(
        input({
          roleGrants: [
            { resource: "fmea", action: "read" },
            { resource: "ncr", action: "create" },
          ],
        }),
        "ncr",
        "create",
      ),
    ).toBe(true);
  });

  it("grant yalnızca aynı kaynak/aksiyon çiftini etkiler", () => {
    expect(
      evaluatePermission(
        input({ grants: [{ resource: "fmea", action: "read", effect: "deny" }] }),
        "fmea",
        "update",
      ),
    ).toBe(false);
  });
});

describe("getPermissionState", () => {
  it("grant yoksa inherit", () => {
    expect(getPermissionState({ grants: [], resource: "fmea", action: "read" })).toBe("inherit");
  });

  it("deny allow'dan baskındır", () => {
    expect(
      getPermissionState({
        grants: [
          { resource: "fmea", action: "read", effect: "allow" },
          { resource: "fmea", action: "read", effect: "deny" },
        ],
        resource: "fmea",
        action: "read",
      }),
    ).toBe("deny");
  });
});

describe("getEffectivePermissionList", () => {
  it("yalnızca katalogdaki izinleri listeler", () => {
    const list = getEffectivePermissionList(
      input({ roleGrants: [{ resource: "fmea", action: "read" }] }),
    );

    expect(list).toEqual(["fmea:read"]);
  });
});

describe("isResourceActionKey", () => {
  it("prototype anahtarlarını kabul etmez", () => {
    expect(isResourceActionKey("constructor:read")).toBe(false);
    expect(isResourceActionKey("toString:read")).toBe(false);
    expect(isResourceActionKey("__proto__:read")).toBe(false);
  });

  it("katalogdaki çiftleri kabul eder", () => {
    expect(isResourceActionKey("fmea:read")).toBe(true);
    expect(isResourceActionKey("fmea:explode")).toBe(false);
  });
});
