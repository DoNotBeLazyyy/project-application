import CalendarCell from '@components/calendar/CalendarCell';
import CalendarPicker, { CalendarPickerProps } from '@components/calendar/CalendarPicker';
import CalendarTitle from '@components/calendar/CalendarTitle';
import CalendarWeekDays from '@components/calendar/CalendarWeekDays';
import MagnifyingGlassIcon from '@components/icons/MagnifyingGlassIcon';
import { ChangeEventInputElement } from '@type/common.type';
import { CalendarDay } from '@type/common/calendar.type';
import { getCalendarDays } from '@utils/calendar.util';
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

    /**
     * Changes the current month by a given direction.
     *
     * @param direction - Number of months to move: 1 for next month, -1 for previous month.
     */
    function changeMonth(direction: number) {
        setDate(new Date(year, month + direction, 1));
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
        <div className="bg-[#FFFFFF] flex flex-col gap-[16px] h-full min-w-[1080px] mx-auto p-[20px] rounded-[16px] shadow">
            <div className="grid grid-cols-6 items-center mx-[20px] my-[16px]">
                <div className="col-span-2">
                    <CalendarTitle
                        subtitle = {subtitle}
                        title = {title}
                    />
                </div>
                <div className="col-span-2 flex gap-4 items-center justify-center">
                    <CalendarPicker
                        calendarPickerAlign={calendarPickerAlign}
                        calendarPickerSize={calendarPickerSize}
                        date={date}
                        onChangeMonth={changeMonth}
                    />
                </div>
                {/* TODO: when the search component is ready and make it props */}
                <div className="col-span-2 relative">
                    <input
                        className="border rounded-[999px] pl-[48px] pr-[12px] py-[8px] text-[14px] h-[36px] w-full focus:outline-none focus:ring-0 focus:border-inherit"
                        placeholder="YYYY-MM or April 2026"
                        value={searchValue}
                        onChange={handleInputChange}
                    />

                    <button
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-1"
                        onClick={handleSearch}
                    >
                        <MagnifyingGlassIcon className="w-[20px] h-[20px] text[#18181B]" />
                    </button>
                </div>
            </div>
            <CalendarWeekDays />
            <div
                className={
                    classMerge(
                        'gap-[8px] grid grid-cols-7',
                        needsSixRows
                            ? 'grid-rows-6'
                            : 'grid-rows-5'
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