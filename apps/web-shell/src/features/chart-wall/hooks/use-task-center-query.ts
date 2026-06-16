import { useCallback, useEffect, useState } from "react";
import type { TaskCenterData } from "@/shared/types/api.types";
import { chartWallApiService } from "../services/chart-wall-api.service";

type TaskCenterQueryState = {
  data: TaskCenterData | null;
  error: string | null;
  isLoading: boolean;
  reload(): Promise<void>;
};

export function useTaskCenterQuery(enabled: boolean): TaskCenterQueryState {
  const [data, setData] = useState<TaskCenterData | null>(null);
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
        setData(await chartWallApiService.fetchTaskCenter(signal));
      } catch (nextError) {
        if (!signal?.aborted) {
          setError(nextError instanceof Error ? nextError.message : "任务中心加载失败");
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const controller = new AbortController();
    void load(controller.signal);
    const intervalId = window.setInterval(() => {
      void load(controller.signal);
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
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
