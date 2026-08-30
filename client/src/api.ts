export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const BASE = "/api";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  list: () => fetch(`${BASE}/notes`).then((r) => handle<Note[]>(r)),
  create: (data: { title?: string; content?: string }) =>
    fetch(`${BASE}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => handle<Note>(r)),
  update: (id: string, data: { title?: string; content?: string }) =>
    fetch(`${BASE}/notes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => handle<Note>(r)),
  remove: (id: string) =>
    fetch(`${BASE}/notes/${id}`, { method: "DELETE" }).then((r) =>
      handle<void>(r)
    ),
};
