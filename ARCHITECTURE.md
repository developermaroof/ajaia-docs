# Architecture note

## What I prioritized and why

The brief asks for depth in a few areas over shallow coverage. I prioritized:

1. **A reliable editing loop** (create, edit, autosave, reopen), because a document editor that loses text is useless.
2. **A clear sharing model** with enforced server-side access rules.
3. **One product-relevant file feature:** import .txt/.md/.docx into an editable document.
4. **Shipping early:** I deployed after Phase 2 so a testable build always existed.

## Stack

| Layer | Choice | Why |
|---|---|---|
| App | Next.js (App Router) + TypeScript + Tailwind | One codebase for UI and API, easy Vercel deploy |
| Editor | TipTap (ProseMirror) | Covers all required formatting; content stored as HTML so import is simple |
| Database | Supabase Postgres | Real persistence, free tier, reviewers need no setup on the live app |
| Validation | zod | Every request body is validated with clear errors |
| Import | marked (.md), mammoth (.docx), sanitize-html | Convert files to HTML and strip unsafe markup |
| Tests | Vitest | Fast tests for the pure logic |
| Hosting | Vercel | Free, simple deploy from GitHub |

## Data model

- `users(id, name, email)`: 3 seeded demo users.
- `documents(id, owner_id, title, content, version, created_at, updated_at)`: `content` is TipTap HTML, `version` powers conflict protection.
- `document_shares(document_id, user_id, role)`: role is `viewer` or `editor`, one row per person per document.

All tables have row-level security enabled with no policies. The browser never talks to the database; only the server does, with the service role key (the Supabase client file imports `server-only`).

## Request flow

Browser → Next.js route handler → zod validation → session check → permission check (`lib/permissions.ts`) → Supabase.

## Access model

- Pure functions in `lib/permissions.ts` decide the role (owner / editor / viewer / none) and what it may do (view, edit, share, delete).
- **The UI only hides buttons. The server re-checks every request.**
- A user with no access gets **404**, not 403, so document IDs cannot be probed. A user with access but the wrong role gets **403**.
- Only the owner can share, remove people, or delete.

## Autosave and conflicts

- Saves 800 ms after the last change; only one save request is in flight at a time.
- The editor does not exist until the document has loaded, so an empty editor cannot overwrite real content.
- On network or server errors it retries with backoff (2s, 4s, 8s… up to 30s) and shows one message.
- The title saves separately, so renaming never races with body saves.
- Each content save sends the version it started from. The server updates only if that version is still current. Otherwise it returns **409** and the editor shows a "changed elsewhere" banner. This is protection, not a merge: real-time merging would need CRDTs, which were out of scope.

## Import pipeline

`.txt` → escaped paragraphs; `.md` → `marked`; `.docx` → `mammoth`. The result is sanitized (scripts, styles, event handlers, `javascript:` links and images removed) and saved as a new document owned by the importer. Limits: .txt/.md/.docx only, 2 MB max, with clear 400/413/415/422 errors.

## Trade-offs and what I deliberately skipped

- **Mocked login** instead of real auth, to spend the time on editing, sharing and persistence. The session cookie only identifies a seeded user, so it is not secure.
- **HTML storage** instead of a JSON document model: simpler and good enough for this scope.
- **No real-time collaboration:** it would take a CRDT such as Yjs plus a websocket server.
- **Images in imported .docx are dropped** to keep the sanitizer strict.
- **No search, folders, comments or version history.**

## What I would build next with 2–4 hours

1. Real authentication (Supabase Auth) and share-by-invite-email.
2. Version history, using the existing version counter as the starting point.
3. Export to Markdown/PDF.
4. Editor-level integration tests (Playwright) for the share and conflict flows.
5. Real-time presence indicators.