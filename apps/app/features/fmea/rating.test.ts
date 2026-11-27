import { describe, expect, it } from "vitest";

import {
  type ActionPriority,
  type ControlEffectiveness,
  computeActionPriority,
  computeRiskClass,
  DEFAULT_ACTION_PRIORITY_MATRIX,
  DEFAULT_RISK_CLASS_MATRIX,
  type Detection,
  isSpecialActionRequired,
  type Occurrence,
  type RiskClass,
  type Severity,
  severityClassificationFor,
  suggestDetection,
  suggestOccurrence,
} from "./rating";

/**
 * Action Priority tablosu.
 *
 * Beklenen değerler **bağımsız** bir aktarımdır: uygulamadaki tabloyla
 * birlikte yazılmamıştır, bir aktarım hatası iki tablodan birinin
 * değişmesiyle ortaya çıkar.
 *
 * Her hücredeki beş değer, algılama bantlarını `1 | 2–3 | 4–6 | 7–8 | 9–10`
 * sırasıyla taşır.
 */
const EXPECTED_ACTION_PRIORITY: readonly (readonly (readonly ActionPriority[])[])[] = [
  // Şiddet 8–10
  [
    ["L", "L", "H", "H", "H"], // Oluşma 1
    ["M", "M", "H", "H", "H"], // Oluşma 2–4
    ["M", "M", "H", "H", "H"], // Oluşma 5–6
    ["M", "M", "H", "H", "H"], // Oluşma 7–10
  ],
  // Şiddet 6–7
  [
    ["L", "L", "H", "H", "H"], // Oluşma 1
    ["L", "M", "H", "H", "H"], // Oluşma 2–4
    ["L", "M", "H", "H", "H"], // Oluşma 5–6
    ["L", "L", "M", "M", "M"], // Oluşma 7–10
  ],
  // Şiddet 4–5
  [
    ["L", "L", "L", "M", "M"], // Oluşma 1
    ["L", "L", "L", "H", "H"], // Oluşma 2–4
    ["L", "L", "M", "H", "H"], // Oluşma 5–6
    ["L", "L", "M", "M", "M"], // Oluşma 7–10
  ],
  // Şiddet 2–3
  [
    ["L", "L", "L", "L", "L"], // Oluşma 1
    ["L", "L", "L", "L", "M"], // Oluşma 2–4
    ["L", "L", "L", "L", "M"], // Oluşma 5–6
    ["L", "L", "L", "L", "M"], // Oluşma 7–10
  ],
  // Şiddet 1
  [
    ["L", "L", "L", "L", "L"], // Oluşma 1
    ["L", "L", "L", "L", "M"], // Oluşma 2–4
    ["L", "L", "L", "L", "M"], // Oluşma 5–6
    ["L", "L", "L", "L", "M"], // Oluşma 7–10
  ],
];

/** Şiddet bandı indeksi: 1 → 4, 2–3 → 3, 4–5 → 2, 6–7 → 1, 8–10 → 0. */
function severityBandIndex(value: number): number {
  if (value <= 1) {
    return 4;
  }

  if (value <= 3) {
    return 3;
  }

  if (value <= 5) {
    return 2;
  }

  if (value <= 7) {
    return 1;
  }

  return 0;
}

/** Oluşma bandı indeksi: 1 → 0, 2–4 → 1, 5–6 → 2, 7–10 → 3. */
function occurrenceBandIndex(value: number): number {
  if (value <= 1) {
    return 0;
  }

  if (value <= 4) {
    return 1;
  }

  if (value <= 6) {
    return 2;
  }

  return 3;
}

/** Algılama bandı indeksi: 1 → 0, 2–3 → 1, 4–6 → 2, 7–8 → 3, 9–10 → 4. */
function detectionBandIndex(value: number): number {
  if (value <= 1) {
    return 0;
  }

  if (value <= 3) {
    return 1;
  }

  if (value <= 6) {
    return 2;
  }

  if (value <= 8) {
    return 3;
  }

  return 4;
}

describe("varsayılan Action Priority matrisi", () => {
  it("her bant üçlüsü için tam olarak bir satır içerir", () => {
    expect(DEFAULT_ACTION_PRIORITY_MATRIX).toHaveLength(5 * 4 * 5);
  });

  it("hiçbir satır çakışmaz", () => {
    for (const row of DEFAULT_ACTION_PRIORITY_MATRIX) {
      const overlapping = DEFAULT_ACTION_PRIORITY_MATRIX.filter(
        (other) =>
          other !== row &&
          other.severityMin <= row.severityMax &&
          other.severityMax >= row.severityMin &&
          other.occurrenceMin <= row.occurrenceMax &&
          other.occurrenceMax >= row.occurrenceMin &&
          other.detectionMin <= row.detectionMax &&
          other.detectionMax >= row.detectionMin,
      );

      expect(overlapping).toEqual([]);
    }
  });

  it("tüm 1–10 derecelerini kapsar", () => {
    for (let severity = 1; severity <= 10; severity += 1) {
      for (let occurrence = 1; occurrence <= 10; occurrence += 1) {
        for (let detection = 1; detection <= 10; detection += 1) {
          expect(
            computeActionPriority(
              severity as never,
              occurrence as never,
              detection as never,
              DEFAULT_ACTION_PRIORITY_MATRIX,
            ),
          ).not.toBeNull();
        }
      }
    }
  });
});

describe("Action Priority hesabı", () => {
  it("beklenen değerleri üretir", () => {
    const differences: string[] = [];

    for (let severity = 1; severity <= 10; severity += 1) {
      for (let occurrence = 1; occurrence <= 10; occurrence += 1) {
        for (let detection = 1; detection <= 10; detection += 1) {
          const expected =
            EXPECTED_ACTION_PRIORITY[severityBandIndex(severity)]?.[
              occurrenceBandIndex(occurrence)
            ]?.[detectionBandIndex(detection)] ?? "L";

          const actual = computeActionPriority(
            severity as never,
            occurrence as never,
            detection as never,
            DEFAULT_ACTION_PRIORITY_MATRIX,
          );

          if (actual !== expected) {
            differences.push(
              `S=${severity} O=${occurrence} D=${detection}: beklenen ${expected}, gelen ${actual}`,
            );
          }
        }
      }
    }

    expect(differences).toEqual([]);
  });

  it("matris boşsa hesap yapılamaz", () => {
    expect(computeActionPriority(9, 5, 5, [])).toBeNull();
  });
});

describe("Action Priority örnekleri", () => {
  it("S=10, O=5, D=4 → H", () => {
    expect(computeActionPriority(10, 5, 4, DEFAULT_ACTION_PRIORITY_MATRIX)).toBe("H");
  });

  it("S=9, O=2, D=2 → M", () => {
    expect(computeActionPriority(9, 2, 2, DEFAULT_ACTION_PRIORITY_MATRIX)).toBe("M");
  });

  it("S=4, O=5, D=5 → M", () => {
    expect(computeActionPriority(4, 5, 5, DEFAULT_ACTION_PRIORITY_MATRIX)).toBe("M");
  });

  it("S=8, O=6, D=4 → H", () => {
    expect(computeActionPriority(8, 6, 4, DEFAULT_ACTION_PRIORITY_MATRIX)).toBe("H");
  });
});

describe("özel aksiyon kuralı", () => {
  it("yalnızca yüksek öncelikte zorunludur", () => {
    expect(isSpecialActionRequired(9, 9, 9, DEFAULT_ACTION_PRIORITY_MATRIX)).toBe(true);

    expect(isSpecialActionRequired(1, 1, 1, DEFAULT_ACTION_PRIORITY_MATRIX)).toBe(false);

    expect(isSpecialActionRequired(5, 5, 5, DEFAULT_ACTION_PRIORITY_MATRIX)).toBe(false);
  });

  it("Action Priority ile tutarlıdır", () => {
    for (let severity = 1; severity <= 10; severity += 1) {
      for (let occurrence = 1; occurrence <= 10; occurrence += 1) {
        for (let detection = 1; detection <= 10; detection += 1) {
          const priority = computeActionPriority(
            severity as never,
            occurrence as never,
            detection as never,
            DEFAULT_ACTION_PRIORITY_MATRIX,
          );

          expect(
            isSpecialActionRequired(
              severity as never,
              occurrence as never,
              detection as never,
              DEFAULT_ACTION_PRIORITY_MATRIX,
            ),
          ).toBe(priority === "H");
        }
      }
    }
  });
});

describe("varsayılan risk sınıfı matrisi", () => {
  it("her (şiddet, oluşma) çifti için tam olarak bir satır içerir", () => {
    expect(DEFAULT_RISK_CLASS_MATRIX).toHaveLength(100);
  });

  it("klasik VDA matrisi değerlerini üretir", () => {
    expect(computeRiskClass(10, 10, DEFAULT_RISK_CLASS_MATRIX)).toBe("A");
    expect(computeRiskClass(10, 1, DEFAULT_RISK_CLASS_MATRIX)).toBe("B");
    expect(computeRiskClass(8, 8, DEFAULT_RISK_CLASS_MATRIX)).toBe("A");
    expect(computeRiskClass(5, 5, DEFAULT_RISK_CLASS_MATRIX)).toBe("C");
    expect(computeRiskClass(1, 1, DEFAULT_RISK_CLASS_MATRIX)).toBe("C");
  });
});

describe("risk sınıfı hesabı", () => {
  const matrix = [
    { severity: 10, occurrence: 10, riskClass: "A" as RiskClass },
    { severity: 10, occurrence: 5, riskClass: "B" as RiskClass },
    { severity: 5, occurrence: 5, riskClass: "C" as RiskClass },
  ];

  it("tam eşleşmeyi bulur", () => {
    expect(computeRiskClass(10, 10, matrix)).toBe("A");
    expect(computeRiskClass(5, 5, matrix)).toBe("C");
  });

  it("tam eşleşme yoksa aynı şiddetteki en yakın oluşmaya düşer", () => {
    expect(computeRiskClass(10, 7, matrix)).toBe("B");
  });

  it("eşleşme bulunamazsa null döner", () => {
    expect(computeRiskClass(1, 1, matrix)).toBeNull();
  });
});

describe("etkinlik önerileri", () => {
  it("önleme etkinliğine göre oluşma önerir", () => {
    expect(suggestOccurrence("VERY_GOOD")).toBe(2);
    expect(suggestOccurrence("GOOD")).toBe(4);
    expect(suggestOccurrence("MODERATE")).toBe(6);
    expect(suggestOccurrence("POOR")).toBe(8);
    expect(suggestOccurrence("VERY_POOR")).toBe(10);
  });

  it("algılama etkinliğine göre algılama önerir", () => {
    expect(suggestDetection("VERY_GOOD")).toBe(2);
    expect(suggestDetection("VERY_POOR")).toBe(10);
  });

  it("etkinlik iyileştikçe öneri düşer", () => {
    const order: ControlEffectiveness[] = ["VERY_GOOD", "GOOD", "MODERATE", "POOR", "VERY_POOR"];

    for (let index = 0; index < order.length - 1; index += 1) {
      const current = order[index] as ControlEffectiveness;
      const next = order[index + 1] as ControlEffectiveness;

      expect(suggestOccurrence(current)).toBeLessThan(suggestOccurrence(next));
    }
  });
});

describe("şiddet sınıflandırması", () => {
  it("güvenlik ve regülasyon etkilerini işaretler", () => {
    expect(severityClassificationFor(10)).toBe("SC1");
    expect(severityClassificationFor(9)).toBe("SC2");
    expect(severityClassificationFor(8)).toBe("NONE");
    expect(severityClassificationFor(1)).toBe("NONE");
  });
});

describe("tip güvenliği", () => {
  it("Dereceler 1–10 aralığında kabul edilir", () => {
    const severity: Severity = 10;
    const occurrence: Occurrence = 1;
    const detection: Detection = 5;

    expect(
      computeActionPriority(severity, occurrence, detection, DEFAULT_ACTION_PRIORITY_MATRIX),
    ).toBe("H");
  });
});
