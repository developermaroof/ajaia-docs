# Submission contents

## Links

- **Live app:** https://ajaia-docs-flax-kappa.vercel.app
- **Walkthrough video:** [PASTE VIDEO URL] (also in `walkthrough-video.txt`)

## Test accounts (no password, click to log in)

alice@demo.test (Alice Owner), bob@demo.test (Bob Teammate), carol@demo.test (Carol Reviewer)

## Files in this folder

| File | What it is |
|---|---|
| `ajaia-docs/` | Full source code (without node_modules and secrets) |
| `README.md` | Setup, run instructions and a quick tour |
| `ARCHITECTURE.md` | Architecture note: priorities, trade-offs, next steps |
| `AI_WORKFLOW.md` | How I used AI |
| `prompts.md` | The prompts I gave Claude Code and what I changed |
| `SUBMISSION.md` | This file |
| `walkthrough-video.txt` | Link to the walkthrough video |

## What is working

Create, rename, edit and reopen documents; formatting; autosave with conflict protection; import of .txt, .md and .docx; sharing with owner/editor/viewer roles; owned vs shared lists; persistence; 30 automated tests; live deployment.

## What is incomplete or not built

Real authentication (login is mocked), real-time collaboration, comments, version history, PDF export, automated browser tests.

## What I would build next with 2–4 more hours

Real auth and invite-by-email, version history, export to Markdown/PDF, Playwright tests for sharing and conflicts, real-time presence.