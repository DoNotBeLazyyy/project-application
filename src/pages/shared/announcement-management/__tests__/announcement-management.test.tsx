import AnnouncementsFeedCard from '@components/dashboard/AnnouncementsFeedCard';
import EventsFeedCard from '@components/dashboard/EventsFeedCard';
import AnnouncementForm from '@pages/shared/announcement-management/AnnouncementForm';
import CommunicationGridCard from '@pages/shared/announcement-management/CommunicationGridCard';
import AnnouncementManagement from '@pages/shared/announcement-management/index';
import { useAppStore } from '@stores/app.store';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnnouncementFeedRow, CommunicationFormValues, CommunicationListRow } from '@type/announcement.type';
import { EventFeedRow } from '@type/event.type';
import { useForm } from 'react-hook-form';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Mock services
vi.mock('@services/announcement.service', () => ({
    bulkDeleteAnnouncements: vi.fn(),
    deleteAnnouncement: vi.fn(),
    getAnnouncementById: vi.fn(),
    getAnnouncementSectionOptions: vi.fn()
        .mockResolvedValue({ data: [], error: null }),
    listAnnouncements: vi.fn()
        .mockResolvedValue({ data: { content: [], totalElements: 0 }, error: null }),
    listMyAnnouncementsFeed: vi.fn()
        .mockResolvedValue({ data: { content: [], totalElements: 0 }, error: null })
}));

vi.mock('@services/event.service', () => ({
    bulkDeleteEvents: vi.fn(),
    deleteEvent: vi.fn(),
    getEventById: vi.fn(),
    listEvents: vi.fn()
        .mockResolvedValue({ data: { content: [], totalElements: 0 }, error: null }),
    listMyEventsFeed: vi.fn()
        .mockResolvedValue({ data: [], error: null })
}));

describe('Announcement & Communication Module Tests', () => {
    const mockRow: CommunicationListRow = {
        attachment_count: 2,
        author_name: 'Registrar Staff',
        content: 'Midterm schedule has been published.',
        created_at: '2026-10-15T08:00:00Z',
        date: '2026-10-15T08:00:00Z',
        id: 'ann-1',
        is_pinned: true,
        item_type: 'Announcement',
        section_count: 0,
        target_audience: 'Student',
        title: 'Midterm Examination Schedule',
        total_count: 1
    };

    describe('CommunicationGridCard', () => {
        it('renders item details correctly', () => {
            render(
                <CommunicationGridCard
                    isSelected={false}
                    row={mockRow}
                    onView={vi.fn()}
                />
            );

            expect(screen.getByText('Midterm Examination Schedule'))
                .toBeDefined();
            expect(screen.getByText('Pinned'))
                .toBeDefined();
        });

        it('hides edit and delete actions when isViewingOnly is true', () => {
            render(
                <CommunicationGridCard
                    isSelected={false}
                    isViewingOnly={true}
                    row={mockRow}
                    onEdit={vi.fn()}
                    onRequestDelete={vi.fn()}
                    onView={vi.fn()}
                />
            );

            expect(screen.queryByText('Edit'))
                .toBeNull();
            expect(screen.queryByText('Delete'))
                .toBeNull();
        });

        it('hides edit and delete actions when a non-admin user does not own the item', () => {
            const adminRow: CommunicationListRow = {
                ...mockRow,
                created_by: 'admin-id',
                created_by_role: 'Admin'
            };
            render(
                <CommunicationGridCard
                    currentUserId="dean-id"
                    currentUserRole="Dean"
                    isSelected={false}
                    isViewingOnly={false}
                    row={adminRow}
                    onEdit={vi.fn()}
                    onRequestDelete={vi.fn()}
                    onView={vi.fn()}
                />
            );

            expect(screen.queryByText('Edit'))
                .toBeNull();
            expect(screen.queryByText('Delete'))
                .toBeNull();
        });
    });

    describe('Dashboard Feed Cards with "View all" Navigation', () => {
        it('renders View all button on AnnouncementsFeedCard and clicking triggers navigation', () => {
            const mockAnnouncements: AnnouncementFeedRow[] = [{
                attachment_count: 0,
                author_name: 'Dean',
                content: 'Welcome back students',
                created_at: '2026-10-15T00:00:00Z',
                id: 'ann-feed-1',
                is_pinned: false,
                published_at: '2026-10-15T00:00:00Z',
                target_audience: 'Global',
                title: 'Welcome Back',
                total_count: 1
            }];

            render(
                <MemoryRouter initialEntries={['/student']}>
                    <AnnouncementsFeedCard announcements={mockAnnouncements} />
                </MemoryRouter>
            );

            const viewAllBtn = screen.getByRole('button', { name: /view all/i });
            expect(viewAllBtn)
                .toBeDefined();
        });

        it('renders View all button on EventsFeedCard', () => {
            const mockEvents: EventFeedRow[] = [{
                all_day: true,
                attachment_count: 0,
                description: 'Campus sports festival',
                end_at: null,
                id: 'evt-1',
                location: 'Grand Stand',
                start_at: '2026-10-25T00:00:00Z',
                target_audience: 'Global',
                title: 'Intramurals 2026'
            }];

            render(
                <MemoryRouter initialEntries={['/student']}>
                    <EventsFeedCard events={mockEvents} />
                </MemoryRouter>
            );

            const viewAllBtn = screen.getByRole('button', { name: /view all/i });
            expect(viewAllBtn)
                .toBeDefined();
        });
    });

    describe('AnnouncementManagement Page Role Toggles', () => {
        it('renders toggle inside three-dots menu for management role (Admin) and allows mode switching', () => {
            // The page reads the signed-in role from the store, not the URL
            useAppStore.setState({ activeRole: 'Admin' });
            render(
                <MemoryRouter initialEntries={['/admin/announcement-management?mode=viewing']}>
                    <AnnouncementManagement />
                </MemoryRouter>
            );

            // Three dots action button is rendered
            const actionButton = screen.getByRole('button', { name: /table actions/i });
            expect(actionButton)
                .toBeDefined();

            // Open the action menu
            fireEvent.click(actionButton);

            // Admin has viewing and management mode toggle options in the menu
            expect(screen.getByRole('button', { name: /viewing mode/i }))
                .toBeDefined();
            expect(screen.getByRole('button', { name: /management mode/i }))
                .toBeDefined();
        });

        it('does not render management toggle for Student role (always viewing mode)', () => {
            useAppStore.setState({ activeRole: 'Student' });
            render(
                <MemoryRouter initialEntries={['/student/announcement-management']}>
                    <AnnouncementManagement />
                </MemoryRouter>
            );

            // Student does not see the Management toggle
            expect(screen.queryByRole('button', { name: /management mode/i }))
                .toBeNull();
            expect(screen.queryByText('Management'))
                .toBeNull();
            // Title shows Campus Announcements & Events
            expect(screen.getByText('Campus Announcements & Events'))
                .toBeDefined();
        });
    });

    describe('AnnouncementForm', () => {
        it('disables Type field when isTypeDisabled is true', () => {
            function Wrapper() {
                const { control } = useForm<CommunicationFormValues>({
                    defaultValues: {
                        item_type: 'Event',
                        title: '',
                        description: '',
                        target_audience: 'Global'
                    }
                });
                return (
                    <AnnouncementForm
                        control={control}
                        isTypeDisabled={true}
                    />
                );
            }

            render(<Wrapper />);
            const input = document.querySelector('input[name="item_type"]') as HTMLInputElement;
            expect(input)
                .toBeDisabled();
            expect(input.value)
                .toBe('Event');
            const comboboxes = screen.getAllByRole('combobox');
            expect(comboboxes[0])
                .toHaveAttribute('aria-disabled', 'true');
        });
    });
});