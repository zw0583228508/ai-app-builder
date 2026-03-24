/**
 * AI Response Cache
 *
 * Bundle-level cache for React esbuild output.
 * Keyed by: projectId + file hash.
 * Re-exports from bundle cache utilities.
 */

export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  ttlMs: number;
}

const inMemoryCache = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const entry = inMemoryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.createdAt > entry.ttlMs) {
    inMemoryCache.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet<T>(key: string, value: T, ttlMs = 5 * 60 * 1000): void {
  inMemoryCache.set(key, { value, createdAt: Date.now(), ttlMs });
}

export function cacheDelete(key: string): void {
  inMemoryCache.delete(key);
}

export function cacheInvalidatePrefix(prefix: string): void {
  for (const key of inMemoryCache.keys()) {
    if (key.startsWith(prefix)) {
      inMemoryCache.delete(key);
    }
  }
}

export function cacheSize(): number {
  return inMemoryCache.size;
}
