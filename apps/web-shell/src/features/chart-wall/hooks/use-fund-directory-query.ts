import { useCallback, useEffect, useState } from "react";
import type { FundCatalogPageData, FundCatalogPageFilters } from "@/shared/types/api.types";
import { chartWallApiService } from "../services/chart-wall-api.service";

type FundDirectoryQueryState = {
  data: FundCatalogPageData | null;
  error: string | null;
  isLoading: boolean;
  reload(): Promise<void>;
};

export function useFundDirectoryQuery(filters: FundCatalogPageFilters, enabled: boolean): FundDirectoryQueryState {
  const [data, setData] = useState<FundCatalogPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (!enabled) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        setData(await chartWallApiService.fetchFundCatalogPage(filters, signal));
      } catch (nextError) {
        if (!signal?.aborted) {
          setError(nextError instanceof Error ? nextError.message : "基金目录加载失败");
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [enabled, filters]
  );

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const controller = new AbortController();
    void load(controller.signal);

    return () => {
      controller.abort();
    };
  }, [enabled, load]);

  return {
    data,
    error,
    isLoading,
    reload: () => load()
  };
}
