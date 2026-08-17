import Button, { ButtonProps } from '@mui/material/Button';
import { ReactNode } from 'react';

interface CalendarNavButtonProps extends ButtonProps {
    // The content to be displayed inside the button, typically an icon or text.
    children: ReactNode;

    // Callback function that is called when the button is clicked, used for navigating between months in the calendar.
    onClick: VoidFunction;
}

/**
 * CalendarNavButton
 *
 * A reusable button component for calendar navigation (e.g., previous/next month).
 * Typically used with icons or text as children.
 *
 * @example
 * <CalendarNavButton onClick={handlePrevMonth}>
 *   {"<"}
 * </CalendarNavButton>
 */
export default function CalendarNavButton({
    children,
    onClick
}: CalendarNavButtonProps) {
    return (
        <Button
            sx={{
                backgroundColor: 'transparent',
                minWidth: '1.25rem',
                padding: 0,
                '@media (pointer: coarse)': {
                    minHeight: '2.75rem',
                    minWidth: '2.75rem'
                },
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