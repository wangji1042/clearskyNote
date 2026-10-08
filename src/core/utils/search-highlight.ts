import { escapeHtml } from "@/core/utils/html";

/**
 * 将文本中匹配关键词的部分用 `<mark>` 包裹（输入须先 escape）。
 */
export function highlightSearchHtml(text: string, query: string): string {
  if (!query || !text) {
    return escapeHtml(text);
  }
  const escaped = escapeHtml(text);
  const escapedQuery = escapeHtml(query);
  const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return escaped.replace(regex, "<mark>$1</mark>");
}
