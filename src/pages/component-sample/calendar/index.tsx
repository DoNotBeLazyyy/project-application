import Calendar from '@components/calendar/Calendar';
import CalendarCellDate from '@components/calendar/CalendarCellDate';
import CalendarPicker from '@components/calendar/CalendarPicker';
import { changeMonthUtil } from '@utils/calendar.util';
import { useState } from 'react';

export default function CalendarSample() {
    const [date, setDate] = useState<Date>(new Date());

    function handleChangeMonth(direction: number) {
        setDate((prev) => changeMonthUtil(prev, direction));
    }

    return (
        <div className="flex flex-col gap-10 items-center justify-center min-h-screen">
            <div className="flex justify-center gap-1">
                <CalendarCellDate day={1} isToday />
                <CalendarCellDate day={2} />
            </div>
            <div className="flex justify-center gap-10">
                <CalendarPicker
                    calendarPickerAlign="RIGHT"
                    calendarPickerSize="BIG"
                    date={date}
                    onChangeMonth={handleChangeMonth}
                />
                <CalendarPicker
                    calendarPickerAlign="CENTER"
                    calendarPickerSize="BIG"
                    date={date}
                    onChangeMonth={handleChangeMonth}
                />
                <CalendarPicker
                    calendarPickerAlign="LEFT"
                    calendarPickerSize="SMALL"
                    date={date}
                    onChangeMonth={handleChangeMonth}
                />
            </div>
            <div className="flex flex-col justify-center">
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