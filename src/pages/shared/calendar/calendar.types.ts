export type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';

export type CalendarEventCategory = 'event' | 'academic' | 'class' | 'assessment' | 'holiday';

export interface CalendarCategoryOption {
    id: CalendarEventCategory;
    label: string;
    color: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    dotClass: string;
}

export interface UnifiedCalendarEvent {
    id: string;
    title: string;
    description?: string | null;
    location?: string | null;
    start: Date;
    end: Date;
    allDay: boolean;
    category: CalendarEventCategory;
    colorTag?: string;
    metadata?: {
        courseCode?: string;
        sectionCode?: string;
        assessmentType?: string;
        enrollmentId?: string;
        sectionId?: string;
        room?: string | null;
        audience?: string | null;
        // Campus events open the shared event detail modal by this id
        eventId?: string;
        targetUrl?: string;
        authorName?: string | null;
        rawStatus?: string | null;
    };
}

export const CALENDAR_CATEGORIES: CalendarCategoryOption[] = [
    {
        id: 'event',
        label: 'Campus Events',
        color: '#2563EB',
        bgClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        textClass: 'text-blue-700 dark:text-blue-300',
        borderClass: 'border-blue-200 dark:border-blue-800',
        dotClass: 'bg-blue-500'
    },
    {
        id: 'academic',
        label: 'Academic Deadlines',
        color: '#E11D48',
        bgClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        textClass: 'text-rose-700 dark:text-rose-300',
        borderClass: 'border-rose-200 dark:border-rose-800',
        dotClass: 'bg-rose-500'
    },
    {
        id: 'class',
        label: 'Class Schedule',
        color: '#6366F1',
        bgClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        textClass: 'text-indigo-700 dark:text-indigo-300',
        borderClass: 'border-indigo-200 dark:border-indigo-800',
        dotClass: 'bg-indigo-500'
    },
    {
        id: 'assessment',
        label: 'Assessments & Due Dates',
        color: '#D97706',
        bgClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        textClass: 'text-amber-700 dark:text-amber-300',
        borderClass: 'border-amber-200 dark:border-amber-800',
        dotClass: 'bg-amber-500'
    },
    {
        id: 'holiday',
        label: 'Holidays & Breaks',
        color: '#059669',
        bgClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        textClass: 'text-emerald-700 dark:text-emerald-300',
        borderClass: 'border-emerald-200 dark:border-emerald-800',
        dotClass: 'bg-emerald-500'
    }
];