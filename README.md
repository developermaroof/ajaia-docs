# Ajaia Docs

A lightweight collaborative document editor inspired by Google Docs, built as a timeboxed full-stack exercise (about 3.5 hours).

**Live app:** https://ajaia-docs-flax-kappa.vercel.app

## Test accounts (no password)

Login is mocked on purpose: click a user on the login page.

| User | Email |
|---|---|
| Alice Owner | alice@demo.test |
| Bob Teammate | bob@demo.test |
| Carol Reviewer | carol@demo.test |

## Quick tour for reviewers (about 3 minutes)

1. Log in as **Alice**. Click **New document**, type some text, and use the toolbar (bold, italic, underline, H1, H2, bullet and numbered lists). Watch the status: "Saving…" then "Saved". Refresh: content and formatting are still there.
2. Rename the document with the title field at the top.
3. Click **Share**, add `bob@demo.test` as **viewer**, then switch the role to **editor**.
4. Click **Switch user** and log in as **Bob**. The document appears under "Shared with me" with "Shared by Alice Owner" and a role badge. As a viewer the editor is read-only; as an editor Bob can type but cannot share or delete.
5. As Alice, click **Import file** and upload a `.txt`, `.md` or `.docx` file. It becomes a new editable document.
6. Conflict protection: open the same document in two tabs, type in one and wait for "Saved", then type in the other. You get a "changed elsewhere" banner instead of a silent overwrite.

## Features

- Create, rename, edit and reopen documents (TipTap rich-text editor, content stored as HTML).
- Formatting: bold, italic, underline, headings (H1/H2), bulleted and numbered lists, undo/redo.
- Autosave (800 ms debounce) with save status, retry with backoff on errors, and version-based conflict protection.
- File import: **.txt, .md, .docx up to 2 MB** become new documents. Imported HTML is sanitized.
- Sharing: owner / editor / viewer, with owned and shared documents shown separately.
- Persistence in Supabase Postgres.
- 30 automated tests (permissions logic and import conversion).

## Run locally

Requirements: Node 20.9 or newer, and a free [Supabase](https://supabase.com) project.

1. Install: `npm install`
2. In Supabase, open the SQL Editor and run the contents of `db/schema.sql` (it also adds the 3 demo users).
3. Copy `.env.example` to `.env.local` and fill in:
```
   SUPABASE_URL=https://<your-project>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your secret key>
```
   The key is used only on the server and is never sent to the browser.
4. Start: `npm run dev` and open http://localhost:3000
5. Tests: `npm test`
6. Production check: `npm run build`

## What is intentionally not included

Real authentication, real-time co-editing, comments, version history and PDF export. See `ARCHITECTURE.md` for the reasoning and what I would build next.

## Known limitations

- Mocked login is for demonstration only and is not real authentication.
- Images inside imported .docx files are not imported (they are removed by the sanitizer).
- If two people edit the same document, the second save is rejected with a conflict message instead of being merged.