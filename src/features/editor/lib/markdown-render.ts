import MarkdownIt from "markdown-it";
import DOMPurify, { type Config as DOMPurifyConfig } from "dompurify";
import { useMarkdownGfmPlugins } from "@/features/editor/lib/markdown-gfm-plugins";

/** 笔记预览用 Markdown 解析器（GFM：表格、任务列表、删除线等） */
const md = useMarkdownGfmPlugins(
  new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true,
  }),
);

/** DOMPurify 配置：允许任务列表复选框与表格相关属性 */
const sanitizeOptions: DOMPurifyConfig = {
  USE_PROFILES: { html: true },
  ADD_TAGS: ["input"],
  ADD_ATTR: ["type", "checked", "disabled", "class", "colspan", "rowspan"],
};

/**
 * 将 Markdown 源文转为经消毒的 HTML，供预览区安全渲染。
 */
export function renderMarkdownToHtml(source: string): string {
  const raw = md.render(source || "");
  return DOMPurify.sanitize(raw, sanitizeOptions);
}

/**
 * 将 Markdown 转为纯文本摘要（用于笔记列表预览）。
 */
export function stripMarkdownToPlainText(source: string): string {
  const html = md.render(source || "");
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
  return text.replace(/\s+/g, " ").trim();
}
