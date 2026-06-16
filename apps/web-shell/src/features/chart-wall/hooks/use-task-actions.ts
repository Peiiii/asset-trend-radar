import { useCallback, useState } from "react";
import type { RuntimeTaskActionKey } from "@gold-insights/market-domain";
import { chartWallApiService } from "../services/chart-wall-api.service";

type TaskActionCallbacks = {
  reloadChartWall(): Promise<void>;
  reloadFundDirectory(): Promise<void>;
  reloadTaskCenter(): Promise<void>;
  onFundMessage(message: string): void;
};

type TaskActionsState = {
  runningActionKey: RuntimeTaskActionKey | null;
  message: string | null;
  runAction(actionKey: RuntimeTaskActionKey): Promise<void>;
  startGlobalRefresh(): Promise<void>;
  syncFundCatalog(): Promise<void>;
};

export function useTaskActions({ reloadChartWall, reloadFundDirectory, reloadTaskCenter, onFundMessage }: TaskActionCallbacks): TaskActionsState {
  const [runningActionKey, setRunningActionKey] = useState<RuntimeTaskActionKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const startGlobalRefresh = useCallback(async (): Promise<void> => {
    setRunningActionKey("refresh-global-bars");
    setMessage(null);

    try {
      const response = await chartWallApiService.startRefresh();
      setMessage(response.message);
      await reloadTaskCenter();
      await reloadChartWall();
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : "全市场行情同步启动失败");
    } finally {
      setRunningActionKey(null);
    }
  }, [reloadChartWall, reloadTaskCenter]);

  const syncFundCatalog = useCallback(async (): Promise<void> => {
    setRunningActionKey("sync-fund-catalog");
    setMessage(null);

    try {
      const response = await chartWallApiService.syncEastmoneyFundCatalog();
      const nextMessage = `基金目录已同步，${response.summary.totalCount.toLocaleString("en-US")} 只；快照更新 ${response.metricSnapshotsUpdated.toLocaleString("en-US")} 只`;
      setMessage(nextMessage);
      onFundMessage(nextMessage);
      await reloadFundDirectory();
      await reloadChartWall();
      await reloadTaskCenter();
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "基金目录同步失败";
      setMessage(nextMessage);
      onFundMessage(nextMessage);
    } finally {
      setRunningActionKey(null);
    }
  }, [onFundMessage, reloadChartWall, reloadFundDirectory, reloadTaskCenter]);

  const runAction = useCallback(
    async (actionKey: RuntimeTaskActionKey): Promise<void> => {
      if (actionKey === "sync-fund-catalog") {
        await syncFundCatalog();
        return;
      }

      await startGlobalRefresh();
    },
    [startGlobalRefresh, syncFundCatalog]
  );

  return {
    runningActionKey,
    message,
    runAction,
    startGlobalRefresh,
    syncFundCatalog
  };
}
