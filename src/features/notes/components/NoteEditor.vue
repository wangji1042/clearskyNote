<template>
  <section class="note-editor csn-panel csn-panel--editor">
    <template v-if="note">
      <input v-model="draftTitle" class="note-editor__title csn-input" placeholder="输入标题" />

      <select
        v-if="folderItems.length > 0"
        class="note-editor__folder-select csn-input"
        :value="note.folderId || ''"
        @change="handleFolderChange"
      >
        <option v-for="folder in folderItems" :key="folder.id" :value="folder.id">
          {{ "  ".repeat(folder.depth) }}{{ folder.name }}
        </option>
      </select>

      <MarkdownEditor :key="note.id" v-model="draftContent" class="note-editor__md" />
    </template>

    <div v-else class="note-editor__empty csn-empty">选择一篇笔记，或者先新建一篇。</div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import MarkdownEditor from "@/features/editor/components/MarkdownEditor.vue";
import type { FolderListItem, NoteEntity } from "@/core/types/domain";
import { NOTE_AUTOSAVE_DEBOUNCE_MS } from "@/core/constants/editor";

const props = defineProps<{
  note: NoteEntity | null;
  folderItems: FolderListItem[];
}>();

const emit = defineEmits<{
  update: [payload: { title: string; content: string }];
  "move-note": [noteId: string, targetFolderId: string];
}>();

/** 草稿标题 */
const draftTitle = ref("");

/** 草稿正文（Markdown 源文） */
const draftContent = ref("");

/** 自动保存防抖定时器 */
let timer: number | null = null;

watch(
  () => props.note,
  (note) => {
    draftTitle.value = note ? note.title : "";
    draftContent.value = note ? note.content : "";
  },
  { immediate: true },
);

/** 目录选择变更时触发移动笔记 */
function handleFolderChange(event: Event): void {
  const target = event.target as HTMLSelectElement;
  if (props.note && target.value !== props.note.folderId) {
    emit("move-note", props.note.id, target.value);
  }
}

watch([draftTitle, draftContent], () => {
  if (!props.note) {
    return;
  }
  if (timer !== null) {
    window.clearTimeout(timer);
  }
  timer = window.setTimeout(() => {
    emit("update", {
      title: draftTitle.value,
      content: draftContent.value,
    });
  }, NOTE_AUTOSAVE_DEBOUNCE_MS);
});
</script>

<style lang="scss">
@use "@/styles/variables" as v;

.note-editor {
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: 100%;
  height: 100%;
  overflow: hidden;
}

.note-editor__title {
  width: 100%;
  padding: 14px 16px;
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.note-editor__folder-select {
  width: 100%;
  padding: 10px 14px;
  margin-bottom: 14px;
  font-size: 0.92rem;
  cursor: pointer;
  flex-shrink: 0;
}

.note-editor__md {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.note-editor__empty {
  display: grid;
  place-items: center;
  flex: 1;
  min-height: 0;
}
</style>
