import type {
  FolderEntity,
  NoteEntity,
  WebDavCredentials,
  WorkspaceSnapshot,
} from "@/core/types/domain";
import {
  ensureDirectory,
  uploadText,
  downloadText,
  listDirectory,
  deleteResource,
} from "./webdav-client";
import {
  mergeRemoteWorkspaceSnapshot,
  type MergedWorkspaceData,
} from "@/features/workspace/lib/merge-remote-snapshot";

function folderMetaPath(rootPath: string, folderId: string): string {
  return `${rootPath}/folders/${folderId}.json`;
}

function noteContentPath(rootPath: string, noteId: string): string {
  return `${rootPath}/notes/${noteId}.md`;
}

function noteMetaPath(rootPath: string, noteId: string): string {
  return `${rootPath}/notes/${noteId}.meta.json`;
}

export async function pushWorkspaceSnapshot(
  snapshot: WorkspaceSnapshot,
  credentials: WebDavCredentials,
): Promise<void> {
  const rootPath = credentials.rootPath.replace(/\/+$/, "");

  await ensureDirectory(credentials, rootPath);
  await ensureDirectory(credentials, `${rootPath}/folders`);
  await ensureDirectory(credentials, `${rootPath}/notes`);

  await uploadText(
    credentials,
    `${rootPath}/manifest.json`,
    JSON.stringify(
      {
        updatedAt: snapshot.updatedAt,
        folderCount: snapshot.folders.length,
        noteCount: snapshot.notes.length,
      },
      null,
      2,
    ),
    "application/json; charset=utf-8",
  );

  for (const folder of snapshot.folders) {
    await uploadText(
      credentials,
      folderMetaPath(rootPath, folder.id),
      JSON.stringify(folder, null, 2),
      "application/json; charset=utf-8",
    );
  }

  for (const note of snapshot.notes.filter((item) => !item.isDeleted)) {
    await uploadText(credentials, noteContentPath(rootPath, note.id), note.content);
    await uploadText(
      credentials,
      noteMetaPath(rootPath, note.id),
      JSON.stringify(
        {
          id: note.id,
          folderId: note.folderId,
          title: note.title,
          summary: note.summary,
          isDeleted: note.isDeleted,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        },
        null,
        2,
      ),
      "application/json; charset=utf-8",
    );
  }

  // 清理已被删除笔记在远端的残留文件，避免死笔记复活
  for (const note of snapshot.notes.filter((item) => item.isDeleted)) {
    try {
      await deleteResource(credentials, noteContentPath(rootPath, note.id));
      await deleteResource(credentials, noteMetaPath(rootPath, note.id));
    } catch {
      // 远端文件可能已不存在，忽略删除失败
    }
  }
}

/** 从 WebDAV 远程拉取完整工作区快照 */
export async function pullWorkspaceSnapshot(
  credentials: WebDavCredentials,
): Promise<WorkspaceSnapshot> {
  const rootPath = credentials.rootPath.replace(/\/+$/, "");
  const folders: FolderEntity[] = [];
  const notes: NoteEntity[] = [];

  // 列出并下载所有目录元数据
  try {
    const folderFiles = await listDirectory(credentials, `${rootPath}/folders`);
    for (const file of folderFiles) {
      if (!file.endsWith(".json")) {
        continue;
      }
      try {
        const raw = await downloadText(credentials, `${rootPath}/folders/${file}`);
        const folder = JSON.parse(raw) as FolderEntity;
        folders.push(folder);
      } catch {
        // 跳过无法解析的文件
      }
    }
  } catch {
    // 远程 folders 目录可能不存在，忽略
  }

  // 列出并下载所有笔记元数据和正文
  try {
    const noteFiles = await listDirectory(credentials, `${rootPath}/notes`);
    const noteIds = new Set<string>();
    for (const file of noteFiles) {
      if (file.endsWith(".meta.json")) {
        const noteId = file.replace(".meta.json", "");
        noteIds.add(noteId);
      }
    }

    for (const noteId of noteIds) {
      try {
        const metaRaw = await downloadText(credentials, `${rootPath}/notes/${noteId}.meta.json`);
        const meta = JSON.parse(metaRaw) as {
          id: string;
          folderId: string | null;
          title: string;
          summary: string;
          isDeleted: boolean;
          createdAt: string;
          updatedAt: string;
        };
        let content = "";
        try {
          content = await downloadText(credentials, `${rootPath}/notes/${noteId}.md`);
        } catch {
          // 正文可能不存在
        }
        const note: NoteEntity = {
          id: meta.id,
          folderId: meta.folderId,
          title: meta.title,
          content,
          summary: meta.summary,
          isDeleted: meta.isDeleted,
          createdAt: meta.createdAt,
          updatedAt: meta.updatedAt,
        };
        notes.push(note);
      } catch {
        // 跳过无法解析的笔记
      }
    }
  } catch {
    // 远程 notes 目录可能不存在，忽略
  }

  return {
    folders,
    notes,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 执行完整的双向闭环同步：
 * 1. 从远端拉取最新快照；
 * 2. 结合本地数据执行智能双向合并（按时间戳与删除状态仲裁）；
 * 3. 将合并后的最新快照推送回远端（并清理已删除条目）；
 * 4. 返回合并后的最新工作区数据。
 */
export async function syncWorkspaceSnapshot(
  localFolders: FolderEntity[],
  localNotes: NoteEntity[],
  credentials: WebDavCredentials,
): Promise<MergedWorkspaceData> {
  const remoteSnapshot = await pullWorkspaceSnapshot(credentials);
  const merged = mergeRemoteWorkspaceSnapshot(localFolders, localNotes, remoteSnapshot);

  await pushWorkspaceSnapshot(
    {
      folders: merged.folders,
      notes: merged.notes,
      updatedAt: new Date().toISOString(),
    },
    credentials,
  );

  return merged;
}
