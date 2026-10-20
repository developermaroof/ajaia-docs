# Prompts and AI notes

## Prompts I gave Claude Code

### Prompt 1: Phase 1

Read AGENTS.md first – this Next.js version may differ from what you know. Then read SPEC.md (including "Reliability rules") and db/schema.sql. The Supabase database already exists and the keys are in .env.local.

Build Phase 1 only:

- server-only Supabase client
- mocked login with the seeded users
- documents API: list, create, get, rename, update content (with the version check), delete
- dashboard + editor page with the toolbar, autosave and save status

Constraints:

- Install only the packages listed in SPEC.md.
- Keep permission logic in lib/permissions.ts as pure functions (tests come in Phase 3).
- Validate every request body with zod and return clear JSON errors.

When done:

1. Run npm run build and fix any errors.
2. Give me a numbered manual test list for Phase 1, including: refresh keeps formatting, and two tabs editing the same document shows the conflict message.
   Do not start Phase 2.

### Prompt 2: Phase 2

Read AGENTS.md, SPEC.md and the existing code. Phase 1 is done and committed. Build Phase 2 only: sharing.

- Share API (POST and DELETE under /api/documents/:id/share), owner only, with all the error cases in SPEC.md (unknown email, sharing with yourself, update the role if already shared).
- Share dialog on the editor page, owner only: email input, role select (viewer/editor), list of people with access, remove button.
- Dashboard: add the "Shared with me" section ("Shared by <owner name>" and a role badge). Keep the "My documents" section.
- Viewer: editor is read-only with the banner "You have view access". Editor role can type and save but cannot share or delete.
- Check access on the server in every route through lib/permissions.ts.

Rules:

- Do NOT use Chrome or any browser tool. Verify with `npm run build`, lint and curl or API tests against the database only.
- Keep your final report under 15 lines, then give me a short manual test list for Phase 2.
- Do not start Phase 3.

### Prompt 3: Phase 3

Read AGENTS.md, SPEC.md and the existing code. Phases 1 and 2 are done and committed. Build Phase 3 only: file import, validation polish and tests.

1. POST /api/import (multipart, field "file"):
   - Allowed types: .txt, .md, .docx only. Max 2 MB.
   - .txt → one <p> per paragraph, HTML-escaped. .md → HTML with `marked`. .docx → HTML with `mammoth`.
   - Strip <script>, <style> and event-handler attributes from the converted HTML before saving (add `sanitize-html` for this).
   - Create a new document owned by the current user, titled from the file name without the extension, and return its id.
   - Errors with clear JSON messages: no file 400, unsupported type 415, over 2 MB 413, empty file 400, unreadable .docx 422.
2. Dashboard: an "Import file" button next to "New document" with the visible text "Supported: .txt, .md, .docx up to 2 MB". Show a loading state while uploading, an inline error message if it fails, and open the new document on success.
3. Put the conversion logic in lib/import.ts as pure functions so they can be tested.
4. Add Vitest and an `npm test` script, with these tests:
   - lib/permissions.ts: owner, editor, viewer and no-access cases for getAccess, canView, canEdit and canShare.
   - lib/import.ts: .txt escapes HTML and makes paragraphs; .md gives headings and lists; script tags are stripped.
5. Small polish only: check every page and API route has loading and error states and no secrets reach the client. No new features.

Rules:

- Do NOT use Chrome or any browser tool. Verify with `npm test`, `npm run build`, lint, and curl (upload one .txt and one .md with curl -F).
- Keep your final report under 15 lines, then a short manual test list for Phase 3.
- Do not start Phase 4.

## How I worked with the AI

- I wrote the spec first (SPEC.md) with the stack, data model, API, access rules and reliability rules, then had Claude Code build one phase at a time, each with a manual test list.
- Before building, I drew on my own experience from a production document editor: debounced autosave, one save at a time, retry with backoff, version-based conflict protection, and server-side access checks.
- I used a fresh session per phase and a lower effort setting, so the spec carried the context instead of a long chat.
- I deployed to Vercel after Phase 2, so a live link existed before the last features were built.

## Where AI was wrong, and what I changed or rejected

- Claude Code's list/get endpoints returned 500 (two foreign-key paths from documents to users). It found this in its own API test and fixed it by naming the key (users!owner_id).
- I accepted its decision to turn off TipTap's TrailingNode extension, because it inserted a paragraph on first click and triggered a save just from viewing a document.
- I stopped Claude Code from testing in the browser through Claude in Chrome because it used up my usage limit. I switched to API checks (curl) and my own manual testing.
- Phase 2: Claude Code added a per-person role select in the share dialog that I hadn't asked for. I kept it because it makes role changes easier.
- Phase 3: Claude Code added HTML sanitizing on imports (script, style, event handlers, javascript: links, and also <img>). I accepted it, because imported files are untrusted input. It also bumped @types/node to 22 because Vitest 5 needed it.
- Phase 3: Claude Code's dev server went stale (new constants showed as undefined) while the production build was fine. It verified against the production build instead, and I cleared `.next` and restarted my own dev server.
- It did not test a real .docx upload, only a fake one, so I tested a real .docx, a .md and a rejected .pdf myself in the browser.

## How I verified the work

- `npm run build`, lint and `npm test` (30 tests) after the phases that added them.
- Claude Code's curl tests against the real database for every role (owner, editor, viewer, stranger, no login) and for every import error case (400, 413, 415, 422, 401).
- The two-tab test for conflict protection: a stale save is rejected with 409 and the other tab's edit is kept.
- My own manual browser checks after each phase, including sharing between users and importing real files.
- A check of the live Vercel deployment after each push.
