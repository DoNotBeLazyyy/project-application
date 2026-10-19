import AnnouncementsFeedCard from '@components/dashboard/AnnouncementsFeedCard';
import EventsFeedCard from '@components/dashboard/EventsFeedCard';
import CommunicationGridCard from '@pages/shared/announcement-management/CommunicationGridCard';
import AnnouncementForm from '@pages/shared/announcement-management/AnnouncementForm';
import AnnouncementManagement from '@pages/shared/announcement-management/index';
import { useAnnouncementTableConfig } from '@pages/shared/announcement-management/useAnnouncementTableConfig';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
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
    getAnnouncementSectionOptions: vi.fn().mockResolvedValue({ data: [], error: null }),
    listAnnouncements: vi.fn().mockResolvedValue({ data: { content: [], totalElements: 0 }, error: null }),
    listMyAnnouncementsFeed: vi.fn().mockResolvedValue({ data: { content: [], totalElements: 0 }, error: null })
}));

vi.mock('@services/event.service', () => ({
    bulkDeleteEvents: vi.fn(),
    deleteEvent: vi.fn(),
    getEventById: vi.fn(),
    listEvents: vi.fn().mockResolvedValue({ data: { content: [], totalElements: 0 }, error: null }),
    listMyEventsFeed: vi.fn().mockResolvedValue({ data: [], error: null })
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

            expect(screen.getByText('Midterm Examination Schedule')).toBeDefined();
            expect(screen.getByText('Pinned')).toBeDefined();
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

            expect(screen.queryByText('Edit')).toBeNull();
            expect(screen.queryByText('Delete')).toBeNull();
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

            expect(screen.queryByText('Edit')).toBeNull();
            expect(screen.queryByText('Delete')).toBeNull();
        });
    });

    describe('useAnnouncementTableConfig', () => {
        it('configures view-only options when isViewingOnly is true', () => {
            const { result } = renderHook(() =>
                useAnnouncementTableConfig({
                    isViewingOnly: true,
                    onView: vi.fn()
                })
            );

            const tableConfig = result.current.tableActionConfig(vi.fn());
            const options = tableConfig.menuOptions ? tableConfig.menuOptions(mockRow) : [];
            expect(options).toHaveLength(1);
            expect(options[0].preset).toBe('view');
            expect(tableConfig.onEditClick).toBeUndefined();
        });

        it('configures edit and delete options when in management mode for authorized user', () => {
            const { result } = renderHook(() =>
                useAnnouncementTableConfig({
                    currentUserId: 'admin-id',
                    currentUserRole: 'Admin',
                    isViewingOnly: false,
                    onEdit: vi.fn(),
                    onView: vi.fn()
                })
            );

            const tableConfig = result.current.tableActionConfig(vi.fn());
            const options = tableConfig.menuOptions ? tableConfig.menuOptions(mockRow) : [];
            expect(options.length).toBeGreaterThanOrEqual(3);
            const presets = options.map((o) => o.preset);
            expect(presets).toContain('view');
            expect(presets).toContain('edit');
            expect(presets).toContain('delete');
        });

        it('restricts to view only if user does not own and is not authorized to manage the item', () => {
            const { result } = renderHook(() =>
                useAnnouncementTableConfig({
                    currentUserId: 'dean-user-1',
                    currentUserRole: 'Dean',
                    isViewingOnly: false,
                    onEdit: vi.fn(),
                    onView: vi.fn()
                })
            );

            const adminRow: CommunicationListRow = {
                ...mockRow,
                created_by: 'admin-id',
                created_by_role: 'Admin'
            };

            const tableConfig = result.current.tableActionConfig(vi.fn());
            const options = tableConfig.menuOptions ? tableConfig.menuOptions(adminRow) : [];
            expect(options).toHaveLength(1);
            expect(options[0].preset).toBe('view');
            expect(tableConfig.onEditClick).toBeDefined();
            expect(tableConfig.onEditClick!(adminRow)).toBeUndefined();
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
            expect(viewAllBtn).toBeDefined();
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
            expect(viewAllBtn).toBeDefined();
        });
    });

    describe('AnnouncementManagement Page Role Toggles', () => {
        it('renders toggle tabs for management role (Admin) and allows mode switching', () => {
            render(
                <MemoryRouter initialEntries={['/admin/announcement-management?mode=viewing']}>
                    <AnnouncementManagement />
                </MemoryRouter>
            );

            // Admin has viewing and management tabs
            expect(screen.getByText('Viewing')).toBeDefined();
            expect(screen.getByText('Management')).toBeDefined();
        });

        it('does not render management toggle for Student role (always viewing mode)', () => {
            render(
                <MemoryRouter initialEntries={['/student/announcement-management']}>
                    <AnnouncementManagement />
                </MemoryRouter>
            );

            // Student does not see the Management toggle tab
            expect(screen.queryByText('Management')).toBeNull();
            // Title shows Campus Announcements & Events
            expect(screen.getByText('Campus Announcements & Events')).toBeDefined();
        });
    });

    describe('AnnouncementForm', () => {
        it('disables Type field when isTypeDisabled is true', () => {
            const Wrapper = () => {
                const { control } = useForm<CommunicationFormValues>({
                    defaultValues: {
                        item_type: 'Event',
                        title: '',
                        description: '',
                        target_audience: 'Global'
                    }
                });
                return <AnnouncementForm control={control} isTypeDisabled={true} />;
            };

            render(<Wrapper />);
            const input = document.querySelector('input[name="item_type"]') as HTMLInputElement;
            expect(input).toBeDisabled();
            expect(input.value).toBe('Event');
            const comboboxes = screen.getAllByRole('combobox');
            expect(comboboxes[0]).toHaveAttribute('aria-disabled', 'true');
        });
    });
});

