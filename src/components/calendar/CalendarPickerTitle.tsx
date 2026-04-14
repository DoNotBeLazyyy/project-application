import { SizeType } from '@type/common/calendar.type';

export interface CalendarPickerTitleProps {
    // The currently selected date displayed in the calendar title
    date: Date;

    // Optional size variant of the title (e.g., SMALL or BIG)
    size?: SizeType;
}

/**
 * CalendarPickerTitle
 *
 * A header title component for the calendar that displays the currently selected
 * month and year. It supports different size variants to adjust typography.
 *
 * @example
 * <CalendarPickerTitle
 *   date={new Date()}
 *   size="BIG"
 * />
 */
export default function CalendarPickerTitle({
    date,
    size = 'SMALL'
}: CalendarPickerTitleProps) {
    return (
        <div
            className={
                size === 'BIG'
                    ? 'font-(--mui-tokens-fontWeight-bold) text-(length:--mui-tokens-fontSize-h3) leading-(--mui-tokens-spacing-9) align-middle text-(--mui-tokens-color-neutral-900)'
                    : 'font-(--mui-tokens-fontWeight-bold) text-(length:--mui-tokens-fontSize-lg) leading-(--mui-tokens-spacing-7) align-middle text-(--mui-tokens-color-neutral-900)'
            }
        >
            {date.toLocaleString('default', {
                month: 'long',
                year: 'numeric'
            })}
        </div>
    );
}