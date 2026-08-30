# CLAUDE.md — AU-JAS LMS

This project keeps ONE set of guidance shared by every AI agent (Claude Code and
Antigravity/Gemini both). Nothing is duplicated here — it is imported below.

## How to talk to the developer (READ THIS FIRST)

@./docs/COMMUNICATION_STYLE.md

Short version: **explain like I'm ten and a vibe coder.** Plain words first, real term
in parentheses after. Lead with what happens to me, not the mechanism. End every answer
with the exact next action. The engineering stays strict; only the explaining gets simple.

## Codebase guide

@./GEMINI.md

## Coding standards (non-negotiable)

@./RULES.md

## The verification gate

Before handing work back to the developer, or handing off to the other agent, run:

```
npx tsc -b
npm run lint
npm run test
```

This is the same gate CI runs (`.github/workflows/ci.yml`), plus `npm run build-prd` on
CI. Neither agent's self-report counts — only this does.
