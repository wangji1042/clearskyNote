/** 无 window 时的内存回退存储 */
const memoryStore = new Map<string, string>();

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}

/** 读取字符串；不存在返回 null */
export function readText(key: string): string | null {
  const storage = getStorage();
  if (!storage) {
    return memoryStore.has(key) ? (memoryStore.get(key) as string) : null;
  }
  return storage.getItem(key);
}

/** 写入字符串 */
export function writeText(key: string, value: string): void {
  const storage = getStorage();
  if (!storage) {
    memoryStore.set(key, value);
    return;
  }
  storage.setItem(key, value);
}
