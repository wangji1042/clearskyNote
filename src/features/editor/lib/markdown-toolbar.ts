/** 工具栏可执行的操作类型 */
export type MarkdownToolbarAction =
  | "bold"
  | "italic"
  | "strikethrough"
  | "heading"
  | "quote"
  | "ul"
  | "ol"
  | "tasklist"
  | "table"
  | "code"
  | "codeblock"
  | "link"
  | "image";

/** 应用工具栏操作后的文本与光标位置 */
export interface MarkdownEditResult {
  /** 更新后的全文 */
  value: string;
  /** 光标起始位置 */
  selectionStart: number;
  /** 光标结束位置 */
  selectionEnd: number;
}

/** 行首插入前缀（多行时对每行生效） */
function prefixLines(text: string, prefix: string): string {
  return text
    .split("\n")
    .map((line) => (line.length ? `${prefix}${line}` : line))
    .join("\n");
}

/** 在选区两侧包裹标记；无选区时插入占位并选中占位文字 */
function wrapSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
  placeholder: string,
): MarkdownEditResult {
  const selected = value.slice(start, end);
  const inner = selected || placeholder;
  const next = value.slice(0, start) + before + inner + after + value.slice(end);
  const innerStart = start + before.length;
  const innerEnd = innerStart + inner.length;
  return {
    value: next,
    selectionStart: innerStart,
    selectionEnd: innerEnd,
  };
}

/** 在当前行或选区行前插入块级前缀 */
function insertLinePrefix(
  value: string,
  start: number,
  end: number,
  prefix: string,
): MarkdownEditResult {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEndRaw = value.indexOf("\n", end);
  const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;
  const block = value.slice(lineStart, lineEnd);
  const prefixed = prefixLines(block || "", prefix);
  const next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);
  const delta = prefixed.length - block.length;
  return {
    value: next,
    selectionStart: start + delta,
    selectionEnd: end + delta,
  };
}

/**
 * 对 textarea 当前选区应用 Markdown 工具栏操作。
 */
export function applyMarkdownToolbarAction(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  action: MarkdownToolbarAction,
  options?: { url?: string; alt?: string },
): MarkdownEditResult {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);

  switch (action) {
    case "bold":
      return wrapSelection(value, start, end, "**", "**", "粗体");
    case "italic":
      return wrapSelection(value, start, end, "*", "*", "斜体");
    case "strikethrough":
      return wrapSelection(value, start, end, "~~", "~~", "删除线");
    case "heading":
      return insertLinePrefix(value, start, end, "## ");
    case "quote":
      return insertLinePrefix(value, start, end, "> ");
    case "ul":
      return insertLinePrefix(value, start, end, "- ");
    case "ol": {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const lineEndRaw = value.indexOf("\n", end);
      const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;
      const block = value.slice(lineStart, lineEnd);
      const lines = (block || "").split("\n");
      const numbered = lines
        .map((line, i) => (line.length ? `${i + 1}. ${line}` : line))
        .join("\n");
      const next = value.slice(0, lineStart) + numbered + value.slice(lineEnd);
      const delta = numbered.length - block.length;
      return {
        value: next,
        selectionStart: start + delta,
        selectionEnd: end + delta,
      };
    }
    case "tasklist":
      return insertLinePrefix(value, start, end, "- [ ] ");
    case "table": {
      const snippet = "\n| 列1 | 列2 |\n| --- | --- |\n| 内容 | 内容 |\n";
      const next = value.slice(0, start) + snippet + value.slice(end);
      const cellStart = start + snippet.indexOf("内容");
      return {
        value: next,
        selectionStart: cellStart,
        selectionEnd: cellStart + 2,
      };
    }
    case "code":
      return wrapSelection(value, start, end, "`", "`", "code");
    case "codeblock": {
      const selected = value.slice(start, end);
      const inner = selected || "代码";
      const snippet = `\n\`\`\`\n${inner}\n\`\`\`\n`;
      const next = value.slice(0, start) + snippet + value.slice(end);
      const innerStart = start + 5;
      const innerEnd = innerStart + inner.length;
      return { value: next, selectionStart: innerStart, selectionEnd: innerEnd };
    }
    case "link": {
      const selected = value.slice(start, end);
      const label = selected || "链接文字";
      const url = (options && options.url ? options.url.trim() : "") || "https://";
      const snippet = `[${label}](${url})`;
      const next = value.slice(0, start) + snippet + value.slice(end);
      const urlStart = start + label.length + 3;
      const urlEnd = urlStart + url.length;
      return { value: next, selectionStart: urlStart, selectionEnd: urlEnd };
    }
    case "image": {
      const alt = (options && options.alt ? options.alt.trim() : "") || "图片";
      const url = (options && options.url ? options.url.trim() : "") || "https://";
      const snippet = `![${alt}](${url})`;
      const next = value.slice(0, start) + snippet + value.slice(end);
      const urlStart = start + alt.length + 4;
      const urlEnd = urlStart + url.length;
      return { value: next, selectionStart: urlStart, selectionEnd: urlEnd };
    }
    default:
      return { value, selectionStart: start, selectionEnd: end };
  }
}
