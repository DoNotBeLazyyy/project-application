import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import EventFilterForm from '@pages/shared/event-management/EventFilterForm';
import EventGridCard from '@pages/shared/event-management/EventGridCard';
import { useEventBasePath } from '@pages/shared/event-management/useEventBasePath';
import { useEventTableConfig } from '@pages/shared/event-management/useEventTableConfig';
import { bulkDeleteEvents, deleteEvent, listEvents } from '@services/event.service';
import { EventFilterValues, EventListRow } from '@type/event.type';
import { SortStringDto } from '@type/http.type';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'title', label: 'Title' },
    { field: 'start_at', label: 'Start Date' }
];

const FILTER_FORM_ID = 'filter-event-form';

export default function EventManagement() {
    const navigate = useNavigate();
    const basePath = useEventBasePath();
    const [activeFilters, setActiveFilters] = useState<EventFilterValues | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const filterMethods = useForm<EventFilterValues>({
        defaultValues: { audience: 'All', upcoming_only: 'All' }
    });

    function handleOpenDetail(id: string) {
        navigate(`${basePath}/${id}`);
    }

    function handleOpenEdit(id: string) {
        navigate(`${basePath}/${id}?edit=1`);
    }

    const { columnDefs, tableActionConfig } = useEventTableConfig({
        onEdit: handleOpenEdit,
        onView: handleOpenDetail
    });

    async function fetchEvents(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        const audience = activeFilters && activeFilters.audience !== 'All'
            ? activeFilters.audience
            : null;
        const upcomingOnly = activeFilters?.upcoming_only === 'true';

        return listEvents(page, size, search, sort, audience, upcomingOnly);
    }

    function handleFilterSubmit(values: EventFilterValues) {
        setActiveFilters(values);
        setIsFilterOpen(false);
    }

    function handleFilterReset() {
        filterMethods.reset();
        setActiveFilters(null);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<EventListRow>
                cardHeaderProps={{
                    subheader: 'Schedule events and share them with the right audience.',
                    title: 'Events'
                }}
                controls={{
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.events
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
                            subheader: 'Narrow the list by audience or timeframe.',
                            title: 'Filter Events'
                        }
                    },
                    confirmText: 'Apply Filters',
                    formId: FILTER_FORM_ID,
                    formContent: (
                        <EventFilterForm
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
                sortColumns={SORT_COLUMNS}
                tableActionConfig={tableActionConfig}
                tableProps={{
                    hasCheckbox: true,
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
                onDelete={bulkDeleteEvents}
                onDeleteRow={deleteEvent}
                onFetch={fetchEvents}
                onFilter={function() {
                    setIsFilterOpen(true);
                }}
                onRowClick={handleOpenDetail}
            />
        </div>
    );
}