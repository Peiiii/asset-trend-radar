import { ErrorState, LoadingState } from "@gold-insights/ui";
import type { AssetDirectoryPageData } from "@/shared/types/api.types";
import { QueryStatus } from "../query-status/query-status";
import { AssetDirectorySection, type AssetDirectorySectionProps } from "./asset-directory-section";

type AssetDirectoryViewProps = Omit<
  AssetDirectorySectionProps,
  | "title"
  | "description"
  | "items"
  | "totalCount"
  | "categoryItemCount"
  | "categoryInPoolCount"
  | "marketFacets"
  | "assetTypeFacets"
  | "dataStateFacets"
  | "valuationStatusFacets"
  | "statusFacets"
  | "canImport"
> & {
  data: AssetDirectoryPageData | null;
  error: string | null;
  isLoading: boolean;
  fallbackTitle: string;
  fallbackDescription: string;
};

export function AssetDirectoryView({ data, error, isLoading, fallbackTitle, fallbackDescription, ...sectionProps }: AssetDirectoryViewProps): JSX.Element {
  if (isLoading && !data) {
    return <LoadingState />;
  }

  if (error && !data) {
    return <ErrorState title="资产目录加载失败" message={error} />;
  }

  return (
    <>
      {isLoading && data && <QueryStatus tone="info" title="目录更新中" message="当前先保留上一页结果" />}
      {error && data && <QueryStatus tone="error" title="目录更新失败" message={error} />}
      <AssetDirectorySection
        {...sectionProps}
        title={data?.category.label ?? fallbackTitle}
        description={data?.category.description ?? fallbackDescription}
        items={data?.items ?? []}
        totalCount={data?.totalCount ?? 0}
        categoryItemCount={data?.category.itemCount ?? data?.totalCount ?? 0}
        categoryInPoolCount={data?.category.inPoolCount ?? 0}
        marketFacets={data?.facets.markets ?? []}
        assetTypeFacets={data?.facets.assetTypes ?? []}
        dataStateFacets={data?.facets.dataStates ?? []}
        valuationStatusFacets={data?.facets.valuationStatuses ?? []}
        statusFacets={data?.facets.statuses ?? []}
        canImport={Boolean(data?.category.capabilities.includes("import_to_pool"))}
      />
    </>
  );
}
