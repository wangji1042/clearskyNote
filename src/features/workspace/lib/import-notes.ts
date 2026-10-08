import type { FolderEntity, NoteEntity } from "@/core/types/domain";
import { createId, nowIso } from "@/core/utils/id";
import { buildNoteSummary } from "@/features/workspace/lib/note-summary";

/** 导入解析结果 */
export interface ImportResult {
  /** 新增的文件夹列表 */
  newFolders: FolderEntity[];
  /** 新增的笔记列表 */
  newNotes: NoteEntity[];
}

/**
 * 判断文件是否为支持的 Markdown 或纯文本格式。
 *
 * @param fileName 文件名
 */
export function isSupportedImportFile(fileName: string): boolean {
  return /\.(md|txt)$/i.test(fileName);
}

/**
 * 去除文件名后缀获取笔记标题。
 *
 * @param fileName 原始文件名
 */
export function extractNoteTitle(fileName: string): string {
  const title = fileName.replace(/\.(md|txt)$/i, "").trim();
  return title || "未命名笔记";
}

/**
 * 生成在指定目录下不与已有笔记重名的标题（同名时添加 `(1)`, `(2)` 避让）。
 *
 * @param baseTitle 基础标题
 * @param folderId 目标目录 id
 * @param allNotes 现有及新生成的笔记列表
 */
export function resolveUniqueNoteTitle(
  baseTitle: string,
  folderId: string | null,
  allNotes: NoteEntity[],
): string {
  // 找出同一目录下所有未删除笔记的标题集合
  const siblingTitles = new Set(
    allNotes
      .filter((note) => !note.isDeleted && note.folderId === folderId)
      .map((note) => note.title),
  );

  if (!siblingTitles.has(baseTitle)) {
    return baseTitle;
  }

  let counter = 1;
  while (siblingTitles.has(`${baseTitle} (${counter})`)) {
    counter++;
  }
  return `${baseTitle} (${counter})`;
}

/**
 * 根据文件的相对路径（webkitRelativePath）在目标目录下定位或创建多级子目录。
 *
 * @param relativePath 文件相对路径，例如 "Docs/Guide/readme.md"
 * @param targetFolderId 用户触发导入的目标目录 id
 * @param currentFolders 当前已存在的目录池（包含历史与本次新创建的目录）
 * @param newFolders 新增目录数组（若有新建则推入）
 * @returns 最终放置笔记的目录 id
 */
function resolveOrCreateFolderByRelativePath(
  relativePath: string,
  targetFolderId: string,
  currentFolders: FolderEntity[],
  newFolders: FolderEntity[],
): string {
  // 规范化路径分隔符并拆分路径段
  const normalized = relativePath.replace(/\\/g, "/");
  const segments = normalized.split("/").filter((seg) => seg.trim().length > 0);

  // 剔除末尾的文件名，只保留目录层级段
  segments.pop();

  if (segments.length === 0) {
    return targetFolderId;
  }

  let parentId: string | null = targetFolderId;

  for (const segName of segments) {
    // 检查在当前父级下是否已存在同名目录
    let folder = currentFolders.find((f) => f.parentId === parentId && f.name === segName);

    if (!folder) {
      const timestamp = nowIso();
      folder = {
        id: createId("folder"),
        parentId,
        name: segName,
        sort: currentFolders.length,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      currentFolders.push(folder);
      newFolders.push(folder);
    }

    parentId = folder.id;
  }

  return parentId ?? targetFolderId;
}

/**
 * 将单个或多个 File 对象解析为笔记与配套目录树。
 *
 * @param files 选中的文件数组（单文件或文件夹内的全部文件）
 * @param targetFolderId 导入的目标目录 id
 * @param existingFolders 系统现有目录列表
 * @param existingNotes 系统现有笔记列表
 */
export async function parseImportFiles(
  files: File[],
  targetFolderId: string,
  existingFolders: FolderEntity[],
  existingNotes: NoteEntity[],
): Promise<ImportResult> {
  const newFolders: FolderEntity[] = [];
  const newNotes: NoteEntity[] = [];

  // 本地合并池，便于在循环解析中实时查找新建的目录与笔记
  const folderPool = [...existingFolders];
  const notePool = [...existingNotes];

  for (const file of files) {
    if (!isSupportedImportFile(file.name)) {
      continue;
    }

    // 确定目标目录（若为文件夹选择，按相对路径逐级映射或创建）
    const folderId = file.webkitRelativePath
      ? resolveOrCreateFolderByRelativePath(
          file.webkitRelativePath,
          targetFolderId,
          folderPool,
          newFolders,
        )
      : targetFolderId;

    // 异步读取文本内容
    const content = await file.text();
    const baseTitle = extractNoteTitle(file.name);
    const uniqueTitle = resolveUniqueNoteTitle(baseTitle, folderId, notePool);

    const timestamp = nowIso();
    const note: NoteEntity = {
      id: createId("note"),
      folderId,
      title: uniqueTitle,
      content,
      summary: buildNoteSummary(content),
      isDeleted: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    newNotes.push(note);
    notePool.push(note);
  }

  return {
    newFolders,
    newNotes,
  };
}
