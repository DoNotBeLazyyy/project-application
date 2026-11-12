import { HistoryDiffMark } from '@pages/admin/school-year-management/wizard/academic-year-history';

interface HistoryDiffBadgeProps {
    mark?: HistoryDiffMark;
}

/**
 * Small "Added" / "Changed" / "Removed in Modified" tag shown on a wizard card while
 * comparing academic year versions. Shows nothing when the item has no difference.
 */
export default function HistoryDiffBadge({ mark }: HistoryDiffBadgeProps) {
    if (!mark) {
        return null;
    }

    return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-200/80 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 shrink-0">
            {mark.label}
        </span>
    );
}

interface HistoryDiffNoteProps {
    mark?: HistoryDiffMark;
}

/**
 * The other version's value under a Step 1 field that differs, e.g. "Original: 2026-06-01".
 */
export function HistoryDiffNote({ mark }: HistoryDiffNoteProps) {
    if (!mark?.note) {
        return null;
    }

    return (
        <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 font-medium">
            {mark.note}
        </p>
    );
}