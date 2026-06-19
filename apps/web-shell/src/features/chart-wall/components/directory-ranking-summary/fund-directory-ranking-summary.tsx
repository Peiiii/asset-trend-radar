import type { FundCatalogPageItem, FundCatalogSortKey, SortOrder } from "@gold-insights/market-domain";
import { DirectoryRankingSummaryBuilder } from "./directory-ranking-summary.builder";
import { DirectoryRankingSummaryCard } from "./directory-ranking-summary";

type FundDirectoryRankingSummaryProps = {
  items: FundCatalogPageItem[];
  totalCount: number;
  sort: FundCatalogSortKey;
  order: SortOrder;
};

const summaryBuilder = new DirectoryRankingSummaryBuilder();

export function FundDirectoryRankingSummary({ items, totalCount, sort, order }: FundDirectoryRankingSummaryProps): JSX.Element {
  const summary = summaryBuilder.buildFund(items, totalCount, sort, order);

  return <DirectoryRankingSummaryCard summary={summary} ariaLabel="基金目录排序质量" />;
}
