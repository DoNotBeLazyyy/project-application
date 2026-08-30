import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import AnnouncementFilterForm from '@pages/shared/announcement-management/AnnouncementFilterForm';
import AnnouncementGridCard from '@pages/shared/announcement-management/AnnouncementGridCard';
import { useAnnouncementBasePath } from '@pages/shared/announcement-management/useAnnouncementBasePath';
import { useAnnouncementTableConfig } from '@pages/shared/announcement-management/useAnnouncementTableConfig';
import { bulkDeleteAnnouncements, deleteAnnouncement, listAnnouncements } from '@services/announcement.service';
import { AnnouncementFilterValues, AnnouncementListRow } from '@type/announcement.type';
import { SortStringDto } from '@type/http.type';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'title', label: 'Title' },
    { field: 'created_at', label: 'Posted On' }
];

const FILTER_FORM_ID = 'filter-announcement-form';

export default function AnnouncementManagement() {
    const navigate = useNavigate();
    const basePath = useAnnouncementBasePath();
    const [activeFilters, setActiveFilters] = useState<AnnouncementFilterValues | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const filterMethods = useForm<AnnouncementFilterValues>({
        defaultValues: { audience: 'All', is_pinned: 'All' }
    });

    function handleOpenDetail(id: string) {
        navigate(`${basePath}/${id}`);
    }

    function handleOpenEdit(id: string) {
        navigate(`${basePath}/${id}?edit=1`);
    }

    const { columnDefs, tableActionConfig } = useAnnouncementTableConfig({
        onEdit: handleOpenEdit,
        onView: handleOpenDetail
    });

    async function fetchAnnouncements(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        const audience = activeFilters && activeFilters.audience !== 'All'
            ? activeFilters.audience
            : null;
        const isPinned = activeFilters?.is_pinned === 'true'
            ? true
            : activeFilters?.is_pinned === 'false'
                ? false
                : null;

        return listAnnouncements(page, size, search, sort, audience, isPinned);
    }

    function handleFilterSubmit(values: AnnouncementFilterValues) {
        setActiveFilters(values);
        setIsFilterOpen(false);
    }

    function handleFilterReset() {
        filterMethods.reset();
        setActiveFilters(null);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<AnnouncementListRow>
                cardHeaderProps={{
                    subheader: 'Post announcements and reach the right audience.',
                    title: 'Announcements'
                }}
                controls={{
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.announcements
                    },
                    tableButtonsProps: {
                        createButtonProps: {
                            onClick: function() {
                                navigate(`${basePath}/new`);
                            }
                        }
                    }
                }}
                dependencies={[activeFilters]}
                filterModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Narrow the list by audience or pinned status.',
                            title: 'Filter Announcements'
                        }
                    },
                    confirmText: 'Apply Filters',
                    formId: FILTER_FORM_ID,
                    formContent: (
                        <AnnouncementFilterForm
                            control={filterMethods.control}
                            id={FILTER_FORM_ID}
                            onSubmit={filterMethods.handleSubmit(handleFilterSubmit)}
                        />
                    ),
                    onReset: handleFilterReset,
                    open: isFilterOpen,
                    onClose: function() {
                        setIsFilterOpen(false);
                    }
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
                sortColumns={SORT_COLUMNS}
                tableActionConfig={tableActionConfig}
                tableProps={{
                    hasCheckbox: true,
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
                onDelete={bulkDeleteAnnouncements}
                onDeleteRow={deleteAnnouncement}
                onFetch={fetchAnnouncements}
                onFilter={function() {
                    setIsFilterOpen(true);
                }}
                onRowClick={handleOpenDetail}
            />
        </div>
    );
}