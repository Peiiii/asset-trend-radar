import type { EastmoneyAshareCatalogItem } from "@gold-insights/data-adapters";
import type { SqliteProviderSnapshotRepository } from "@gold-insights/data-storage";

export type EastmoneyAshareDirectoryLoadResult = {
  catalogItems: EastmoneyAshareCatalogItem[];
  isCatalogAvailable: boolean;
};

type EastmoneyAshareDirectorySnapshotPayload = {
  catalogItems: EastmoneyAshareCatalogItem[];
};

export class EastmoneyAshareDirectorySnapshotService {
  private readonly snapshotKey = "asset-directory:eastmoney-a-share:v1";
  private readonly refreshTtlMs = 60 * 1000;
  private refreshRequest: Promise<void> | null = null;

  public constructor(private readonly snapshotRepository: SqliteProviderSnapshotRepository) {}

  public load = async (loadFresh: () => Promise<EastmoneyAshareDirectoryLoadResult>): Promise<EastmoneyAshareDirectoryLoadResult> => {
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

  private refresh = (loadFresh: () => Promise<EastmoneyAshareDirectoryLoadResult>): void => {
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

  private getSnapshot = (): { value: EastmoneyAshareDirectoryLoadResult; updatedAt: number } | null => {
    const snapshot = this.snapshotRepository.getSnapshot<EastmoneyAshareDirectorySnapshotPayload>(this.snapshotKey);

    if (!snapshot || !this.isPayload(snapshot.payload)) {
      return null;
    }

    return {
      updatedAt: snapshot.updatedAt,
      value: {
        catalogItems: snapshot.payload.catalogItems,
        isCatalogAvailable: true
      }
    };
  };

  private saveSnapshot = (result: EastmoneyAshareDirectoryLoadResult): void => {
    if (!result.isCatalogAvailable || result.catalogItems.length === 0) {
      return;
    }

    this.snapshotRepository.upsertSnapshot(this.snapshotKey, {
      catalogItems: result.catalogItems
    } satisfies EastmoneyAshareDirectorySnapshotPayload);
  };

  private isPayload = (value: unknown): value is EastmoneyAshareDirectorySnapshotPayload => {
    if (!value || typeof value !== "object") {
      return false;
    }

    const record = value as Partial<EastmoneyAshareDirectorySnapshotPayload>;
    return Array.isArray(record.catalogItems);
  };
}
