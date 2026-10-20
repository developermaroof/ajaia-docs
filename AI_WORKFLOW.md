# AI workflow note

## Tools used

- **Claude (chat):** planning and scoping, reviewing my specs and reports, and turning my previous experience into rules for this build.
- **Claude Code (Sonnet 5.5):** building each phase from my `SPEC.md`.
- **Cursor:** as my editor for reviewing and testing the code.

The exact prompts are in `prompts.md`.

## Where AI materially sped up the work

- Boilerplate-heavy parts: the CRUD API, zod validation, the dashboard, the share dialog, and the import converters.
- API-level verification: Claude Code ran curl tests against the real database for every role (owner, editor, viewer, stranger, no login) and every import error code.
- Writing the 30 unit tests.

## What I decided myself

- The scope and the 4 phases, and what to leave out.
- The stack and the reliability rules in `SPEC.md`: debounced autosave, one save at a time, retry with backoff, version-based conflict protection, 404 for no access, RLS on with no policies. These come from my earlier experience building a document editor in production.
- To deploy to Vercel after Phase 2, so a live link existed early.

## What AI-generated output I changed or rejected

- Accepted Claude Code's decision to turn off TipTap's TrailingNode extension, because it caused a save just from opening a document.
- Accepted its fix for a 500 error caused by two foreign-key paths between documents and users.
- Stopped it from browser-testing through Claude in Chrome (it was using up my usage limit) and switched to curl checks plus my own manual testing.
- Kept an extra per-person role select it added to the share dialog.
- Accepted stricter HTML sanitizing on imports (including removing images), because imported files are untrusted.

## How I verified correctness, UX and reliability

- `npm run build`, lint and `npm test` (30 tests) after each phase.
- Curl tests against the real database for roles and import errors.
- My own browser checks after each phase: formatting survives refresh, the two-tab conflict banner, sharing between users and the read-only viewer, and importing a real .docx, a .md and a rejected .pdf.
- A check of the live deployment after each push.
- Not verified: automated browser tests (not enough time), and large real-world .docx files.