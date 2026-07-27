import { UserRole } from '@type/app.type';

export const ROLE_HOME: Record<UserRole, string> = {
    Admin: '/admin',
    Dean: '/dean',
    Faculty: '/faculty',
    Registrar: '/registrar',
    Student: '/student'
};

export const ROLE_PANEL_LABEL: Record<UserRole, string> = {
    Admin: 'Admin Panel',
    Dean: 'Dean Panel',
    Faculty: 'Faculty Panel',
    Registrar: 'Registrar Panel',
    Student: 'Student Panel'
};

export function resolveRoleHome(role: UserRole | null): string {
    return role
        ? ROLE_HOME[role]
        : '/login';
}

export function resolvePanelLabel(role: UserRole | null, fallback: UserRole): string {
    return ROLE_PANEL_LABEL[role ?? fallback];
}