import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import AnnouncementFilterForm from '@pages/shared/announcement-management/AnnouncementFilterForm';
import CommunicationGridCard from '@pages/shared/announcement-management/CommunicationGridCard';
import { useAnnouncementBasePath } from '@pages/shared/announcement-management/useAnnouncementBasePath';
import { useAnnouncementTableConfig } from '@pages/shared/announcement-management/useAnnouncementTableConfig';
import { bulkDeleteAnnouncements, deleteAnnouncement, listAnnouncements } from '@services/announcement.service';
import { bulkDeleteEvents, deleteEvent, listEvents } from '@services/event.service';
import { AnnouncementFilterValues, CommunicationListRow } from '@type/announcement.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import { useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

const COMMUNICATION_SORT_COLUMNS: SortColumn[] = [
    { field: 'date', label: 'Date' },
    { field: 'title', label: 'Title' }
];

const FILTER_COMMUNICATION_FORM_ID = 'filter-communication-form';

interface AnnouncementManagementProps {
    defaultTab?: 'announcements' | 'events';
}

export default function AnnouncementManagement({ defaultTab: _defaultTab }: AnnouncementManagementProps = {}) {
    const navigate = useNavigate();
    const basePath = useAnnouncementBasePath();

    const [activeFilters, setActiveFilters] = useState<AnnouncementFilterValues | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const filterMethods = useForm<AnnouncementFilterValues>({
        defaultValues: {
            audience: 'All',
            is_pinned: 'All',
            type: 'All'
        }
    });

    const rowMapRef = useRef<Map<string, CommunicationListRow>>(new Map());

    function handleOpenDetail(id: string) {
        navigate(`${basePath}/${id}`);
    }

    function handleOpenEdit(id: string) {
        navigate(`${basePath}/${id}?edit=1`);
    }

    const {
        columnDefs,
        tableActionConfig
    } = useAnnouncementTableConfig({
        onEdit: handleOpenEdit,
        onView: handleOpenDetail
    });

    const fetchCommunications = useCallback(async function(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ): Promise<ServiceResult<CommonListResDto<CommunicationListRow>>> {
        const filterType = activeFilters?.type ?? 'All';
        const audience = activeFilters && activeFilters.audience !== 'All'
            ? activeFilters.audience
            : null;
        const isPinned = activeFilters?.is_pinned === 'true'
            ? true
            : activeFilters?.is_pinned === 'false'
                ? false
                : null;

        if (filterType === 'Announcement') {
            const annSort = sort.map((s) => s.field === 'date' ? { ...s, field: 'created_at' } : s);
            const res = await listAnnouncements(page, size, search, annSort, audience, isPinned);
            if (res.error) {
                return { data: null, error: res.error };
            }

            const rows: CommunicationListRow[] = (res.data?.content ?? []).map((a) => ({
                attachment_count: a.attachment_count ?? 0,
                author_name: a.author_name,
                content: a.content,
                created_at: a.created_at,
                date: a.published_at || a.created_at,
                id: a.id,
                is_pinned: a.is_pinned,
                item_type: 'Announcement',
                section_count: a.section_count,
                target_audience: a.target_audience,
                title: a.title,
                total_count: a.total_count ?? res.data?.totalElements ?? 0
            }));

            for (const r of rows) {
                rowMapRef.current.set(r.id, r);
            }

            const totalCount = res.data?.totalElements ?? rows.length;
            const totalPages = res.data?.totalPages ?? Math.ceil(totalCount / size);

            return {
                data: {
                    content: rows,
                    empty: rows.length === 0,
                    first: res.data?.first ?? (page === 1),
                    last: res.data?.last ?? (page >= totalPages),
                    number: res.data?.number ?? (page - 1),
                    numberOfElements: rows.length,
                    pageable: res.data?.pageable ?? {
                        offset: (page - 1) * size,
                        pageNumber: page - 1,
                        pageSize: size,
                        paged: true,
                        sort: { empty: true, sorted: false, unsorted: true },
                        unpaged: false
                    },
                    size: res.data?.size ?? size,
                    sort: res.data?.sort ?? { empty: true, sorted: false, unsorted: true },
                    totalElements: totalCount,
                    totalPages
                },
                error: null
            };
        }

        if (filterType === 'Event') {
            const evtSort = sort.map((s) => s.field === 'date' ? { ...s, field: 'start_at' } : s);
            const res = await listEvents(page, size, search, evtSort, audience, false);
            if (res.error) {
                return { data: null, error: res.error };
            }

            const rows: CommunicationListRow[] = (res.data?.content ?? []).map((e) => ({
                attachment_count: e.attachment_count ?? 0,
                author_name: e.author_name ?? null,
                content: e.description || '',
                created_at: e.created_at,
                date: e.start_at || e.created_at,
                end_at: e.end_at,
                id: e.id,
                is_pinned: false,
                item_type: 'Event',
                location: e.location,
                section_count: e.section_count,
                start_at: e.start_at,
                target_audience: e.target_audience,
                title: e.title,
                total_count: e.total_count ?? res.data?.totalElements ?? 0
            }));

            for (const r of rows) {
                rowMapRef.current.set(r.id, r);
            }

            const totalCount = res.data?.totalElements ?? rows.length;
            const totalPages = res.data?.totalPages ?? Math.ceil(totalCount / size);

            return {
                data: {
                    content: rows,
                    empty: rows.length === 0,
                    first: res.data?.first ?? (page === 1),
                    last: res.data?.last ?? (page >= totalPages),
                    number: res.data?.number ?? (page - 1),
                    numberOfElements: rows.length,
                    pageable: res.data?.pageable ?? {
                        offset: (page - 1) * size,
                        pageNumber: page - 1,
                        pageSize: size,
                        paged: true,
                        sort: { empty: true, sorted: false, unsorted: true },
                        unpaged: false
                    },
                    size: res.data?.size ?? size,
                    sort: res.data?.sort ?? { empty: true, sorted: false, unsorted: true },
                    totalElements: totalCount,
                    totalPages
                },
                error: null
            };
        }

        // filterType === 'All'
        const fetchLimit = Math.max(page * size, 50);
        const annSort = sort.map((s) => s.field === 'date' ? { ...s, field: 'created_at' } : s);
        const evtSort = sort.map((s) => s.field === 'date' ? { ...s, field: 'start_at' } : s);

        const [annRes, evtRes] = await Promise.all([
            listAnnouncements(1, fetchLimit, search, annSort, audience, isPinned),
            isPinned === true
                ? Promise.resolve({ data: null, error: null })
                : listEvents(1, fetchLimit, search, evtSort, audience, false)
        ]);

        if (annRes.error && evtRes.error) {
            return { data: null, error: annRes.error || evtRes.error };
        }

        const annRows: CommunicationListRow[] = (annRes.data?.content ?? []).map((a) => ({
            attachment_count: a.attachment_count ?? 0,
            author_name: a.author_name,
            content: a.content,
            created_at: a.created_at,
            date: a.published_at || a.created_at,
            id: a.id,
            is_pinned: a.is_pinned,
            item_type: 'Announcement',
            section_count: a.section_count,
            target_audience: a.target_audience,
            title: a.title,
            total_count: a.total_count ?? annRes.data?.totalElements ?? 0
        }));

        const evtRows: CommunicationListRow[] = (evtRes.data?.content ?? []).map((e) => ({
            attachment_count: e.attachment_count ?? 0,
            author_name: e.author_name ?? null,
            content: e.description || '',
            created_at: e.created_at,
            date: e.start_at || e.created_at,
            end_at: e.end_at,
            id: e.id,
            is_pinned: false,
            item_type: 'Event',
            location: e.location,
            section_count: e.section_count,
            start_at: e.start_at,
            target_audience: e.target_audience,
            title: e.title,
            total_count: e.total_count ?? evtRes.data?.totalElements ?? 0
        }));

        const combined = [...annRows, ...evtRows];

        for (const r of combined) {
            rowMapRef.current.set(r.id, r);
        }

        const activeSortField = sort[0]?.field || 'date';
        const activeSortOrder = sort[0]?.order || 'desc';

        combined.sort((a, b) => {
            let valA: string | number = '';
            let valB: string | number = '';

            if (activeSortField === 'title') {
                valA = (a.title || '').toLowerCase();
                valB = (b.title || '').toLowerCase();
            } else {
                if (activeSortOrder === 'desc') {
                    if (a.is_pinned && !b.is_pinned) return -1;
                    if (!a.is_pinned && b.is_pinned) return 1;
                }
                valA = new Date(a.date || a.created_at).getTime() || 0;
                valB = new Date(b.date || b.created_at).getTime() || 0;
            }

            if (valA < valB) return activeSortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return activeSortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        const totalCount = (annRes.data?.totalElements ?? 0) + (evtRes.data?.totalElements ?? 0);
        const startIdx = (page - 1) * size;
        const paginatedRows = combined.slice(startIdx, startIdx + size);
        const totalPages = Math.ceil(totalCount / size);

        return {
            data: {
                content: paginatedRows,
                empty: paginatedRows.length === 0,
                first: page === 1,
                last: page >= totalPages,
                number: page - 1,
                numberOfElements: paginatedRows.length,
                pageable: {
                    offset: startIdx,
                    pageNumber: page - 1,
                    pageSize: size,
                    paged: true,
                    sort: { empty: true, sorted: false, unsorted: true },
                    unpaged: false
                },
                size,
                sort: { empty: true, sorted: false, unsorted: true },
                totalElements: totalCount,
                totalPages
            },
            error: null
        };
    }, [activeFilters]);

    async function handleDeleteRow(id: string) {
        const item = rowMapRef.current.get(id);
        if (item?.item_type === 'Event') {
            return deleteEvent(id);
        }
        return deleteAnnouncement(id);
    }

    async function handleBulkDelete(ids: string[]) {
        const annIds: string[] = [];
        const evtIds: string[] = [];

        for (const id of ids) {
            if (rowMapRef.current.get(id)?.item_type === 'Event') {
                evtIds.push(id);
            } else {
                annIds.push(id);
            }
        }

        const promises = [];
        if (annIds.length > 0) {
            promises.push(bulkDeleteAnnouncements(annIds));
        }
        if (evtIds.length > 0) {
            promises.push(bulkDeleteEvents(evtIds));
        }

        const results = await Promise.all(promises);
        const err = results.find((r) => r.error);
        if (err) {
            return { data: null, error: err.error };
        }
        return { data: true, error: null };
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<CommunicationListRow>
                cardHeaderProps={{
                    subheader: 'Publish announcements and schedule campus events for your community.',
                    title: 'Announcements & Events'
                }}
                controls={{
                    tableButtonsProps: {
                        createButtonProps: {
                            label: 'Create Post',
                            onClick: function() {
                                navigate(`${basePath}/new`);
                            }
                        }
                    },
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.announcements
                    }
                }}
                dependencies={[activeFilters]}
                filterModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Narrow the list by type, audience, or pinned status.',
                            title: 'Filter Announcements & Events'
                        }
                    },
                    confirmText: 'Apply Filters',
                    formContent: (
                        <AnnouncementFilterForm
                            control={filterMethods.control}
                            id={FILTER_COMMUNICATION_FORM_ID}
                            onSubmit={filterMethods.handleSubmit((values) => {
                                setActiveFilters(values);
                                setIsFilterOpen(false);
                            })}
                        />
                    ),
                    formId: FILTER_COMMUNICATION_FORM_ID,
                    onClose: function() {
                        setIsFilterOpen(false);
                    },
                    onReset: function() {
                        filterMethods.reset();
                        setActiveFilters(null);
                    },
                    open: isFilterOpen
                }}
                renderGridCard={function(item, isSelected, onToggleSelect, onRequestDeleteRow) {
                    return (
                        <CommunicationGridCard
                            isSelected={isSelected}
                            row={item}
                            onEdit={handleOpenEdit}
                            onRequestDelete={onRequestDeleteRow}
                            onToggleSelect={onToggleSelect}
                            onView={handleOpenDetail}
                        />
                    );
                }}
                sortColumns={COMMUNICATION_SORT_COLUMNS}
                tableActionConfig={tableActionConfig}
                tableProps={{
                    hasCheckbox: true,
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
                onDelete={handleBulkDelete}
                onDeleteRow={handleDeleteRow}
                onFetch={fetchCommunications}
                onFilter={function() {
                    setIsFilterOpen(true);
                }}
                onRowClick={handleOpenDetail}
            />
        </div>
    );
}