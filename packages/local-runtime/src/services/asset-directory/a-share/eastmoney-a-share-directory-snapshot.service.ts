import type { EastmoneyAshareCatalogItem } from "@gold-insights/data-adapters";
import type { SqliteProviderSnapshotRepository } from "@gold-insights/data-storage";
import { ProviderSnapshotCacheService } from "../../shared/provider-snapshot-cache.service";

export type EastmoneyAshareDirectoryLoadResult = {
  catalogItems: EastmoneyAshareCatalogItem[];
  isCatalogAvailable: boolean;
};

type EastmoneyAshareDirectorySnapshotPayload = {
  catalogItems: EastmoneyAshareCatalogItem[];
};

export class EastmoneyAshareDirectorySnapshotService {
  private readonly cache: ProviderSnapshotCacheService<EastmoneyAshareDirectoryLoadResult, EastmoneyAshareDirectorySnapshotPayload>;

  public constructor(snapshotRepository: SqliteProviderSnapshotRepository) {
    this.cache = new ProviderSnapshotCacheService(snapshotRepository, {
      key: "asset-directory:eastmoney-a-share:v1",
      refreshTtlMs: 60 * 1000,
      isPayload: this.isPayload,
      toValue: this.toValue,
      toPayload: this.toPayload
    });
  }

  public load = async (loadFresh: () => Promise<EastmoneyAshareDirectoryLoadResult>): Promise<EastmoneyAshareDirectoryLoadResult> =>
    this.cache.load(loadFresh);

  private toValue = (payload: EastmoneyAshareDirectorySnapshotPayload): EastmoneyAshareDirectoryLoadResult => ({
    catalogItems: payload.catalogItems,
    isCatalogAvailable: true
  });

  private toPayload = (result: EastmoneyAshareDirectoryLoadResult): EastmoneyAshareDirectorySnapshotPayload | null => {
    if (!result.isCatalogAvailable || result.catalogItems.length === 0) {
      return null;
    }

    return {
      catalogItems: result.catalogItems
    };
  };

  private isPayload = (value: unknown): value is EastmoneyAshareDirectorySnapshotPayload => {
    if (!value || typeof value !== "object") {
      return false;
    }

    const record = value as Partial<EastmoneyAshareDirectorySnapshotPayload>;
    return Array.isArray(record.catalogItems);
  };
}
