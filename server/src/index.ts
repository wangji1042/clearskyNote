import express from "express";
import cors from "cors";
import {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
} from "./store.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "clearskynote-server" });
});

app.get("/api/notes", async (_req, res) => {
  res.json(await listNotes());
});

app.get("/api/notes/:id", async (req, res) => {
  const note = await getNote(req.params.id);
  if (!note) return res.status(404).json({ error: "Note not found" });
  res.json(note);
});

app.post("/api/notes", async (req, res) => {
  const { title, content } = req.body ?? {};
  const note = await createNote({ title, content });
  res.status(201).json(note);
});

app.put("/api/notes/:id", async (req, res) => {
  const { title, content } = req.body ?? {};
  const note = await updateNote(req.params.id, { title, content });
  if (!note) return res.status(404).json({ error: "Note not found" });
  res.json(note);
});

app.delete("/api/notes/:id", async (req, res) => {
  const ok = await deleteNote(req.params.id);
  if (!ok) return res.status(404).json({ error: "Note not found" });
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`clearskyNote API listening on http://localhost:${PORT}`);
});
