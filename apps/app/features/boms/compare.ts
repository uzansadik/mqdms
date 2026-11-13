import { type BomRevisionChange, diffBomLines } from "./comparison";
import { listBomLines } from "./repository";

/**
 * İki BOM revision'ını karşılaştırır.
 *
 * Satır verileri veritabanından okunur, fark çıkarımı saf `diffBomLines`
 * fonksiyonuna bırakılır.
 */
export async function compareBomRevisions(
  organizationId: string,
  fromRevisionId: string,
  toRevisionId: string,
): Promise<BomRevisionChange[]> {
  const [fromLines, toLines] = await Promise.all([
    listBomLines(organizationId, fromRevisionId),
    listBomLines(organizationId, toRevisionId),
  ]);

  return diffBomLines(fromLines, toLines);
}
