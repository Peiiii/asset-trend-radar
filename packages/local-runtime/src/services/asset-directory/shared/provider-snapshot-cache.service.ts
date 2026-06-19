import type { SqliteProviderSnapshotRepository } from "@gold-insights/data-storage";

export type ProviderSnapshotCacheConfig<TValue, TPayload> = {
  key: string;
  refreshTtlMs: number;
  isPayload(value: unknown): value is TPayload;
  toValue(payload: TPayload): TValue;
  toPayload(value: TValue): TPayload | null;
};

export class ProviderSnapshotCacheService<TValue, TPayload> {
  private refreshRequest: Promise<void> | null = null;

  public constructor(
    private readonly snapshotRepository: SqliteProviderSnapshotRepository,
    private readonly config: ProviderSnapshotCacheConfig<TValue, TPayload>
  ) {}

  public load = async (loadFresh: () => Promise<TValue>): Promise<TValue> => {
    const snapshot = this.getSnapshot();

    if (snapshot) {
      if (Date.now() - snapshot.updatedAt > this.config.refreshTtlMs) {
        this.refresh(loadFresh);
      }

      return snapshot.value;
    }

    const fresh = await loadFresh();
    this.saveSnapshot(fresh);
    return fresh;
  };

  private refresh = (loadFresh: () => Promise<TValue>): void => {
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

  private getSnapshot = (): { value: TValue; updatedAt: number } | null => {
    const snapshot = this.snapshotRepository.getSnapshot<TPayload>(this.config.key);

    if (!snapshot || !this.config.isPayload(snapshot.payload)) {
      return null;
    }

    return {
      updatedAt: snapshot.updatedAt,
      value: this.config.toValue(snapshot.payload)
    };
  };

  private saveSnapshot = (value: TValue): void => {
    const payload = this.config.toPayload(value);

    if (!payload) {
      return;
    }

    this.snapshotRepository.upsertSnapshot(this.config.key, payload);
  };
}
