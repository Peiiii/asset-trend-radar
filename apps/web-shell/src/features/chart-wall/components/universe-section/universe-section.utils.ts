import type { AssetSummary, UniverseTreeNode } from "@gold-insights/market-domain";

export type UniverseFilters = {
  search: string;
  market: string;
  assetType: string;
  level: string;
};

export type UniverseNodeSummary = {
  totalNodes: number;
  totalAssets: number;
  matchedAssets: number;
  markets: number;
  assetTypes: number;
};

export function flattenUniverseNodes(nodes: UniverseTreeNode[]): UniverseTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenUniverseNodes(node.children)]);
}

export function uniqueUniverseAssets(nodes: UniverseTreeNode[]): AssetSummary[] {
  const assetsById = new Map<string, AssetSummary>();

  for (const node of flattenUniverseNodes(nodes)) {
    for (const asset of node.assets) {
      assetsById.set(asset.id, asset);
    }
  }

  return [...assetsById.values()].sort((left, right) => left.market.localeCompare(right.market) || left.name.localeCompare(right.name));
}

export function filterUniverseAssets(assets: AssetSummary[], filters: UniverseFilters): AssetSummary[] {
  const normalizedSearch = filters.search.trim().toLocaleLowerCase();

  return assets.filter((asset) => {
    const matchesSearch = normalizedSearch.length === 0 || [
      asset.name,
      asset.symbol,
      asset.market,
      asset.exchange,
      asset.universe,
      ...(asset.tags ?? [])
    ].some((value) => value?.toLocaleLowerCase().includes(normalizedSearch));
    const matchesMarket = filters.market === "all" || asset.market === filters.market;
    const matchesAssetType = filters.assetType === "all" || asset.assetType === filters.assetType;
    const matchesLevel = filters.level === "all" || asset.level === filters.level;

    return matchesSearch && matchesMarket && matchesAssetType && matchesLevel;
  });
}

export function summarizeUniverse(nodes: UniverseTreeNode[], assets: AssetSummary[], matchedAssets: AssetSummary[]): UniverseNodeSummary {
  return {
    totalNodes: flattenUniverseNodes(nodes).length,
    totalAssets: assets.length,
    matchedAssets: matchedAssets.length,
    markets: new Set(assets.map((asset) => asset.market)).size,
    assetTypes: new Set(assets.map((asset) => asset.assetType)).size
  };
}

export function nodeContainsMatchedAssets(node: UniverseTreeNode, matchedAssetIds: Set<string>): boolean {
  return node.assets.some((asset) => matchedAssetIds.has(asset.id)) || node.children.some((child) => nodeContainsMatchedAssets(child, matchedAssetIds));
}

export function assetTypeLabel(value: string): string {
  const labels: Record<string, string> = {
    index: "指数",
    fund: "基金/ETF",
    equity: "公司",
    commodity: "商品",
    macro: "宏观",
    crypto: "加密"
  };

  return labels[value] ?? value;
}

export function levelLabel(value: string | undefined): string {
  const labels: Record<string, string> = {
    "asset-class": "大类",
    market: "市场",
    "broad-index": "宽基",
    "sector-index": "行业",
    "theme-basket": "主题",
    company: "公司",
    instrument: "工具/合约",
    "macro-indicator": "宏观"
  };

  return value ? labels[value] ?? value : "未分层";
}
