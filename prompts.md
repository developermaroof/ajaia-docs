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

## How I worked with the AI

- I wrote the spec first (SPEC.md) with the stack, data model, API, access rules and reliability rules, then had Claude Code build one phase at a time, each with a manual test list.
- Before building, I drew on my own experience from a production document editor: debounced autosave, one save at a time, retry with backoff, version-based conflict protection, and server-side access checks.
- I used a fresh session per phase and a lower effort setting, so the spec carried the context instead of a long chat.

## Where AI was wrong, and what I changed or rejected

- Claude Code's list/get endpoints returned 500 (two foreign-key paths from documents to users). It found this in its own API test and fixed it by naming the key (users!owner_id).
- I accepted its decision to turn off TipTap's TrailingNode extension, because it inserted a paragraph on first click and triggered a save just from viewing a document.
- I stopped Claude Code from testing in the browser through Claude in Chrome because it used up my usage limit. I switched to API checks (curl) and my own manual testing.
- Phase 2: Claude Code added a per-person role select in the share dialog that I hadn't asked for. I kept it because it makes role changes easier.

## How I verified the work

- `npm run build` and lint after every phase.
- Claude Code's curl tests against the real database for every role (owner, editor, viewer, stranger, no login), plus my own manual browser checks for each phase.
- The two-tab test for conflict protection: a stale save is rejected with 409 and the other tab's edit is kept.
