import type { FolderEntity, FolderListItem } from "@/core/types/domain";

/** 同级目录按 sort、名称排序 */
function sortFolders(a: FolderEntity, b: FolderEntity): number {
  if (a.sort !== b.sort) {
    return a.sort - b.sort;
  }
  return a.name.localeCompare(b.name, "zh-CN");
}

/**
 * 将父子关系的文件夹列表展平为带 depth 的列表（深度优先）。
 */
export function flattenFolderTree(
  folders: FolderEntity[],
  parentId: string | null = null,
  depth = 0,
): FolderListItem[] {
  const siblings = folders.filter((folder) => folder.parentId === parentId).sort(sortFolders);
  return siblings.flatMap((folder) => [
    { ...folder, depth },
    ...flattenFolderTree(folders, folder.id, depth + 1),
  ]);
}

/** 根级目录列表 */
export function getRootFolders(folders: FolderEntity[]): FolderEntity[] {
  return folders.filter((folder) => folder.parentId === null);
}

/** 第一个根目录 id */
export function getFirstRootFolderId(folders: FolderEntity[]): string | null {
  const roots = getRootFolders(folders).sort(sortFolders);
  return roots[0]?.id ?? null;
}

/**
 * 递归收集目录及其所有子孙目录 id。
 */
export function collectDescendantFolderIds(folders: FolderEntity[], parentId: string): string[] {
  const childIds: string[] = [];
  for (const folder of folders) {
    if (folder.parentId === parentId) {
      childIds.push(folder.id);
      childIds.push(...collectDescendantFolderIds(folders, folder.id));
    }
  }
  return childIds;
}
