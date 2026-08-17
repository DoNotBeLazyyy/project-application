import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import { ChalkboardTeacherIcon, WarningIcon } from '@phosphor-icons/react';
import FacultyLoadFilterForm from '@pages/dean/faculty-load/FacultyLoadFilterForm';
import { useFacultyLoadTableConfig } from '@pages/dean/faculty-load/hooks/useFacultyLoadTableConfig';
import { useScheduleConflictTableConfig } from '@pages/dean/faculty-load/hooks/useScheduleConflictTableConfig';
import ScheduleConflictFilterForm from '@pages/dean/faculty-load/ScheduleConflictFilterForm';
import { listFacultyLoad, listScheduleConflicts } from '@services/faculty-load.service';
import { getActiveTerm } from '@services/term/term.service';
import { FacultyLoadFilterValues, FacultyLoadRow, ScheduleConflictFilterValues, ScheduleConflictRow } from '@type/faculty-load.type';
import { SortStringDto } from '@type/http.type';
import { SyntheticEvent, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';

type FacultyLoadTab = 'load' | 'conflicts';

const LOAD_FILTER_FORM_ID = 'filter-faculty-load-form';
const CONFLICT_FILTER_FORM_ID = 'filter-schedule-conflict-form';

const LOAD_SORT_COLUMNS: SortColumn[] = [
    { field: 'faculty_name', label: 'Faculty' },
    { field: 'section_count', label: 'Sections' },
    { field: 'total_units', label: 'Units' },
    { field: 'weekly_hours', label: 'Hrs / Week' },
    { field: 'student_count', label: 'Students' }
];

const CONFLICT_SORT_COLUMNS: SortColumn[] = [
    { field: 'conflict_type', label: 'Type' },
    { field: 'subject_label', label: 'Faculty / Room' },
    { field: 'day_of_week', label: 'Day' },
    { field: 'section_a', label: 'Section A' },
    { field: 'section_b', label: 'Section B' }
];

const defaultLoadFilters: FacultyLoadFilterValues = { term_id: '' };

const defaultConflictFilters: ScheduleConflictFilterValues = {
    term_id: '',
    conflict_types: []
};

function resolveInitialTab(tab: string | null): FacultyLoadTab {
    return tab === 'conflicts'
        ? 'conflicts'
        : 'load';
}

export default function FacultyLoadManagement() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<FacultyLoadTab>(resolveInitialTab(searchParams.get('tab')));
    const [activeTermId, setActiveTermId] = useState('');
    const [isTermResolved, setIsTermResolved] = useState(false);
    const [loadFilters, setLoadFilters] = useState<FacultyLoadFilterValues>(defaultLoadFilters);
    const [conflictFilters, setConflictFilters] = useState<ScheduleConflictFilterValues>(defaultConflictFilters);
    const [isLoadFilterOpen, setIsLoadFilterOpen] = useState(false);
    const [isConflictFilterOpen, setIsConflictFilterOpen] = useState(false);

    const loadFilterMethods = useForm<FacultyLoadFilterValues>({
        defaultValues: defaultLoadFilters
    });

    const conflictFilterMethods = useForm<ScheduleConflictFilterValues>({
        defaultValues: defaultConflictFilters
    });

    const { columnDefs: loadColumnDefs } = useFacultyLoadTableConfig();
    const { columnDefs: conflictColumnDefs } = useScheduleConflictTableConfig();

    const { reset: resetLoadFilterForm } = loadFilterMethods;
    const { reset: resetConflictFilterForm } = conflictFilterMethods;

    useEffect(function() {
        async function fetchActiveTerm() {
            const result = await getActiveTerm();
            const termId = result.data?.term_id ?? '';

            setActiveTermId(termId);
            setLoadFilters({ term_id: termId });
            setConflictFilters({ conflict_types: [], term_id: termId });
            resetLoadFilterForm({ term_id: termId });
            resetConflictFilterForm({ conflict_types: [], term_id: termId });
            setIsTermResolved(true);
        }

        fetchActiveTerm();
    }, [resetConflictFilterForm, resetLoadFilterForm]);

    function handleTabChange(_: SyntheticEvent, value: string) {
        setActiveTab(value as FacultyLoadTab);
    }

    function handleLoadFilterSubmit(values: FacultyLoadFilterValues) {
        setLoadFilters(values);
        setIsLoadFilterOpen(false);
    }

    function handleLoadFilterReset() {
        const resetValues: FacultyLoadFilterValues = { term_id: activeTermId };

        loadFilterMethods.reset(resetValues);
        setLoadFilters(resetValues);
    }

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

    async function fetchFacultyLoad(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listFacultyLoad(page, size, search, sort, loadFilters);
    }

    async function fetchScheduleConflicts(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listScheduleConflicts(page, size, search, sort, conflictFilters);
    }

    function handleRowClick(facultyId: string) {
        navigate(`/dean/faculty-load/${facultyId}${loadFilters.term_id
            ? `?termId=${loadFilters.term_id}`
            : ''}`);
    }

    const tabMenu = (
        <CommonTabMenu
            menuStyle="outline"
            size="small"
            tabs={[
                {
                    icon: <ChalkboardTeacherIcon />,
                    label: 'Load',
                    value: 'load'
                },
                {
                    icon: <WarningIcon />,
                    label: 'Conflicts',
                    value: 'conflicts'
                }
            ]}
            value={activeTab}
            onChange={handleTabChange}
        />
    );

    return (
        <div className="flex flex-col gap-4 h-full">
            {isTermResolved && activeTab === 'load' && (
                <CommonTableCard<FacultyLoadRow>
                    cardHeaderProps={{
                        subheader: 'Select a faculty member to see their sections and meeting times.',
                        title: tabMenu
                    }}
                    controls={{
                        tableInputProps: {
                            searchHints: SEARCH_HINTS.facultyLoad
                        }
                    }}
                    dependencies={[loadFilters]}
                    filterModalProps={{
                        cardProps: {
                            cardHeaderProps: {
                                subheader: 'Filter teaching load by term.',
                                title: 'Filter Teaching Load'
                            }
                        },
                        confirmText: 'Apply Filters',
                        formId: LOAD_FILTER_FORM_ID,
                        formContent: (
                            <FacultyLoadFilterForm
                                control={loadFilterMethods.control}
                                id={LOAD_FILTER_FORM_ID}
                                onSubmit={loadFilterMethods.handleSubmit(handleLoadFilterSubmit)}
                            />
                        ),
                        onReset: handleLoadFilterReset,
                        open: isLoadFilterOpen,
                        onClose: function() {
                            setIsLoadFilterOpen(false);
                        }
                    }}
                    sortColumns={LOAD_SORT_COLUMNS}
                    tableProps={{
                        leadingColumnDefs: loadColumnDefs
                    }}
                    uniqueIdKey="id"
                    onFetch={fetchFacultyLoad}
                    onFilter={function() {
                        setIsLoadFilterOpen(true);
                    }}
                    onRowClick={handleRowClick}
                />
            )}

            {isTermResolved && activeTab === 'conflicts' && (
                <CommonTableCard<ScheduleConflictRow>
                    cardHeaderProps={{
                        subheader: 'Overlapping meeting times detected across sections.',
                        title: tabMenu
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