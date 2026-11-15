import type { ColumnDef } from "@tanstack/react-table";

/**
 * TreeGrid için ortak tipler.
 *
 * Bileşen **genel amaçlıdır**: BOM, item ya da başka bir hiyerarşi için
 * kullanılabilir. Hiyerarşi dışındaki iş kuralları bileşene girmez.
 */

/** Ağaç satırlarının düzleştirilmiş hâli. */
export type TreeGridRow<TData> = {
  /** Satırın stabil kimliği. */
  id: string;

  /** Üst satırın kimliği; kök satırlarda null. */
  parentId: string | null;

  /** Derinlik; kök satır 0'dır. */
  depth: number;

  /** Satırın verisi. */
  data: TData;

  /** Alt satırı var mı? */
  hasChildren: boolean;

  /** Satır açık mı? */
  isExpanded: boolean;

  /** Kardeşler arasındaki sıra (1'den başlar). */
  position: number;
};

/** Ağaç satırlarını düzleştirme seçenekleri. */
export type FlattenTreeRowsOptions<TData> = {
  /** Satır kimliği; sıra değişse de kimlik sabit kalmalıdır. */
  getRowId: (row: TData, index: number) => string;

  /** Alt satırlar; yoksa satır yaprak kabul edilir. */
  getChildren?: (row: TData) => TData[] | undefined;

  /** Açık satır kimlikleri. */
  expanded: Record<string, boolean>;
};

/** TreeGrid sütun tanımı. */
export type TreeGridColumn<TData> = ColumnDef<TData>;

/** TreeGrid bileşeninin özellikleri. */
export type TreeGridProps<TData> = {
  /** Kök seviyedeki satırlar. */
  data: TData[];

  /** Sütun tanımları. */
  columns: TreeGridColumn<TData>[];

  /** Stabil satır kimliği. */
  getRowId: (row: TData, index: number) => string;

  /** Alt satırlar. */
  getChildren?: (row: TData) => TData[] | undefined;

  /** Kontrollü açma/kapatma durumu. */
  expanded?: Record<string, boolean>;

  /** Açma/kapatma durumu değiştiğinde çağrılır. */
  onExpandedChange?: (expanded: Record<string, boolean>) => void;

  /** Seçili satırın kimliği; seçim dışarıdan yönetilir. */
  selectedId?: string | null;

  /** Satıra tıklandığında çağrılır. */
  onRowClick?: (row: TData) => void;

  /** Satır yüksekliği tahmini (piksel). */
  estimateRowHeight?: number;

  /** Sütun genişlikleri (CSS grid değeri). */
  columnWidths?: Record<string, string>;

  /** Boş durum mesajı. */
  emptyMessage?: string;

  /** Ek sınıf adı. */
  className?: string;

  /** Hücre içeriğini özel çizmek için; sütun tanımları yerine kullanılır. */
  renderCell?: (params: { row: TData; columnId: string; depth: number }) => React.ReactNode;
};
