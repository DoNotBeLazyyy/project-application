import CommonButton from '@components/button/CommonButton';
import PageLoadingFallback from '@components/loading/PageLoadingFallback';
import useBreakpoint from '@hooks/useBreakpoint';
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
import { changeMonthUtil } from '@utils/calendar.util';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarAgendaView } from './CalendarAgendaView';
import { CalendarDayView } from './CalendarDayView';
import { CalendarEventDetailModal } from './CalendarEventDetailModal';
import { CalendarMiniMonth } from './CalendarMiniMonth';
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
    const { isMobile } = useBreakpoint();

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

    const handleToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
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

    // Formatted current title
    const currentHeading = useMemo(() => {
        if (viewMode === 'day') {
            return selectedDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
        if (viewMode === 'week') {
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);

            return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
        return currentDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });
    }, [currentDate, selectedDate, viewMode]);

    // Highlight items coming up soon
    const upcomingHighlights = useMemo(() => {
        const now = new Date();
        return [...events]
            .filter((ev) => ev.end.getTime() >= now.getTime())
            .sort((a, b) => a.start.getTime() - b.start.getTime())
            .slice(0, 4);
    }, [events]);

    const canCreateEvents = currentRole === 'Admin' || currentRole === 'Dean' || currentRole === 'Registrar' || currentRole === 'Faculty';

    return (
        <div className="space-y-6 pb-12 min-w-0 max-w-full">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                            <CalendarBlankIcon size={24} weight="duotone" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                                Academic & Campus Calendar
                            </h1>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                {roleSubtitle}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Header Actions */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        aria-label="Refresh calendar data"
                        className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        title="Reload Calendar"
                        type="button"
                        onClick={() => reload()}
                    >
                        <ArrowsClockwiseIcon className={isLoading ? 'animate-spin' : ''} size={18} />
                    </button>

                    {canCreateEvents && (
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
                    )}
                </div>
            </div>

            {/* Navigation & View Toggle Toolbar */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Date Jump Controls */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
                    <div className="flex items-center gap-1.5">
                        <CommonButton
                            size="small"
                            variant="outlined"
                            onClick={handleToday}
                        >
                            Today
                        </CommonButton>
                        <button
                            aria-label="Previous"
                            className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            type="button"
                            onClick={handlePrev}
                        >
                            <CaretLeftIcon size={16} />
                        </button>
                        <button
                            aria-label="Next"
                            className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            type="button"
                            onClick={handleNext}
                        >
                            <CaretRightIcon size={16} />
                        </button>
                    </div>

                    <h2 className="text-base font-bold text-neutral-900 dark:text-white min-w-[150px] text-center md:text-left">
                        {currentHeading}
                    </h2>
                </div>

                {/* View Switcher Buttons */}
                <div className="flex items-center bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl w-full md:w-auto justify-center">
                    <button
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            viewMode === 'month'
                                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                        type="button"
                        onClick={() => setViewMode('month')}
                    >
                        <GridFourIcon size={15} />
                        Month
                    </button>
                    <button
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            viewMode === 'week'
                                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                        type="button"
                        onClick={() => setViewMode('week')}
                    >
                        <CalendarDotsIcon size={15} />
                        Week
                    </button>
                    <button
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            viewMode === 'day'
                                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                        type="button"
                        onClick={() => setViewMode('day')}
                    >
                        <ClockIcon size={15} />
                        Day
                    </button>
                    <button
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            viewMode === 'agenda'
                                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                        type="button"
                        onClick={() => setViewMode('agenda')}
                    >
                        <ListBulletsIcon size={15} />
                        Agenda
                    </button>
                </div>
            </div>

            {/* Filter Categories Chips */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-semibold text-neutral-400 dark:text-neutral-500 flex items-center gap-1 mr-1">
                    <FunnelIcon size={14} /> Filter:
                </span>
                <button
                    className={`px-2.5 py-1 rounded-full font-semibold border transition-all ${
                        activeCategories.size === CALENDAR_CATEGORIES.length
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white'
                            : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50'
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
                            className={`px-2.5 py-1 rounded-full font-semibold border flex items-center gap-1.5 transition-all ${
                                isChecked
                                    ? cat.bgClass
                                    : 'bg-white/50 dark:bg-neutral-800/50 text-neutral-400 border-neutral-200 dark:border-neutral-800 opacity-60 hover:opacity-90'
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

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Calendar View Area */}
                <div className="lg:col-span-3 min-w-0">
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

                {/* Right Side Widgets (Hidden on small screens or stacked) */}
                <div className="space-y-6">
                    {/* Mini Month Picker */}
                    <CalendarMiniMonth
                        date={currentDate}
                        selectedDate={selectedDate}
                        onChangeMonth={(newDate) => {
                            setCurrentDate(newDate);
                            setSelectedDate(newDate);
                        }}
                        onSelectDate={(newDate) => {
                            setSelectedDate(newDate);
                            setCurrentDate(newDate);
                        }}
                    />

                    {/* Upcoming Highlights Widget */}
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                                Upcoming Soon
                            </span>
                            <span className="text-[11px] font-semibold text-neutral-400">
                                {upcomingHighlights.length} items
                            </span>
                        </div>

                        {upcomingHighlights.length === 0 ? (
                            <div className="text-center py-6 text-xs text-neutral-400">
                                No upcoming items scheduled.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {upcomingHighlights.map((item) => {
                                    const cat = CALENDAR_CATEGORIES.find((c) => c.id === item.category) || CALENDAR_CATEGORIES[0];
                                    const dateString = item.start.toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric'
                                    });

                                    return (
                                        <div
                                            key={item.id}
                                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-transform hover:scale-[1.01] ${cat.bgClass}`}
                                            onClick={() => handleOpenEventModal(item)}
                                        >
                                            <div className="font-bold truncate text-neutral-900 dark:text-white">
                                                {item.title}
                                            </div>
                                            <div className="flex items-center justify-between mt-1 text-[11px] opacity-75">
                                                <span>{dateString}</span>
                                                <span>{item.allDay ? 'All Day' : item.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Event Detail Modal */}
            <CalendarEventDetailModal
                event={selectedEvent}
                open={isDetailModalOpen}
                onClose={handleCloseEventModal}
            />
        </div>
    );
}
