/// <reference types="vite/client" />

/** 由 vite.config `define` 注入，勿在业务中直接改 */
declare const __VITE_IS_DEV__: boolean;

declare module "vconsole" {
  /** 腾讯 vConsole 移动端调试面板 */
  export default class VConsole {
    constructor(options?: Record<string, unknown>);
  }
}

declare module "markdown-it-task-lists" {
  import type MarkdownIt from "markdown-it";

  interface TaskListsOptions {
    enabled?: boolean;
    label?: boolean;
    labelAfter?: boolean;
  }

  /** GitHub 风格任务列表插件 */
  function taskLists(md: MarkdownIt, options?: TaskListsOptions): void;
  export default taskLists;
}

declare module "markdown-it-multimd-table" {
  import type MarkdownIt from "markdown-it";

  interface MultimdTableOptions {
    multiline?: boolean;
    rowspan?: boolean;
    headerless?: boolean;
  }

  /** MultiMarkdown / GFM 表格插件 */
  function multimdTable(md: MarkdownIt, options?: MultimdTableOptions): void;
  export default multimdTable;
}
