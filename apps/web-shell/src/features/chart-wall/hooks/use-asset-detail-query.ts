import { useCallback, useEffect, useState } from "react";
import type { AssetDetailData } from "@/shared/types/api.types";
import { chartWallApiService } from "../services/chart-wall-api.service";

type AssetDetailQueryState = {
  data: AssetDetailData | null;
  error: string | null;
  isLoading: boolean;
  setPinned(assetId: string, isPinned: boolean): void;
};

export function useAssetDetailQuery(assetId: string | undefined, range: string, timeframe: string, enabled: boolean): AssetDetailQueryState {
  const [data, setData] = useState<AssetDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !assetId) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    void chartWallApiService
      .fetchAssetDetail(assetId, range, timeframe, controller.signal)
      .then(setData)
      .catch((nextError: unknown) => {
        if (!controller.signal.aborted) {
          setError(nextError instanceof Error ? nextError.message : "资产详情加载失败");
          setData(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [assetId, enabled, range, timeframe]);

  const setPinned = useCallback((assetId: string, isPinned: boolean): void => {
    setData((current) => (current?.item.id === assetId ? { ...current, item: { ...current.item, isPinned } } : current));
  }, []);

  return {
    data,
    error,
    isLoading,
    setPinned
  };
}
