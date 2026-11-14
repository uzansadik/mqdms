import readXlsxFile from "read-excel-file/node";

/**
 * Excel ve CSV ayrıştırma.
 *
 * Ayrıştırma saf bir işlemdir: dosyanın içeriği okunur, kolon başlıkları ve
 * satırlar çıkarılır. Excel formülleri **çalıştırılmaz**; dosyadaki değerler
 * okunur.
 */

/** Ayrıştırılmış sayfa. */
export type ImportSheet = {
  /** Kolon başlıkları. */
  headers: string[];

  /** Satırlar; `rowNumber` dosyadaki sırayı gösterir (1 tabanlı). */
  rows: {
    rowNumber: number;
    values: Record<string, string>;
  }[];

  /** Kullanılan ayraç (CSV için). */
  delimiter: string;
};

/** CSV ayraç adayları. */
const DELIMITERS = [",", ";", "\t", "|"];

/**
 * CSV içeriğini satırlara ayırır.
 *
 * RFC 4180: tırnaklı alanlarda ayraç ve satır sonu geçerlidir, tırnak
 * `""` ile kaçışlanır. BOM silinir.
 */
export function parseCsvRows(content: string, delimiter = ","): string[][] {
  const rows: string[][] = [];

  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let index = 0;

  // UTF-8 BOM
  if (content.charCodeAt(0) === 0xfeff) {
    index = 1;
  }

  while (index < content.length) {
    const char = content[index];

    if (inQuotes) {
      if (char === '"') {
        if (content[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }

        inQuotes = false;
        index += 1;
        continue;
      }

      field += char;
      index += 1;
      continue;
    }

    if (char === '"' && field === "") {
      inQuotes = true;
      index += 1;
      continue;
    }

    if (char === delimiter) {
      row.push(field);
      field = "";
      index += 1;
      continue;
    }

    if (char === "\r") {
      index += 1;
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      index += 1;
      continue;
    }

    field += char;
    index += 1;
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * CSV ayracını tahmin eder.
 *
 * İlk satırdaki ayraç sayılarına bakılır; en çok geçen ayraç kullanılır.
 */
export function detectDelimiter(content: string): string {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";

  let best = ",";
  let bestCount = 0;

  for (const delimiter of DELIMITERS) {
    let count = 0;
    let inQuotes = false;

    for (const char of firstLine) {
      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (!inQuotes && char === delimiter) {
        count += 1;
      }
    }

    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }

  return best;
}

/**
 * CSV içeriğini kolon başlıkları ve satırlara ayırır.
 */
export function parseCsv(content: string, delimiter?: string): ImportSheet {
  const resolved = delimiter ?? detectDelimiter(content);
  const raw = parseCsvRows(content, resolved);

  if (raw.length === 0) {
    return { headers: [], rows: [], delimiter: resolved };
  }

  const headers = (raw[0] ?? []).map((header) => header.trim());

  const rows = raw
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row, index) => ({
      rowNumber: index + 2,
      values: Object.fromEntries(
        headers.map((header, columnIndex) => [header, (row[columnIndex] ?? "").trim()]),
      ),
    }));

  return { headers, rows, delimiter: resolved };
}

/**
 * Excel dosyasını kolon başlıkları ve satırlara ayırır.
 */
export async function parseXlsx(bytes: Uint8Array): Promise<ImportSheet> {
  const raw = (await readXlsxFile(Buffer.from(bytes))) as unknown as unknown[][];

  if (raw.length === 0) {
    return { headers: [], rows: [], delimiter: "," };
  }

  const headers = (raw[0] ?? []).map((cell) => String(cell ?? "").trim());

  const rows = raw
    .slice(1)
    .filter((row) => row.some((cell) => cell !== null && cell !== undefined && cell !== ""))
    .map((row, index) => ({
      rowNumber: index + 2,
      values: Object.fromEntries(
        headers.map((header, columnIndex) => [header, normalizeCell((row ?? [])[columnIndex])]),
      ),
    }));

  return { headers, rows, delimiter: "," };
}

/** Excel hücresini metne çevirir. */
function normalizeCell(cell: unknown): string {
  if (cell === null || cell === undefined) {
    return "";
  }

  if (cell instanceof Date) {
    return cell.toISOString().slice(0, 10);
  }

  if (typeof cell === "number") {
    /*
     * Excel sayıları ondalık ayırıcı olarak nokta kullanır. Kayan nokta
     * gürültüsü (0.1 + 0.2) bastırılır, ancak **anlamlı basamaklar
     * korunur**: `30.0001234` kısaltılmaz, aksi halde ERP kodu bozulur.
     */
    return String(Number(cell.toPrecision(12)));
  }

  return String(cell).trim();
}
