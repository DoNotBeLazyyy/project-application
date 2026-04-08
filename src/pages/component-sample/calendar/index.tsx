import Calendar from '@components/calendar/Calendar';
import CalendarCellDate from '@components/calendar/CalendarCellDate';
import CalendarPicker from '@components/calendar/CalendarPicker';
import { useState } from 'react';

export default function CalendarSample() {
    const [date, setDate] = useState<Date>(new Date());
    const year = date.getFullYear();
    const month = date.getMonth();

    function changeMonth(direction: number) {
        setDate(new Date(year, month + direction, 1));
    }

    return (
        <div className="flex flex-col gap-10 items-center justify-center min-h-screen">
            <div className="flex justify-center gap-1">
                <CalendarCellDate day={1} isToday />
                <CalendarCellDate day={2} />
            </div>
            <div className="flex justify-center gap-10">
                <CalendarPicker
                    calendarPickerAlign="LEFT"
                    calendarPickerSize="SMALL"
                    date={date}
                    onChangeMonth={changeMonth}
                />
                <CalendarPicker
                    calendarPickerAlign="LEFT"
                    calendarPickerSize="BIG"
                    date={date}
                    onChangeMonth={changeMonth}
                />
                <CalendarPicker
                    calendarPickerAlign="RIGHT"
                    calendarPickerSize="SMALL"
                    date={date}
                    onChangeMonth={changeMonth}
                />
            </div>
            <div className="flex flex-col justify-center gap-[999px]">
                <Calendar
                    calendarPickerAlign={'CENTER'}
                    calendarPickerSize={'BIG'}
                    subtitle="Employee Leave & Request Histort"
                    title="Holidays"
                />
            </div>
        </div>
    );
}