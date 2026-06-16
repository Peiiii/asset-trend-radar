import type { AssetSummary } from "./asset.types";

export type FundSearchResult = {
  code: string;
  name: string;
  fundType: string | null;
  company: string | null;
  managers: string[];
  latestNav: number | null;
  latestNavDate: string | null;
  themes: string[];
  canBuy: boolean;
};

export type FundCatalogEntry = {
  code: string;
  name: string;
  fundType: string | null;
  pinyin: string | null;
  fullPinyin: string | null;
  source: "eastmoney";
  updatedAt: number;
};

export type FundCatalogSummary = {
  totalCount: number;
  syncedAt: string | null;
  source: "eastmoney";
};

export type FundSearchResponse = {
  generatedAt: string;
  keyword: string;
  catalog: FundCatalogSummary;
  matchedCount: number;
  source: "local-catalog" | "remote-suggest";
  results: FundSearchResult[];
};

export type FundCatalogSyncResponse = {
  generatedAt: string;
  summary: FundCatalogSummary;
  insertedOrUpdated: number;
};

export type FundCatalogSummaryResponse = {
  generatedAt: string;
  summary: FundCatalogSummary;
};

export type FundImportResponse = {
  generatedAt: string;
  asset: AssetSummary;
  barsImported: number;
  firstBarAt: string | null;
  latestBarAt: string | null;
  source: string;
  searchResult: FundSearchResult | null;
};
