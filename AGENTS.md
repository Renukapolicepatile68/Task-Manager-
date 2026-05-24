# AGENTS — Guidance for coding assistants

Purpose: provide concise, actionable orientation so an AI coding agent can be productive immediately.

Quick start
- **Server:**
  - Install: `cd server && npm install`
  - Run (development): `npm start` (uses `nodemon index.js`)
- **Client (frontend):**
  - Install: `cd client && npm install`
  - Run (dev): `npm run dev` (Vite)

Where to look (key files)
- Project overview: [README.md](README.md)
- Server entry: `server/index.js` — mounts `/api` and configures middleware.
- API routes: `server/routes/index.js`, `server/routes/userRoute.js`, `server/routes/taskRoute.js`.
- Controllers: `server/controllers/*.js` (business logic for routes).
- Models: `server/models/*.js` (Mongoose schemas).
- DB util: `server/utils/connectDB.js` (Mongo connection).
- Client entry: `client/src/main.jsx` and `client/src/App.jsx`.
- Frontend state: `client/src/redux/store.js` and slices under `client/src/redux/slices/` (see `slices/api/` for API integrations).
- UI: `client/src/components/` and `client/src/pages/`.

Important conventions & notes
- API base: server mounts routes under `/api` (so user routes are available at `/api/user`, tasks at `/api/task`).
- Auth: server uses JWT in an HTTP-only cookie (see `server/utils/index.js` and `server/middleware/authMiddleware.js`).
- Error handling: centralized in `server/middleware/errorMiddleware.js` — use existing patterns for responses.
- CORS: configured in `server/index.js` — allowed origins include Vite dev ports.
- Client uses React + Vite + Redux Toolkit. Prefer updating API slices (`client/src/redux/slices/api/`) when server endpoints change.
- Environment variables:
  - Server `.env`: `MONGODB_URI`, `JWT_SECRET`, `OPENAI_API_KEY`, `PORT`, `NODE_ENV` (see [README.md](README.md) for details).
  - Client `.env`: `VITE_APP_BASE_URL`, `VITE_APP_FIREBASE_API_KEY`.

Agent workflow suggestions
- When making API changes, update both server `controllers`/`routes` and client API slices; run both apps locally to verify.
- Prefer small, focused commits; run lint (`client` has an `lint` script) before formatting-heavy PRs.
- Do not assume tests exist — add tests or ask before authoring them.
- If a long-running task is requested (start servers, run full builds), confirm which environment and ports the user expects.

Why this file helps
- Saves time: points developers to the exact files and commands to run the app.
- Reduces mistakes: highlights auth, CORS, and env var expectations agents commonly mis-handle.

If you want, I can also:
- add a `.github/copilot-instructions.md` with shortcuts for PR checks, or
- create a small `skill` that auto-runs the dev servers for you.
