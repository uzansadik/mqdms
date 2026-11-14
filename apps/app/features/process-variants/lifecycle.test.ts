import { describe, expect, it } from "vitest";

import { canTransition, isEditable } from "./lifecycle";

describe("revision yaşam döngüsü", () => {
  it("normal akışı destekler", () => {
    expect(canTransition("DRAFT", "IN_REVIEW")).toBe(true);
    expect(canTransition("IN_REVIEW", "APPROVED")).toBe(true);
    expect(canTransition("APPROVED", "RELEASED")).toBe(true);
  });

  it("incelemeden taslağa dönebilir", () => {
    expect(canTransition("IN_REVIEW", "DRAFT")).toBe(true);
  });

  it("onaydan gerekçeli geri alabilir", () => {
    expect(canTransition("APPROVED", "DRAFT")).toBe(true);
  });

  it("yayınlanmış revision değiştirilemez", () => {
    expect(canTransition("RELEASED", "DRAFT")).toBe(false);
    expect(canTransition("RELEASED", "IN_REVIEW")).toBe(false);
    expect(canTransition("RELEASED", "APPROVED")).toBe(false);
  });

  it("geçersiz kılınmış revision değiştirilemez", () => {
    expect(canTransition("SUPERSEDED", "DRAFT")).toBe(false);
  });

  it("taslaktan doğrudan yayınlanamaz", () => {
    expect(canTransition("DRAFT", "RELEASED")).toBe(false);
    expect(canTransition("DRAFT", "APPROVED")).toBe(false);
  });

  it("yayınlanmadan geri alınamaz", () => {
    expect(canTransition("IN_REVIEW", "RELEASED")).toBe(false);
  });

  it("yalnızca taslak düzenlenebilir", () => {
    expect(isEditable("DRAFT")).toBe(true);
    expect(isEditable("IN_REVIEW")).toBe(false);
    expect(isEditable("APPROVED")).toBe(false);
    expect(isEditable("RELEASED")).toBe(false);
    expect(isEditable("SUPERSEDED")).toBe(false);
  });
});
