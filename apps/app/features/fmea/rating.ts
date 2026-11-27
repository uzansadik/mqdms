/**
 * AIAG–VDA FMEA değerlendirme çekirdeği.
 *
 * Bu modül **saf**tır: veritabanı, Next.js veya React bilgisi taşımaz.
 * Böylece Action Priority ve Risk Sınıfı hesapları doğrudan test
 * edilebilir; arayüz ve sunucu aynı sonucu üretir.
 *
 * ### Neden matrisler veritabanında?
 *
 * AIAG & VDA FMEA Handbook (2019) **ücretli** bir yayındır ve Action Priority
 * tablosu ile VDA risk sınıflandırması kamuya açık kaynaklardan birebir
 * doğrulanamaz. Bu yüzden iki matris de **veri** olarak tutulur
 * (`fmea_action_priority`, `fmea_risk_matrix`); kurum elindeki el kitabına
 * göre kalibre edebilir.
 *
 * Bu dosyadaki `DEFAULT_ACTION_PRIORITY_MATRIX` ve
 * `DEFAULT_RISK_CLASS_MATRIX` yalnızca **seed** kaynağıdır: kurumda kayıt
 * yoksa yazılır, kayıt varsa dokunulmaz.
 */

/** Şiddet (Severity) derecesi. */
export type Severity = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** Oluşma (Occurrence) derecesi. */
export type Occurrence = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** Algılama (Detection) derecesi. */
export type Detection = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * Action Priority.
 *
 * `H` → "must either identify an appropriate action to improve prevention
 * and/or detection controls or justify and document why current controls are
 * adequate".
 * `M` → "should identify appropriate actions …".
 * `L` → "could identify actions …".
 *
 * Önemli: Action Priority bir **risk** önceliklendirmesi değil, **aksiyon
 * ihtiyacının** önceliklendirmesidir.
 */
export type ActionPriority = "H" | "M" | "L";

/** VDA risk sınıfı. */
export type RiskClass = "A" | "B" | "C";

/** Önleme / algılama kontrolünün etkinlik derecesi. */
export type ControlEffectiveness = "VERY_GOOD" | "GOOD" | "MODERATE" | "POOR" | "VERY_POOR";

/** Action Priority matrisinin tek bir bandı. */
export type ActionPriorityRow = {
  severityMin: number;
  severityMax: number;
  occurrenceMin: number;
  occurrenceMax: number;
  detectionMin: number;
  detectionMax: number;
  actionPriority: ActionPriority;
};

/** Risk sınıfı matrisinin tek bir satırı. */
export type RiskClassRow = {
  severity: number;
  occurrence: number;
  riskClass: RiskClass;
};

/**
 * Action Priority tablosunun bantları.
 *
 * El kitabındaki tablo bant hâlinde yayımlanmıştır: 1–10 değerler gruplara
 * ayrılır ve her grup çifti için tek bir değer tanımlıdır.
 *
 * **Şiddet bantları yüksekten düşüğe** sıralıdır (el kitabında şiddet
 * yukarıdan aşağıya listelenir). Oluşma ve algılama bantları ise **düşükten
 * yükseğe** sıralıdır: oluşma soldan sağa, algılama hücre içinde soldan
 * sağa gider.
 */
const SEVERITY_BANDS: readonly (readonly [number, number])[] = [
  [8, 10],
  [6, 7],
  [4, 5],
  [2, 3],
  [1, 1],
];

const OCCURRENCE_BANDS: readonly (readonly [number, number])[] = [
  [1, 1],
  [2, 4],
  [5, 6],
  [7, 10],
];

const DETECTION_BANDS: readonly (readonly [number, number])[] = [
  [1, 1],
  [2, 3],
  [4, 6],
  [7, 8],
  [9, 10],
];

/**
 * Varsayılan Action Priority tablosu.
 *
 * Dizin sırası: `[şiddet bandı][oluşma bandı] → [algılama bandı]`.
 */
const DEFAULT_ACTION_PRIORITY: readonly (readonly (readonly ActionPriority[])[])[] = [
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

/**
 * Varsayılan Action Priority matrisi.
 *
 * Bant tablosu satır satır veritabanına yazılabilir hâle getirilir.
 */
export const DEFAULT_ACTION_PRIORITY_MATRIX: readonly ActionPriorityRow[] = (() => {
  const rows: ActionPriorityRow[] = [];

  for (let severityIndex = 0; severityIndex < SEVERITY_BANDS.length; severityIndex += 1) {
    const severityBand = SEVERITY_BANDS[severityIndex] ?? [1, 1];
    const [severityMin, severityMax] = severityBand;

    for (let occurrenceIndex = 0; occurrenceIndex < OCCURRENCE_BANDS.length; occurrenceIndex += 1) {
      const occurrenceBand = OCCURRENCE_BANDS[occurrenceIndex] ?? [1, 1];
      const [occurrenceMin, occurrenceMax] = occurrenceBand;

      for (let detectionIndex = 0; detectionIndex < DETECTION_BANDS.length; detectionIndex += 1) {
        const detectionBand = DETECTION_BANDS[detectionIndex] ?? [1, 1];
        const [detectionMin, detectionMax] = detectionBand;

        rows.push({
          severityMin,
          severityMax,
          occurrenceMin,
          occurrenceMax,
          detectionMin,
          detectionMax,
          actionPriority:
            DEFAULT_ACTION_PRIORITY[severityIndex]?.[occurrenceIndex]?.[detectionIndex] ?? "L",
        });
      }
    }
  }

  return rows;
})();

/**
 * Varsayılan risk sınıfı matrisi.
 *
 * Klasik VDA matrisi mantığı: **şiddet bandı × oluşma bandı**. Algılama
 * derecesi bu sınıflandırmaya girmez.
 *
 * | S \ O | 1–2 | 3–4 | 5–6 | 7–8 | 9–10 |
 * | --- | --- | --- | --- | --- | --- |
 * | 9–10 | B | B | A | A | A |
 * | 7–8 | C | C | B | A | A |
 * | 4–6 | C | C | C | B | B |
 * | 2–3 | C | C | C | C | C |
 * | 1 | C | C | C | C | C |
 */
export const DEFAULT_RISK_CLASS_MATRIX: readonly RiskClassRow[] = (() => {
  const severityBands: readonly (readonly [number, number, RiskClass[]])[] = [
    [9, 10, ["B", "B", "A", "A", "A"]],
    [7, 8, ["C", "C", "B", "A", "A"]],
    [4, 6, ["C", "C", "C", "B", "B"]],
    [2, 3, ["C", "C", "C", "C", "C"]],
    [1, 1, ["C", "C", "C", "C", "C"]],
  ];

  const occurrenceBands: readonly (readonly [number, number])[] = [
    [1, 2],
    [3, 4],
    [5, 6],
    [7, 8],
    [9, 10],
  ];

  const rows: RiskClassRow[] = [];

  for (const [severityMin, severityMax, classes] of severityBands) {
    for (let occurrenceIndex = 0; occurrenceIndex < occurrenceBands.length; occurrenceIndex += 1) {
      const occurrenceBand = occurrenceBands[occurrenceIndex] ?? [1, 1];
      const [occurrenceMin, occurrenceMax] = occurrenceBand;

      for (let severity = severityMin; severity <= severityMax; severity += 1) {
        for (let occurrence = occurrenceMin; occurrence <= occurrenceMax; occurrence += 1) {
          rows.push({
            severity,
            occurrence,
            riskClass: classes[occurrenceIndex] ?? "C",
          });
        }
      }
    }
  }

  return rows;
})();

/**
 * Action Priority hesaplar.
 *
 * Matris bant hâlindedir; verilen derece için bandı içeren satır aranır.
 * Eşleşen satır yoksa `null` döner (matris eksikse bu durum "hesap
 * yapılamadı" anlamına gelir; arayüz uyarı gösterir).
 */
export function computeActionPriority(
  severity: Severity,
  occurrence: Occurrence,
  detection: Detection,
  matrix: readonly ActionPriorityRow[],
): ActionPriority | null {
  const row = matrix.find(
    (entry) =>
      severity >= entry.severityMin &&
      severity <= entry.severityMax &&
      occurrence >= entry.occurrenceMin &&
      occurrence <= entry.occurrenceMax &&
      detection >= entry.detectionMin &&
      detection <= entry.detectionMax,
  );

  return row?.actionPriority ?? null;
}

/**
 * Özel aksiyon gerekiyor mu?
 *
 * Action Priority "H" olan satırlarda aksiyon zorunludur; aksiyon
 * alınmıyorsa gerekçe yazılmalıdır ("special action required").
 */
export function isSpecialActionRequired(
  severity: Severity,
  occurrence: Occurrence,
  detection: Detection,
  matrix: readonly ActionPriorityRow[],
): boolean {
  return computeActionPriority(severity, occurrence, detection, matrix) === "H";
}

/**
 * Risk Sınıfı hesaplar.
 *
 * VDA'nın risk sınıflandırması **şiddet × oluşma** çiftine göre verilir;
 * algılama derecesi bu sınıflandırmaya girmez.
 *
 * Matris tam (şiddet, oluşma) çiftlerini içermiyorsa en yakın, daha düşük
 * değerler aranır; hiçbir eşleşme bulunamazsa `null` döner.
 */
export function computeRiskClass(
  severity: Severity,
  occurrence: Occurrence,
  matrix: readonly RiskClassRow[],
): RiskClass | null {
  const exact = matrix.find((row) => row.severity === severity && row.occurrence === occurrence);

  if (exact) {
    return exact.riskClass;
  }

  /*
   * Tam eşleşme yoksa aynı şiddetteki en yüksek oluşma değerine düşülür;
   * o da yoksa aynı oluşmadaki en yüksek şiddet değerine.
   */
  const sameSeverity = matrix
    .filter((row) => row.severity === severity && row.occurrence <= occurrence)
    .sort((left, right) => right.occurrence - left.occurrence)[0];

  if (sameSeverity) {
    return sameSeverity.riskClass;
  }

  const sameOccurrence = matrix
    .filter((row) => row.occurrence === occurrence && row.severity <= severity)
    .sort((left, right) => right.severity - left.severity)[0];

  return sameOccurrence?.riskClass ?? null;
}

/**
 * Etkinlik derecesinin karşılık geldiği ölçek bandının ortası.
 *
 * VDA'da oluşma değeri doğrudan önleme kontrolünün etkinliğidir ve
 * algılama değeri doğrudan algılama kontrolünün etkinliğidir. Bu yüzden
 * öneri, etkinlik derecesinin ölçekte karşılık geldiği bandın ortasıdır.
 */
const EFFECTIVENESS_BAND: Record<ControlEffectiveness, number> = {
  VERY_GOOD: 0,
  GOOD: 1,
  MODERATE: 2,
  POOR: 3,
  VERY_POOR: 4,
};

/** Önleme kontrolünün etkinliğine göre önerilen oluşma derecesi. */
export function suggestOccurrence(effectiveness: ControlEffectiveness): Occurrence {
  const band = EFFECTIVENESS_BAND[effectiveness];

  return (band * 2 + 2) as Occurrence;
}

/** Algılama kontrolünün etkinliğine göre önerilen algılama derecesi. */
export function suggestDetection(effectiveness: ControlEffectiveness): Detection {
  const band = EFFECTIVENESS_BAND[effectiveness];

  return (band * 2 + 2) as Detection;
}

/**
 * Şiddet sınıflandırması (VDA "S-Klassifizierung").
 *
 * Şiddet 10 ve 9 güvenlik veya regülasyon etkisi taşır ve özel karakteristik
 * adayıdır. SC1/SC2 ayrımı müşteri (OEM) tanımına bağlıdır; varsayılan
 * olarak en yüksek şiddet SC1'e, 9 ise SC2'ye karşılık gelir. Kullanıcı
 * değeri arayüzden değiştirebilir.
 */
export function severityClassificationFor(severity: Severity): "NONE" | "SC1" | "SC2" {
  if (severity === 10) {
    return "SC1";
  }

  if (severity === 9) {
    return "SC2";
  }

  return "NONE";
}
