import CalendarContent from '@components/calendar/CalendarContent';
import CalendarPickerTitle, { CalendarPickerTitleProps } from '@components/calendar/CalendarPickerTitle';
import { AlignType } from '@type/common/calendar.type';
import { classMerge } from '@utils/css.util';

export interface CalendarPickerProps extends CalendarPickerTitleProps{
    // Alignment of the calendar picker: LEFT, CENTER, or RIGHT
    calendarPickerAlign?: AlignType;

    // Current selected date
    date: Date;

    // Callback triggered when navigating to previous/next month
    onChangeMonth: (direction: number) => void;
}

/**
 * CalendarPicker
 *
 * A header component for the calendar that displays the current month and year,
 * navigation buttons for previous/next month, and supports alignment and size options.
 *
 * @example
 * <CalendarPicker
 *  date={new Date()}
 *  calendarPickerAlign="CENTER"
 *  calendarPickerSize="SMALL"
 *  onChangeMonth={changeMonth}
 * />
 */
export default function CalendarPicker({
    date,
    calendarPickerAlign = 'CENTER',
    size,
    onChangeMonth
}: CalendarPickerProps) {
    const containerClasses = classMerge(
        'flex items-center gap-[var(--mui-tokens-spacing-6)]',
        {
            'justify-center': calendarPickerAlign === 'CENTER',
            'justify-start': calendarPickerAlign === 'LEFT',
            'justify-end': calendarPickerAlign === 'RIGHT'
        }
    );

    /**
     * Handles the click event for the next month button.
     */
    function handleNextMonth() {
        onChangeMonth(1);
    }

    /**
     * Handles the click event for the previous month button.
     */
    function handlePrevMonth() {
        onChangeMonth(-1);
    }

    return (
        <div className={containerClasses}>
            <CalendarContent
                title={
                    <CalendarPickerTitle
                        date={date}
                        size={size}
                    />
                }
                titlePosition={
                    calendarPickerAlign === 'CENTER'
                        ? undefined
                        : calendarPickerAlign === 'LEFT'
                            ? 'RIGHT'
                            : 'LEFT'
                }
                onNext={handleNextMonth}
                onPrev={handlePrevMonth}
            />
        </div>
    );
}