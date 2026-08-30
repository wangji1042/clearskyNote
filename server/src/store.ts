import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "notes.json");

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function readAll(): Promise<Note[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw) as Note[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(notes: Note[]): Promise<void> {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(notes, null, 2), "utf8");
}

/** Notes sorted by most recently updated first. */
export async function listNotes(): Promise<Note[]> {
  const notes = await readAll();
  return notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getNote(id: string): Promise<Note | undefined> {
  const notes = await readAll();
  return notes.find((n) => n.id === id);
}

export async function createNote(
  data: Partial<Pick<Note, "title" | "content">>
): Promise<Note> {
  const notes = await readAll();
  const now = new Date().toISOString();
  const note: Note = {
    id: randomUUID(),
    title: data.title?.trim() || "Untitled note",
    content: data.content ?? "",
    createdAt: now,
    updatedAt: now,
  };
  notes.push(note);
  await writeAll(notes);
  return note;
}

export async function updateNote(
  id: string,
  data: Partial<Pick<Note, "title" | "content">>
): Promise<Note | undefined> {
  const notes = await readAll();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return undefined;
  const existing = notes[idx];
  const updated: Note = {
    ...existing,
    title: data.title !== undefined ? data.title : existing.title,
    content: data.content !== undefined ? data.content : existing.content,
    updatedAt: new Date().toISOString(),
  };
  notes[idx] = updated;
  await writeAll(notes);
  return updated;
}

export async function deleteNote(id: string): Promise<boolean> {
  const notes = await readAll();
  const next = notes.filter((n) => n.id !== id);
  if (next.length === notes.length) return false;
  await writeAll(next);
  return true;
}
