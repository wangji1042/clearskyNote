import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { DEFAULT_ROOT_FOLDER_NAME } from "@/core/constants/layout";
import type {
  FolderEntity,
  FolderListItem,
  NoteEntity,
  WebDavCredentials,
} from "@/core/types/domain";
import { createId, nowIso } from "@/core/utils/id";
import { formatUnknownError } from "@/core/utils/error-format";
import {
  collectDescendantFolderIds,
  flattenFolderTree,
  getFirstRootFolderId,
  getRootFolders,
} from "@/features/workspace/lib/folder-tree";
import { mergeRemoteWorkspaceSnapshot } from "@/features/workspace/lib/merge-remote-snapshot";
import { buildNoteSummary } from "@/features/workspace/lib/note-summary";
import {
  getFirstNoteIdInFolder,
  getNotesInFolder,
  searchNotes,
} from "@/features/workspace/lib/note-query";
import {
  getWorkspaceSnapshot,
  persistWorkspaceSnapshot,
} from "@/infrastructure/repository/workspace.repository";
import {
  pullWorkspaceSnapshot,
  pushWorkspaceSnapshot,
  syncWorkspaceSnapshot,
} from "@/features/sync/services/sync-service";
import { parseImportFiles } from "@/features/workspace/lib/import-notes";

export const useWorkspaceStore = defineStore("workspace", () => {
  const folders = ref<FolderEntity[]>([]);
  const notes = ref<NoteEntity[]>([]);
  const selectedFolderId = ref<string | null>(null);
  const selectedNoteId = ref<string | null>(null);
  const syncState = ref<"idle" | "syncing" | "success" | "error">("idle");
  const syncError = ref<string>("");
  /** 搜索关键词 */
  const searchQuery = ref<string>("");

  const folderItems = computed<FolderListItem[]>(() => flattenFolderTree(folders.value));

  const notesInSelectedFolder = computed(() =>
    getNotesInFolder(notes.value, selectedFolderId.value),
  );

  const selectedNote = computed(
    () => notes.value.find((note) => note.id === selectedNoteId.value) || null,
  );

  const isSearching = computed(() => searchQuery.value.trim().length > 0);

  const searchResults = computed(() => searchNotes(notes.value, searchQuery.value));

  /** 将当前状态写入本地存储 */
  function persist(): void {
    persistWorkspaceSnapshot(folders.value, notes.value);
  }

  /** 选中目录后同步选中该目录下第一篇笔记 */
  function syncNoteSelectionToFolder(): void {
    selectedNoteId.value = getFirstNoteIdInFolder(notes.value, selectedFolderId.value);
  }

  /** 从本地加载工作区；空数据时创建默认根目录 */
  function initialize(): void {
    const snapshot = getWorkspaceSnapshot();
    folders.value = snapshot.folders;
    notes.value = snapshot.notes;

    if (!folders.value.length) {
      const timestamp = nowIso();
      const rootFolder: FolderEntity = {
        id: createId("folder"),
        parentId: null,
        name: DEFAULT_ROOT_FOLDER_NAME,
        sort: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      folders.value = [rootFolder];
      selectedFolderId.value = rootFolder.id;
      persist();
    } else if (!selectedFolderId.value) {
      selectedFolderId.value = getFirstRootFolderId(folders.value);
    }

    if (!selectedNoteId.value) {
      syncNoteSelectionToFolder();
    }
  }

  function selectFolder(folderId: string): void {
    selectedFolderId.value = folderId;
    syncNoteSelectionToFolder();
  }

  function selectNote(noteId: string): void {
    selectedNoteId.value = noteId;
  }

  function createFolder(parentId: string | null = selectedFolderId.value): void {
    const timestamp = nowIso();
    const folder: FolderEntity = {
      id: createId("folder"),
      parentId,
      name: "新目录",
      sort: folders.value.length,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    folders.value.push(folder);
    selectedFolderId.value = folder.id;
    persist();
  }

  /** 将目录 `folderId` 的名称更新为 `name`（全空白则保持原名） */
  function renameFolder(folderId: string, name: string): void {
    const target = folders.value.find((folder) => folder.id === folderId);
    if (!target) {
      return;
    }
    target.name = name.trim() || target.name;
    target.updatedAt = nowIso();
    persist();
  }

  /** 删除目录：递归删除子目录，软删除关联笔记 */
  function deleteFolder(folderId: string): void {
    const rootFolders = getRootFolders(folders.value);
    const isRoot = rootFolders.some((folder) => folder.id === folderId);
    if (isRoot && rootFolders.length <= 1) {
      return;
    }

    const folderIdsToRemove = [folderId, ...collectDescendantFolderIds(folders.value, folderId)];

    for (const note of notes.value) {
      if (note.folderId && folderIdsToRemove.includes(note.folderId)) {
        note.isDeleted = true;
      }
    }

    folders.value = folders.value.filter((folder) => !folderIdsToRemove.includes(folder.id));

    if (selectedFolderId.value && folderIdsToRemove.includes(selectedFolderId.value)) {
      selectedFolderId.value = getFirstRootFolderId(folders.value);
      syncNoteSelectionToFolder();
    }

    persist();
  }

  function createNote(folderId: string | null = selectedFolderId.value): void {
    const timestamp = nowIso();
    const note: NoteEntity = {
      id: createId("note"),
      folderId,
      title: "未命名笔记",
      content: "",
      summary: "",
      isDeleted: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    notes.value.unshift(note);
    selectedNoteId.value = note.id;
    persist();
  }

  function updateSelectedNote(payload: { title: string; content: string }): void {
    const target = selectedNote.value;
    if (!target) {
      return;
    }
    target.title = payload.title.trim() || "未命名笔记";
    target.content = payload.content;
    target.summary = buildNoteSummary(payload.content);
    target.updatedAt = nowIso();
    persist();
  }

  /** 移动笔记到目标目录 */
  function moveNote(noteId: string, targetFolderId: string): void {
    const target = notes.value.find((note) => note.id === noteId);
    if (!target) {
      return;
    }
    target.folderId = targetFolderId;
    target.updatedAt = nowIso();
    if (selectedFolderId.value && selectedFolderId.value !== targetFolderId) {
      selectedNoteId.value = null;
    }
    persist();
  }

  /** 软删除笔记 */
  function deleteNote(noteId: string): void {
    const target = notes.value.find((note) => note.id === noteId);
    if (!target) {
      return;
    }
    target.isDeleted = true;
    target.updatedAt = nowIso();
    if (selectedNoteId.value === noteId) {
      syncNoteSelectionToFolder();
    }
    persist();
  }

  async function syncToWebDav(credentials: WebDavCredentials): Promise<void> {
    syncState.value = "syncing";
    syncError.value = "";
    try {
      await pushWorkspaceSnapshot(
        persistWorkspaceSnapshot(folders.value, notes.value),
        credentials,
      );
      syncState.value = "success";
    } catch (error) {
      syncState.value = "error";
      syncError.value = formatUnknownError(error) || "未知同步错误";
    }
  }

  /** 从云端拉取快照并合并到本地（远程同 ID 覆盖，本地独有保留） */
  async function pullFromWebDav(credentials: WebDavCredentials): Promise<void> {
    syncState.value = "syncing";
    syncError.value = "";
    try {
      const remote = await pullWorkspaceSnapshot(credentials);
      const merged = mergeRemoteWorkspaceSnapshot(folders.value, notes.value, remote);
      folders.value = merged.folders;
      notes.value = merged.notes;

      if (
        selectedFolderId.value &&
        !folders.value.some((folder) => folder.id === selectedFolderId.value)
      ) {
        selectedFolderId.value = getFirstRootFolderId(folders.value);
      }
      if (selectedNoteId.value && !notes.value.some((note) => note.id === selectedNoteId.value)) {
        syncNoteSelectionToFolder();
      }

      persist();
      syncState.value = "success";
    } catch (error) {
      syncState.value = "error";
      syncError.value = formatUnknownError(error) || "云端恢复失败";
    }
  }

  /** 与 WebDAV 远端执行闭环双向同步（拉取 -> 智能合并 -> 回写更新） */
  async function syncWithWebDav(credentials: WebDavCredentials): Promise<void> {
    syncState.value = "syncing";
    syncError.value = "";
    try {
      const merged = await syncWorkspaceSnapshot(folders.value, notes.value, credentials);
      folders.value = merged.folders;
      notes.value = merged.notes;

      if (
        selectedFolderId.value &&
        !folders.value.some((folder) => folder.id === selectedFolderId.value)
      ) {
        selectedFolderId.value = getFirstRootFolderId(folders.value);
      }
      if (selectedNoteId.value && !notes.value.some((note) => note.id === selectedNoteId.value)) {
        syncNoteSelectionToFolder();
      }

      persist();
      syncState.value = "success";
    } catch (error) {
      syncState.value = "error";
      syncError.value = formatUnknownError(error) || "同步失败";
    }
  }

  /**
   * 将选中的单个或多个文件（含文件夹导入）解析并保存到指定目录。
   *
   * @param targetFolderId 目标目录 id
   * @param files 文件列表
   */
  async function importFilesToFolder(
    targetFolderId: string,
    files: File[],
  ): Promise<{ folderCount: number; noteCount: number }> {
    const { newFolders, newNotes } = await parseImportFiles(
      files,
      targetFolderId,
      folders.value,
      notes.value,
    );

    if (newFolders.length > 0) {
      folders.value.push(...newFolders);
    }

    if (newNotes.length > 0) {
      notes.value.unshift(...newNotes);
      // 自动选中导入的首篇笔记及其所属目录
      selectedFolderId.value = newNotes[0].folderId;
      selectedNoteId.value = newNotes[0].id;
    }

    if (newFolders.length > 0 || newNotes.length > 0) {
      persist();
    }

    return {
      folderCount: newFolders.length,
      noteCount: newNotes.length,
    };
  }

  return {
    folders,
    notes,
    selectedFolderId,
    selectedNoteId,
    syncState,
    syncError,
    searchQuery,
    isSearching,
    searchResults,
    folderItems,
    notesInSelectedFolder,
    selectedNote,
    initialize,
    selectFolder,
    selectNote,
    createFolder,
    renameFolder,
    deleteFolder,
    createNote,
    updateSelectedNote,
    deleteNote,
    moveNote,
    syncToWebDav,
    pullFromWebDav,
    syncWithWebDav,
    importFilesToFolder,
  };
});
