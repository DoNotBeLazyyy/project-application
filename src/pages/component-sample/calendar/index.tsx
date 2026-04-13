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
        <div className="flex flex-col gap-[var(--mui-tokens-spacing-9)] items-center justify-center min-h-screen">
            <div className="flex justify-center gap-[var(--mui-tokens-spacing-2)]">
                <CalendarCellDate day={1} isToday />
                <CalendarCellDate day={2} />
            </div>
            <div className="flex justify-center gap-[var(--mui-tokens-spacing-9)]">
                <CalendarPicker
                    calendarPickerAlign="RIGHT"
                    date={date}
                    size="SMALL"
                    onChangeMonth={handleChangeMonth}
                />
                <CalendarPicker
                    calendarPickerAlign="CENTER"
                    date={date}
                    size="BIG"
                    onChangeMonth={handleChangeMonth}
                />
                <CalendarPicker
                    calendarPickerAlign="LEFT"
                    date={date}
                    size="SMALL"
                    onChangeMonth={handleChangeMonth}
                />
            </div>
            <div className="flex flex-col justify-center">
                <Calendar
                    calendarPickerAlign={'CENTER'}
                    size={'BIG'}
                    subtitle="Employee Leave & Request Histort"
                    title="Holidays"
                />
            </div>
        </div>
    );
}