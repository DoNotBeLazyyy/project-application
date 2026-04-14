export interface CalendarDay {
    // Numeric day of the month (1–31)
    day: number;

    // Full date string in YYYY-MM-DD format
    date: string;

    // Indicates whether the day belongs to the currently displayed month
    isCurrentMonth: boolean;

    // Indicates whether this day is today
    isToday: boolean;
}

// Calendar props
export type AlignType = 'LEFT' | 'CENTER' | 'RIGHT';
export type SizeType = 'BIG' | 'SMALL';
export type CalendarTitlePosition = 'RIGHT' | 'MIDDLE' | 'LEFT';