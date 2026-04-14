import CalendarNavButton from '@components/calendar/CalendarNavButton';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { CalendarTitlePosition } from '@type/common/calendar.type';
import { ReactNode } from 'react';

interface CalendarContentProps {
    // Title to be displayed in the calendar header, typically showing the current month and year
    title: ReactNode;

    // Position of the title relative to the navigation buttons: LEFT, MIDDLE, or RIGHT
    titlePosition?: CalendarTitlePosition;

    // Callback triggered when the next month button is clicked
    onNext: VoidFunction;

    // Callback triggered when the previous month button is clicked
    onPrev: VoidFunction;
}

/**
 * CalendarContent
 *
 * A reusable calendar header component that displays navigation buttons for
 * previous/next months and an optional title (e.g., current month/year).
 * The title can be positioned relative to the navigation buttons.
 *
 * @example
 * <CalendarContent
 *   title={<div>April 2026</div>}
 *   titlePosition="MIDDLE"
 *   onPrev={handlePrevMonth}
 *   onNext={handleNextMonth}
 * />
 */
export default function CalendarContent({
    title,
    titlePosition = 'MIDDLE',
    onPrev,
    onNext
}: CalendarContentProps) {
    const isRight = titlePosition === 'RIGHT'; // True when the title should appear on the right side of the navigation buttons
    const isLeft = titlePosition === 'LEFT'; // True when the title should appear on the left side of the navigation buttons
    const iconClass ='text-[var(--mui-tokens-color-neutral-500)] h-[1.25rem] w-[1.25rem]'; // Shared icon size and neutral color for calendar navigation icons

    return (
        <div className="flex gap-(--mui-tokens-spacing-3) items-center">
            {isRight && title && <div>{title}</div>}
            <div className="flex gap-(--mui-tokens-spacing-5) items-center">
                <CalendarNavButton onClick={onPrev}>
                    <CaretLeftIcon className={iconClass} />
                </CalendarNavButton>
                {!isRight && !isLeft && title && <div>{title}</div>}
                <CalendarNavButton onClick={onNext}>
                    <CaretRightIcon className={iconClass} />
                </CalendarNavButton>
            </div>
            {isLeft && title && <div>{title}</div>}
        </div>
    );
}