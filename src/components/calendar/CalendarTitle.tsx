interface CalendarHeaderProps {
    // Subtitle displayed below the title
    subtitle?: string;

    // Main title displayed above the calendar header
    title?: string;
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
    subtitle,
    title
}: CalendarHeaderProps) {
    return (
        <div>
            <div className="font-(--mui-tokens-fontWeight-bold) text-(--mui-tokens-color-neutral-900) text-(length:--mui-tokens-fontSize-lg)">
                {title}
            </div>
            <div className="text-(--mui-tokens-color-neutral-500) text-(length:--mui-tokens-fontSize-xs)">
                {subtitle}
            </div>
        </div>
    );
}