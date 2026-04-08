import { classMerge } from '@utils/css.util';
import { useTranslation } from 'react-i18next';

/**
 * CalendarWeekDays
 *
 * Renders the weekday headers (Sun–Sat) for the calendar grid.
 * Each day is displayed in a fixed-width column and styled for readability.
 *
 * @example
 * <CalendarWeekDays />
 */
export default function CalendarWeekDays() {
    const { t } = useTranslation();
    const days = [
        t('Sun'),
        t('Mon'),
        t('Tue'),
        t('Wed'),
        t('Thu'),
        t('Fri'),
        t('Sat')
    ]; // Array of weekday abbreviations

    return (
        <div
            className={
                classMerge(
                    'font-[700] grid grid-cols-7 leading-[20px] mb-[12px] text-[16px] text-center text-[#71717A]'
                )
            }
        >
            {days.map((d) => (
                <div key={d}>{d}</div>
            ))}
        </div>
    );
}