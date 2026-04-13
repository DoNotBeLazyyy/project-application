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
    const { t } = useTranslation(); // Translation hook
    const days = [
        t('sun'),
        t('mon'),
        t('tue'),
        t('wed'),
        t('thu'),
        t('fri'),
        t('sat')
    ]; // Array of weekday abbreviations

    return (
        <div
            className={
                classMerge(
                    'font-[var(--mui-tokens-fontWeight-bold)] grid grid-cols-7 leading-[var(--mui-tokens-spacing-6)] mb-[var(--mui-tokens-spacing-4)] text-[length:var(--mui-tokens-fontSize-nm)] text-center text-[var(--mui-tokens-color-neutral-500)]'
                )
            }
        >
            {days.map((d) => (
                <div key={d}>{d}</div>
            ))}
        </div>
    );
}