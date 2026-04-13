import CalendarContent from '@components/calendar/CalendarContent';
import { AlignType, SizeType } from '@type/common/calendar.type';
import { classMerge } from '@utils/css.util';

export interface CalendarPickerProps {
    // Alignment of the calendar picker: LEFT, CENTER, or RIGHT
    calendarPickerAlign?: AlignType;

    // Size of the calendar picker: SMALL or BIG
    calendarPickerSize?: SizeType;

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
    calendarPickerAlign = 'CENTER',
    calendarPickerSize = 'SMALL',
    date,
    onChangeMonth
}: CalendarPickerProps) {
    const isBIG = calendarPickerSize === 'BIG'; // Flag for large size variant
    const textSize = isBIG
        ? 'font-heading font-[700] text-[32px] leading-[36px] tracking-normal align-middle text-[#18181B]'
        : 'font-heading font-[700] text-[20px] leading-[24px] tracking-normal align-middle text-[#18181B]'; // Adjust title font size based on picker size
    const containerClasses = classMerge(
        'flex items-center gap-[20px]',
        {
            'justify-center': calendarPickerAlign === 'CENTER',
            'justify-start': calendarPickerAlign === 'LEFT',
            'justify-end': calendarPickerAlign === 'RIGHT'
        }
    ); // Classes for container alignment based on prop
    const title = (
        <div className={textSize}>
            {date.toLocaleString('default', {
                month: 'long',
                year: 'numeric'
            })}
        </div>
    ); // Displays the current month and year

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
            {calendarPickerAlign === 'LEFT' && (
                <>
                    <CalendarContent
                        title={title}
                        titlePosition="RIGHT"
                        onNext={handleNextMonth}
                        onPrev={handlePrevMonth}
                    />
                </>
            )}
            {calendarPickerAlign === 'CENTER' && (
                <>
                    <CalendarContent
                        title={title}
                        onNext={handleNextMonth}
                        onPrev={handlePrevMonth}
                    />
                </>
            )}
            {calendarPickerAlign === 'RIGHT' && (
                <>
                    <CalendarContent
                        title={title}
                        titlePosition="LEFT"
                        onNext={handleNextMonth}
                        onPrev={handlePrevMonth}
                    />
                </>
            )}
        </div>
    );
}