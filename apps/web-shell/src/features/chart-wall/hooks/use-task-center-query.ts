import { useCallback, useEffect, useState } from "react";
import type { TaskCenterData } from "@/shared/types/api.types";
import { chartWallApiService } from "../services/chart-wall-api.service";

type TaskCenterQueryState = {
  data: TaskCenterData | null;
  error: string | null;
  isLoading: boolean;
  isPolling: boolean;
  lastLoadedAt: string | null;
  pollIntervalMs: number;
  reload(): Promise<void>;
};

const taskCenterPollIntervalMs = 3000;

export function useTaskCenterQuery(enabled: boolean): TaskCenterQueryState {
  const [data, setData] = useState<TaskCenterData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (!enabled) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        setData(await chartWallApiService.fetchTaskCenter(signal));
        setLastLoadedAt(new Date().toISOString());
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
    }, taskCenterPollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
      controller.abort();
    };
  }, [enabled, load]);

  return {
    data,
    error,
    isLoading,
    isPolling: enabled,
    lastLoadedAt,
    pollIntervalMs: taskCenterPollIntervalMs,
    reload: () => load()
  };
}
