# AU-JAS LMS Design Proposal & UI Evolution Protocol

This document establishes the mandatory protocol for proposing UI/UX designs, refactors, and interactive prototypes for the **AU-JAS Learning Management System**.

Whenever a design proposal is requested, follow this exact structure and design philosophy. **Never reinvent screens from scratch or introduce foreign design paradigms.** Every proposal must be a grounded **5–10% minimal evolution** that 100% matches our established design system.

---

## 1. Core Philosophy: 5–10% Minimal Evolution, Zero Re-Creation

1. **Respect Established System Design**:
   - The LMS already has a well-defined component library (`CommonCard`, `CommonBentoCard`, `CommonButton`, `ValidCommonInput`, `CommonTableCard`, `BentoCardActionMenu`).
   - Layouts, header elevations, typography scales, border radiuses, and color tokens are defined in `@constants/theme/tokens.constant.ts`.
   - Never replace existing architectural standards with arbitrary third-party styles or radical redesigns.

2. **Solve Real Domain Contradictions**:
   - Start by understanding the exact business logic and data constraints.
   - Propose tailored UI improvements only where a generic pattern fails the specific domain requirement (e.g., managing a fixed 100% budget vs. browsing an infinite list of rows).

3. **Incremental & Implementable**:
   - Proposals must be easily translatable into 5–10% code adjustments or focused, reusable components (like `PeriodComposer`, `PeriodAllocationBar`, `WeightStepper`).

---

## 2. The 3-Step Design Proposal Structure

Every design proposal must follow this structured template:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 01 / WHAT THE CURRENT PATTERN GETS WRONG                               │
│ Diagnosis: Numbered callouts explaining exact domain & UI issues       │
├────────────────────────────────────────────────────────────────────────┤
│ 02 / DESIGN CONCEPTS (A vs. B)                                         │
│ Structured concepts with metadata:                                     │
│ - BEST AT                                                              │
│ - COSTS                                                                │
│ - ORDER / WORKFLOW                                                     │
│ - VERDICT (Clear recommendation: e.g. "Ship this one")                 │
├────────────────────────────────────────────────────────────────────────┤
│ 03 / HIGH-FIDELITY INTERACTIVE PREVIEW & ANATOMY                       │
│ Authentic AU-JAS LMS layout, exact color tokens, Phosphor icons        │
└────────────────────────────────────────────────────────────────────────┘
```

### Step 1: Diagnose What the Current Pattern Gets Wrong
Identify 3 to 6 concrete structural or visual issues in the existing UI with numbered callouts:
- **Quiet Critical Data / Errors**: e.g., "The error is the quietest thing on screen — overbudget warning is buried in grey subheader text."
- **Mismatched Generic Controls**: e.g., "Search, sort, and pagination on a fixed 4-row set fighting the pattern."
- **Unverified Assertions / Static Chips**: e.g., "Chips asserting 100% when math sums to 90%."
- **Squashed Hierarchy / Text Blobs**: e.g., "Multi-level relational budgets flattened into multi-line clamped strings."

### Step 2: Present 1–2 Focused Concepts with Trade-Offs
Always present clearly contrasted alternatives with standardized metadata:

| Field | Description |
|---|---|
| **Concept Name** | Short, evocative noun phrase (e.g., *The Allocation Composer*, *The Term Ribbon*). |
| **Description** | 2–3 sentences explaining the visual and mental model. |
| **BEST AT** | What this concept optimizes for (e.g., *"Making an invalid total impossible to miss and cheap to fix"*). |
| **COSTS** | Honest trade-offs or limitations (e.g., *"Purpose-built component; no CommonTableCard reuse"*). |
| **ORDER / WORKFLOW** | How interaction flows (e.g., *"Fixed vertical sequence on a numbered rail; drag or step to adjust"*). |
| **VERDICT** | Decisive recommendation (e.g., *"Recommended — ship this one"* or *"Strong header, weak editor. Borrow the ribbon into A"*). |

### Step 3: High-Fidelity UI Presentation
Provide an authentic mockup or interactive showcase using the exact tokens, components, and layout of AU-JAS LMS:
- Header with live summary state, badges, and top-right action buttons.
- Visual status bars with overflow hatching/color tones.
- Structured rows with numbered sequence badges, inline steppers, and reactive status indicators.

---

## 3. AU-JAS LMS Design System & Token Contract

All proposals and mockups must strictly use these design tokens:

### Brand & State Colors
- **Brand Dark (Header & Dark Accents)**: `brand-950` (`#011554`), `brand-900` (`#022179`), `brand-800` (`#123F8A`).
- **Brand Primary & Active Accents**: `brand-700` (`#225DB4`), `brand-600` (`#387BE0`), `brand-500` (`#5196F6`).
- **Brand Tints & Active Surfaces**: `brand-100` (`#E0EDFD`), `brand-50` (`#F2F7FE`).
- **Neutrals**:
  - Backgrounds: `neutral-50` (`#FAFAFA`), `neutral-100` (`#F4F4F5`), `white` (`#FFFFFF`).
  - Borders & Dividers: `neutral-200` (`#E4E4E7`), `neutral-300` (`#D4D4D8`).
  - Text & Subtitles: `neutral-900` (`#18181B`) for titles, `neutral-600` (`#52525B`) / `neutral-500` (`#71717A`) for subtitles.
- **State Feedback**:
  - **Success / Balanced**: `green-500` (`#2DCC70`), `green-100` (`#E5FBEE`), `green-700` (`#1B8547`).
  - **Warning / Unsaved**: `yellow-500` (`#FBA732`), `yellow-100` (`#FFF2E0`), `yellow-800` (`#A3550B`).
  - **Error / Over-budget**: `red-500` (`#EB5757`), `red-100` (`#FFF0F0`), `red-700` (`#B91C1C`).

### Typography & Spacing
- **Headings Font**: `Plus Jakarta Sans`, bold/semi-bold.
- **Body Font**: `Noto Sans` or `Inter`, regular (`400`) / medium (`500`).
- **Card Spacing & Elevation**:
  - `CommonCard` with subtle borders (`1px solid #E4E4E7`).
  - Elevated headers with subtle bottom shadow (`0 10px 10px -10px rgb(15 23 42 / 0.18)`).
- **Icons**: Phosphor Icons (`@phosphor-icons/react`), typically `size={14-16}`, `weight="bold"` or `"fill"`.

---

## 4. Checklist for Design Proposals

Before submitting any UI proposal or generative UI showcase, verify:

- [ ] Does it maintain 90–95% of existing system conventions, introducing at most a 5–10% targeted enhancement?
- [ ] Are all colors mapped to AU-JAS LMS tokens (`brand-*`, `neutral-*`, `state-*`)?
- [ ] Are the diagnosis callouts clearly numbered and addressing true domain rules?
- [ ] Are concepts compared with `BEST AT`, `COSTS`, `ORDER`, and `VERDICT`?
- [ ] Does the UI use existing components (`CommonCard`, `CommonButton`, standard badges) rather than inventing alien containers?

