/**
 * 生成 RFC 4122 v4 UUID。优先 `randomUUID`，WebView 74 等环境回退到 `getRandomValues`。
 */
function randomUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const n = (Math.random() * 16) | 0;
    const value = char === "x" ? n : (n & 0x3) | 0x8;
    return value.toString(16);
  });
}

/** 带前缀的实体 id（如 `folder_…`、`note_…`） */
export function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

/** 当前时间的 ISO 8601 字符串 */
export function nowIso(): string {
  return new Date().toISOString();
}
