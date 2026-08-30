import { useEffect, useMemo, useRef, useState } from "react";
import { api, type Note } from "./api";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function previewOf(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed.slice(0, 80) : "No additional text";
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
    );
  }, [notes, query]);

  useEffect(() => {
    api
      .list()
      .then((data) => {
        setNotes(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    const note = await api.create({ title: "", content: "" });
    setNotes((prev) => [note, ...prev]);
    setSelectedId(note.id);
  }

  async function handleDelete(id: string) {
    await api.remove(id);
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (id === selectedId) setSelectedId(next[0]?.id ?? null);
      return next;
    });
  }

  function scheduleSave(id: string, patch: { title?: string; content?: string }) {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch } : n))
    );
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      try {
        const updated = await api.update(id, patch);
        setNotes((prev) =>
          prev
            .map((n) => (n.id === id ? updated : n))
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        );
      } catch (err) {
        console.error(err);
      } finally {
        setSaving(false);
      }
    }, 400);
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <header className="brand">
          <span className="brand-mark" aria-hidden>
            ☁
          </span>
          <div>
            <h1>clearskyNote</h1>
            <p>Clear thoughts, clear skies</p>
          </div>
        </header>

        <div className="sidebar-actions">
          <input
            className="search"
            type="search"
            placeholder="Search notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn-new" onClick={handleCreate}>
            + New
          </button>
        </div>

        <div className="note-list">
          {loading && <p className="empty">Loading…</p>}
          {!loading && filtered.length === 0 && (
            <p className="empty">No notes yet. Create your first one!</p>
          )}
          {filtered.map((note) => (
            <button
              key={note.id}
              className={
                "note-item" + (note.id === selectedId ? " active" : "")
              }
              onClick={() => setSelectedId(note.id)}
            >
              <span className="note-item-title">
                {note.title.trim() || "Untitled note"}
              </span>
              <span className="note-item-preview">
                {previewOf(note.content)}
              </span>
              <span className="note-item-date">
                {formatDate(note.updatedAt)}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <main className="editor">
        {selected ? (
          <>
            <div className="editor-toolbar">
              <span className="save-status">
                {saving ? "Saving…" : "Saved"}
              </span>
              <button
                className="btn-delete"
                onClick={() => handleDelete(selected.id)}
              >
                Delete
              </button>
            </div>
            <input
              className="editor-title"
              placeholder="Note title"
              value={selected.title}
              onChange={(e) =>
                scheduleSave(selected.id, { title: e.target.value })
              }
            />
            <textarea
              className="editor-content"
              placeholder="Start writing…"
              value={selected.content}
              onChange={(e) =>
                scheduleSave(selected.id, { content: e.target.value })
              }
            />
          </>
        ) : (
          <div className="editor-empty">
            <span className="editor-empty-mark" aria-hidden>
              ☁
            </span>
            <h2>Select a note or create a new one</h2>
            <p>Your notes are saved automatically as you type.</p>
          </div>
        )}
      </main>
    </div>
  );
}
