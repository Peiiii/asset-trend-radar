import type { FundCatalogDataStateFilter, FundCatalogEntry, FundCatalogImportStatus, FundCatalogSortKey, SortOrder } from "@gold-insights/market-domain";

export type FundCatalogPageQuery = {
  keyword: string;
  fundType: string;
  status: FundCatalogImportStatus;
  dataState: FundCatalogDataStateFilter;
  sort: FundCatalogSortKey;
  order: SortOrder;
  limit: number;
  offset: number;
};

export type FundCatalogPageRecord = FundCatalogEntry & {
  assetId: string | null;
  latestNav: number | null;
  accumulatedNav: number | null;
  latestNavDate: string | null;
  return1d: number | null;
  return1w: number | null;
  return1m: number | null;
  return3m: number | null;
  return6m: number | null;
  return1y: number | null;
  returnYtd: number | null;
  metricUpdatedAt: number | null;
};

export type FundCatalogPageResult = {
  totalCount: number;
  importedTotalCount: number;
  items: FundCatalogPageRecord[];
};

export type FundCatalogPageFilter = {
  fromSql: string;
  whereSql: string;
  params: Array<number | string>;
};
