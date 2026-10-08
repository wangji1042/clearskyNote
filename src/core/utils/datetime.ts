/**
 * 格式化为中文 locale 的短日期时间（列表展示用）。
 */
export function formatShortDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
