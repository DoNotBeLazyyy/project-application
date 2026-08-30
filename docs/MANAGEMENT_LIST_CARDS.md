# Management-list grid cards

Every "management" page in the app renders its rows two ways: a data **table** and a
responsive **grid** of cards. This doc is the contract for the grid card. Follow
it whenever you add a new management list or touch an existing one.

Reference implementations: `SectionGridCard`, `CourseGridCard` (rich rows),
`CourseTypeGridCard`, `RoleGridCard`, `ProgramLevelGridCard` (simple rows).

---

## Anatomy

A card is always `CommonBentoCard`. A per-entity `*GridCard.tsx` component maps
one list row onto its props — it does **not** re-implement layout.

```
┌─────────────────────────────────────────┐
│ [Select]  [CODE]  [Status]          ⋮   │  ← header: select button, code pill, status pill, action menu
│                                          │
│  Hero Title                              │  ← title  (row's primary name/label)
│  subtitle                                │  ← subtitle (secondary identifier: code, email, school year…)
│                                          │
│  ┌───────────────────────────────────┐  │
│  │ PERSON ROLE                        │  │  ← optional person slot (faculty / dept head / owner)
│  │ Person Name                        │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌─────────────┐  ┌─────────────┐        │  ← metrics: always exactly 2 tiles, short scalar values
│  │ Label       │  │ Label       │        │
│  │ value       │  │ value       │        │
│  └─────────────┘  └─────────────┘        │
│                                          │
│  ┌────────┐ ┌────────┐ ┌────────┐        │  ← facts: N short attributes, share a row
│  │ LABEL  │ │ LABEL  │ │ LABEL  │        │    while they fit, stack when the card
│  │ value  │ │ value  │ │ value  │        │    narrows, tone-coloured
│  └────────┘ └────────┘ └────────┘        │
│                                          │
│  Capacity                 12 / 40 (30%)  │  ← optional progress bar
│  ▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                          │
│  ┌───────────────────────────────────┐  │  ← detail rows: long, free-text values, each on its OWN row
│  │ DESCRIPTION                        │  │
│  │ Clamped to N lines, hover for the  │  │
│  │ full value in a tooltip …          │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ─────────────────────────────────────  │
│  footer meta            [Action] [Action]│  ← optional footer
└─────────────────────────────────────────┘
```

---

## Rules

### 0. The grid itself: container-relative, 1–4 columns, cards fill the row

`CommonTableCard` lays the cards out with

```
grid-template-columns: repeat(auto-fit, minmax(max(280px, calc((100% - 3rem) / 4)), 1fr));
```

- **`auto-fit` + `1fr`** — cards always stretch to fill the available width; 3 cards
  on a wide screen span the whole row, they don't huddle at card width.
- **`calc((100% - 3rem) / 4)`** — the track floor is one-quarter of the container
  (minus the 3 gaps), so the column count never exceeds **4**.
- **`max(280px, …)`** — when the content area narrows (sidebar expanded, small
  screen) the 280px floor wins and columns drop: 3, 2, down to **1**.
- It keys off the **container**, not the viewport — no media-query breakpoints.

Individual `*GridCard`s don't touch layout; they just render `CommonBentoCard`.

### 1. Height is content-driven, equalized per row — never globally fixed

- `CommonBentoCard` sets `h-full`. CSS grid then equalizes every card in the
  **same row** to the tallest one. That is the only equalization we want.
- **Do not** add a global `min-height` to `CommonBentoCard`. A sparse list (e.g.
  course types: title + one description) must be allowed to render short. Forcing
  it to match a rich list (sections) just produces dead space.
- Different management lists are **not** expected to have the same card height.

### 2. Optional blocks: reserve or omit, don't half-render

If a block represents a field that conceptually always exists but is sometimes
unset (a section's faculty, a department's head), render a **same-height muted
placeholder** rather than dropping the block — dropping it makes neighbours
ragged. `CommonBentoCard` already does this for:

- **Person slot** — pass `facultyNotAssigned` and it renders a "Not assigned"
  placeholder at full height when `faculty` is absent.
- **Metrics** — renders short scalar values. 1 metric renders full-width (`grid-cols-1`); 2 metrics render side-by-side (`grid-cols-2`). Never adds dead placeholder tiles.

If a block is genuinely optional for the whole entity (a `description` that many
rows leave blank), use a **detail row** with an `emptyText` placeholder (rule 4).

### 3. Long values that are short-ish → clamp inline, with tooltip

Title, subtitle, metric values, footer meta: single line, ellipsis. These use
`TruncatedText` under the hood, which shows a hover tooltip with the full text
**only when the value is actually cut off**. Nothing to wire — pass strings.

### 3b. Three or more short attributes → `facts`, not one row each

`metrics` is a fixed 2-up grid. When an entity is defined by **three or more**
short scalars (a policy rule, a threshold, a flag), pass them as `facts`
instead — a chip row that reflows on the card's own width:

```tsx
<CommonBentoCard
    facts={[
        { label: 'Outcome', value: 'Non-Passing', tone: 'danger', icon: <ProhibitIcon size={13} weight="fill" /> },
        { label: 'Min Absence', value: '≥ 20%' },
        { label: 'Completion', value: 'Required (30d)', tone: 'warning' }
    ]}
    …
/>
```

- Chips are `flex-wrap` with a `7rem` basis: as many as fit share the row, the
  last row stretches to fill, and a narrow card — a small screen, or 4 columns on
  a wide one — drops to one chip per row rather than squeezing them. No media
  queries; it keys off the card, like the grid itself.
- Keep the label short (**≤ ~11 characters**). At the 280px column floor a chip is
  ~116px wide, and a longer label truncates.
- Values use `TruncatedText`, so a long one clamps with a hover tooltip. Prefer
  a value that fits: `Required (30d)`, not `Required within 30 days`.
- `tone` colours the chip: `positive` (good), `warning` (an obligation attached),
  `danger` (blocking / failed), `neutral` (default). Tone a chip only when the
  value carries that meaning — a card where every chip is coloured says nothing.
- An optional `icon` (13px, `weight="fill"`) sits before the label. Keep one icon
  per label so a column of cards scans consistently; only swap the icon when it
  *is* the signal (a check vs. a prohibit sign for pass/fail).

Reference implementation: `SpecialGradeGridCard`.

### 4. Long free-text values → omitted from grid cards (read in full view)

Descriptions, notes, announcement bodies, and long multi-sentence rules are
**omitted** from grid cards so cards remain compact, scannable, and uniform.
Full contents and descriptions are displayed in the full view drawer / modal
accessed via the card click or the "View" action menu item.

`CommonBentoCard` continues to support the optional `details` prop for standalone
or specialized wide-card contexts where explicitly needed.

### 5. Action menu is shared and adaptive

Use `BentoCardActionMenu`. One action → a plain button. Two or more → a kebab
(`⋮`) menu. Put a `destructive: true` on Delete and it gets a divider + red
styling. Mirror exactly the actions the table's `menuOptions` expose for that
row, including any row-state gating (see `TermGridCard`).

### 6. Selection

Pass `selectVariant="button"` (the "Select" / "Selected" pill). The card wiring
in `CommonTableCard`'s `renderGridCard` callback hands you `isSelected` and
`onToggleSelect` — forward them straight through.

---

## Adding a new management list

1. Create `XxxGridCard.tsx` next to the page's `index.tsx`. Copy the closest
   reference card.
2. Map the row:
   - `title` — the primary human name (`label`, `name`, `title`, full name).
   - `subtitle` — the secondary identifier (`code`, `email`, school year). Omit
     if there isn't a meaningful one.
   - `status` — a short state word if the entity has one (`Active`/`Inactive`,
     term status, `Published`/`Draft`). Pass `""` to hide the pill.
   - `metrics` — up to 2 **short scalar** facts (dates, counts, a category).
   - `facts` — 3+ short attributes that should share a row when they fit
     (rule 3b). Use instead of `metrics`, not alongside it.
   - `faculty` + `facultyNotAssigned` — only if a person owns the row.
   - `actionMenu` — a `BentoCardActionMenu` mirroring the table row actions.
3. Wire it in the page's `<CommonTableCard renderGridCard={…}>`:

```tsx
renderGridCard={function(item, isSelected, onToggleSelect, onRequestDeleteRow) {
    return (
        <XxxGridCard
            isSelected={isSelected}
            row={item}
            onEdit={handleOpenUpdate}
            onRequestDelete={onRequestDeleteRow}
            onToggleSelect={onToggleSelect}
            onView={handleOpenView}
        />
    );
}}
```

4. `npx tsc -b` and `npx eslint src/pages/<area>` before you're done.

---

## Shared pieces

| File | Responsibility |
| --- | --- |
| `src/components/card/CommonBentoCard.tsx` | The card layout. All spacing, the 2-tile metrics floor, `h-full`, detail rows. |
| `src/components/card/TruncatedText.tsx` | Clamp-to-N-lines + hover tooltip **only when overflowing**. Used for title, subtitle, metric values, detail rows. |
| `src/components/card/CommonBentoCard.tsx` → `FACT_TONE_CLASS` | The `neutral` / `positive` / `warning` / `danger` chip palette. |
| `src/components/card/BentoCardActionMenu.tsx` | The adaptive single-button / kebab-menu controller. |
| `src/utils/date.util.ts` → `formatShortDate` | `"Aug 30, 2025"` for date metrics; `"—"` for empty. |
| `src/utils/term.util.ts` → `formatTermLabel` | Condenses `"1st Semester - School Year 2025-2026"` → `"1st sem (AY. 2025 - 2026)"`. |
