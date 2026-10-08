/**
 * 转义 HTML 特殊字符，供 v-html 高亮前使用。
 */
export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
