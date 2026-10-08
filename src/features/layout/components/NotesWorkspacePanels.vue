<template>
  <div class="workspace-panels">
    <SidebarTree
      v-if="showSidebar"
      :folders="workspace.folderItems"
      :selected-folder-id="workspace.selectedFolderId"
      @select-folder="onSelectFolder"
      @create-folder="workspace.createFolder()"
      @delete-folder="workspace.deleteFolder"
      @rename-folder="workspace.renameFolder"
      @import-files="onImportFiles"
    />

    <NoteList
      :notes="workspace.isSearching ? workspace.searchResults : workspace.notesInSelectedFolder"
      :selected-note-id="workspace.selectedNoteId"
      :is-searching="workspace.isSearching"
      :search-query="workspace.searchQuery"
      @select-note="workspace.selectNote"
      @create-note="workspace.createNote()"
      @delete-note="workspace.deleteNote"
    />

    <NoteEditor
      :note="workspace.selectedNote"
      :folder-items="workspace.folderItems"
      @update="workspace.updateSelectedNote"
      @move-note="workspace.moveNote"
    />
  </div>
</template>

<script setup lang="ts">
import SidebarTree from "@/features/folders/components/SidebarTree.vue";
import NoteList from "@/features/notes/components/NoteList.vue";
import NoteEditor from "@/features/notes/components/NoteEditor.vue";
import { useWorkspaceStore } from "@/features/workspace/store/workspace.store";

withDefaults(
  defineProps<{
    /** 是否渲染侧栏目录树（移动端主体区可仅显示列表+编辑器） */
    showSidebar?: boolean;
  }>(),
  {
    showSidebar: true,
  },
);

const emit = defineEmits<{
  "select-folder": [folderId: string];
}>();

const workspace = useWorkspaceStore();

/** 选中目录；可由父级拦截（如移动端收起抽屉） */
function onSelectFolder(folderId: string): void {
  workspace.selectFolder(folderId);
  emit("select-folder", folderId);
}

/** 导入文件或文件夹到指定目录 */
async function onImportFiles(folderId: string, files: File[]): Promise<void> {
  await workspace.importFilesToFolder(folderId, files);
}
</script>

<style lang="scss" scoped>
.workspace-panels {
  /** 容器仅用于提供单一根节点，不生成盒子，三个面板直接参与父级 grid 排列 */
  display: contents;
}
</style>
