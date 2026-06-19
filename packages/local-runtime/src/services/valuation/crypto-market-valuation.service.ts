import type { CoinGeckoCryptoMarketItem, CoinGeckoCryptoMarketsProvider } from "@gold-insights/data-adapters";
import type { SqliteProviderSnapshotRepository } from "@gold-insights/data-storage";
import { ProviderSnapshotCacheService } from "../shared/provider-snapshot-cache.service";

type CryptoMarketValuationSnapshotPayload = {
  items: CoinGeckoCryptoMarketItem[];
};

export class CryptoMarketValuationService {
  private readonly snapshotKey = "valuation:crypto-market:v1";
  private readonly directorySnapshotKey = "asset-directory:crypto:v1";
  private readonly cache: ProviderSnapshotCacheService<Map<string, CoinGeckoCryptoMarketItem>, CryptoMarketValuationSnapshotPayload>;

  public constructor(
    private readonly marketsProvider: CoinGeckoCryptoMarketsProvider,
    private readonly snapshotRepository: SqliteProviderSnapshotRepository
  ) {
    this.cache = new ProviderSnapshotCacheService(snapshotRepository, {
      key: this.snapshotKey,
      refreshTtlMs: 5 * 60 * 1000,
      isPayload: this.isPayload,
      toValue: this.toValue,
      toPayload: this.toPayload
    });
  }

  public listMarketsBySymbol = async (): Promise<Map<string, CoinGeckoCryptoMarketItem>> => {
    this.seedFromDirectorySnapshot();
    return this.cache.load(this.marketsProvider.listMarketsBySymbol);
  };

  private toValue = (payload: CryptoMarketValuationSnapshotPayload): Map<string, CoinGeckoCryptoMarketItem> =>
    new Map(payload.items.map((item) => [this.normalizeSymbol(item.symbol), item]));

  private toPayload = (itemsBySymbol: Map<string, CoinGeckoCryptoMarketItem>): CryptoMarketValuationSnapshotPayload | null => {
    if (itemsBySymbol.size === 0) {
      return null;
    }

    return {
      items: [...itemsBySymbol.values()]
    };
  };

  private isPayload = (value: unknown): value is CryptoMarketValuationSnapshotPayload => {
    if (!value || typeof value !== "object") {
      return false;
    }

    const record = value as Partial<CryptoMarketValuationSnapshotPayload>;
    return Array.isArray(record.items);
  };

  private seedFromDirectorySnapshot = (): void => {
    if (this.snapshotRepository.getSnapshot<CryptoMarketValuationSnapshotPayload>(this.snapshotKey)) {
      return;
    }

    const directorySnapshot = this.snapshotRepository.getSnapshot<{ valuations?: CoinGeckoCryptoMarketItem[] }>(this.directorySnapshotKey);
    const valuations = directorySnapshot?.payload.valuations;

    if (!directorySnapshot || !Array.isArray(valuations) || valuations.length === 0) {
      return;
    }

    this.snapshotRepository.upsertSnapshot(this.snapshotKey, { items: valuations } satisfies CryptoMarketValuationSnapshotPayload, directorySnapshot.updatedAt);
  };

  private normalizeSymbol = (value: string): string =>
    value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
