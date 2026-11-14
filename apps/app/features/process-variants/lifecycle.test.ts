import { describe, expect, it } from "vitest";

import { ALLOWED_TRANSITIONS, canTransition, isEditable } from "./lifecycle";

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

  it("geri alma yolu tek bir kaynak duruma bağlı değildir", () => {
    /*
     * Geri alma hem incelemede hem onaylanmış durumdan mümkündür. Servis bu
     * yüzden beklenen durumu sabit bir değer olarak yazmaz, transaction
     * içinde okunan mevcut durumu kullanır.
     */
    const sources = ALLOWED_TRANSITIONS.IN_REVIEW.concat(ALLOWED_TRANSITIONS.APPROVED);

    expect(sources.filter((status) => status === "DRAFT")).toHaveLength(2);
  });
});
