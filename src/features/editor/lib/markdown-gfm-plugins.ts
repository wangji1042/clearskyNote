import type MarkdownIt from "markdown-it";
import multimdTable from "markdown-it-multimd-table";
import taskLists from "markdown-it-task-lists";

/**
 * GFM 删除线：~~text~~ → <del>
 */
function markdownItStrikethrough(md: MarkdownIt): void {
  md.inline.ruler.before("emphasis", "strikethrough", (state, silent) => {
    const max = state.posMax;
    const start = state.pos;

    if (state.src.charCodeAt(start) !== 0x7e /* ~ */) {
      return false;
    }
    if (start + 1 >= max || state.src.charCodeAt(start + 1) !== 0x7e) {
      return false;
    }

    const matchStart = start + 2;
    let matchEnd = matchStart;
    while (matchEnd < max) {
      if (
        state.src.charCodeAt(matchEnd) === 0x7e &&
        matchEnd + 1 < max &&
        state.src.charCodeAt(matchEnd + 1) === 0x7e
      ) {
        if (matchEnd - matchStart < 1) {
          return false;
        }
        if (silent) {
          return true;
        }

        const open = state.push("del_open", "del", 1);
        open.markup = "~~";

        const text = state.push("text", "", 0);
        text.content = state.src.slice(matchStart, matchEnd);

        const close = state.push("del_close", "del", -1);
        close.markup = "~~";

        state.pos = matchEnd + 2;
        return true;
      }
      matchEnd += 1;
    }

    return false;
  });
}

/**
 * 为 markdown-it 注册 GFM 扩展（表格、任务列表、删除线等）。
 */
export function useMarkdownGfmPlugins(md: MarkdownIt): MarkdownIt {
  return md
    .use(markdownItStrikethrough)
    .use(multimdTable, {
      multiline: false,
      rowspan: false,
      headerless: false,
    })
    .use(taskLists, {
      enabled: false,
      label: true,
      labelAfter: false,
    });
}
