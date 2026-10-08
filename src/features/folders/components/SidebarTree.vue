<template>
  <aside class="sidebar-tree csn-panel csn-panel--padded">
    <div class="csn-panel__header">
      <div>
        <p class="csn-eyebrow">目录</p>
        <h2>笔记空间</h2>
      </div>
      <button type="button" class="csn-btn csn-btn--ghost" @click="$emit('create-folder')">
        新建目录
      </button>
    </div>

    <div class="sidebar-tree__list">
      <div
        v-for="folder in folders"
        :key="folder.id"
        class="sidebar-tree__item"
        :class="{
          'sidebar-tree__item--active': folder.id === selectedFolderId,
          'sidebar-tree__item--menu-open': activeImportFolderId === folder.id,
        }"
        :style="{ paddingLeft: `${16 + folder.depth * 18}px` }"
        tabindex="0"
        role="button"
        :aria-label="`目录 ${folder.name}`"
        @click="onFolderRowClick(folder, $event)"
        @keydown="onFolderRowKeydown($event, folder.id)"
      >
        <div class="sidebar-tree__name-wrap">
          <input
            v-if="editingFolderId === folder.id"
            ref="renameInputRef"
            v-model="draftName"
            class="sidebar-tree__rename-input csn-input"
            type="text"
            :aria-label="`重命名 ${folder.name}`"
            @click.stop
            @keydown="onRenameKeydown"
            @blur="onRenameBlur"
          />
          <span v-else class="sidebar-tree__name">{{ folder.name }}</span>
        </div>

        <div class="sidebar-tree__actions" @click.stop>
          <button
            v-if="editingFolderId === folder.id"
            type="button"
            class="csn-icon-btn csn-icon-btn--rename csn-icon-btn--rename-confirm"
            title="确认"
            aria-label="确认重命名"
            @mousedown.prevent="onConfirmRename"
          >
            ✓
          </button>
          <button
            v-else
            type="button"
            class="csn-icon-btn csn-icon-btn--rename"
            title="重命名"
            :aria-label="`重命名目录 ${folder.name}`"
            @click="startRename(folder)"
          >
            ✎
          </button>
          <button
            v-if="editingFolderId !== folder.id"
            type="button"
            class="csn-icon-btn csn-icon-btn--import"
            title="导入笔记或文件夹"
            :aria-label="`导入到目录 ${folder.name}`"
            @click="toggleImportMenu(folder.id)"
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button
            type="button"
            class="csn-icon-btn csn-icon-btn--delete"
            title="删除目录"
            :aria-label="`删除目录 ${folder.name}`"
            @click="$emit('delete-folder', folder.id)"
          >
            &times;
          </button>
        </div>

        <div
          v-if="activeImportFolderId === folder.id"
          class="sidebar-tree__import-menu"
          @click.stop
        >
          <button
            type="button"
            class="sidebar-tree__import-menu-item"
            @click="triggerImportFile(folder.id)"
          >
            <span class="sidebar-tree__menu-icon" aria-hidden="true">📄</span>
            <span>导入单个文件 (.md / .txt)</span>
          </button>
          <button
            type="button"
            class="sidebar-tree__import-menu-item"
            @click="triggerImportFolder(folder.id)"
          >
            <span class="sidebar-tree__menu-icon" aria-hidden="true">📁</span>
            <span>导入文件夹 (全部笔记)</span>
          </button>
        </div>
      </div>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      accept=".md,.txt,text/markdown,text/plain"
      style="display: none"
      @change="onFileInputChange"
    />
    <input
      ref="folderInputRef"
      type="file"
      webkitdirectory=""
      directory=""
      multiple
      style="display: none"
      @change="onFolderInputChange"
    />
  </aside>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import type { FolderListItem } from "@/core/types/domain";

defineProps<{
  folders: FolderListItem[];
  selectedFolderId: string | null;
}>();

const emit = defineEmits<{
  "select-folder": [folderId: string];
  "create-folder": [];
  "delete-folder": [folderId: string];
  "rename-folder": [folderId: string, name: string];
  "import-files": [folderId: string, files: File[]];
}>();

/** 正在重命名的目录 id，null 表示未在编辑 */
const editingFolderId = ref<string | null>(null);

/** 当前展开导入菜单的目录 id，null 表示无展开 */
const activeImportFolderId = ref<string | null>(null);

/** 等待文件选择回调的目标目录 id */
const pendingTargetFolderId = ref<string | null>(null);

/** 单文件 input 引用 */
const fileInputRef = ref<HTMLInputElement | null>(null);

/** 文件夹 input 引用 */
const folderInputRef = ref<HTMLInputElement | null>(null);

/** 重命名输入框中的草稿名称 */
const draftName = ref("");

/** 重命名输入框引用（v-for 内 ref 在 Vue 3 中可能为元素数组） */
const renameInputRef = ref<HTMLInputElement | HTMLInputElement[] | null>(null);

/**
 * 从 v-for 内的 ref 解析出当前可聚焦的 input。
 */
function getRenameInputElement(): HTMLInputElement | null {
  const raw = renameInputRef.value;
  if (raw == null) {
    return null;
  }
  if (Array.isArray(raw)) {
    for (let i = 0; i < raw.length; i++) {
      const item = raw[i];
      if (item instanceof HTMLInputElement) {
        return item;
      }
    }
    return null;
  }
  return raw instanceof HTMLInputElement ? raw : null;
}

/** 失焦后延迟提交的定时器 */
let blurCommitTimer: ReturnType<typeof setTimeout> | null = null;

/** 发出选中目录事件 */
function emitSelect(folderId: string): void {
  emit("select-folder", folderId);
}

/** 目录行键盘：Enter / Space 选中 */
function onFolderRowKeydown(event: KeyboardEvent, folderId: string): void {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  event.preventDefault();
  emitSelect(folderId);
}

/** 重命名输入框键盘：Enter 确认、Esc 取消 */
function onRenameKeydown(event: KeyboardEvent): void {
  if (event.key === "Enter") {
    event.preventDefault();
    commitRename();
  } else if (event.key === "Escape") {
    event.preventDefault();
    cancelRename();
  }
}

/** 点击目录行：非操作区、非重命名输入时选中目录 */
function onFolderRowClick(folder: FolderListItem, event: MouseEvent): void {
  if (editingFolderId.value === folder.id) {
    return;
  }
  const el = event.target as HTMLElement | null;
  if (el != null && el.closest(".sidebar-tree__actions")) {
    return;
  }
  emitSelect(folder.id);
}

/** 进入重命名 */
function startRename(folder: FolderListItem): void {
  clearBlurCommitTimer();
  if (editingFolderId.value && editingFolderId.value !== folder.id) {
    commitRename();
  }
  editingFolderId.value = folder.id;
  draftName.value = folder.name;
  void nextTick(() => {
    const input = getRenameInputElement();
    if (input && typeof input.focus === "function") {
      input.focus();
      if (typeof input.select === "function") {
        input.select();
      }
    }
  });
}

/** 清除失焦延迟提交定时器 */
function clearBlurCommitTimer(): void {
  if (blurCommitTimer !== null) {
    clearTimeout(blurCommitTimer);
    blurCommitTimer = null;
  }
}

/** 点击「确认」 */
function onConfirmRename(): void {
  clearBlurCommitTimer();
  commitRename();
}

/** 确认重命名 */
function commitRename(): void {
  clearBlurCommitTimer();
  const id = editingFolderId.value;
  if (!id) {
    return;
  }
  const name = draftName.value.trim();
  if (name) {
    emit("rename-folder", id, name);
  }
  editingFolderId.value = null;
}

/** 取消重命名编辑 */
function cancelRename(): void {
  clearBlurCommitTimer();
  editingFolderId.value = null;
}

/** 失焦后短延迟提交 */
function onRenameBlur(): void {
  clearBlurCommitTimer();
  blurCommitTimer = setTimeout(() => {
    blurCommitTimer = null;
    commitRename();
  }, 200);
}

/** 切换指定目录的导入菜单显示状态 */
function toggleImportMenu(folderId: string): void {
  activeImportFolderId.value = activeImportFolderId.value === folderId ? null : folderId;
}

/** 触发单文件导入 */
function triggerImportFile(folderId: string): void {
  pendingTargetFolderId.value = folderId;
  activeImportFolderId.value = null;
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
    fileInputRef.value.click();
  }
}

/** 触发文件夹导入 */
function triggerImportFolder(folderId: string): void {
  pendingTargetFolderId.value = folderId;
  activeImportFolderId.value = null;
  if (folderInputRef.value) {
    folderInputRef.value.value = "";
    folderInputRef.value.click();
  }
}

/** 单文件选择完成回调 */
function onFileInputChange(event: Event): void {
  const target = event.target as HTMLInputElement | null;
  const files = Array.from(target?.files ?? []);
  const targetFolderId = pendingTargetFolderId.value;
  pendingTargetFolderId.value = null;

  if (files.length > 0 && targetFolderId) {
    emit("import-files", targetFolderId, files);
  }
}

/** 文件夹选择完成回调 */
function onFolderInputChange(event: Event): void {
  const target = event.target as HTMLInputElement | null;
  const files = Array.from(target?.files ?? []);
  const targetFolderId = pendingTargetFolderId.value;
  pendingTargetFolderId.value = null;

  if (files.length > 0 && targetFolderId) {
    emit("import-files", targetFolderId, files);
  }
}

/** 全局点击关闭浮动导入菜单 */
function onWindowClick(event: MouseEvent): void {
  if (!activeImportFolderId.value) {
    return;
  }
  const el = event.target as HTMLElement | null;
  if (!el?.closest(".sidebar-tree__import-menu") && !el?.closest(".csn-icon-btn--import")) {
    activeImportFolderId.value = null;
  }
}

/** 全局键盘事件：Escape 关闭导入菜单 */
function onWindowKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && activeImportFolderId.value) {
    activeImportFolderId.value = null;
  }
}

onMounted(() => {
  window.addEventListener("click", onWindowClick);
  window.addEventListener("keydown", onWindowKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("click", onWindowClick);
  window.removeEventListener("keydown", onWindowKeydown);
});
</script>

<style lang="scss">
@use "@/styles/variables" as v;

.sidebar-tree__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sidebar-tree__item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  border-radius: 16px;
  background: v.$color-item-bg;
  color: v.$color-text-dark;
  cursor: pointer;
  outline: none;
  transition:
    transform v.$transition-fast,
    background v.$transition-fast;

  &:hover {
    transform: translateY(-1px);
    background: v.$color-item-hover;

    .csn-icon-btn--rename,
    .csn-icon-btn--delete,
    .csn-icon-btn--import {
      opacity: 1;
    }
  }

  &:focus-within {
    .csn-icon-btn--rename,
    .csn-icon-btn--delete,
    .csn-icon-btn--import {
      opacity: 1;
    }
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px rgba(34, 103, 255, 0.45);
  }

  &--active {
    background: linear-gradient(135deg, v.$color-accent-start, v.$color-accent-end);
    color: white;

    .csn-icon-btn--rename,
    .csn-icon-btn--delete,
    .csn-icon-btn--import {
      color: rgba(255, 255, 255, 0.92);
      opacity: 0.85;
    }

    .csn-icon-btn--rename:hover,
    .csn-icon-btn--import:hover {
      color: #1b4ea8;
      background: rgba(255, 255, 255, 0.95);
    }

    .sidebar-tree__rename-input {
      border-color: rgba(255, 255, 255, 0.55);
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }
  }

  &--menu-open {
    /** 菜单展开时提升当前目录项层级，避免被后续卡片遮挡 */
    z-index: 50;
  }
}

.sidebar-tree__name-wrap {
  flex: 1;
  min-width: 0;
}

.sidebar-tree__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-tree__rename-input {
  width: 100%;
  padding: 6px 10px;
  font-size: 0.95rem;
}

.sidebar-tree__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.sidebar-tree__import-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 10px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  min-width: 180px;
  background: #ffffff;
  border: 1px solid v.$color-border-subtle;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(16, 35, 60, 0.22);
  backdrop-filter: blur(12px);

  /** 浮动菜单项按钮 */
  .sidebar-tree__import-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: v.$color-text-dark;
    font-size: 0.85rem;
    text-align: left;
    cursor: pointer;
    white-space: nowrap;
    transition: background v.$transition-fast;

    &:hover {
      background: v.$color-item-hover;
      color: v.$color-text-dark;
    }
  }

  /** 菜单项图标 */
  .sidebar-tree__menu-icon {
    font-size: 1rem;
    line-height: 1;
  }
}

@media (hover: none) {
  .sidebar-tree__item .csn-icon-btn--rename,
  .sidebar-tree__item .csn-icon-btn--delete,
  .sidebar-tree__item .csn-icon-btn--import {
    opacity: 0.55;
  }
}
</style>
