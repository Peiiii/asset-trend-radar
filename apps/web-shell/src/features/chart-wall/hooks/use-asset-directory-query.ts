import { useCallback, useEffect, useState } from "react";
import type { AssetDirectoryPageData, AssetDirectoryPageFilters } from "@/shared/types/api.types";
import { chartWallApiService } from "../services/chart-wall-api.service";

type AssetDirectoryQueryState = {
  data: AssetDirectoryPageData | null;
  error: string | null;
  isLoading: boolean;
  reload(): Promise<void>;
};

export function useAssetDirectoryQuery(filters: AssetDirectoryPageFilters, enabled: boolean): AssetDirectoryQueryState {
  const [data, setData] = useState<AssetDirectoryPageData | null>(null);
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
        setData(await chartWallApiService.fetchAssetDirectoryPage(filters, signal));
      } catch (nextError) {
        if (!signal?.aborted) {
          setError(nextError instanceof Error ? nextError.message : "资产目录加载失败");
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
