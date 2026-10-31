import { ADMIN_KNOWLEDGE } from './admin.ts';
import { DEAN_KNOWLEDGE } from './dean.ts';
import { FACULTY_KNOWLEDGE } from './faculty.ts';
import { REGISTRAR_KNOWLEDGE } from './registrar.ts';
import { STUDENT_KNOWLEDGE } from './student.ts';

const SHARED_KNOWLEDGE = `
# Shared behaviour (every role)

- The left sidebar switches pages. The top bar holds the AI Assistant button, the notification bell,
  and your name. Clicking your name opens the account menu: My Profile, the roles you can switch to
  (only when you hold more than one), and sign out. Switching roles changes the whole menu.
- The session times out after a period of inactivity and warns before signing you out.
- Every role has Calendar (classes, deadlines, holidays and campus events in month, week, day and
  agenda views) and Announcements & Events (posts addressed to you; staff can also create them).
- List pages show cards with a search box (press Enter to search) and a "⋮" menu at the top right
  holding Create, Filter & Sort and Upload CSV where the page supports them. Each card has its own
  "⋮" menu with View, Edit and Delete.
- Creating and editing open a step-by-step dialog (a wizard). "Next Step" checks the current step;
  fields with problems turn red and the first one is focused. Unsaved work is kept as a draft and
  offered back the next time the dialog opens.
- CSV upload: open "Upload CSV", check the column guide (it lists required columns), optionally
  "Download CSV Template", choose the file, review the preview, then "Confirm Import". The result
  shows created, updated and blocked rows with the reason for each blocked row.
- Deleting asks for confirmation. Records still in use (for example a program with students or a
  section with enrollments) cannot be deleted; the message says what to move first.
- Your personal details are on My Profile. Changes to your details are sent for approval (staff to
  the Administrator, students to the Registrar).
`;

const ROLE_KNOWLEDGE: Record<string, string> = {
    Admin: ADMIN_KNOWLEDGE,
    Dean: DEAN_KNOWLEDGE,
    Faculty: FACULTY_KNOWLEDGE,
    Registrar: REGISTRAR_KNOWLEDGE,
    Student: STUDENT_KNOWLEDGE
};

export function getKnowledgeForRole(role: string): string {
    const roleSection = ROLE_KNOWLEDGE[role];

    if (!roleSection) {
        return SHARED_KNOWLEDGE;
    }

    return `${SHARED_KNOWLEDGE}\n${roleSection}`;
}
