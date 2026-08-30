import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import { useScheduleConflictTableConfig } from '@pages/dean/schedule-conflicts/hooks/useScheduleConflictTableConfig';
import ScheduleConflictFilterForm from '@pages/dean/schedule-conflicts/ScheduleConflictFilterForm';
import { listScheduleConflicts } from '@services/faculty-load.service';
import { getActiveTerm } from '@services/term/term.service';
import { ScheduleConflictFilterValues, ScheduleConflictRow } from '@type/faculty-load.type';
import { SortStringDto } from '@type/http.type';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

const CONFLICT_FILTER_FORM_ID = 'filter-schedule-conflict-form';

const CONFLICT_SORT_COLUMNS: SortColumn[] = [
    { field: 'conflict_type', label: 'Type' },
    { field: 'subject_label', label: 'Faculty / Room' },
    { field: 'day_of_week', label: 'Day' },
    { field: 'section_a', label: 'Section A' },
    { field: 'section_b', label: 'Section B' }
];

const defaultConflictFilters: ScheduleConflictFilterValues = {
    conflict_types: [],
    term_id: ''
};

export default function ScheduleConflictsManagement() {
    const [activeTermId, setActiveTermId] = useState('');
    const [isTermResolved, setIsTermResolved] = useState(false);
    const [conflictFilters, setConflictFilters] = useState<ScheduleConflictFilterValues>(defaultConflictFilters);
    const [isConflictFilterOpen, setIsConflictFilterOpen] = useState(false);

    const conflictFilterMethods = useForm<ScheduleConflictFilterValues>({
        defaultValues: defaultConflictFilters
    });

    const { columnDefs: conflictColumnDefs } = useScheduleConflictTableConfig();
    const { reset: resetConflictFilterForm } = conflictFilterMethods;

    useEffect(function() {
        async function fetchActiveTerm() {
            const result = await getActiveTerm();
            const termId = result.data?.term_id ?? '';

            setActiveTermId(termId);
            setConflictFilters({ conflict_types: [], term_id: termId });
            resetConflictFilterForm({ conflict_types: [], term_id: termId });
            setIsTermResolved(true);
        }

        fetchActiveTerm();
    }, [resetConflictFilterForm]);

    function handleConflictFilterSubmit(values: ScheduleConflictFilterValues) {
        setConflictFilters(values);
        setIsConflictFilterOpen(false);
    }

    function handleConflictFilterReset() {
        const resetValues: ScheduleConflictFilterValues = {
            conflict_types: [],
            term_id: activeTermId
        };

        conflictFilterMethods.reset(resetValues);
        setConflictFilters(resetValues);
    }

    async function fetchScheduleConflicts(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listScheduleConflicts(page, size, search, sort, conflictFilters);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            {isTermResolved && (
                <CommonTableCard<ScheduleConflictRow>
                    cardHeaderProps={{
                        subheader: 'Overlapping meeting times detected across sections.',
                        title: 'Schedule Conflicts'
                    }}
                    controls={{
                        tableInputProps: {
                            searchHints: SEARCH_HINTS.scheduleConflicts
                        }
                    }}
                    dependencies={[conflictFilters]}
                    filterModalProps={{
                        cardProps: {
                            cardHeaderProps: {
                                subheader: 'Filter conflicts by term and conflict type.',
                                title: 'Filter Conflicts'
                            }
                        },
                        confirmText: 'Apply Filters',
                        formId: CONFLICT_FILTER_FORM_ID,
                        formContent: (
                            <ScheduleConflictFilterForm
                                control={conflictFilterMethods.control}
                                id={CONFLICT_FILTER_FORM_ID}
                                onSubmit={conflictFilterMethods.handleSubmit(handleConflictFilterSubmit)}
                            />
                        ),
                        onReset: handleConflictFilterReset,
                        open: isConflictFilterOpen,
                        onClose: function() {
                            setIsConflictFilterOpen(false);
                        }
                    }}
                    sortColumns={CONFLICT_SORT_COLUMNS}
                    tableProps={{
                        leadingColumnDefs: conflictColumnDefs
                    }}
                    uniqueIdKey="id"
                    onFetch={fetchScheduleConflicts}
                    onFilter={function() {
                        setIsConflictFilterOpen(true);
                    }}
                />
            )}
        </div>
    );
}