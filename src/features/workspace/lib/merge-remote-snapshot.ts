import type { FolderEntity, NoteEntity, WorkspaceSnapshot } from "@/core/types/domain";
import { DEFAULT_ROOT_FOLDER_NAME } from "@/core/constants/layout";

/** 合并后的文件夹与笔记集合 */
export interface MergedWorkspaceData {
  folders: FolderEntity[];
  notes: NoteEntity[];
}

/** 解析 ISO 时间戳为毫秒数，非法时间返回 0 */
function parseTimestamp(isoString: string | undefined): number {
  if (!isoString) {
    return 0;
  }
  const time = new Date(isoString).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/** 判断本地是否为全新安装时自动初始化的空环境 */
function isFreshLocalWorkspace(localFolders: FolderEntity[], localNotes: NoteEntity[]): boolean {
  if (localNotes.length > 0) {
    return false;
  }
  return localFolders.length === 1 && localFolders[0].name === DEFAULT_ROOT_FOLDER_NAME;
}

/**
 * 将远程快照与本地工作区双向智能合并：
 * 1. 同 ID 项依据 `updatedAt` 时间戳比较，以修改时间较新者为准（Last-Write-Wins）；
 * 2. 双方各自独有项均予以保留；
 * 3. 若本地为初始生成的默认空环境且远端已有数据，优先采纳远端目录结构，避免冗余空目录。
 */
export function mergeRemoteWorkspaceSnapshot(
  localFolders: FolderEntity[],
  localNotes: NoteEntity[],
  remote: WorkspaceSnapshot,
): MergedWorkspaceData {
  // 本地仅有初始空目录且远端有目录或笔记时，放弃本地默认生成的空目录
  const isFreshLocal =
    isFreshLocalWorkspace(localFolders, localNotes) &&
    (remote.folders.length > 0 || remote.notes.length > 0);
  const effectiveLocalFolders = isFreshLocal ? [] : localFolders;

  // 1. 合并文件夹
  const remoteFolderMap = new Map<string, FolderEntity>();
  for (const folder of remote.folders) {
    remoteFolderMap.set(folder.id, folder);
  }

  const mergedFolders: FolderEntity[] = [];
  const handledFolderIds = new Set<string>();

  for (const localFolder of effectiveLocalFolders) {
    handledFolderIds.add(localFolder.id);
    const remoteFolder = remoteFolderMap.get(localFolder.id);
    if (!remoteFolder) {
      mergedFolders.push(localFolder);
    } else {
      const localTime = parseTimestamp(localFolder.updatedAt);
      const remoteTime = parseTimestamp(remoteFolder.updatedAt);
      mergedFolders.push(localTime >= remoteTime ? localFolder : remoteFolder);
    }
  }

  for (const remoteFolder of remote.folders) {
    if (!handledFolderIds.has(remoteFolder.id)) {
      mergedFolders.push(remoteFolder);
    }
  }

  // 2. 合并笔记
  const remoteNoteMap = new Map<string, NoteEntity>();
  for (const note of remote.notes) {
    remoteNoteMap.set(note.id, note);
  }

  const mergedNotes: NoteEntity[] = [];
  const handledNoteIds = new Set<string>();

  for (const localNote of localNotes) {
    handledNoteIds.add(localNote.id);
    const remoteNote = remoteNoteMap.get(localNote.id);
    if (!remoteNote) {
      mergedNotes.push(localNote);
    } else {
      const localTime = parseTimestamp(localNote.updatedAt);
      const remoteTime = parseTimestamp(remoteNote.updatedAt);
      mergedNotes.push(localTime >= remoteTime ? localNote : remoteNote);
    }
  }

  for (const remoteNote of remote.notes) {
    if (!handledNoteIds.has(remoteNote.id)) {
      mergedNotes.push(remoteNote);
    }
  }

  return {
    folders: mergedFolders,
    notes: mergedNotes,
  };
}
