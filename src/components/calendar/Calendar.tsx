import CalendarCell from '@components/calendar/CalendarCell';
import CalendarPicker, { CalendarPickerProps } from '@components/calendar/CalendarPicker';
import CalendarSearchInput from '@components/calendar/CalendarSearchInput';
import CalendarTitle from '@components/calendar/CalendarTitle';
import CalendarWeekDays from '@components/calendar/CalendarWeekDays';
import { ChangeEventInputElement } from '@type/common.type';
import { CalendarDay } from '@type/common/calendar.type';
import { changeMonthUtil, getCalendarDays } from '@utils/calendar.util';
import { classMerge } from '@utils/css.util';
import { useState } from 'react';

interface CalendarProps extends Omit<CalendarPickerProps, 'date' | 'onChangeMonth'> {
    // Main title displayed above the calendar
    title: string;

    // Subtitle displayed below the title
    subtitle: string;
}

/**
 * Calendar
 *
 * A reusable calendar component that displays a monthly view, allows
 * changing months, and supports searching by month/year. Handles
 * internal date state and highlights the current month.
 *
 * @example
 * <Calendar
 *  title="My Calendar"
 *  subtitle="April 2026"
 * />
 */
export default function Calendar({
    calendarPickerAlign,
    calendarPickerSize,
    title,
    subtitle
}: CalendarProps) {
    const [date, setDate] = useState<Date>(new Date()); // Current selected date state, initialized to today
    const [searchValue, setSearchValue] = useState(''); // Input value for a date search or text search
    const year = date.getFullYear(); // Extract the year from the selected date
    const month = date.getMonth(); // Extract the month (0-11) from the selected date
    const days: CalendarDay[] = getCalendarDays(year, month); // Generate all days for the current month as CalendarDay objects
    const needsSixRows = days.length === 42; // Determine if the calendar layout requires 6 rows (42 cells)
    const gridRowClass = needsSixRows
        ? 'grid-rows-6'
        : 'grid-rows-5'; // Set CSS class for grid rows

    /**
     * Changes the current month by a given direction.
     *
     * @param direction - Number of months to move: 1 for next month, -1 for previous month.
     */
    function handleChangeMonth(direction: number) {
        setDate((prev) => changeMonthUtil(prev, direction));
    }

    /**
     * Handles date search from the input.
     */
    function handleSearch() {
        if (!searchValue) {
            return;
        }

        const parsedDate = new Date(searchValue);

        if (!isNaN(parsedDate.getTime())) {
            setDate(new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1));
        }
        else {
            alert('Invalid date format. Try "2026-04" or "April 2026"'); {/* TODO */}
        }
    }

    /**
     * Updates the search input state when the user types.
     *
     * @param event - The input change event
     */
    function handleInputChange(event: ChangeEventInputElement) {
        setSearchValue(event.target.value);
    }

    return (
        <div className="bg-[var(--mui-tokens-color-common-white)] flex flex-col gap-[var(--mui-tokens-spacing-5)] h-full min-w-[67.5rem] mx-auto p-[var(--mui-tokens-spacing-6)] rounded-[var(--mui-tokens-radius-lg)] shadow">
            <div className="grid grid-cols-6 items-center mx-[var(--mui-tokens-spacing-6)] my-[var(--mui-tokens-spacing-5)]">
                <div className="col-span-2">
                    <CalendarTitle
                        subtitle = {subtitle}
                        title = {title}
                    />
                </div>
                <div className="col-span-2 flex items-center justify-center">
                    <CalendarPicker
                        calendarPickerAlign={calendarPickerAlign}
                        calendarPickerSize={calendarPickerSize}
                        date={date}
                        onChangeMonth={handleChangeMonth}
                    />
                </div>
                {/* TODO: when the search component is ready and make it props */}
                <div className="flex gap-[var(--mui-tokens-spacing-4)] col-span-2 relative">
                    <CalendarSearchInput
                        value={searchValue}
                        onChange={handleInputChange}
                        onSearch={handleSearch}
                    />
                </div>
            </div>
            <CalendarWeekDays />
            <div
                className={
                    classMerge(
                        'gap-[var(--mui-tokens-spacing-3)] grid grid-cols-7',
                        gridRowClass
                    )
                }
            >
                {days.map((day, index) => (
                    <CalendarCell
                        day={day}
                        key={index}
                    />
                ))}
            </div>
        </div>
    );
}