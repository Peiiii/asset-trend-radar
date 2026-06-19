import type { AssetDirectoryCategoryId } from "@gold-insights/market-domain";

export type DirectoryTableSizing = {
  tableMinWidth: number;
  firstColumnMinWidth: number;
  lastColumnMinWidth: number;
};

export const fundDirectoryTableSizing: DirectoryTableSizing = {
  tableMinWidth: 1584,
  firstColumnMinWidth: 274,
  lastColumnMinWidth: 206
};

export function getAssetDirectoryTableSizing(categoryId: AssetDirectoryCategoryId | null): DirectoryTableSizing {
  return {
    tableMinWidth: categoryId === "us-equity" ? 1650 : 1608,
    firstColumnMinWidth: categoryId === "us-equity" ? 252 : 210,
    lastColumnMinWidth: 264
  };
}
