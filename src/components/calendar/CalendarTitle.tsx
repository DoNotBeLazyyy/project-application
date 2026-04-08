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
            <div className="font-[700] text-[20px] text-[#18181B]">
                {title}
            </div>
            <div className="text-[12px] text-[#71717A]">
                {subtitle}
            </div>
        </div>
    );
}