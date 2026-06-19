import type { BinanceCryptoCatalogItem, CoinGeckoCryptoMarketItem } from "@gold-insights/data-adapters";
import type { SqliteProviderSnapshotRepository } from "@gold-insights/data-storage";
import { ProviderSnapshotCacheService } from "../shared/provider-snapshot-cache.service";

export type CryptoAssetDirectoryLoadResult = {
  catalogItems: BinanceCryptoCatalogItem[];
  valuationsBySymbol: Map<string, CoinGeckoCryptoMarketItem>;
  isCatalogAvailable: boolean;
  isValuationAvailable: boolean;
};

type CryptoAssetDirectorySnapshotPayload = {
  catalogItems: BinanceCryptoCatalogItem[];
  valuations: CoinGeckoCryptoMarketItem[];
};

export class CryptoAssetDirectorySnapshotService {
  private readonly cache: ProviderSnapshotCacheService<CryptoAssetDirectoryLoadResult, CryptoAssetDirectorySnapshotPayload>;

  public constructor(snapshotRepository: SqliteProviderSnapshotRepository) {
    this.cache = new ProviderSnapshotCacheService(snapshotRepository, {
      key: "asset-directory:crypto:v1",
      refreshTtlMs: 60 * 1000,
      isPayload: this.isPayload,
      toValue: this.toValue,
      toPayload: this.toPayload
    });
  }

  public load = async (loadFresh: () => Promise<CryptoAssetDirectoryLoadResult>): Promise<CryptoAssetDirectoryLoadResult> =>
    this.cache.load(loadFresh);

  private toValue = (payload: CryptoAssetDirectorySnapshotPayload): CryptoAssetDirectoryLoadResult => ({
    catalogItems: payload.catalogItems,
    valuationsBySymbol: new Map(payload.valuations.map((item) => [this.normalizeSymbol(item.symbol), item])),
    isCatalogAvailable: true,
    isValuationAvailable: true
  });

  private toPayload = (result: CryptoAssetDirectoryLoadResult): CryptoAssetDirectorySnapshotPayload | null => {
    if (!result.isCatalogAvailable || result.catalogItems.length === 0) {
      return null;
    }

    return {
      catalogItems: result.catalogItems,
      valuations: [...result.valuationsBySymbol.values()]
    };
  };

  private isPayload = (value: unknown): value is CryptoAssetDirectorySnapshotPayload => {
    if (!value || typeof value !== "object") {
      return false;
    }

    const record = value as Partial<CryptoAssetDirectorySnapshotPayload>;
    return Array.isArray(record.catalogItems) && Array.isArray(record.valuations);
  };

  private normalizeSymbol = (value: string): string =>
    value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
