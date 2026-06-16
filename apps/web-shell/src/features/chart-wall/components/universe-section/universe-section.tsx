import { Search } from "lucide-react";
import { useMemo } from "react";
import { EmptyState, SignalBadge } from "@gold-insights/ui";
import type { AssetSummary, UniverseTreeNode } from "@gold-insights/market-domain";
import {
  assetTypeLabel,
  filterUniverseAssets,
  levelLabel,
  nodeContainsMatchedAssets,
  summarizeUniverse,
  uniqueUniverseAssets,
  type UniverseFilters
} from "./universe-section.utils";
import "./universe-section.css";

type UniverseSectionProps = {
  nodes: UniverseTreeNode[];
  filters: UniverseFilters;
  onSelectAsset(assetId: string): void;
};

export function UniverseSection({ nodes, filters, onSelectAsset }: UniverseSectionProps): JSX.Element {
  const assets = useMemo(() => uniqueUniverseAssets(nodes), [nodes]);
  const matchedAssets = useMemo(() => filterUniverseAssets(assets, filters), [assets, filters]);
  const matchedAssetIds = useMemo(() => new Set(matchedAssets.map((asset) => asset.id)), [matchedAssets]);
  const visibleNodes = useMemo(() => nodes.filter((node) => nodeContainsMatchedAssets(node, matchedAssetIds)), [matchedAssetIds, nodes]);
  const summary = useMemo(() => summarizeUniverse(nodes, assets, matchedAssets), [assets, matchedAssets, nodes]);
  const hasActiveFilter = filters.search.trim().length > 0 || filters.market !== "all" || filters.assetType !== "all" || filters.level !== "all";

  return (
    <section className="single-view-section universe-section">
      <div className="section-title-row">
        <div>
          <h2>资产宇宙</h2>
          <p>从大类资产到地区、板块、主题、基金、商品和重点公司</p>
        </div>
      </div>

      <div className="universe-summary-grid" aria-label="资产宇宙摘要">
        <UniverseSummaryCard label="资产" value={summary.totalAssets} description={`当前命中 ${summary.matchedAssets}`} />
        <UniverseSummaryCard label="节点" value={summary.totalNodes} description="大类/市场/层级" />
        <UniverseSummaryCard label="市场" value={summary.markets} description="全球资产覆盖" />
        <UniverseSummaryCard label="品种" value={summary.assetTypes} description="指数/基金/公司/商品等" />
      </div>

      {hasActiveFilter && (
        <div className="universe-filter-note">
          <Search size={15} aria-hidden="true" />
          当前资产宇宙已跟随顶部搜索和筛选联动
        </div>
      )}

      {matchedAssets.length === 0 ? (
        <EmptyState title="没有匹配资产" description="当前搜索或筛选条件没有命中资产宇宙。" />
      ) : (
        <>
          <div className="universe-asset-results">
            <header>
              <h3>匹配资产</h3>
              <span>{matchedAssets.length.toLocaleString("en-US")}</span>
            </header>
            <div className="universe-asset-list">
              {matchedAssets.slice(0, 80).map((asset) => (
                <UniverseAssetButton key={asset.id} asset={asset} onSelectAsset={onSelectAsset} />
              ))}
            </div>
          </div>

          <div className="universe-grid">
            {visibleNodes.map((node) => (
              <UniverseNodeCard key={node.id} node={node} matchedAssetIds={matchedAssetIds} onSelectAsset={onSelectAsset} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function UniverseSummaryCard({ label, value, description }: { label: string; value: number; description: string }): JSX.Element {
  return (
    <article className="universe-summary-card">
      <span>{label}</span>
      <strong>{value.toLocaleString("en-US")}</strong>
      <small>{description}</small>
    </article>
  );
}

function UniverseNodeCard({
  node,
  matchedAssetIds,
  onSelectAsset
}: {
  node: UniverseTreeNode;
  matchedAssetIds: Set<string>;
  onSelectAsset(assetId: string): void;
}): JSX.Element {
  const matchedAssets = node.assets.filter((asset) => matchedAssetIds.has(asset.id));
  const visibleChildren = node.children.filter((child) => nodeContainsMatchedAssets(child, matchedAssetIds));

  return (
    <article className="universe-node-card">
      <header>
        <strong>{node.label}</strong>
        <span>{matchedAssets.length > 0 ? `${matchedAssets.length}/${node.count}` : node.count}</span>
      </header>
      {visibleChildren.length > 0 && (
        <div className="universe-node-card__children">
          {visibleChildren.map((child) => (
            <UniverseNodeCard key={child.id} node={child} matchedAssetIds={matchedAssetIds} onSelectAsset={onSelectAsset} />
          ))}
        </div>
      )}
      {matchedAssets.length > 0 && (
        <div className="universe-node-card__assets">
          {matchedAssets.slice(0, 14).map((asset) => (
            <UniverseAssetButton key={asset.id} asset={asset} onSelectAsset={onSelectAsset} compact />
          ))}
        </div>
      )}
    </article>
  );
}

function UniverseAssetButton({
  asset,
  compact = false,
  onSelectAsset
}: {
  asset: AssetSummary;
  compact?: boolean;
  onSelectAsset(assetId: string): void;
}): JSX.Element {
  return (
    <button type="button" className={compact ? "universe-asset-button universe-asset-button--compact" : "universe-asset-button"} onClick={() => onSelectAsset(asset.id)}>
      <span>
        <strong>{asset.name}</strong>
        <small>{asset.symbol}</small>
      </span>
      {!compact && (
        <span className="universe-asset-button__badges">
          <SignalBadge label={asset.market} tone="blue" />
          <SignalBadge label={assetTypeLabel(asset.assetType)} tone="neutral" />
          <SignalBadge label={levelLabel(asset.level)} tone="amber" />
        </span>
      )}
    </button>
  );
}
