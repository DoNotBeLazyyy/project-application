import { classMerge } from '@utils/css.util';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarWeekDays() {
    return (
        <div
            className={
                classMerge(
                    'font-(--mui-tokens-fontWeight-bold) grid grid-cols-7 leading-(--mui-tokens-spacing-6) mb-(--mui-tokens-spacing-4) text-(length:--mui-tokens-fontSize-nm) text-center text-(--mui-tokens-color-neutral-500)'
                )
            }
        >
            {WEEK_DAYS.map((day) => (
                <div key={day}>
                    {day}
                </div>
            ))}
        </div>
    );
}