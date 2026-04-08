import CalendarNavButton from '@components/calendar/CalendarNavButton';
import GreaterthanIcon from '@components/icons/GreaterthanIcon';
import LessthanIcon from '@components/icons/LessthanIcon';
import { CalendarTitlePosition } from '@type/common.type';
import { ReactNode } from 'react';

interface CalendarContentProps {
    // Title to be displayed in the calendar header, typically showing the current month and year
    title: ReactNode;

    // Position of the title relative to the navigation buttons: LEFT, MIDDLE, or RIGHT
    titlePosition?: CalendarTitlePosition;

    // Callback triggered when the next month button is clicked
    onNext: () => void;

    // Callback triggered when the previous month button is clicked
    onPrev: () => void;
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

    if (titlePosition === 'RIGHT' || titlePosition === 'LEFT') {
        return (
            <div className="flex items-center gap-[8px]">
                {titlePosition === 'RIGHT' && title && <div>{title}</div>}
                <div className="flex gap-[16px] items-center">
                    <CalendarNavButton onClick={onPrev}>
                        <LessthanIcon className="text-[#71717A]" />
                    </CalendarNavButton>
                    <CalendarNavButton onClick={onNext}>
                        <GreaterthanIcon className="text-[#71717A]" />
                    </CalendarNavButton>
                </div>
                {titlePosition === 'LEFT' && title && <div>{title}</div>}
            </div>
        );
    }

    return (
        <div className="flex gap-[16px] items-center">
            <CalendarNavButton onClick={onPrev}>
                <LessthanIcon className="text-[#71717A]" />
            </CalendarNavButton>
            {title && <div>{title}</div>}
            <CalendarNavButton onClick={onNext}>
                <GreaterthanIcon className="text-[#71717A]" />
            </CalendarNavButton>
        </div>
    );
}