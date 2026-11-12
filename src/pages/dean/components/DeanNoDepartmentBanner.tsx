import { WarningCircleIcon } from '@phosphor-icons/react';
import { useAppStore } from '@stores/app.store';

/**
 * Tells a dean why their pages are empty when they have no department yet.
 * Dean lists only show their own department's records, so without one every count is zero.
 * Shows nothing for other roles or once a department is assigned.
 */
export default function DeanNoDepartmentBanner() {
    const activeRole = useAppStore((state) => state.activeRole);
    const departmentId = useAppStore((state) => state.userProfile?.department_id);

    if (activeRole !== 'Dean' || departmentId) {
        return null;
    }

    return (
        <div
            className="bg-(--mui-palette-warning-main)/10 border border-(--mui-palette-warning-main)/40 flex flex-none gap-2 items-start p-3 rounded-lg text-(--mui-palette-text-primary) text-sm"
            role="alert"
        >
            <WarningCircleIcon
                className="shrink-0 text-(--mui-palette-warning-main)"
                size={20}
                weight="fill"
            />
            <span>
                Your account is not assigned to a department yet. Ask the admin to assign you in Departments.
            </span>
        </div>
    );
}