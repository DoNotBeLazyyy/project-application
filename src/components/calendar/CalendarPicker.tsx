import GreaterthanIcon from '@components/icons/GreaterthanIcon';
import LessthanIcon from '@components/icons/LessthanIcon';
import Button from '@mui/material/Button';
import { AlignType, SizeType } from '@type/common.type';
import clsx from 'clsx';

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
 *  onChangeMonth={(dir) => console.log(dir)}
 * />
 */
export default function CalendarPicker({
    calendarPickerAlign = 'CENTER',
    calendarPickerSize = 'SMALL',
    date,
    onChangeMonth
}: CalendarPickerProps) {
    const buttonStyles = {
        minWidth: '20px',
        padding: '0px',
        '&:hover': {
            backgroundColor: '#ffffff',
            boxShadow: 'none'
        }
    }; // Common styles for month navigation buttons
    const isBIG = calendarPickerSize === 'BIG'; // Flag for large size variant
    const textSize = isBIG
        ? 'font-heading font-[700] text-[32px] leading-[36px] tracking-normal align-middle text-[#18181B]'
        : 'font-heading font-[700] text-[20px] leading-[24px] tracking-normal align-middle text-[#18181B]'; // Adjust title font size based on picker size
    const containerClasses = clsx(
        'flex items-center gap-[20px]',
        {
            'justify-center': calendarPickerAlign === 'CENTER',
            'justify-start': calendarPickerAlign === 'LEFT',
            'justify-end': calendarPickerAlign === 'RIGHT'
        }
    ); // Classes for container alignment based on prop
    const leftContent = (
        <Button
            sx={buttonStyles}
            onClick={handlePrevMonth}
        >
            <LessthanIcon className="text-[#71717A]"/>
        </Button>
    ); // Button to navigate to previous month
    const rightContent = (
        <Button
            sx={buttonStyles}
            onClick={handleNextMonth}
        >
            <GreaterthanIcon className="text-[#71717A]"/>
        </Button>
    ); // Button to navigate to next month
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
                    {title}
                    <div className="flex gap-[16px] items-center">
                        {leftContent}
                        {rightContent}
                    </div>
                </>
            )}
            {calendarPickerAlign === 'CENTER' && (
                <>
                    {leftContent}
                    {title}
                    {rightContent}
                </>
            )}
            {calendarPickerAlign === 'RIGHT' && (
                <>
                    <div className="flex gap-[16px] items-center">
                        {leftContent}
                        {rightContent}
                    </div>
                    {title}
                </>
            )}
        </div>
    );
}