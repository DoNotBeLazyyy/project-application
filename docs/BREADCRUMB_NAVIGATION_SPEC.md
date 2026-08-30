# Breadcrumb Navigation Specification — AU-JAS LMS

## 1. Executive Summary

This document specifies the UX design, placement, responsive behavior, and architectural contract for the **Breadcrumb Navigation System** in the Arellano University (Jose Abad Santos Campus) Learning Management System (AU-JAS LMS).

The breadcrumb provides persistent contextual orientation, visual hierarchy, and 1-click ancestor traversal across deeply nested workflows.

---

## 2. Depth Hierarchy & Maximum Depth Limit

### **Maximum Supported Depth: 5 Levels**

An audit of all route hierarchies across Admin, Dean, Registrar, Faculty, and Student portals confirms that the deepest nested routes in the system require at most **5 levels**:

| Level | Faculty Hierarchy Example | Student Hierarchy Example |
|---|---|---|
| **Level 1 (Portal Root)** | `Faculty` (`/faculty`) | `Student` (`/student`) |
| **Level 2 (Feature Area)** | `My Sections` (`/faculty/sections`) | `My Subjects` (`/student/subjects`) |
| **Level 3 (Entity Instance)** | `BSIT 3-A (IT 301)` (`/faculty/sections/:sectionId`) | `Data Structures` (`/student/subjects/:enrollmentId`) |
| **Level 4 (Sub-Entity Instance)** | `Midterm Exam` (`.../assessments/:assessmentId`) | `Midterm Exam` (`.../assessments/:assessmentId`) |
| **Level 5 (Sub-Feature Page)** | `Item Analysis` (`.../assessments/:assessmentId/analysis`) | `Result Breakdown` (`.../assessments/:assessmentId/result`) |

*Standard pages in Admin, Dean, and Registrar portals naturally operate at **2 to 3 levels** (e.g., `Dean > Faculty Loading > Prof. Santos`).*

---

## 3. Screen Placement & Layout Integration

The Breadcrumb component is positioned as a **sub-navbar strip** directly beneath the dark AU-JAS header navbar and directly above the page viewport:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  AU-JAS LMS (Brand Dark Navbar: #011554)                       ✨     🔔     [Avatar]  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  🏠 Faculty  ›  Sections  ›  BSIT 3-A (IT 301)  ›  Midterm Exam  ›  Item Analysis       │  <-- BREADCRUMB STRIP
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  [Page Title: Item Analysis & Psychometrics]                                           │
│  [Action Buttons: Search, Filters, Export]                                             │
│  [Main Viewport / AG Grid / Bento Cards / Forms]                                       │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Layout Characteristics
1. **Vertical Hierarchy**: Sits immediately below `CommonNavbar` and spans the full available width of the main content column.
2. **Visual Contrast**: Pristine white background (`#ffffff`) with a subtle bottom border (`var(--mui-tokens-color-neutral-200)` / `#E4E4E7`), providing a clear boundary between the dark brand header and page contents.
3. **Sticky Anchor**: Remains locked at the top of the viewport as the user scrolls within `<main>`, ensuring easy navigation at all scroll offsets.

---

## 4. Responsive UX Behavior & Collapsible Parent Pill

### Desktop View ($\ge 768\text{px}$)
- Renders the **full path trail** with clickable links for all ancestor levels.
- Non-active ancestor links use brand primary styling (`var(--mui-palette-primary-main)` / `#022179`), turning darker with underline on hover.
- Current active page is rendered in bold text (`var(--mui-tokens-color-neutral-900)` / `#18181B`) without click interaction.
- Separators use Phosphor `CaretRight` (`text-neutral-400`).

### Mobile View ($< 768\text{px}$) — The Collapsible Parent Pill
When depth exceeds 2 levels on small phone viewports (360px–390px), displaying all items causes awkward multi-line wrapping and pushdown of critical page content.

**The Solution: Collapsible Parent Pill (`... (count)`)**:
1. **Collapsed Presentation**:
   ```text
   [🏠 Faculty]  ›  [ ... (2) ]  ›  [Item Analysis]
   ```
2. **Interaction**:
   - Tapping the `[ ... (2) ]` pill opens a lightweight dropdown menu popover.
   - The popover lists the intermediate parent sections:
     - `Sections` (`/faculty/sections`)
     - `BSIT 3-A (IT 301)` (`/faculty/sections/123`)
     - `Midterm Exam` (`/faculty/sections/123/assessments/456`)
   - Tapping any item immediately navigates to that ancestor level.
3. **Guarantees**:
   - Zero horizontal overflow or screen scrolling needed.
   - Single-line compact height (36px).
   - High tap-target usability.

---

## 5. Design System Tokens & Styling Reference

| Element | Design System Token / Value |
|---|---|
| **Container Surface** | `#FFFFFF` (`var(--mui-tokens-color-common-white)`) |
| **Container Border** | `1px solid var(--mui-tokens-color-neutral-200)` (`#E4E4E7`) |
| **Ancestor Links** | `var(--mui-palette-primary-main)` (`#022179` / `#193CB8`), `font-medium` |
| **Current Page Text** | `var(--mui-tokens-color-neutral-900)` (`#18181B`), `font-bold` |
| **Separator** | Phosphor `CaretRightIcon` (size 12), `var(--mui-tokens-color-neutral-400)` |
| **Mobile Parent Pill** | Background: `var(--mui-tokens-color-brand-50)` (`#F2F7FE`), Border: `var(--mui-tokens-color-brand-200)` (`#A9CEF7`), Text: `var(--mui-palette-primary-main)` |
| **Typography** | `var(--mui-tokens-fontFamily-headings)` (`Plus Jakarta Sans` / `Noto Sans`) |

---

## 6. Implementation Architecture

### Proposed Component Structure
```text
src/components/breadcrumb/
├── CommonBreadcrumb.tsx         # Main presentation container & responsive renderer
├── BreadcrumbItem.tsx           # Individual link / active item item
├── BreadcrumbParentMenu.tsx     # Mobile popover dropdown for collapsed items
└── useBreadcrumbs.ts            # Route inspection hook mapping path tokens & entity IDs
```

