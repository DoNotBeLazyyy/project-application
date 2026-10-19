import { AnnouncementDetailModal } from '@components/modal/AnnouncementDetailModal';
import { EventDetailModal } from '@components/modal/EventDetailModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import AnnouncementFilterForm from '@pages/shared/announcement-management/AnnouncementFilterForm';
import CommunicationGridCard from '@pages/shared/announcement-management/CommunicationGridCard';
import { useAnnouncementBasePath } from '@pages/shared/announcement-management/useAnnouncementBasePath';
import { useAnnouncementTableConfig } from '@pages/shared/announcement-management/useAnnouncementTableConfig';
import {
    bulkDeleteAnnouncements,
    deleteAnnouncement,
    listAnnouncements,
    listMyAnnouncementsFeed
} from '@services/announcement.service';
import {
    bulkDeleteEvents,
    deleteEvent,
    listEvents,
    listMyEventsFeed
} from '@services/event.service';
import { AnnouncementFilterValues, CommunicationListRow } from '@type/announcement.type';
import { EventFeedRow } from '@type/event.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import { canManageCommunication } from '@utils/communication.util';
import { getRoleFromPath } from '@utils/role-path.util';
import { useAppStore } from '@stores/app.store';
import { useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

const COMMUNICATION_SORT_COLUMNS: SortColumn[] = [
    { field: 'date', label: 'Date' },
    { field: 'title', label: 'Title' }
];

const FILTER_COMMUNICATION_FORM_ID = 'filter-communication-form';

interface AnnouncementManagementProps {
    defaultTab?: 'announcements' | 'events';
}

export default function AnnouncementManagement({ defaultTab }: AnnouncementManagementProps = {}) {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    const currentRole = getRoleFromPath(pathname);
    const isManagementRole = currentRole !== 'Student';

    // In viewing mode, users view communications targeted to them (audience feed).
    // In management mode, management roles perform CRUD operations.
    const modeParam = searchParams.get('mode');
    const mode: 'viewing' | 'management' = !isManagementRole
        ? 'viewing'
        : (modeParam === 'viewing' ? 'viewing' : 'management');
    const isViewingOnly = mode === 'viewing';

    const isEvent = pathname.includes('/event-management') || defaultTab === 'events';
    const basePath = useAnnouncementBasePath();

    const [activeFilters, setActiveFilters] = useState<AnnouncementFilterValues | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Modal viewers for instant preview in viewing mode
    const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    const filterMethods = useForm<AnnouncementFilterValues>({
        defaultValues: {
            audience: 'All',
            is_pinned: 'All',
            type: isEvent ? 'Event' : 'All'
        }
    });

    const rowMapRef = useRef<Map<string, CommunicationListRow>>(new Map());

    const handleModeChange = useCallback(function(newMode: 'viewing' | 'management') {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('mode', newMode);
        setSearchParams(nextParams, { replace: true });
    }, [searchParams, setSearchParams]);

    const handleOpenDetail = useCallback(function(id: string) {
        const item = rowMapRef.current.get(id);
        const itemType = item?.item_type;

        if (isViewingOnly) {
            if (itemType === 'Event') {
                setSelectedEventId(id);
            } else {
                setSelectedAnnouncementId(id);
            }
            return;
        }

        const typeQuery = itemType === 'Event' ? '?type=Event' : '';
        navigate(`${basePath}/${id}${typeQuery}`, {
            state: { from: pathname }
        });
    }, [basePath, isViewingOnly, navigate, pathname]);

    const handleOpenEdit = useCallback(function(id: string) {
        const item = rowMapRef.current.get(id);
        const itemType = item?.item_type;
        const typeQuery = itemType === 'Event' ? '&type=Event' : '';
        navigate(`${basePath}/${id}?edit=1${typeQuery}`, {
            state: { from: pathname }
        });
    }, [basePath, navigate, pathname]);

    const currentUserId = useAppStore((s) => s.userProfile?.id || s.session?.user?.id);

    const {
        columnDefs,
        tableActionConfig
    } = useAnnouncementTableConfig({
        currentUserId,
        currentUserRole: currentRole,
        isViewingOnly,
        onEdit: isViewingOnly ? undefined : handleOpenEdit,
        onView: handleOpenDetail
    });

    const fetchCommunications = useCallback(async function(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ): Promise<ServiceResult<CommonListResDto<CommunicationListRow>>> {
        const filterType = activeFilters?.type ?? (isEvent ? 'Event' : 'All');
        const audience = activeFilters && activeFilters.audience !== 'All'
            ? activeFilters.audience
            : null;
        const isPinned = activeFilters?.is_pinned === 'true'
            ? true
            : activeFilters?.is_pinned === 'false'
                ? false
                : null;

        // --- VIEWING MODE (Audience Feed) ---
        if (isViewingOnly) {
            if (filterType === 'Announcement') {
                const fetchSize = (audience || isPinned !== null) ? Math.max(page * size, 50) : size;
                const fetchPage = (audience || isPinned !== null) ? 1 : page;
                const res = await listMyAnnouncementsFeed(fetchPage, fetchSize, search, currentRole);
                if (res.error) {
                    return { data: null, error: res.error };
                }

                let items = res.data?.content ?? [];
                if (audience) {
                    items = items.filter((a) => a.target_audience === audience);
                }
                if (isPinned !== null) {
                    items = items.filter((a) => a.is_pinned === isPinned);
                }

                const rows: CommunicationListRow[] = items.map((a: any) => ({
                    attachment_count: a.attachment_count ?? a.attachments?.length ?? 0,
                    author_name: a.author_name,
                    content: a.content,
                    created_at: a.created_at,
                    date: a.published_at || a.created_at,
                    id: a.id,
                    is_pinned: a.is_pinned,
                    item_type: 'Announcement',
                    section_count: a.section_count ?? 0,
                    target_audience: a.target_audience,
                    title: a.title,
                    total_count: (audience || isPinned !== null) ? items.length : (res.data?.totalElements ?? items.length)
                }));

                for (const r of rows) {
                    rowMapRef.current.set(r.id, r);
                }

                const activeSortField = sort[0]?.sortKey || (sort[0] as unknown as Record<string, string>)?.field || 'date';
                const activeSortOrder = sort[0] ? (sort[0].isAsc ? 'asc' : 'desc') : 'desc';

                rows.sort((a, b) => {
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

                const totalCount = (audience || isPinned !== null) ? rows.length : (res.data?.totalElements ?? rows.length);
                const totalPages = Math.ceil(totalCount / size);
                const paginatedRows = (audience || isPinned !== null)
                    ? rows.slice((page - 1) * size, (page - 1) * size + size)
                    : rows;

                return {
                    data: {
                        content: paginatedRows,
                        empty: paginatedRows.length === 0,
                        first: page === 1,
                        last: page >= totalPages,
                        number: page - 1,
                        numberOfElements: paginatedRows.length,
                        pageable: {
                            offset: (page - 1) * size,
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
            }

            if (filterType === 'Event') {
                const from = new Date(0).toISOString();
                const to = new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString();
                const res = await listMyEventsFeed(from, to, currentRole);
                if (res.error) {
                    return { data: null, error: res.error };
                }

                let items = res.data ?? [];
                if (search) {
                    const s = search.toLowerCase();
                    items = items.filter((e) =>
                        (e.title || '').toLowerCase().includes(s) ||
                        (e.description || '').toLowerCase().includes(s) ||
                        (e.location || '').toLowerCase().includes(s)
                    );
                }
                if (audience) {
                    items = items.filter((e) => e.target_audience === audience);
                }

                const rows: CommunicationListRow[] = items.map((e) => ({
                    attachment_count: e.attachment_count ?? e.attachments?.length ?? 0,
                    author_name: null,
                    content: e.description || '',
                    created_at: e.start_at,
                    date: e.start_at,
                    end_at: e.end_at ? e.end_at : undefined,
                    id: e.id,
                    is_pinned: false,
                    item_type: 'Event',
                    location: e.location ?? undefined,
                    section_count: 0,
                    start_at: e.start_at,
                    target_audience: e.target_audience,
                    title: e.title,
                    total_count: items.length
                }));

                for (const r of rows) {
                    rowMapRef.current.set(r.id, r);
                }

                const activeSortField = sort[0]?.sortKey || (sort[0] as unknown as Record<string, string>)?.field || 'date';
                const activeSortOrder = sort[0] ? (sort[0].isAsc ? 'asc' : 'desc') : 'asc';

                rows.sort((a, b) => {
                    let valA: string | number = '';
                    let valB: string | number = '';
                    if (activeSortField === 'title') {
                        valA = (a.title || '').toLowerCase();
                        valB = (b.title || '').toLowerCase();
                    } else {
                        valA = new Date(a.date || a.created_at).getTime() || 0;
                        valB = new Date(b.date || b.created_at).getTime() || 0;
                    }
                    if (valA < valB) return activeSortOrder === 'asc' ? -1 : 1;
                    if (valA > valB) return activeSortOrder === 'asc' ? 1 : -1;
                    return 0;
                });

                const totalCount = rows.length;
                const totalPages = Math.ceil(totalCount / size);
                const startIdx = (page - 1) * size;
                const paginatedRows = rows.slice(startIdx, startIdx + size);

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
            }

            // filterType === 'All' in Viewing Mode
            const fetchLimit = Math.max(page * size, 50);
            const from = new Date(0).toISOString();
            const to = new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString();

            const [annRes, evtRes] = await Promise.all([
                listMyAnnouncementsFeed(1, fetchLimit, search, currentRole),
                isPinned === true
                    ? Promise.resolve({ data: [] as EventFeedRow[], error: null })
                    : listMyEventsFeed(from, to, currentRole)
            ]);

            if (annRes.error && evtRes.error) {
                return { data: null, error: annRes.error || evtRes.error };
            }

            let annItems = annRes.data?.content ?? [];
            if (audience) {
                annItems = annItems.filter((a) => a.target_audience === audience);
            }
            if (isPinned !== null) {
                annItems = annItems.filter((a) => a.is_pinned === isPinned);
            }

            const annRows: CommunicationListRow[] = annItems.map((a: any) => ({
                attachment_count: a.attachment_count ?? a.attachments?.length ?? 0,
                author_name: a.author_name,
                content: a.content,
                created_at: a.created_at,
                date: a.published_at || a.created_at,
                id: a.id,
                is_pinned: a.is_pinned,
                item_type: 'Announcement',
                section_count: a.section_count ?? 0,
                target_audience: a.target_audience,
                title: a.title,
                total_count: a.total_count ?? annRes.data?.totalElements ?? 0
            }));

            let evtItems = (evtRes.data as EventFeedRow[]) ?? [];
            if (search) {
                const s = search.toLowerCase();
                evtItems = evtItems.filter((e) =>
                    (e.title || '').toLowerCase().includes(s) ||
                    (e.description || '').toLowerCase().includes(s) ||
                    (e.location || '').toLowerCase().includes(s)
                );
            }
            if (audience) {
                evtItems = evtItems.filter((e) => e.target_audience === audience);
            }

            const evtRows: CommunicationListRow[] = evtItems.map((e) => ({
                attachment_count: e.attachment_count ?? e.attachments?.length ?? 0,
                author_name: null,
                content: e.description || '',
                created_at: e.start_at,
                date: e.start_at,
                end_at: e.end_at ? e.end_at : undefined,
                id: e.id,
                is_pinned: false,
                item_type: 'Event',
                location: e.location ?? undefined,
                section_count: 0,
                start_at: e.start_at,
                target_audience: e.target_audience,
                title: e.title,
                total_count: evtItems.length
            }));

            const combined = [...annRows, ...evtRows];
            for (const r of combined) {
                rowMapRef.current.set(r.id, r);
            }

            const activeSortField = sort[0]?.sortKey || (sort[0] as unknown as Record<string, string>)?.field || 'date';
            const activeSortOrder = sort[0] ? (sort[0].isAsc ? 'asc' : 'desc') : 'desc';

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

            const totalCount = combined.length;
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
        }

        // --- MANAGEMENT MODE (CRUD) ---
        if (filterType === 'Announcement') {
            const annSort = sort.map((s: any) => ((s.sortKey || s.field) === 'date' ? { sortKey: 'created_at', isAsc: s.isAsc ?? true } : s));
            const res = await listAnnouncements(page, size, search, annSort, audience, isPinned, currentRole);
            if (res.error) {
                return { data: null, error: res.error };
            }

            const rows: CommunicationListRow[] = (res.data?.content ?? []).map((a) => ({
                attachment_count: a.attachment_count ?? 0,
                author_name: a.author_name,
                content: a.content,
                created_at: a.created_at,
                created_by: a.created_by,
                created_by_role: a.created_by_role,
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
            const evtSort = sort.map((s: any) => ((s.sortKey || s.field) === 'date' ? { sortKey: 'start_at', isAsc: s.isAsc ?? true } : s));
            const res = await listEvents(page, size, search, evtSort, audience, false, currentRole);
            if (res.error) {
                return { data: null, error: res.error };
            }

            const rows: CommunicationListRow[] = (res.data?.content ?? []).map((e) => ({
                attachment_count: e.attachment_count ?? 0,
                author_name: e.author_name ?? null,
                content: e.description || '',
                created_at: e.created_at,
                created_by: e.created_by,
                created_by_role: e.created_by_role,
                date: e.start_at || e.created_at,
                end_at: e.end_at ? e.end_at : undefined,
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

        // filterType === 'All' in Management Mode
        const fetchLimit = Math.max(page * size, 50);
        const annSort = sort.map((s: any) => ((s.sortKey || s.field) === 'date' ? { sortKey: 'created_at', isAsc: s.isAsc ?? true } : s));
        const evtSort = sort.map((s: any) => ((s.sortKey || s.field) === 'date' ? { sortKey: 'start_at', isAsc: s.isAsc ?? true } : s));

        const [annRes, evtRes] = await Promise.all([
            listAnnouncements(1, fetchLimit, search, annSort, audience, isPinned, currentRole),
            isPinned === true
                ? Promise.resolve({ data: null, error: null })
                : listEvents(1, fetchLimit, search, evtSort, audience, false, currentRole)
        ]);

        if (annRes.error && evtRes.error) {
            return { data: null, error: annRes.error || evtRes.error };
        }

        const annRows: CommunicationListRow[] = (annRes.data?.content ?? []).map((a) => ({
            attachment_count: a.attachment_count ?? 0,
            author_name: a.author_name,
            content: a.content,
            created_at: a.created_at,
            created_by: a.created_by,
            created_by_role: a.created_by_role,
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
            created_by: e.created_by,
            created_by_role: e.created_by_role,
            date: e.start_at || e.created_at,
            end_at: e.end_at ? e.end_at : undefined,
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

        const activeSortField = sort[0]?.sortKey || (sort[0] as unknown as Record<string, string>)?.field || 'date';
        const activeSortOrder = sort[0] ? (sort[0].isAsc ? 'asc' : 'desc') : 'desc';

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
    }, [activeFilters, currentRole, isEvent, isViewingOnly]);

    async function handleDeleteRow(id: string) {
        const item = rowMapRef.current.get(id);
        if (item && !canManageCommunication(item, currentUserId, currentRole)) {
            return { data: null, error: { message: 'You do not have permission to delete this item.' } as any };
        }
        if (item?.item_type === 'Event') {
            return deleteEvent(id);
        }
        return deleteAnnouncement(id);
    }

    async function handleBulkDelete(ids: string[]) {
        const allowedIds = ids.filter((id) => {
            const item = rowMapRef.current.get(id);
            return item ? canManageCommunication(item, currentUserId, currentRole) : false;
        });

        if (allowedIds.length === 0) {
            return { data: null, error: { message: 'You do not have permission to delete the selected items.' } as any };
        }

        const annIds: string[] = [];
        const evtIds: string[] = [];

        for (const id of allowedIds) {
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
                    subheader: isEvent
                        ? (isViewingOnly
                            ? 'Browse and search campus events addressed to you.'
                            : 'Schedule campus events and track activities for your community.')
                        : (isViewingOnly
                            ? 'Browse, filter, and search campus announcements and events addressed to you.'
                            : 'Publish announcements and schedule campus events for your community.'),
                    title: isEvent
                        ? (isViewingOnly ? 'Campus Events' : 'Event Management')
                        : (isViewingOnly ? 'Campus Announcements & Events' : 'Announcements & Events')
                }}
                controls={{
                    tableButtonsProps: isViewingOnly ? undefined : {
                        createButtonProps: {
                            children: isEvent ? 'Create Event' : 'Create Post',
                            onClick: function() {
                                navigate(`${basePath}/new`);
                            }
                        }
                    },
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.announcements
                    }
                }}
                dependencies={[activeFilters, mode]}
                modeToggle={isManagementRole ? {
                    mode,
                    onToggleMode: handleModeChange
                } : undefined}
                filterModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: isEvent
                                ? 'Narrow the list by audience or status.'
                                : 'Narrow the list by type, audience, or pinned status.',
                            title: isEvent ? 'Filter Events' : 'Filter Announcements & Events'
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
                            currentUserId={currentUserId}
                            currentUserRole={currentRole}
                            isSelected={isSelected}
                            isViewingOnly={isViewingOnly}
                            row={item}
                            onEdit={isViewingOnly ? undefined : handleOpenEdit}
                            onRequestDelete={isViewingOnly ? undefined : onRequestDeleteRow}
                            onToggleSelect={isViewingOnly ? undefined : onToggleSelect}
                            onView={handleOpenDetail}
                        />
                    );
                }}
                sortColumns={COMMUNICATION_SORT_COLUMNS}
                tableActionConfig={tableActionConfig}
                tableProps={{
                    hasCheckbox: !isViewingOnly,
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
                onDelete={isViewingOnly ? undefined : handleBulkDelete}
                onDeleteRow={isViewingOnly ? undefined : handleDeleteRow}
                onFetch={fetchCommunications}
                onFilter={function() {
                    setIsFilterOpen(true);
                }}
                onRowClick={handleOpenDetail}
            />
            <AnnouncementDetailModal
                announcementId={selectedAnnouncementId}
                onClose={() => setSelectedAnnouncementId(null)}
            />
            <EventDetailModal
                eventId={selectedEventId}
                onClose={() => setSelectedEventId(null)}
            />
        </div>
    );
}