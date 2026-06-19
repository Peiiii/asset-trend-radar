import type { NasdaqUsEquityCatalogItem, NasdaqUsEquityValuationItem } from "@gold-insights/data-adapters";
import type { SqliteProviderSnapshotRepository } from "@gold-insights/data-storage";

export type NasdaqUsEquityDirectoryLoadResult = {
  catalogItems: NasdaqUsEquityCatalogItem[];
  valuationsBySymbol: Map<string, NasdaqUsEquityValuationItem>;
  isCatalogAvailable: boolean;
  isValuationAvailable: boolean;
};

type NasdaqUsEquityDirectorySnapshotPayload = {
  catalogItems: NasdaqUsEquityCatalogItem[];
  valuations: NasdaqUsEquityValuationItem[];
};

export class NasdaqUsEquityDirectorySnapshotService {
  private readonly snapshotKey = "asset-directory:nasdaq-us-equity:v1";
  private readonly refreshTtlMs = 5 * 60 * 1000;
  private refreshRequest: Promise<void> | null = null;

  public constructor(private readonly snapshotRepository: SqliteProviderSnapshotRepository) {}

  public load = async (loadFresh: () => Promise<NasdaqUsEquityDirectoryLoadResult>): Promise<NasdaqUsEquityDirectoryLoadResult> => {
    const snapshot = this.getSnapshot();

    if (snapshot) {
      if (Date.now() - snapshot.updatedAt > this.refreshTtlMs) {
        this.refresh(loadFresh);
      }

      return snapshot.value;
    }

    const fresh = await loadFresh();
    this.saveSnapshot(fresh);
    return fresh;
  };

  private refresh = (loadFresh: () => Promise<NasdaqUsEquityDirectoryLoadResult>): void => {
    if (this.refreshRequest) {
      return;
    }

    this.refreshRequest = loadFresh()
      .then(this.saveSnapshot)
      .catch((error) => {
        console.warn(error);
      })
      .finally(() => {
        this.refreshRequest = null;
      });
  };

  private getSnapshot = (): { value: NasdaqUsEquityDirectoryLoadResult; updatedAt: number } | null => {
    const snapshot = this.snapshotRepository.getSnapshot<NasdaqUsEquityDirectorySnapshotPayload>(this.snapshotKey);

    if (!snapshot || !this.isPayload(snapshot.payload)) {
      return null;
    }

    return {
      updatedAt: snapshot.updatedAt,
      value: {
        catalogItems: snapshot.payload.catalogItems,
        valuationsBySymbol: new Map(snapshot.payload.valuations.map((item) => [this.normalizeSymbol(item.symbol), item])),
        isCatalogAvailable: true,
        isValuationAvailable: true
      }
    };
  };

  private saveSnapshot = (result: NasdaqUsEquityDirectoryLoadResult): void => {
    if (!result.isCatalogAvailable || result.catalogItems.length === 0) {
      return;
    }

    this.snapshotRepository.upsertSnapshot(this.snapshotKey, {
      catalogItems: result.catalogItems,
      valuations: [...result.valuationsBySymbol.values()]
    } satisfies NasdaqUsEquityDirectorySnapshotPayload);
  };

  private isPayload = (value: unknown): value is NasdaqUsEquityDirectorySnapshotPayload => {
    if (!value || typeof value !== "object") {
      return false;
    }

    const record = value as Partial<NasdaqUsEquityDirectorySnapshotPayload>;
    return Array.isArray(record.catalogItems) && Array.isArray(record.valuations);
  };

  private normalizeSymbol = (value: string): string =>
    value.toUpperCase().replace(/[./]/g, "-").replace(/[^A-Z0-9-]/g, "");
}
