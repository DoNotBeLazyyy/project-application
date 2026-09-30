import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import AnnouncementFilterForm from '@pages/shared/announcement-management/AnnouncementFilterForm';
import AnnouncementGridCard from '@pages/shared/announcement-management/AnnouncementGridCard';
import { useAnnouncementBasePath } from '@pages/shared/announcement-management/useAnnouncementBasePath';
import { useAnnouncementTableConfig } from '@pages/shared/announcement-management/useAnnouncementTableConfig';
import EventFilterForm from '@pages/shared/event-management/EventFilterForm';
import EventGridCard from '@pages/shared/event-management/EventGridCard';
import { useEventTableConfig } from '@pages/shared/event-management/useEventTableConfig';
import { bulkDeleteAnnouncements, deleteAnnouncement, listAnnouncements } from '@services/announcement.service';
import { bulkDeleteEvents, deleteEvent, listEvents } from '@services/event.service';
import { AnnouncementFilterValues, AnnouncementListRow } from '@type/announcement.type';
import { EventFilterValues, EventListRow } from '@type/event.type';
import { SortStringDto } from '@type/http.type';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';

const ANNOUNCEMENT_SORT_COLUMNS: SortColumn[] = [
    { field: 'title', label: 'Title' },
    { field: 'created_at', label: 'Posted On' }
];

const EVENT_SORT_COLUMNS: SortColumn[] = [
    { field: 'title', label: 'Title' },
    { field: 'start_at', label: 'Start Date' }
];

const FILTER_ANNOUNCEMENT_FORM_ID = 'filter-announcement-form';
const FILTER_EVENT_FORM_ID = 'filter-event-form';

const MANAGEMENT_TABS = [
    { label: 'Announcements', value: 'announcements' },
    { label: 'Events', value: 'events' }
];

interface AnnouncementManagementProps {
    defaultTab?: 'announcements' | 'events';
}

export default function AnnouncementManagement({ defaultTab = 'announcements' }: AnnouncementManagementProps) {
    const navigate = useNavigate();
    const basePath = useAnnouncementBasePath();
    const [searchParams, setSearchParams] = useSearchParams();

    const currentTab = (searchParams.get('tab') || defaultTab) === 'events' ? 'events' : 'announcements';

    // Announcement state
    const [activeAnnouncementFilters, setActiveAnnouncementFilters] = useState<AnnouncementFilterValues | null>(null);
    const [isAnnouncementFilterOpen, setIsAnnouncementFilterOpen] = useState(false);
    const announcementFilterMethods = useForm<AnnouncementFilterValues>({
        defaultValues: { audience: 'All', is_pinned: 'All' }
    });

    // Event state
    const [activeEventFilters, setActiveEventFilters] = useState<EventFilterValues | null>(null);
    const [isEventFilterOpen, setIsEventFilterOpen] = useState(false);
    const eventFilterMethods = useForm<EventFilterValues>({
        defaultValues: { audience: 'All', upcoming_only: 'All' }
    });

    function handleTabChange(_event: unknown, newTab: string) {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('tab', newTab);
            return next;
        });
    }

    function handleOpenDetail(id: string) {
        navigate(`${basePath}/${id}`);
    }

    function handleOpenEdit(id: string) {
        navigate(`${basePath}/${id}?edit=1`);
    }

    const {
        columnDefs: announcementColumnDefs,
        tableActionConfig: announcementActionConfig
    } = useAnnouncementTableConfig({
        onEdit: handleOpenEdit,
        onView: handleOpenDetail
    });

    const {
        columnDefs: eventColumnDefs,
        tableActionConfig: eventActionConfig
    } = useEventTableConfig({
        onEdit: handleOpenEdit,
        onView: handleOpenDetail
    });

    async function fetchAnnouncements(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        const audience = activeAnnouncementFilters && activeAnnouncementFilters.audience !== 'All'
            ? activeAnnouncementFilters.audience
            : null;
        const isPinned = activeAnnouncementFilters?.is_pinned === 'true'
            ? true
            : activeAnnouncementFilters?.is_pinned === 'false'
                ? false
                : null;

        return listAnnouncements(page, size, search, sort, audience, isPinned);
    }

    async function fetchEvents(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        const audience = activeEventFilters && activeEventFilters.audience !== 'All'
            ? activeEventFilters.audience
            : null;
        const upcomingOnly = activeEventFilters?.upcoming_only === 'true';

        return listEvents(page, size, search, sort, audience, upcomingOnly);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTabMenu
                tabs={MANAGEMENT_TABS}
                value={currentTab}
                onChange={handleTabChange}
            />

            {currentTab === 'announcements' ? (
                <CommonTableCard<AnnouncementListRow>
                    cardHeaderProps={{
                        subheader: 'Post announcements and share news with your campus community.',
                        title: 'Announcements & Events'
                    }}
                    controls={{
                        tableInputProps: {
                            searchHints: SEARCH_HINTS.announcements
                        },
                        tableButtonsProps: {
                            createButtonProps: {
                                label: 'Post Announcement',
                                onClick: function() {
                                    navigate(`${basePath}/new?type=Announcement`);
                                }
                            }
                        }
                    }}
                    dependencies={[activeAnnouncementFilters]}
                    filterModalProps={{
                        cardProps: {
                            cardHeaderProps: {
                                subheader: 'Narrow the list by audience or pinned status.',
                                title: 'Filter Announcements'
                            }
                        },
                        confirmText: 'Apply Filters',
                        formContent: (
                            <AnnouncementFilterForm
                                control={announcementFilterMethods.control}
                                id={FILTER_ANNOUNCEMENT_FORM_ID}
                                onSubmit={announcementFilterMethods.handleSubmit((values) => {
                                    setActiveAnnouncementFilters(values);
                                    setIsAnnouncementFilterOpen(false);
                                })}
                            />
                        ),
                        formId: FILTER_ANNOUNCEMENT_FORM_ID,
                        onClose: function() {
                            setIsAnnouncementFilterOpen(false);
                        },
                        onReset: function() {
                            announcementFilterMethods.reset();
                            setActiveAnnouncementFilters(null);
                        },
                        open: isAnnouncementFilterOpen
                    }}
                    renderGridCard={function(item, isSelected, onToggleSelect, onRequestDeleteRow) {
                        return (
                            <AnnouncementGridCard
                                isSelected={isSelected}
                                row={item}
                                onEdit={handleOpenEdit}
                                onRequestDelete={onRequestDeleteRow}
                                onToggleSelect={onToggleSelect}
                                onView={handleOpenDetail}
                            />
                        );
                    }}
                    sortColumns={ANNOUNCEMENT_SORT_COLUMNS}
                    tableActionConfig={announcementActionConfig}
                    tableProps={{
                        hasCheckbox: true,
                        leadingColumnDefs: announcementColumnDefs
                    }}
                    uniqueIdKey="id"
                    onDelete={bulkDeleteAnnouncements}
                    onDeleteRow={deleteAnnouncement}
                    onFetch={fetchAnnouncements}
                    onFilter={function() {
                        setIsAnnouncementFilterOpen(true);
                    }}
                    onRowClick={handleOpenDetail}
                />
            ) : (
                <CommonTableCard<EventListRow>
                    cardHeaderProps={{
                        subheader: 'Schedule campus events and keep everyone informed.',
                        title: 'Announcements & Events'
                    }}
                    controls={{
                        tableInputProps: {
                            searchHints: SEARCH_HINTS.events
                        },
                        tableButtonsProps: {
                            createButtonProps: {
                                label: 'Schedule Event',
                                onClick: function() {
                                    navigate(`${basePath}/new?type=Event`);
                                }
                            }
                        }
                    }}
                    dependencies={[activeEventFilters]}
                    filterModalProps={{
                        cardProps: {
                            cardHeaderProps: {
                                subheader: 'Narrow the list by audience or timeframe.',
                                title: 'Filter Events'
                            }
                        },
                        confirmText: 'Apply Filters',
                        formContent: (
                            <EventFilterForm
                                control={eventFilterMethods.control}
                                id={FILTER_EVENT_FORM_ID}
                                onSubmit={eventFilterMethods.handleSubmit((values) => {
                                    setActiveEventFilters(values);
                                    setIsEventFilterOpen(false);
                                })}
                            />
                        ),
                        formId: FILTER_EVENT_FORM_ID,
                        onClose: function() {
                            setIsEventFilterOpen(false);
                        },
                        onReset: function() {
                            eventFilterMethods.reset();
                            setActiveEventFilters(null);
                        },
                        open: isEventFilterOpen
                    }}
                    renderGridCard={function(item, isSelected, onToggleSelect, onRequestDeleteRow) {
                        return (
                            <EventGridCard
                                isSelected={isSelected}
                                row={item}
                                onEdit={handleOpenEdit}
                                onRequestDelete={onRequestDeleteRow}
                                onToggleSelect={onToggleSelect}
                                onView={handleOpenDetail}
                            />
                        );
                    }}
                    sortColumns={EVENT_SORT_COLUMNS}
                    tableActionConfig={eventActionConfig}
                    tableProps={{
                        hasCheckbox: true,
                        leadingColumnDefs: eventColumnDefs
                    }}
                    uniqueIdKey="id"
                    onDelete={bulkDeleteEvents}
                    onDeleteRow={deleteEvent}
                    onFetch={fetchEvents}
                    onFilter={function() {
                        setIsEventFilterOpen(true);
                    }}
                    onRowClick={handleOpenDetail}
                />
            )}
        </div>
    );
}