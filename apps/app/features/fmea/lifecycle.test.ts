import { describe, expect, it } from "vitest";

import {
  ALLOWED_TRANSITIONS,
  canTransition,
  type FmeaDocumentStatus,
  isEditable,
} from "./lifecycle";

describe("FMEA belgesi yaşam döngüsü", () => {
  it("taslak belge incelemeye gönderilebilir", () => {
    expect(canTransition("DRAFT", "IN_REVIEW")).toBe(true);
  });

  it("incelemede onaylanabilir", () => {
    expect(canTransition("IN_REVIEW", "APPROVED")).toBe(true);
  });

  it("onaylanan belge yayınlanabilir", () => {
    expect(canTransition("APPROVED", "RELEASED")).toBe(true);
  });

  it("inceleme reddedilebilir", () => {
    expect(canTransition("IN_REVIEW", "DRAFT")).toBe(true);
  });

  it("onaylanan belge gerekçeli geri alınabilir", () => {
    expect(canTransition("APPROVED", "DRAFT")).toBe(true);
  });

  it("yayınlanan belge değiştirilemez", () => {
    expect(canTransition("RELEASED", "DRAFT")).toBe(false);
    expect(canTransition("RELEASED", "IN_REVIEW")).toBe(false);
    expect(ALLOWED_TRANSITIONS.RELEASED).toEqual([]);
  });

  it("taslak belge doğrudan onaylanamaz", () => {
    expect(canTransition("DRAFT", "APPROVED")).toBe(false);
  });

  it("taslak belge doğrudan yayınlanamaz", () => {
    expect(canTransition("DRAFT", "RELEASED")).toBe(false);
  });
});

describe("düzenlenebilirlik", () => {
  it("yalnızca taslak belge düzenlenebilir", () => {
    expect(isEditable("DRAFT")).toBe(true);
    expect(isEditable("IN_REVIEW")).toBe(false);
    expect(isEditable("APPROVED")).toBe(false);
    expect(isEditable("RELEASED")).toBe(false);
  });
});

describe("geçiş tablosu tutarlılığı", () => {
  it("her durum için geçiş listesi vardır", () => {
    const statuses: FmeaDocumentStatus[] = ["DRAFT", "IN_REVIEW", "APPROVED", "RELEASED"];

    for (const status of statuses) {
      expect(ALLOWED_TRANSITIONS[status]).toBeDefined();
    }
  });

  it("yayınlanan durumdan hiçbir geçişe izin vermez", () => {
    const targets: FmeaDocumentStatus[] = ["DRAFT", "IN_REVIEW", "APPROVED", "RELEASED"];

    for (const target of targets) {
      expect(canTransition("RELEASED", target)).toBe(false);
    }
  });
});
