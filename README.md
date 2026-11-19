# OGame ToolDev — AGENTS.md

A drop-in `AGENTS.md` for anyone building an OGame third-party tool with an AI coding agent (Claude Code, Cursor, Copilot, Codex and similar). It turns the OGame Origin team's rules for tolerated tools into constraints your agent follows, so it doesn't build forbidden features in the first place.

## What's here

| | |
|---|---|
| `AGENTS.md` | The rules for your agent: what it may build, what needs a ToolDev's approval first, and what it must refuse. |
| `ogame-request-guard/` | The **OGame Request Guard**, the one file through which a tolerated tool makes its network requests, with its TypeScript types and its guide (`README.md`). Every tool that makes requests ships it unchanged. |

## Quick start

1. Copy `AGENTS.md` and the `ogame-request-guard/` folder into the root of your tool's repository.
2. Most agentic coding tools read `AGENTS.md` on their own. If yours doesn't, copy or link it to the name it expects (`CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`), or start your session with *"Read `AGENTS.md` and follow it strictly."*
3. When your agent refuses something, don't override it. If you think your case is an exception, ask a ToolDev on the forum before building it.

## What it is and isn't

- It makes breaking the rules by accident much less likely, and your tool easier to review.
- It is **not a guarantee of toleration**. A tool that needs toleration is still reviewed by a person.
- It **does not set the rules**. The forum threads below do; this repository only encodes them.
- Agents make mistakes. Read what yours produces, and ask a ToolDev when in doubt.

## Links

- **Forbidden features**: https://forum.origin.ogame.gameforge.com/forum/thread/29-forbidden-features/
- **Submissions & API Requests**: https://forum.origin.ogame.gameforge.com/forum/board/12-submissions-api-requests/
- **Submission template**: https://forum.origin.ogame.gameforge.com/forum/thread/332-submission-template/
- **Tolerated Tools**: https://forum.origin.ogame.gameforge.com/forum/board/13-tolerated-tools/
- **Community Showcase**: https://forum.origin.ogame.gameforge.com/forum/board/38-community-showcase/
- **Community API proxy**, for the report API: https://ogapi.faw-kes.de/

## Contributing

Corrections and clarifications are welcome as issues and pull requests. A change to what is or isn't allowed must reflect a decision by the OGame Origin ToolDev team, so open an issue first. The guard is never changed by pull request: its hash is what the review checks.

## Maintainers

[RiV-](https://forum.origin.ogame.gameforge.com/user/16-riv/) (Origin ToolDev Administrator)
