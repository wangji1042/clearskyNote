# clearskyNote

A clean, modern note-taking app. Write, search, and organize your notes with
automatic saving — clear thoughts, clear skies.

## Tech stack

- **Client** — React 18 + Vite + TypeScript (`client/`)
- **Server** — Express + TypeScript with a lightweight JSON file store (`server/`)
- **Monorepo** — npm workspaces + `concurrently`

## Project structure

```
.
├── client/          # React + Vite front end
│   └── src/
├── server/          # Express REST API
│   └── src/
├── .cursor/         # Cloud Agent environment config
└── package.json     # npm workspaces + dev scripts
```

## Getting started

Requires Node.js 20+ (developed on Node 22).

```bash
npm install        # install all workspace dependencies
npm run dev        # start API (:3001) and web client (:5173) together
```

Then open http://localhost:5173.

### Individual dev servers

```bash
npm run dev:server   # Express API on http://localhost:3001
npm run dev:client   # Vite dev server on http://localhost:5173
```

The Vite dev server proxies `/api` requests to the API on port 3001.

## API

Base URL: `http://localhost:3001`

| Method   | Path              | Description          |
| -------- | ----------------- | -------------------- |
| `GET`    | `/api/health`     | Health check         |
| `GET`    | `/api/notes`      | List notes           |
| `GET`    | `/api/notes/:id`  | Get a single note    |
| `POST`   | `/api/notes`      | Create a note        |
| `PUT`    | `/api/notes/:id`  | Update a note        |
| `DELETE` | `/api/notes/:id`  | Delete a note        |

Notes are persisted to `server/data/notes.json`.

## Cloud Agent environment

`.cursor/environment.json` installs dependencies with `npm ci` and launches the
API and web dev servers as persistent terminals (ports 3001 and 5173).
