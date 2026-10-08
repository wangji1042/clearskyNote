import { stripMarkdownToPlainText } from "@/features/editor/lib/markdown-render";

/** 列表摘要最大长度 */
const SUMMARY_MAX_LENGTH = 120;

/** 从 Markdown 正文生成列表用纯文本摘要 */
export function buildNoteSummary(content: string): string {
  return stripMarkdownToPlainText(content).slice(0, SUMMARY_MAX_LENGTH);
}
