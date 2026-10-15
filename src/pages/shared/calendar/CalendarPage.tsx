import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import PageLoadingFallback from '@components/loading/PageLoadingFallback';
import {
    ArrowsClockwiseIcon,
    CalendarBlankIcon,
    CalendarDotsIcon,
    CaretLeftIcon,
    CaretRightIcon,
    ClockIcon,
    FunnelIcon,
    GridFourIcon,
    ListBulletsIcon,
    PlusIcon
} from '@phosphor-icons/react';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { changeMonthUtil } from '@utils/calendar.util';
import { DateTime } from 'luxon';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CalendarActionMenu from './CalendarActionMenu';
import { CalendarAgendaView } from './CalendarAgendaView';
import { CalendarDayView } from './CalendarDayView';
import { CalendarEventDetailModal } from './CalendarEventDetailModal';
import { CalendarMonthView } from './CalendarMonthView';
import { CalendarWeekView } from './CalendarWeekView';
import {
    CALENDAR_CATEGORIES,
    CalendarEventCategory,
    CalendarViewMode,
    UnifiedCalendarEvent
} from './calendar.types';
import { useCalendarData } from './useCalendarData';

export default function CalendarPage() {
    const navigate = useNavigate();

    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
    const [activeCategories, setActiveCategories] = useState<Set<CalendarEventCategory>>(
        new Set(['event', 'academic', 'class', 'assessment', 'holiday'])
    );
    const [selectedEvent, setSelectedEvent] = useState<UnifiedCalendarEvent | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const { events, isLoading, reload, currentRole } = useCalendarData(currentDate);

    // Filter events by selected category
    const filteredEvents = useMemo(() => {
        return events.filter((ev) => activeCategories.has(ev.category));
    }, [events, activeCategories]);

    // Role-specific subtitle
    const roleSubtitle = useMemo(() => {
        switch (currentRole) {
            case 'Student':
                return 'Track your class timetable, assessment due dates, and campus events in one place.';
            case 'Faculty':
                return 'Manage your instruction schedule, grading deadlines, and institutional activities.';
            case 'Dean':
                return 'Oversee college milestones, loading periods, and campus-wide events.';
            case 'Registrar':
                return 'Monitor enrollment windows, grade submission deadlines, and academic calendar dates.';
            default:
                return 'Centralized institutional calendar, academic terms, and campus events.';
        }
    }, [currentRole]);

    // Handlers for month navigation
    const handlePrev = () => {
        if (viewMode === 'day') {
            const next = new Date(selectedDate);
            next.setDate(next.getDate() - 1);
            setSelectedDate(next);
            setCurrentDate(next);
        } else if (viewMode === 'week') {
            const next = new Date(currentDate);
            next.setDate(next.getDate() - 7);
            setCurrentDate(next);
            setSelectedDate(next);
        } else {
            setCurrentDate((prev) => changeMonthUtil(prev, -1));
        }
    };

    const handleNext = () => {
        if (viewMode === 'day') {
            const next = new Date(selectedDate);
            next.setDate(next.getDate() + 1);
            setSelectedDate(next);
            setCurrentDate(next);
        } else if (viewMode === 'week') {
            const next = new Date(currentDate);
            next.setDate(next.getDate() + 7);
            setCurrentDate(next);
            setSelectedDate(next);
        } else {
            setCurrentDate((prev) => changeMonthUtil(prev, 1));
        }
    };

    const toggleCategory = (catId: CalendarEventCategory) => {
        setActiveCategories((prev) => {
            const next = new Set(prev);
            if (next.has(catId)) {
                // Keep at least one category checked
                if (next.size > 1) {
                    next.delete(catId);
                }
            } else {
                next.add(catId);
            }
            return next;
        });
    };

    const handleSelectAllCategories = () => {
        setActiveCategories(new Set(['event', 'academic', 'class', 'assessment', 'holiday']));
    };

    const handleOpenEventModal = (event: UnifiedCalendarEvent) => {
        setSelectedEvent(event);
        setIsDetailModalOpen(true);
    };

    const handleCloseEventModal = () => {
        setIsDetailModalOpen(false);
        setSelectedEvent(null);
    };

    const handleDayViewJump = (date: Date) => {
        setSelectedDate(date);
        setCurrentDate(date);
        setViewMode('day');
    };

    const VIEW_MODE_LABELS: Record<CalendarViewMode, { label: string; icon: React.ReactNode }> = {
        month: {
            label: 'Month View',
            icon: <GridFourIcon className="text-blue-600" size={14} weight="bold" />
        },
        week: {
            label: 'Week View',
            icon: <CalendarDotsIcon className="text-blue-600" size={14} weight="bold" />
        },
        day: {
            label: 'Day View',
            icon: <ClockIcon className="text-blue-600" size={14} weight="bold" />
        },
        agenda: {
            label: 'Agenda View',
            icon: <ListBulletsIcon className="text-blue-600" size={14} weight="bold" />
        }
    };

    const pickerDateValue = useMemo(() => {
        return DateTime.fromJSDate(viewMode === 'day' ? selectedDate : currentDate);
    }, [viewMode, selectedDate, currentDate]);

    const handlePickerChange = (val: DateTime | null) => {
        if (!val || !val.isValid) return;
        const nextDate = val.toJSDate();
        setCurrentDate(nextDate);
        setSelectedDate(nextDate);
    };

    const canCreateEvents = currentRole === 'Admin' || currentRole === 'Dean' || currentRole === 'Registrar' || currentRole === 'Faculty';

    return (
        <CommonCard
            className="flex flex-col min-h-full md:h-full w-full overflow-visible md:overflow-hidden"
            infoContent={roleSubtitle}
            cardHeaderProps={{
                title: (
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                            <CalendarBlankIcon className="sm:hidden" size={18} weight="duotone" />
                            <CalendarBlankIcon className="hidden sm:inline" size={22} weight="duotone" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-base sm:text-xl font-bold text-(--mui-palette-text-primary) tracking-tight m-0 truncate">
                                Academic & Campus Calendar
                            </h1>
                            <p className="text-xs text-(--mui-palette-text-secondary) mt-0.5 m-0 hidden sm:block">
                                {roleSubtitle}
                            </p>
                        </div>
                    </div>
                ),
                action: (
                    <div className="flex items-center gap-2 pt-0.5">
                        <button
                            aria-label="Refresh calendar data"
                            className="hidden sm:flex p-2 rounded-xl border border-(--mui-palette-divider) text-(--mui-palette-text-secondary) hover:text-(--mui-palette-text-primary) hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="Reload Calendar"
                            type="button"
                            onClick={() => reload()}
                        >
                            <ArrowsClockwiseIcon className={isLoading ? 'animate-spin' : ''} size={18} />
                        </button>

                        {canCreateEvents && (
                            <div className="hidden sm:block">
                                <CommonButton
                                    color="primary"
                                    size="small"
                                    startIcon={<PlusIcon size={16} />}
                                    variant="contained"
                                    onClick={() => {
                                        const rolePath = currentRole.toLowerCase();
                                        navigate(`/${rolePath}/event-management/new`);
                                    }}
                                >
                                    Create Event
                                </CommonButton>
                            </div>
                        )}

                        <CalendarActionMenu
                            activeCategories={activeCategories}
                            canCreateEvents={canCreateEvents}
                            isLoading={isLoading}
                            viewMode={viewMode}
                            onCreateEvent={() => {
                                const rolePath = currentRole.toLowerCase();
                                navigate(`/${rolePath}/event-management/new`);
                            }}
                            onReload={reload}
                            onSelectAllCategories={handleSelectAllCategories}
                            onSelectViewMode={setViewMode}
                            onToggleCategory={toggleCategory}
                        />
                    </div>
                )
            }}
        >
            {/* Navigation & View Toggle Toolbar + Filter Row */}
            <div className="border-t border-b border-(--mui-palette-divider) bg-neutral-50/60 dark:bg-neutral-800/30 px-3 py-2 sm:p-4 flex flex-col gap-2.5">
                {/* Date Navigation & View Mode Switcher */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-3">
                    {/* Date Navigation with DatePicker wrapped by arrows & View Mode Label */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between w-full md:w-auto gap-2">
                        {/* Left & Right arrows wrapping DatePicker */}
                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                            <button
                                aria-label="Previous"
                                className="p-1.5 sm:p-2 rounded-lg border border-(--mui-palette-divider) text-(--mui-palette-text-secondary) hover:text-(--mui-palette-text-primary) hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
                                type="button"
                                onClick={handlePrev}
                            >
                                <CaretLeftIcon size={16} />
                            </button>

                            <div className="w-[135px] sm:w-[165px]">
                                <LocalizationProvider dateAdapter={AdapterLuxon}>
                                    <DatePicker
                                        format={viewMode === 'month' || viewMode === 'agenda' ? 'MMMM yyyy' : 'MMM d, yyyy'}
                                        slotProps={{
                                            actionBar: {
                                                actions: ['today', 'accept']
                                            },
                                            textField: {
                                                size: 'small',
                                                sx: {
                                                    '& .MuiInputBase-root': {
                                                        height: '34px !important',
                                                        maxHeight: '34px !important',
                                                        fontSize: '0.8125rem !important',
                                                        fontWeight: 600,
                                                        paddingRight: '4px !important',
                                                        paddingLeft: '6px !important',
                                                        borderRadius: '10px',
                                                        backgroundColor: 'var(--mui-palette-background-paper)'
                                                    },
                                                    '& .MuiInputBase-input': {
                                                        padding: '0 !important',
                                                        textAlign: 'center',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8125rem !important',
                                                        fontWeight: 600,
                                                        color: 'var(--mui-palette-text-primary)'
                                                    },
                                                    '& .MuiInputAdornment-root .MuiIconButton-root': {
                                                        padding: '2px !important',
                                                        width: '24px !important',
                                                        height: '24px !important',
                                                        color: 'var(--mui-palette-primary-main)'
                                                    },
                                                    '& .MuiInputAdornment-root svg': {
                                                        width: '16px !important',
                                                        height: '16px !important'
                                                    }
                                                }
                                            }
                                        }}
                                        value={pickerDateValue}
                                        onChange={handlePickerChange}
                                    />
                                </LocalizationProvider>
                            </div>

                            <button
                                aria-label="Next"
                                className="p-1.5 sm:p-2 rounded-lg border border-(--mui-palette-divider) text-(--mui-palette-text-secondary) hover:text-(--mui-palette-text-primary) hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
                                type="button"
                                onClick={handleNext}
                            >
                                <CaretRightIcon size={16} />
                            </button>
                        </div>

                        {/* View Mode Label & Active Filter indicator */}
                        <div className="flex items-center gap-2">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800/80 text-(--mui-palette-text-primary) border border-(--mui-palette-divider) shrink-0">
                                {VIEW_MODE_LABELS[viewMode].icon}
                                <span>{VIEW_MODE_LABELS[viewMode].label}</span>
                            </div>

                            {activeCategories.size < CALENDAR_CATEGORIES.length && (
                                <span className="md:hidden text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                                    Filtered ({activeCategories.size}/{CALENDAR_CATEGORIES.length})
                                </span>
                            )}
                        </div>
                    </div>

                    {/* View Switcher Buttons (Desktop) */}
                    <div className="hidden md:flex items-center bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl w-full md:w-auto justify-center">
                        <button
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                viewMode === 'month'
                                    ? 'bg-white dark:bg-neutral-900 text-(--mui-palette-text-primary) shadow-2xs'
                                    : 'text-(--mui-palette-text-secondary) hover:text-(--mui-palette-text-primary)'
                            }`}
                            type="button"
                            onClick={() => setViewMode('month')}
                        >
                            <GridFourIcon size={15} />
                            Month
                        </button>
                        <button
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                viewMode === 'week'
                                    ? 'bg-white dark:bg-neutral-900 text-(--mui-palette-text-primary) shadow-2xs'
                                    : 'text-(--mui-palette-text-secondary) hover:text-(--mui-palette-text-primary)'
                            }`}
                            type="button"
                            onClick={() => setViewMode('week')}
                        >
                            <CalendarDotsIcon size={15} />
                            Week
                        </button>
                        <button
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                viewMode === 'day'
                                    ? 'bg-white dark:bg-neutral-900 text-(--mui-palette-text-primary) shadow-2xs'
                                    : 'text-(--mui-palette-text-secondary) hover:text-(--mui-palette-text-primary)'
                            }`}
                            type="button"
                            onClick={() => setViewMode('day')}
                        >
                            <ClockIcon size={15} />
                            Day
                        </button>
                        <button
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                viewMode === 'agenda'
                                    ? 'bg-white dark:bg-neutral-900 text-(--mui-palette-text-primary) shadow-2xs'
                                    : 'text-(--mui-palette-text-secondary) hover:text-(--mui-palette-text-primary)'
                            }`}
                            type="button"
                            onClick={() => setViewMode('agenda')}
                        >
                            <ListBulletsIcon size={15} />
                            Agenda
                        </button>
                    </div>
                </div>

                {/* Filter Categories Chips (Desktop) */}
                <div className="hidden md:flex items-center gap-2 flex-wrap text-xs pt-1">
                    <span className="font-semibold text-(--mui-palette-text-secondary) flex items-center gap-1 mr-1">
                        <FunnelIcon size={14} /> Filter:
                    </span>
                    <button
                        className={`px-2.5 py-1 rounded-full font-semibold border transition-all cursor-pointer ${
                            activeCategories.size === CALENDAR_CATEGORIES.length
                                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white'
                                : 'bg-white dark:bg-neutral-800 text-(--mui-palette-text-secondary) border-(--mui-palette-divider) hover:bg-neutral-50'
                        }`}
                        type="button"
                        onClick={handleSelectAllCategories}
                    >
                        All Items
                    </button>
                    {CALENDAR_CATEGORIES.map((cat) => {
                        const isChecked = activeCategories.has(cat.id);
                        return (
                            <button
                                key={cat.id}
                                className={`px-2.5 py-1 rounded-full font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                                    isChecked
                                        ? cat.bgClass
                                        : 'bg-white/50 dark:bg-neutral-800/50 text-neutral-400 border-(--mui-palette-divider) opacity-60 hover:opacity-90'
                                }`}
                                type="button"
                                onClick={() => toggleCategory(cat.id)}
                            >
                                <span className={`w-2 h-2 rounded-full ${isChecked ? cat.dotClass : 'bg-neutral-300'}`} />
                                {cat.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Calendar View Area - Full Width */}
            <div className="flex-1 min-h-0 md:overflow-auto p-2 sm:p-4 md:p-6">
                {isLoading && events.length === 0 ? (
                    <div className="p-16 flex justify-center">
                        <PageLoadingFallback />
                    </div>
                ) : (
                    <>
                        {viewMode === 'month' && (
                            <CalendarMonthView
                                currentDate={currentDate}
                                events={filteredEvents}
                                selectedDate={selectedDate}
                                onSelectDate={setSelectedDate}
                                onSelectEvent={handleOpenEventModal}
                                onViewDay={handleDayViewJump}
                            />
                        )}
                        {viewMode === 'week' && (
                            <CalendarWeekView
                                currentDate={currentDate}
                                events={filteredEvents}
                                selectedDate={selectedDate}
                                onSelectDate={setSelectedDate}
                                onSelectEvent={handleOpenEventModal}
                            />
                        )}
                        {viewMode === 'day' && (
                            <CalendarDayView
                                date={selectedDate}
                                events={filteredEvents}
                                onSelectEvent={handleOpenEventModal}
                            />
                        )}
                        {viewMode === 'agenda' && (
                            <CalendarAgendaView
                                events={filteredEvents}
                                onSelectEvent={handleOpenEventModal}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Event Detail Modal */}
            <CalendarEventDetailModal
                event={selectedEvent}
                open={isDetailModalOpen}
                onClose={handleCloseEventModal}
            />
        </CommonCard>
    );
}
