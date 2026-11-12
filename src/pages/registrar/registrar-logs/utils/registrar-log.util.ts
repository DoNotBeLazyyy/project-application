/**
 * Turns a registrar log action code into a readable label, e.g. PROFILE_CHANGE_APPROVED to
 * Profile Change Approved.
 *
 * @param action - Action code from registrar_logs.
 * @returns The label.
 */
export function formatActionLabel(action: string): string {
    return action
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}