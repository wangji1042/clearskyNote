<template>
  <div class="md-editor">
    <div class="md-editor__header">
      <div class="md-editor__toolbar" role="toolbar" aria-label="Markdown 格式工具">
        <button
          v-for="item in toolbarItems"
          :key="item.action"
          type="button"
          class="md-editor__toolbar-btn"
          :title="item.label"
          :aria-label="item.label"
          @click="onToolbarClick(item.action)"
        >
          <span class="md-editor__toolbar-icon" aria-hidden="true">{{ item.icon }}</span>
        </button>

        <span class="md-editor__toolbar-divider" aria-hidden="true" />

        <button
          type="button"
          class="md-editor__toolbar-btn"
          title="插入链接"
          aria-label="插入链接"
          @click="onInsertLink"
        >
          <span class="md-editor__toolbar-icon" aria-hidden="true">🔗</span>
        </button>
        <button
          type="button"
          class="md-editor__toolbar-btn"
          title="插入图片（URL）"
          aria-label="插入图片 URL"
          @click="onInsertImageUrl"
        >
          <span class="md-editor__toolbar-icon" aria-hidden="true">🖼</span>
        </button>
        <button
          type="button"
          class="md-editor__toolbar-btn"
          title="从本机选择图片"
          aria-label="从本机选择图片"
          @click="onPickLocalImage"
        >
          <span class="md-editor__toolbar-icon" aria-hidden="true">📁</span>
        </button>
        <input
          ref="imageInputRef"
          type="file"
          accept="image/*"
          class="md-editor__image-input"
          tabindex="-1"
          aria-hidden="true"
          @change="onLocalImageSelected"
        />
      </div>

      <button
        type="button"
        class="md-editor__preview-toggle"
        :class="{ 'md-editor__preview-toggle--active': isPreview }"
        :aria-pressed="isPreview"
        @click="togglePreview"
      >
        {{ isPreview ? "编辑" : "预览" }}
      </button>
    </div>

    <div class="md-editor__body">
      <textarea
        v-show="!isPreview"
        ref="textareaRef"
        :value="modelValue"
        class="md-editor__textarea csn-textarea"
        :placeholder="placeholder"
        :disabled="disabled"
        spellcheck="true"
        @input="onInput"
        @keydown="onKeydown"
      />

      <article v-show="isPreview" class="md-editor__preview" v-html="previewHtml" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { renderMarkdownToHtml } from "@/features/editor/lib/markdown-render";
import {
  applyMarkdownToolbarAction,
  type MarkdownToolbarAction,
} from "@/features/editor/lib/markdown-toolbar";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    disabled?: boolean;
  }>(),
  {
    placeholder: "支持 Markdown 语法，开始记录…",
    disabled: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

/** 工具栏按钮配置 */
const toolbarItems: { action: MarkdownToolbarAction; label: string; icon: string }[] = [
  { action: "bold", label: "粗体", icon: "B" },
  { action: "italic", label: "斜体", icon: "I" },
  { action: "strikethrough", label: "删除线", icon: "S" },
  { action: "heading", label: "标题", icon: "H" },
  { action: "quote", label: "引用", icon: "❝" },
  { action: "ul", label: "无序列表", icon: "•" },
  { action: "ol", label: "有序列表", icon: "1." },
  { action: "tasklist", label: "任务列表", icon: "☑" },
  { action: "table", label: "表格", icon: "⊞" },
  { action: "code", label: "行内代码", icon: "</>" },
  { action: "codeblock", label: "代码块", icon: "{ }" },
];

/** 是否处于预览模式 */
const isPreview = ref(false);

/** 正文编辑区引用 */
const textareaRef = ref<HTMLTextAreaElement | null>(null);

/** 本机图片选择 input */
const imageInputRef = ref<HTMLInputElement | null>(null);

/** 消毒后的预览 HTML */
const previewHtml = computed(() => renderMarkdownToHtml(props.modelValue));

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) {
      isPreview.value = false;
    }
  },
);

/** 切换编辑 / 预览 */
function togglePreview(): void {
  if (props.disabled) {
    return;
  }
  isPreview.value = !isPreview.value;
}

/** 同步 v-model */
function onInput(event: Event): void {
  const target = event.target as HTMLTextAreaElement;
  emit("update:modelValue", target.value);
}

/** Ctrl/Cmd + B/I 快捷加粗、斜体 */
function onKeydown(event: KeyboardEvent): void {
  if (!(event.ctrlKey || event.metaKey)) {
    return;
  }
  const key = event.key.toLowerCase();
  if (key === "b") {
    event.preventDefault();
    runToolbarAction("bold");
  } else if (key === "i") {
    event.preventDefault();
    runToolbarAction("italic");
  }
}

/** 应用工具栏操作并恢复焦点与选区 */
function runToolbarAction(
  action: MarkdownToolbarAction,
  options?: { url?: string; alt?: string },
): void {
  const el = textareaRef.value;
  if (!el || props.disabled) {
    return;
  }
  const result = applyMarkdownToolbarAction(
    el.value,
    el.selectionStart,
    el.selectionEnd,
    action,
    options,
  );
  emit("update:modelValue", result.value);
  void nextTick(() => {
    el.focus();
    el.setSelectionRange(result.selectionStart, result.selectionEnd);
  });
}

/** 工具栏按钮点击 */
function onToolbarClick(action: MarkdownToolbarAction): void {
  runToolbarAction(action);
}

/** 插入链接：提示 URL */
function onInsertLink(): void {
  const url = window.prompt("链接地址", "https://");
  if (url === null) {
    return;
  }
  runToolbarAction("link", { url });
}

/** 插入图片：提示 URL */
function onInsertImageUrl(): void {
  const url = window.prompt("图片地址", "https://");
  if (url === null) {
    return;
  }
  const altPrompt = window.prompt("图片描述（可选）", "图片");
  const alt = altPrompt != null ? altPrompt : "图片";
  runToolbarAction("image", { url, alt });
}

/** 打开本机图片选择 */
function onPickLocalImage(): void {
  const imageInput = imageInputRef.value;
  if (imageInput) {
    imageInput.click();
  }
}

/** 将所选图片以 Data URL 插入 Markdown */
function onLocalImageSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files && input.files.length > 0 ? input.files[0] : undefined;
  input.value = "";
  if (!file || !file.type.startsWith("image/")) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const url = typeof reader.result === "string" ? reader.result : "";
    if (!url) {
      return;
    }
    const alt = file.name.replace(/\.[^.]+$/, "") || "图片";
    runToolbarAction("image", { url, alt });
  };
  reader.readAsDataURL(file);
}
</script>

<style lang="scss">
@use "@/styles/variables" as v;

.md-editor {
  flex: 1;
  min-height: 0;
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.md-editor__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
}

.md-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.md-editor__toolbar-btn {
  display: grid;
  place-items: center;
  min-width: 34px;
  height: 34px;
  padding: 0 8px;
  border-radius: 10px;
  border: 1px solid rgba(95, 122, 153, 0.22);
  background: rgba(255, 255, 255, 0.9);
  color: v.$color-text-dark;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    background: rgba(236, 243, 255, 0.95);
    border-color: rgba(95, 122, 153, 0.35);
  }
}

.md-editor__toolbar-icon {
  line-height: 1;
  font-style: normal;
}

.md-editor__toolbar-divider {
  width: 1px;
  height: 22px;
  margin: 0 2px;
  background: v.$color-border;
}

.md-editor__image-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.md-editor__preview-toggle {
  flex-shrink: 0;
  padding: 8px 14px;
  border-radius: 12px;
  border: 1px solid v.$color-border;
  background: rgba(255, 255, 255, 0.9);
  color: v.$color-text-dark;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover,
  &--active {
    background: v.$color-text-dark;
    color: #f8fbff;
    border-color: v.$color-text-dark;
  }
}

.md-editor__body {
  flex: 1;
  min-height: 0;
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.md-editor__textarea,
.md-editor__preview {
  flex: 1;
  min-height: 0;
  min-width: 0;
  max-width: 100%;
  width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  border: 1px solid v.$color-border;
  border-radius: v.$radius-md;
  background: v.$color-surface;
  color: v.$color-text;
}

.md-editor__textarea {
  font-family: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace;
  font-size: 0.92rem;
  resize: none;
  padding: 16px;
  line-height: 1.7;
  outline: none;
}

.md-editor__preview {
  padding: 16px;
  line-height: 1.75;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
}

.md-editor__preview h1,
.md-editor__preview h2,
.md-editor__preview h3,
.md-editor__preview h4 {
  margin: 1.1em 0 0.5em;
  line-height: 1.3;
  color: v.$color-text-dark;
}

.md-editor__preview h1 {
  font-size: 1.55rem;
}

.md-editor__preview h2 {
  font-size: 1.3rem;
}

.md-editor__preview h3 {
  font-size: 1.12rem;
}

.md-editor__preview p {
  margin: 0.65em 0;
}

.md-editor__preview ul,
.md-editor__preview ol {
  margin: 0.65em 0;
  padding-left: 1.5em;
}

.md-editor__preview blockquote {
  margin: 0.8em 0;
  padding: 0.4em 0 0.4em 1em;
  border-left: 4px solid rgba(23, 48, 79, 0.25);
  color: v.$color-text-muted;
}

.md-editor__preview code {
  padding: 0.15em 0.4em;
  border-radius: 6px;
  background: rgba(236, 243, 255, 0.9);
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 0.9em;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.md-editor__preview pre {
  margin: 0.8em 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: v.$color-text-dark;
  color: #ecf3ff;
  max-width: 100%;
  overflow-x: hidden;
  white-space: pre-wrap;
  word-break: break-all;
}

.md-editor__preview pre code {
  padding: 0;
  background: transparent;
  color: inherit;
  white-space: pre-wrap;
  word-break: break-all;
}

.md-editor__preview a {
  color: #2a6eb8;
  text-decoration: underline;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.md-editor__preview img {
  display: block;
  max-width: 100%;
  width: auto;
  height: auto;
  box-sizing: border-box;
  border-radius: 10px;
  margin: 0.6em 0;
}

.md-editor__preview hr {
  border: none;
  border-top: 1px solid v.$color-border;
  margin: 1.2em 0;
}

.md-editor__preview table {
  width: 100%;
  max-width: 100%;
  border-collapse: collapse;
  margin: 0.8em 0;
  table-layout: fixed;
}

.md-editor__preview th,
.md-editor__preview td {
  border: 1px solid v.$color-border;
  padding: 8px 10px;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.md-editor__preview .contains-task-list {
  list-style: none;
  padding-left: 0.2em;
}

.md-editor__preview .task-list-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  list-style: none;
}

.md-editor__preview .task-list-item input[type="checkbox"] {
  margin-top: 0.35em;
  flex-shrink: 0;
  accent-color: v.$color-text-dark;
}

.md-editor__preview del {
  color: v.$color-text-muted;
  text-decoration: line-through;
}

@media (max-width: 1080px) {
  .md-editor__textarea,
  .md-editor__preview {
    min-height: 46vh;
  }

  .md-editor__toolbar-btn {
    min-width: 40px;
    height: 40px;
  }
}
</style>
