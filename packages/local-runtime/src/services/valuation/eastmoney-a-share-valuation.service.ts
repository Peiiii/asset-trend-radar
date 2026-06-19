import type { EastmoneyAshareCatalogItem, EastmoneyAshareCatalogProvider } from "@gold-insights/data-adapters";
import type { SqliteProviderSnapshotRepository } from "@gold-insights/data-storage";
import { ProviderSnapshotCacheService } from "../shared/provider-snapshot-cache.service";

type EastmoneyAshareValuationSnapshotPayload = {
  items: EastmoneyAshareCatalogItem[];
};

export class EastmoneyAshareValuationService {
  private readonly snapshotKey = "valuation:eastmoney-a-share:v1";
  private readonly directorySnapshotKey = "asset-directory:eastmoney-a-share:v1";
  private readonly cache: ProviderSnapshotCacheService<EastmoneyAshareCatalogItem[], EastmoneyAshareValuationSnapshotPayload>;

  public constructor(
    private readonly catalogProvider: EastmoneyAshareCatalogProvider,
    private readonly snapshotRepository: SqliteProviderSnapshotRepository
  ) {
    this.cache = new ProviderSnapshotCacheService(snapshotRepository, {
      key: this.snapshotKey,
      refreshTtlMs: 60 * 1000,
      isPayload: this.isPayload,
      toValue: this.toValue,
      toPayload: this.toPayload
    });
  }

  public listItemsBySymbol = async (): Promise<Map<string, EastmoneyAshareCatalogItem>> => {
    const items = await this.listCatalogItems();
    return new Map(items.map((item) => [this.normalizeSymbol(item.yahooSymbol), item]));
  };

  private listCatalogItems = async (): Promise<EastmoneyAshareCatalogItem[]> => {
    this.seedFromDirectorySnapshot();
    return this.cache.load(this.catalogProvider.listCatalog);
  };

  private toValue = (payload: EastmoneyAshareValuationSnapshotPayload): EastmoneyAshareCatalogItem[] =>
    payload.items;

  private toPayload = (items: EastmoneyAshareCatalogItem[]): EastmoneyAshareValuationSnapshotPayload | null => {
    if (items.length === 0) {
      return null;
    }

    return { items };
  };

  private isPayload = (value: unknown): value is EastmoneyAshareValuationSnapshotPayload => {
    if (!value || typeof value !== "object") {
      return false;
    }

    const record = value as Partial<EastmoneyAshareValuationSnapshotPayload>;
    return Array.isArray(record.items);
  };

  private seedFromDirectorySnapshot = (): void => {
    if (this.snapshotRepository.getSnapshot<EastmoneyAshareValuationSnapshotPayload>(this.snapshotKey)) {
      return;
    }

    const directorySnapshot = this.snapshotRepository.getSnapshot<{ catalogItems?: EastmoneyAshareCatalogItem[] }>(this.directorySnapshotKey);
    const catalogItems = directorySnapshot?.payload.catalogItems;

    if (!directorySnapshot || !Array.isArray(catalogItems) || catalogItems.length === 0) {
      return;
    }

    this.snapshotRepository.upsertSnapshot(this.snapshotKey, { items: catalogItems } satisfies EastmoneyAshareValuationSnapshotPayload, directorySnapshot.updatedAt);
  };

  private normalizeSymbol = (value: string): string =>
    value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
