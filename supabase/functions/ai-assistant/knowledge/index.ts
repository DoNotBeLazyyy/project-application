import { ADMIN_KNOWLEDGE } from './admin.ts';
import { DEAN_KNOWLEDGE } from './dean.ts';
import { FACULTY_KNOWLEDGE } from './faculty.ts';
import { REGISTRAR_KNOWLEDGE } from './registrar.ts';
import { STUDENT_KNOWLEDGE } from './student.ts';

const SHARED_KNOWLEDGE = `
# Shared behaviour (every role)

- The sidebar switches pages; the top bar holds the notification bell, your name and Sign Out.
- Users who hold more than one role see a "Switch Role" dropdown in the sidebar. The panel you see
  is always the panel of your active role — switching roles changes the whole menu.
- The session times out after a period of inactivity and warns before signing you out.
- Announcements and events are addressed to an audience (a role, a program, or a section); you only
  see the ones addressed to you. The bell shows unread notifications.
- Lists share the same controls: search, filter, sort, pagination, row selection for bulk actions, and
  CSV template download plus CSV upload where bulk creation is supported.
- Records open as their own page; confirmations, filters and imports open as dialogs.
- Deletions are soft — a deleted record disappears from lists but is retained for auditing.
- Passwords are changed on the Profile page.
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
