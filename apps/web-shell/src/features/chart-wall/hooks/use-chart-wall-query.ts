import { useCallback, useEffect, useState } from "react";
import type { ChartWallFilters, ChartWallPageData } from "@/shared/types/api.types";
import { chartWallApiService } from "../services/chart-wall-api.service";

type ChartWallQueryState = {
  data: ChartWallPageData | null;
  error: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  refresh(): Promise<void>;
  reload(): Promise<void>;
};

export function useChartWallQuery(filters: ChartWallFilters, enabled = true): ChartWallQueryState {
  const [data, setData] = useState<ChartWallPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (!enabled) {
        return;
      }

      setError(null);
      const nextData = await chartWallApiService.fetchPageData(filters, signal);
      setData(nextData);
    },
    [enabled, filters]
  );

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setError(null);
      return undefined;
    }

    const controller = new AbortController();
    setIsLoading(true);

    void load(controller.signal)
      .catch((nextError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : "加载失败");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [enabled, load]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled) {
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      await chartWallApiService.startRefresh();
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "刷新失败");
    } finally {
      setIsRefreshing(false);
    }
  }, [enabled, load]);

  return {
    data,
    error,
    isLoading,
    isRefreshing,
    refresh,
    reload: load
  };
}
