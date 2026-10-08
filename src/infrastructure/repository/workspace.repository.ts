import type { FolderEntity, NoteEntity, WorkspaceSnapshot } from "@/core/types/domain";
import { nowIso } from "@/core/utils/id";
import {
  loadWorkspaceSnapshot,
  saveWorkspaceSnapshot,
} from "@/infrastructure/persistence/workspace.persistence";

/** 构造空工作区快照 */
function createEmptySnapshot(): WorkspaceSnapshot {
  return {
    folders: [],
    notes: [],
    updatedAt: nowIso(),
  };
}

/** 读取工作区；无数据时返回空快照 */
export function getWorkspaceSnapshot(): WorkspaceSnapshot {
  return loadWorkspaceSnapshot() || createEmptySnapshot();
}

/**
 * 写入完整工作区并返回快照。
 */
export function persistWorkspaceSnapshot(
  folders: FolderEntity[],
  notes: NoteEntity[],
): WorkspaceSnapshot {
  const snapshot: WorkspaceSnapshot = {
    folders,
    notes,
    updatedAt: nowIso(),
  };
  saveWorkspaceSnapshot(snapshot);
  return snapshot;
}
