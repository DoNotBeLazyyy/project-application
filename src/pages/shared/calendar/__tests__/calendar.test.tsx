import { CALENDAR_CATEGORIES, UnifiedCalendarEvent } from '@pages/shared/calendar/calendar.types';
import CalendarActionMenu from '@pages/shared/calendar/CalendarActionMenu';
import { CalendarAgendaView } from '@pages/shared/calendar/CalendarAgendaView';
import { CalendarEventDetailModal } from '@pages/shared/calendar/CalendarEventDetailModal';
import { CalendarMiniMonth } from '@pages/shared/calendar/CalendarMiniMonth';
import { CalendarMonthView } from '@pages/shared/calendar/CalendarMonthView';
import { fireEvent, render, screen } from '@testing-library/react';
import { changeMonthUtil, getCalendarDays } from '@utils/calendar.util';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const mockEvent: UnifiedCalendarEvent = {
    id: 'test-event-1',
    title: 'CS 101 Midterm Examination',
    description: 'Covers Chapters 1 to 5.',
    location: 'Building A, Room 302',
    start: new Date(2026, 3, 15, 9, 0),
    end: new Date(2026, 3, 15, 11, 0),
    allDay: false,
    category: 'assessment',
    metadata: {
        assessmentType: 'Exam',
        courseCode: 'CS 101',
        sectionCode: 'CS-3A',
        room: '302'
    }
};

describe('Calendar Utility & Configuration Tests', () => {
    it('defines all required categories with valid colors and labels', () => {
        expect(CALENDAR_CATEGORIES).toHaveLength(5);
        const categoryIds = CALENDAR_CATEGORIES.map((c) => c.id);
        expect(categoryIds).toContain('event');
        expect(categoryIds).toContain('academic');
        expect(categoryIds).toContain('class');
        expect(categoryIds).toContain('assessment');
        expect(categoryIds).toContain('holiday');

        for (const cat of CALENDAR_CATEGORIES) {
            expect(cat.label).toBeTruthy();
            expect(cat.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
            expect(cat.bgClass).toBeTruthy();
            expect(cat.dotClass).toBeTruthy();
        }
    });

    it('generates correct calendar days for a 30-day month (April 2026)', () => {
        const days = getCalendarDays(2026, 3);
        expect([35, 42]).toContain(days.length);

        const currentMonthDays = days.filter((d) => d.isCurrentMonth);
        expect(currentMonthDays).toHaveLength(30);

        expect(currentMonthDays[0].day).toBe(1);
        expect(currentMonthDays[currentMonthDays.length - 1].day).toBe(30);
    });

    it('correctly shifts months with changeMonthUtil', () => {
        const base = new Date(2026, 3, 15);
        const nextMonth = changeMonthUtil(base, 1);
        expect(nextMonth.getMonth()).toBe(4);
        expect(nextMonth.getFullYear()).toBe(2026);

        const prevMonth = changeMonthUtil(base, -1);
        expect(prevMonth.getMonth()).toBe(2);
        expect(prevMonth.getFullYear()).toBe(2026);

        const nextYear = changeMonthUtil(new Date(2026, 11, 1), 1);
        expect(nextYear.getMonth()).toBe(0);
        expect(nextYear.getFullYear()).toBe(2027);
    });
});

describe('Calendar Component Rendering Tests', () => {
    it('renders CalendarMiniMonth and triggers month navigation', () => {
        const onSelectDate = vi.fn();
        const onChangeMonth = vi.fn();

        render(
            <CalendarMiniMonth
                date={new Date(2026, 3, 15)}
                selectedDate={new Date(2026, 3, 15)}
                onChangeMonth={onChangeMonth}
                onSelectDate={onSelectDate}
            />
        );

        expect(screen.getByText('April 2026')).toBeInTheDocument();

        const nextBtn = screen.getByRole('button', { name: /next month/i });
        fireEvent.click(nextBtn);
        expect(onChangeMonth).toHaveBeenCalledTimes(1);
    });

    it('renders CalendarMonthView with event chips and handles selection', () => {
        const onSelectDate = vi.fn();
        const onSelectEvent = vi.fn();
        const onViewDay = vi.fn();

        render(
            <CalendarMonthView
                currentDate={new Date(2026, 3, 1)}
                events={[mockEvent]}
                selectedDate={new Date(2026, 3, 15)}
                onSelectDate={onSelectDate}
                onSelectEvent={onSelectEvent}
                onViewDay={onViewDay}
            />
        );

        expect(screen.getByText('Sun')).toBeInTheDocument();
        expect(screen.getByText('CS 101 Midterm Examination')).toBeInTheDocument();

        fireEvent.click(screen.getByText('CS 101 Midterm Examination'));
        expect(onSelectEvent).toHaveBeenCalledWith(mockEvent);
    });

    it('renders CalendarAgendaView with search filtering', () => {
        const onSelectEvent = vi.fn();

        render(
            <CalendarAgendaView
                events={[mockEvent]}
                onSelectEvent={onSelectEvent}
            />
        );

        expect(screen.getByText('CS 101 Midterm Examination')).toBeInTheDocument();
        expect(screen.getByText('Building A, Room 302')).toBeInTheDocument();

        const input = screen.getByPlaceholderText(/search items/i);
        fireEvent.change(input, { target: { value: 'Non-existent query 12345' } });

        expect(screen.getByText('No scheduled items found')).toBeInTheDocument();
    });

    it('renders CalendarEventDetailModal with details and closes when requested', () => {
        const onClose = vi.fn();

        render(
            <BrowserRouter>
                <CalendarEventDetailModal
                    event={mockEvent}
                    open={true}
                    onClose={onClose}
                />
            </BrowserRouter>
        );

        expect(screen.getByText('CS 101 Midterm Examination')).toBeInTheDocument();
        expect(screen.getByText('Building A, Room 302')).toBeInTheDocument();
        expect(screen.getByText('Covers Chapters 1 to 5.')).toBeInTheDocument();

        const closeBtn = screen.getByRole('button', { name: /^close$/i });
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalled();
    });

    it('renders CalendarActionMenu and triggers view mode and category changes', () => {
        const onSelectViewMode = vi.fn();
        const onToggleCategory = vi.fn();
        const onSelectAllCategories = vi.fn();
        const onReload = vi.fn();
        const onCreateEvent = vi.fn();

        render(
            <CalendarActionMenu
                activeCategories={new Set(['event', 'academic'])}
                canCreateEvents={true}
                isLoading={false}
                viewMode="month"
                onCreateEvent={onCreateEvent}
                onReload={onReload}
                onSelectAllCategories={onSelectAllCategories}
                onSelectViewMode={onSelectViewMode}
                onToggleCategory={onToggleCategory}
            />
        );

        // Kebab trigger button exists
        const menuBtn = screen.getByRole('button', { name: /calendar options and filters/i });
        expect(menuBtn).toBeInTheDocument();

        // Open menu
        fireEvent.click(menuBtn);

        // Sections exist
        expect(screen.getByText('View Mode')).toBeInTheDocument();
        expect(screen.getByText('Filter Categories')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();

        // Test category toggle while menu is open
        const academicItem = screen.getByText('Academic Deadlines');
        fireEvent.click(academicItem);
        expect(onToggleCategory).toHaveBeenCalledWith('academic');

        // View Mode buttons (triggers onSelectViewMode and closes menu)
        const weekBtn = screen.getByRole('button', { name: /week view/i });
        fireEvent.click(weekBtn);
        expect(onSelectViewMode).toHaveBeenCalledWith('week');
    });
});
