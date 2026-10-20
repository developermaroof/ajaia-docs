# SPEC – Ajaia Docs (lightweight collaborative editor)

## Goal
Small full-stack Google-Docs-style editor built in ~3 hours. Depth over breadth.

## Stack (fixed)
- Next.js (App Router, `app/` at project root, no `src/`) + TypeScript + Tailwind
- TipTap editor (StarterKit + Underline if not included)
- Supabase Postgres via @supabase/supabase-js, used ONLY on the server with the service role key (use the `server-only` package; never import it in client code)
- zod (validation), marked (.md → HTML), mammoth (.docx → HTML)
- Vitest for tests
- Deploy: Vercel

## Data (already created – see db/schema.sql)
- users(id, name, email) – 3 seeded users
- documents(id, owner_id, title, content as HTML text, version, created_at, updated_at)
- document_shares(document_id, user_id, role 'viewer' | 'editor')

## Auth (mocked on purpose)
- /login lists the seeded users; clicking one sets an httpOnly cookie `uid`.
- Every page except /login redirects to /login if there is no valid user.
- Header shows the current user + "Switch user".

## Access rules (enforced on the server in every API route)
- Pure functions in `lib/permissions.ts`:
  - getAccess(doc, shares, userId) → 'owner' | 'editor' | 'viewer' | null
  - canView = any non-null, canEdit = owner or editor, canShare = owner only
- No access → 404 (don't reveal the doc exists). Wrong role → 403.

## API (route handlers, JSON, zod-validated, clear error messages)
- GET /api/documents → { owned, shared } (shared items include owner name + my role)
- POST /api/documents → create "Untitled document"
- GET /api/documents/:id → doc + my access (+ share list if owner)
- PATCH /api/documents/:id → { title? } or { content, expectedVersion } (title 1–200 chars, content max 1 MB)
- DELETE /api/documents/:id → owner only
- POST /api/documents/:id/share → { email, role }, owner only. Errors: unknown email, sharing with yourself. If already shared, update the role.
- DELETE /api/documents/:id/share/:userId → owner only
- POST /api/import → multipart file. Only .txt, .md, .docx, max 2 MB. Convert to HTML, create a new doc titled from the file name, return its id.

## Pages
- `/` Dashboard: "My documents" and "Shared with me" sections (shared items show "Shared by X" + role badge), last updated time, "New document" button, "Import file" button with the text "Supported: .txt, .md, .docx up to 2 MB". Empty states.
- `/documents/:id` Editor: editable title (rename), toolbar: Bold, Italic, Underline, H1, H2, Bullet list, Numbered list, Undo, Redo (active buttons highlighted). Save status "Saving… / Saved / Couldn't save – retrying". Viewer = read-only + banner "You have view access". Owner sees a "Share" button → dialog: email input + role select + list of people with access + remove.

## Reliability rules (from my production experience building a document editor)
- Autosave: debounce 800 ms after the last change. Never save before the document has finished loading (prevents an empty editor overwriting real content). Only one save request in flight at a time. On network/server error, retry with backoff (2s, 4s, 8s… max 30s) and show one error message, not one per retry.
- Title saves separately from content (its own debounced PATCH), so renaming never races with body autosave.
- Conflict protection: a content PATCH sends `expectedVersion`; the server updates only `where id = ? and version = expectedVersion`, increments the version and returns the new one. If no row matched → 409. The client then shows "This document was changed elsewhere. Reload to see the latest version" (no silent overwrite).
- Access: viewer < editor < owner. The UI only hides buttons; the server re-checks every request. No access → 404.
- Supabase tables have RLS enabled with no policies; only the server (secret key) can read or write.

## Quality
- Vitest tests: permissions.ts (owner / editor / viewer / no-access cases) and import conversion (.txt → paragraphs with HTML escaped, .md → headings/lists).
- Loading and error states on every page. No secrets in the client bundle. `.env.local` gitignored; add `.env.example`.

## Build in phases – stop after each phase and list what I should test
1. Supabase server client, mocked login, documents CRUD API, dashboard, editor + toolbar + autosave + rename
2. Sharing API + share dialog + owned/shared sections + viewer read-only + server access checks
3. File import + validation/error polish + Vitest tests
4. README.md, ARCHITECTURE.md, AI_WORKFLOW.md (draft for me to edit), SUBMISSION.md

## Out of scope (state in README)
Real-time co-editing, comments, version history, real authentication, PDF export.