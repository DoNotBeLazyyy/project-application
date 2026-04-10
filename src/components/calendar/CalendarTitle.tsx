interface CalendarHeaderProps {
    // Main title displayed above the calendar header
    title?: string;

    // Subtitle displayed below the title
    subtitle?: string;
}

/**
 * CalendarTitle
 *
 * Displays the main title and optional subtitle for the calendar header.
 * Useful for labeling the calendar view, e.g., "Holidays" or "Employee Leave".
 *
 * @example
 * <CalendarTitle
 *  title="Holidays"
 *  subtitle="Employee Leave & Requests History"
 * />
 */
export default function CalendarTitle({
    title = 'Holidays',
    subtitle = 'Employee Leave & Requests History'
}: CalendarHeaderProps) {
    return (
        <div>
            <div className="font-[var(--mui-tokens-fontWeight-bold)] text-[length:var(--mui-tokens-fontSize-lg)] text-[var(--mui-tokens-color-neutral-900)]">
                {title}
            </div>
            <div className="text-[length:var(--mui-tokens-fontSize-xs)] text-[var(--mui-tokens-color-neutral-500)]">
                {subtitle}
            </div>
        </div>
    );
}