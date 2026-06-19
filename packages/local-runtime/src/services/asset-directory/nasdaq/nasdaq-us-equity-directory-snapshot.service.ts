import type { NasdaqUsEquityCatalogItem, NasdaqUsEquityValuationItem } from "@gold-insights/data-adapters";
import type { SqliteProviderSnapshotRepository } from "@gold-insights/data-storage";
import { ProviderSnapshotCacheService } from "../shared/provider-snapshot-cache.service";

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
  private readonly cache: ProviderSnapshotCacheService<NasdaqUsEquityDirectoryLoadResult, NasdaqUsEquityDirectorySnapshotPayload>;

  public constructor(snapshotRepository: SqliteProviderSnapshotRepository) {
    this.cache = new ProviderSnapshotCacheService(snapshotRepository, {
      key: "asset-directory:nasdaq-us-equity:v1",
      refreshTtlMs: 5 * 60 * 1000,
      isPayload: this.isPayload,
      toValue: this.toValue,
      toPayload: this.toPayload
    });
  }

  public load = async (loadFresh: () => Promise<NasdaqUsEquityDirectoryLoadResult>): Promise<NasdaqUsEquityDirectoryLoadResult> =>
    this.cache.load(loadFresh);

  private toValue = (payload: NasdaqUsEquityDirectorySnapshotPayload): NasdaqUsEquityDirectoryLoadResult => ({
    catalogItems: payload.catalogItems,
    valuationsBySymbol: new Map(payload.valuations.map((item) => [this.normalizeSymbol(item.symbol), item])),
    isCatalogAvailable: true,
    isValuationAvailable: true
  });

  private toPayload = (result: NasdaqUsEquityDirectoryLoadResult): NasdaqUsEquityDirectorySnapshotPayload | null => {
    if (!result.isCatalogAvailable || result.catalogItems.length === 0) {
      return null;
    }

    return {
      catalogItems: result.catalogItems,
      valuations: [...result.valuationsBySymbol.values()]
    };
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
