import type { AssetSummary } from "@gold-insights/market-domain";

export type AssetSeed = AssetSummary & { parentId?: string | null };

export const node = (id: string, name: string, parentId: string | null, market: string, tags: string[] = []): AssetSeed => ({
  id,
  symbol: id.toUpperCase(),
  name,
  assetType: "index",
  market,
  exchange: "local",
  currency: "",
  universe: "global",
  level: parentId === null ? "asset-class" : "market",
  parentId,
  dataSource: "yahoo",
  vendorSymbol: id.toUpperCase(),
  tags
});

export const yahoo = (
  id: string,
  symbol: string,
  name: string,
  assetType: AssetSummary["assetType"],
  market: string,
  exchange: string,
  currency: string,
  parentId: string,
  level: AssetSummary["level"],
  tags: string[] = []
): AssetSeed => ({
  id,
  symbol,
  name,
  assetType,
  market,
  exchange,
  currency,
  universe: "global",
  level,
  parentId,
  dataSource: "yahoo",
  vendorSymbol: symbol,
  tags
});

export const eastmoneyFund = (id: string, code: string, name: string, tags: string[] = []): AssetSeed => ({
  id,
  symbol: code,
  name,
  assetType: "fund",
  market: "基金",
  exchange: "东方财富基金",
  currency: "CNY",
  universe: "global",
  level: "instrument",
  parentId: "market-cn-mutual-fund",
  dataSource: "eastmoney",
  vendorSymbol: code,
  tags: ["场外基金", ...tags]
});

export const binance = (id: string, symbol: string, name: string, tags: string[] = [], vendorSymbol = `${symbol.split("/")[0]}-USD`): AssetSeed => ({
  id,
  symbol,
  name,
  assetType: "crypto",
  market: "加密",
  exchange: "Yahoo Crypto",
  currency: "USD",
  universe: "global",
  level: "instrument",
  parentId: "market-crypto",
  dataSource: "yahoo",
  vendorSymbol,
  tags
});
