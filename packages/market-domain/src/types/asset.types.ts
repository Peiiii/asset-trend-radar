export type AssetType = "crypto" | "equity" | "index" | "fund" | "commodity" | "macro";

export type AssetLevel = "asset-class" | "market" | "broad-index" | "sector-index" | "theme-basket" | "company" | "instrument" | "macro-indicator";

export type MarketDataSource = "binance" | "yahoo" | "eastmoney" | "fred";

export type AssetSummary = {
  id: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  market: string;
  exchange: string;
  currency: string;
  universe?: string;
  level?: AssetLevel;
  parentId?: string | null;
  dataSource?: MarketDataSource;
  vendorSymbol?: string;
  tags?: string[];
};
