import type { NoteEntity } from "@/core/types/domain";

/** 未软删的笔记 */
export function getActiveNotes(notes: NoteEntity[]): NoteEntity[] {
  return notes.filter((note) => !note.isDeleted);
}

/** 指定目录下未删笔记，按更新时间倒序 */
export function getNotesInFolder(notes: NoteEntity[], folderId: string | null): NoteEntity[] {
  return getActiveNotes(notes)
    .filter((note) => note.folderId === folderId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** 目录内第一篇笔记 id */
export function getFirstNoteIdInFolder(
  notes: NoteEntity[],
  folderId: string | null,
): string | null {
  const list = getNotesInFolder(notes, folderId);
  return list[0]?.id ?? null;
}

/**
 * 跨目录搜索：标题或正文包含关键词（不区分大小写）。
 */
export function searchNotes(notes: NoteEntity[], query: string): NoteEntity[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }
  return getActiveNotes(notes)
    .filter(
      (note) =>
        note.title.toLowerCase().includes(normalized) ||
        note.content.toLowerCase().includes(normalized),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
