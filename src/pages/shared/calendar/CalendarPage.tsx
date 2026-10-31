import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import { CommonDatePicker } from '@components/datepicker/ValidCommonDatepicker';
import PageLoadingFallback from '@components/loading/PageLoadingFallback';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import {
    CALENDAR_CATEGORIES,
    CalendarEventCategory,
    CalendarViewMode,
    UnifiedCalendarEvent
} from '@pages/shared/calendar/calendar.types';
import CalendarActionMenu from '@pages/shared/calendar/CalendarActionMenu';
import { CalendarAgendaView } from '@pages/shared/calendar/CalendarAgendaView';
import { CalendarDayView } from '@pages/shared/calendar/CalendarDayView';
import { CalendarEventDetailModal } from '@pages/shared/calendar/CalendarEventDetailModal';
import { CalendarMonthView } from '@pages/shared/calendar/CalendarMonthView';
import { CalendarWeekView } from '@pages/shared/calendar/CalendarWeekView';
import { useCalendarData } from '@pages/shared/calendar/use-calendar-data';
import {
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
import { changeMonthUtil } from '@utils/calendar.util';
import { DateTime } from 'luxon';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

export default function CalendarPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { pathname } = useLocation();

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
    function handlePrev() {
        if (viewMode === 'day') {
            const next = new Date(selectedDate);
            next.setDate(next.getDate() - 1);
            setSelectedDate(next);
            setCurrentDate(next);
        }
        else if (viewMode === 'week') {
            const next = new Date(currentDate);
            next.setDate(next.getDate() - 7);
            setCurrentDate(next);
            setSelectedDate(next);
        }
        else {
            setCurrentDate((prev) => changeMonthUtil(prev, -1));
        }
    }

    function handleNext() {
        if (viewMode === 'day') {
            const next = new Date(selectedDate);
            next.setDate(next.getDate() + 1);
            setSelectedDate(next);
            setCurrentDate(next);
        }
        else if (viewMode === 'week') {
            const next = new Date(currentDate);
            next.setDate(next.getDate() + 7);
            setCurrentDate(next);
            setSelectedDate(next);
        }
        else {
            setCurrentDate((prev) => changeMonthUtil(prev, 1));
        }
    }

    function toggleCategory(catId: CalendarEventCategory) {
        setActiveCategories((prev) => {
            const next = new Set(prev);
            if (next.has(catId)) {
                // Keep at least one category checked
                if (next.size > 1) {
                    next.delete(catId);
                }
            }
            else {
                next.add(catId);
            }
            return next;
        });
    }

    function handleSelectAllCategories() {
        setActiveCategories(new Set(['event', 'academic', 'class', 'assessment', 'holiday']));
    }

    function handleOpenEventModal(event: UnifiedCalendarEvent) {
        // Campus events open the same detail modal as the dashboard, list and notifications
        if (event.category === 'event' && event.metadata?.eventId) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.set('eventId', event.metadata.eventId);
            setSearchParams(nextParams);
            return;
        }

        setSelectedEvent(event);
        setIsDetailModalOpen(true);
    }

    function handleCloseEventModal() {
        setIsDetailModalOpen(false);
        setSelectedEvent(null);
    }

    function handleDayViewJump(date: Date) {
        setSelectedDate(date);
        setCurrentDate(date);
        setViewMode('day');
    }

    const VIEW_MODE_LABELS: Record<CalendarViewMode, { label: string; icon: React.ReactNode }> = {
        month: {
            label: 'Month View',
            icon: (
                <GridFourIcon
                    className="text-blue-600"
                    size={14}
                    weight="bold"
                />
            )
        },
        week: {
            label: 'Week View',
            icon: (
                <CalendarDotsIcon
                    className="text-blue-600"
                    size={14}
                    weight="bold"
                />
            )
        },
        day: {
            label: 'Day View',
            icon: (
                <ClockIcon
                    className="text-blue-600"
                    size={14}
                    weight="bold"
                />
            )
        },
        agenda: {
            label: 'Agenda View',
            icon: (
                <ListBulletsIcon
                    className="text-blue-600"
                    size={14}
                    weight="bold"
                />
            )
        }
    };

    const pickerDateValue = useMemo(() => {
        return DateTime.fromJSDate(viewMode === 'day'
            ? selectedDate
            : currentDate)
            .toISODate() || '';
    }, [viewMode, selectedDate, currentDate]);

    function handlePickerChange(dateStr: string) {
        if (!dateStr) return;
        const dt = DateTime.fromISO(dateStr);
        if (!dt.isValid) return;
        const nextDate = dt.toJSDate();
        setCurrentDate(nextDate);
        setSelectedDate(nextDate);
    }

    const canCreateEvents = currentRole === 'Admin' || currentRole === 'Dean' || currentRole === 'Registrar' || currentRole === 'Faculty';

    function handleCreateEvent(defaultDate?: Date) {
        const rolePath = currentRole.toLowerCase();
        navigate(`/${rolePath}/announcement-management/new?type=Event`, {
            state: { from: pathname, defaultDate }
        });
    }

    return (
        <CommonCard
            cardHeaderProps={{
                title: (
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                            <CalendarBlankIcon
                                className="sm:hidden"
                                size={18}
                                weight="duotone"
                            />
                            <CalendarBlankIcon
                                className="hidden sm:inline"
                                size={22}
                                weight="duotone"
                            />
                        </div>
                        <h1 className="text-xs sm:text-base md:text-xl font-bold text-(--mui-palette-text-primary) tracking-tight m-0 inline-flex items-center gap-1.5 flex-wrap min-w-0">
                            <span>Academic & Campus Calendar</span>
                            <CommonInfoTooltip content={roleSubtitle} />
                        </h1>
                    </div>
                ),
                action: (
                    <div className="flex items-center gap-2">
                        {canCreateEvents && (
                            <CommonButton
                                aria-label="Create Event"
                                className="h-9 px-3 text-xs font-semibold shadow-xs"
                                color="primary"
                                size="small"
                                startIcon={(
                                    <PlusIcon
                                        size={16}
                                        weight="bold"
                                    />
                                )}
                                variant="contained"
                                onClick={() => handleCreateEvent()}
                            >
                                <span className="hidden sm:inline">Create Event</span>
                                <span className="sm:hidden">Create</span>
                            </CommonButton>
                        )}
                        <CalendarActionMenu
                            activeCategories={activeCategories}
                            canCreateEvents={canCreateEvents}
                            isLoading={isLoading}
                            viewMode={viewMode}
                            onCreateEvent={() => handleCreateEvent()}
                            onReload={reload}
                            onSelectAllCategories={handleSelectAllCategories}
                            onSelectViewMode={setViewMode}
                            onToggleCategory={toggleCategory}
                        />
                    </div>
                )
            }}
            className="flex flex-col h-full w-full overflow-hidden"
            sx={{
                p: {
                    xs: '12px !important', sm: '16px !important', md: '24px !important'
                }
            }}
        >
            {/* Navigation & View Toggle Toolbar + Filter Row */}
            <div className="border-t border-b border-(--mui-palette-divider) bg-neutral-50/60 dark:bg-neutral-800/30 px-2.5 py-2 sm:p-4 flex flex-col gap-2 shrink-0">
                {/* Date Navigation & View Mode Switcher */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-3">
                    {/* Date Navigation with DatePicker wrapped by arrows & View Mode Label */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between w-full md:w-auto gap-2">
                        {/* Left & Right arrows wrapping DatePicker */}
                        <div className="flex items-center gap-1 sm:gap-1.5 w-full sm:w-auto">
                            <button
                                aria-label="Previous"
                                className="p-1.5 sm:p-2 rounded-lg border border-(--mui-palette-divider) text-(--mui-palette-text-secondary) hover:text-(--mui-palette-text-primary) hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
                                type="button"
                                onClick={handlePrev}
                            >
                                <CaretLeftIcon size={16} />
                            </button>

                            <div className="flex-1 min-w-0 sm:w-[165px] sm:flex-initial">
                                <CommonDatePicker
                                    containerClassName="w-full"
                                    format={viewMode === 'month' || viewMode === 'agenda'
                                        ? 'MMMM yyyy'
                                        : 'MMM d, yyyy'}
                                    fullWidth
                                    hasToday
                                    size="small"
                                    slotProps={{
                                        textField: {
                                            sx: {
                                                '& .MuiInputBase-input': {
                                                    textAlign: 'center',
                                                    cursor: 'pointer'
                                                }
                                            }
                                        }
                                    }}
                                    value={pickerDateValue}
                                    onChange={handlePickerChange}
                                />
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
                        <div className="flex items-center justify-center w-full sm:w-auto sm:justify-start gap-2">
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
                                : 'bg-white dark:bg-neutral-800 text-(--mui-palette-text-secondary) border-(--mui-palette-divider) hover:bg-neutral-50 dark:hover:bg-neutral-700'
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
                                className={`px-2.5 py-1 rounded-full font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                                    isChecked
                                        ? cat.bgClass
                                        : 'bg-white/50 dark:bg-neutral-800/50 text-neutral-400 border-(--mui-palette-divider) opacity-60 hover:opacity-90'
                                }`}
                                key={cat.id}
                                type="button"
                                onClick={() => toggleCategory(cat.id)}
                            >
                                <span
                                    className={`w-2 h-2 rounded-full ${isChecked
                                        ? cat.dotClass
                                        : 'bg-neutral-300 dark:bg-neutral-600'}`}
                                />
                                {cat.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Calendar View Area - Full Width */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-1 sm:p-3 md:p-4">
                {isLoading && events.length === 0
                    ? (
                        <div className="p-16 flex justify-center">
                            <PageLoadingFallback />
                        </div>
                    )
                    : (
                        <>
                            {viewMode === 'month' && (
                                <CalendarMonthView
                                    canCreateEvent={canCreateEvents}
                                    currentDate={currentDate}
                                    events={filteredEvents}
                                    selectedDate={selectedDate}
                                    onCreateEvent={handleCreateEvent}
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