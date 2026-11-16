import { BomLab } from "../components/bom-lab";
import {
  buildMockBomLines,
  MOCK_BOM,
  MOCK_ITEMS,
  MOCK_REVISION,
  MOCK_ROOT_ITEM,
  MOCK_UNITS,
} from "../lib/mock-bom";

/**
 * BOM laboratuvarı.
 *
 * Mock veriyle BOM ağacının görünümü denenir; deploy ve veritabanı gerekmez.
 */
export default function BomLabPage() {
  const lines = buildMockBomLines();

  const gridLines = lines.map((line) => {
    const item = MOCK_ITEMS.find((candidate) => candidate.id === line.childItemId);

    return {
      id: line.id,
      parentLineId: line.parentLineId,
      childItemId: line.childItemId,
      childItemCode: item?.code ?? "",
      childItemName: item?.name ?? "",
      childItemType: item?.itemType ?? "OTHER",
      childItemStructureType: item?.structureType ?? "PART",
      childItemSupplyType: item?.supplyType ?? null,
      childItemIsSellable: item?.isSellable ?? false,
      quantity: line.quantity,
      unitOfMeasureId: line.unitOfMeasureId,
      sortOrder: line.sortOrder,
      childItemRevisionId: line.childItemRevisionId,
    };
  });

  return (
    <BomLab
      bom={MOCK_BOM}
      initialLines={gridLines}
      items={MOCK_ITEMS}
      revision={MOCK_REVISION}
      rootItem={MOCK_ROOT_ITEM}
      units={MOCK_UNITS}
    />
  );
}
