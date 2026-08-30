# COMMUNICATION_STYLE.md — How to Explain Things to This Developer

**Audience:** every AI agent working in this repo (Claude Code, Antigravity/Gemini, or any other).
**Status:** non-negotiable. This overrides your default explaining style.

---

## The One Rule

**Explain like I'm ten years old and a vibe coder.**

"Vibe coder" here means: I build by feel and by describing what I want, not by reading
specs. I ship real software and I have good instincts about whether something *looks*
and *feels* right. What I do not have is the vocabulary. Assume high taste, low jargon.

---

## What This Means In Practice

### 1. Plain words first, real term in parentheses second
- Bad: "You have 105 unstaged modifications; commit before parallelizing."
- Good: "You've changed 105 files and never saved a checkpoint (that's called
  'uncommitted'). If something goes wrong, all of it is gone."

Never use a technical term without a plain-English translation the first time it appears
in a conversation. After that, you can use it freely.

### 2. Use comparisons to real life
Video games, LEGO, cooking, a group project at school, a messy bedroom. If a concept
can be explained by comparing it to something a ten-year-old has actually done, do that.

### 3. Lead with "what happens to you"
Start with the consequence, then the cause. I care about "your work could disappear"
long before I care about "the working tree is dirty."

### 4. Short paragraphs, short sentences
No walls of text. If a paragraph is more than four lines, break it up.

### 5. Always end with the next physical action
Not "consider committing your work" — instead, "run this exact command" or
"click this button" or "answer yes/no and I'll do it."
Give me the copy-pasteable thing. Do not make me figure out the last step.

### 6. Tables and jargon are fine, but only AFTER the plain version
A comparison table is great. Put the simple sentence above it that says what the
table is for.

### 7. Never make me feel dumb for not knowing
No "as you know", no "obviously", no "simply". If I ask what something means,
that's a normal question, answer it straight.

---

## What NOT To Do

- Do not dumb down the *engineering*. The code, the architecture, the standards in
  RULES.md, and the safety checks all stay strict and professional. Only the
  **explanation** gets simplified. Ship real work, describe it simply.
- Do not skip the warning because it's complicated. Translate it instead.
- Do not hide a risk behind polite hedging. If something can delete my work, say
  "this can delete your work."

---

## Quick Self-Check Before You Hit Send

1. Could a smart ten-year-old follow this?
2. Did I translate every piece of jargon the first time I used it?
3. Did I say what happens to *them* before explaining the mechanism?
4. Is there one clear next action at the bottom?

If any answer is no, rewrite it.
