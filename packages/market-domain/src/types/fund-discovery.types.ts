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

export type FundSearchResponse = {
  generatedAt: string;
  keyword: string;
  results: FundSearchResult[];
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
