/** 文件夹实体 */
export interface FolderEntity {
  id: string;
  parentId: string | null;
  name: string;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

/** 笔记实体 */
export interface NoteEntity {
  id: string;
  folderId: string | null;
  title: string;
  content: string;
  summary: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 带树深度的文件夹列表项（用于侧栏渲染） */
export interface FolderListItem extends FolderEntity {
  depth: number;
}

/** 本地持久化的完整工作区快照 */
export interface WorkspaceSnapshot {
  folders: FolderEntity[];
  notes: NoteEntity[];
  updatedAt: string;
}

/** 坚果云 WebDAV 连接凭证 */
export interface WebDavCredentials {
  baseUrl: string;
  username: string;
  password: string;
  rootPath: string;
}

/**
 * 增量同步记录（预留类型，当前实现为全量快照同步）。
 * @internal 尚未接入 sync 流程
 */
export interface SyncRecord {
  targetId: string;
  targetType: "folder" | "note";
  remotePath: string;
  etag?: string;
  lastSyncedAt?: string;
}
