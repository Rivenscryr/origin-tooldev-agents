# OGame ToolDev — `AGENTS.md` guardrails

A drop-in **`AGENTS.md`** for anyone building an OGame third-party tool with the help
of an AI coding agent (Claude Code, Cursor, Copilot, Codex, and similar).

It turns the OGame Origin team's **forbidden-features and toleration rules** into hard
constraints your coding agent will follow — so the tool you build has a real chance of
being tolerated instead of rejected on sight.

## Why this exists

OGame third-party tools have to follow strict rules: no automation, no scheduling, no
alarms, no tampering with the game's UI or monetization, careful API and
background-call behavior, and more. Tools that break these rules get **rejected**
during review, and repeat offenders can lose the right to publish tools at all.

A lot of tools are now written by people using AI agents who don't know how to code
*or* how OGame works — and the agent will happily implement forbidden features unless
something stops it. This `AGENTS.md` is that something. Dropped into your project, it
tells the agent what it may not build, why, and what to do instead.

## What's inside `AGENTS.md`

- An operating protocol that makes the agent sort every feature into **allowed /
  needs-approval / forbidden** — and **refuse** the forbidden ones in plain language
  instead of quietly building them.
- The full list of forbidden features: automation & macros, scheduling, auto-refresh
  & polling, automatically registered alarms/notifications/webhooks, drastic shortcuts
  & direct probing, imitating Dark Matter features, blocking monetization, paywalls,
  and silent data scraping.
- The **gray areas** that require prior approval.
- API and background-call discipline: use the community proxy, page-load-only calls,
  the `accountInfo` and `cp` gotchas, and what "activity" is and why it matters.
- A **"does my tool even need toleration?"** decision guide.
- A pre-submission **self-audit checklist**.
- A quick-reference **request → verdict** table.

## Quick start

1. Copy **`AGENTS.md`** into the **root of your tool's repository**.
2. Most modern agentic coding tools read `AGENTS.md` automatically. If yours expects a
   different filename, copy or symlink it (e.g. `CLAUDE.md`, `.cursorrules`,
   `.github/copilot-instructions.md`), or simply start your session with:
   *"Read `AGENTS.md` and follow it strictly."*
3. Build your tool. When you ask for something forbidden, the agent should refuse and
   explain — **don't override it.** If you believe you have a legitimate exception, ask
   a ToolDev admin on the forum *before* proceeding.

### What it looks like in practice

> **You:** Add a feature that pings me on Discord whenever I'm attacked.
>
> **Agent:** I can't build that. OGame forbids automatically alerting you to in-game
> events — including incoming attacks — and especially through external channels like
> Discord or webhooks. Tools that do this get rejected. There's no compliant version
> of auto-detecting attacks; the closest allowed thing is a notification *you* set by
> hand on a specific fleet you sent. If you think your case is an exception, check with
> a ToolDev admin on the forum before we build anything.

## Important — what this is and isn't

- ✅ It's a set of **guardrails** that make accidental rule-breaking far less likely
  and make your tool much easier to review.
- ❌ It is **not a guarantee of toleration.** Tools that require it must still be
  submitted and pass a real human review.
- ❌ It is **not a substitute for the official rules.** The forum threads are the
  source of truth; this file only encodes them for your agent.
- ⚠️ AI agents make mistakes. Read what your agent produces, and when in doubt,
  **ask a ToolDev admin.**

## Useful links

- **Forbidden features** — https://forum.origin.ogame.gameforge.com/forum/thread/29-forbidden-features/
- **Submissions & API Requests** — https://forum.origin.ogame.gameforge.com/forum/board/12-submissions-api-requests/
- **Submission template** — https://forum.origin.ogame.gameforge.com/forum/thread/332-submission-template/
- **Tolerated Tools** — https://forum.origin.ogame.gameforge.com/forum/board/13-tolerated-tools/
- **Community Showcase** — https://forum.origin.ogame.gameforge.com/forum/board/38-community-showcase/
- **Community API proxy** — https://ogapi.faw-kes.de/

## Contributing

Corrections and clarifications are welcome via issues and pull requests — especially if
a rule has changed or an example is unclear.

**Please note:** this file only *encodes* the rules; it does not set them. Any change
that alters what is or isn't allowed must reflect an actual decision by the OGame
Origin ToolDev team, not a contributor's preference. When in doubt, open an issue
first and let a ToolDev admin weigh in.

## Maintainers

[RiV-](https://forum.origin.ogame.gameforge.com/user/16-riv/) (Origin ToolDev Administrator)
