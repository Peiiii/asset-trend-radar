import { useCallback, useEffect, useMemo, useState } from "react";
import type { CompareData } from "@/shared/types/api.types";
import { chartWallApiService } from "../services/chart-wall-api.service";

type CompareSelectionState = {
  compareAssetIds: string[];
  compareData: CompareData | null;
  comparedSet: Set<string>;
  clearCompare(): void;
  toggleCompare(assetId: string): void;
};

const maxCompareAssets = 6;

export function useCompareSelection(range: string, timeframe: string): CompareSelectionState {
  const [compareAssetIds, setCompareAssetIds] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<CompareData | null>(null);
  const comparedSet = useMemo(() => new Set(compareAssetIds), [compareAssetIds]);

  useEffect(() => {
    if (compareAssetIds.length < 2) {
      setCompareData(null);
      return undefined;
    }

    let isActive = true;

    void chartWallApiService
      .fetchCompare(compareAssetIds, range, timeframe)
      .then((nextData) => {
        if (isActive) {
          setCompareData(nextData);
        }
      })
      .catch(() => {
        if (isActive) {
          setCompareData(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [compareAssetIds, range, timeframe]);

  const toggleCompare = useCallback((assetId: string): void => {
    setCompareAssetIds((current) => (current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId].slice(-maxCompareAssets)));
  }, []);

  const clearCompare = useCallback((): void => {
    setCompareAssetIds([]);
  }, []);

  return {
    compareAssetIds,
    compareData,
    comparedSet,
    clearCompare,
    toggleCompare
  };
}
