import Button, { ButtonProps } from '@mui/material/Button';
import { ReactNode } from 'react';

interface CalendarNavButtonProps extends ButtonProps {
    // The content to be displayed inside the button, typically an icon or text.
    children: ReactNode;

    // Callback function that is called when the button is clicked, used for navigating between months in the calendar.
    onClick: VoidFunction;
}

/**
 * CalendarContent
 *
 * A reusable component for calendar navigation. Displays previous/next month buttons
 * and an optional title (e.g., current month/year) that can be positioned relative to the buttons.
 *
 * @example
 * <CalendarContent
 *   title={<div>April 2026</div>}
 *   titlePosition="MIDDLE"
 *   onPrev={handlePrevMonth}
 *   onNext={handleNextMonth}
 * />
 */
export default function CalendarNavButton({
    children,
    onClick
}: CalendarNavButtonProps) {
    return (
        <Button
            sx={{
                minWidth: '1.25rem',
                padding: 0,
                '&:hover': {
                    backgroundColor: 'transparent',
                    boxShadow: 'none'
                }
            }}
            onClick={onClick}
        >
            {children}
        </Button>
    );
}