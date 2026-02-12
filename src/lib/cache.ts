type CacheEntry<T> = { value: T; expiresAt: number };

export class TTLCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(private defaultTtlMs: number) {}

  set(key: string, value: T, ttlMs?: number) {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(key, { value, expiresAt });
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  del(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}
