# Submission contents

## Links

- **Live app:** https://ajaia-docs-flax-kappa.vercel.app
- **Walkthrough video (two parts, also in `walkthrough-video.txt`):**
  - Part 1 (demo): https://www.loom.com/share/0a4cc467b5bc43e88537508c3dbf3667
  - Part 2 (decisions and AI): https://www.loom.com/share/2a76c0f0c7f14441b262d1d3d2ca3f9c

## Test accounts (no password, click to log in)

alice@demo.test (Alice Owner), bob@demo.test (Bob Teammate), carol@demo.test (Carol Reviewer)

## Files in this folder

| File | What it is |
|---|---|
| `ajaia-docs-source.zip` | Full source code (without node_modules, build output and secrets) |
| `README.md` | Setup, run instructions and a quick tour |
| `ARCHITECTURE.md` | Architecture note: priorities, trade-offs, next steps |
| `AI_WORKFLOW.md` | How I used AI |
| `prompts.md` | The prompts I gave Claude Code and what I changed |
| `SUBMISSION.md` | This file |
| `walkthrough-video.txt` | Links to the walkthrough video |

## What is working

Create, rename, edit and reopen documents; formatting; autosave with conflict protection; import of .txt, .md and .docx; sharing with owner/editor/viewer roles; owned vs shared lists; persistence; 30 automated tests; live deployment.

## What is incomplete or not built

Real authentication (login is mocked), real-time collaboration, comments, version history, PDF export, automated browser tests.

## What I would build next with 2–4 more hours

Real auth and invite-by-email, version history, export to Markdown/PDF, Playwright tests for sharing and conflicts, real-time presence.