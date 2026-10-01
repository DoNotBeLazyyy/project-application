import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import FacultyLoadFilterForm from '@pages/dean/faculty-load/FacultyLoadFilterForm';
import { useFacultyLoadTableConfig } from '@pages/dean/faculty-load/hooks/useFacultyLoadTableConfig';
import ScheduleConflictsManagement from '@pages/dean/schedule-conflicts';
import { ChalkboardTeacherIcon, WarningIcon } from '@phosphor-icons/react';
import { listFacultyLoad } from '@services/faculty-load.service';
import { getActiveTerm } from '@services/term/term.service';
import { FacultyLoadFilterValues, FacultyLoadRow } from '@type/faculty-load.type';
import { SortStringDto } from '@type/http.type';
import { classMerge } from '@utils/css.util';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';

const LOAD_FILTER_FORM_ID = 'filter-faculty-load-form';

const LOAD_SORT_COLUMNS: SortColumn[] = [
    { field: 'faculty_name', label: 'Faculty' },
    { field: 'section_count', label: 'Sections' },
    { field: 'total_units', label: 'Units' },
    { field: 'weekly_hours', label: 'Hrs / Week' },
    { field: 'student_count', label: 'Students' }
];

const defaultLoadFilters: FacultyLoadFilterValues = { term_id: '' };

export default function FacultyLoadManagement() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') === 'conflicts' ? 'conflicts' : 'loads';

    const [activeTermId, setActiveTermId] = useState('');
    const [isTermResolved, setIsTermResolved] = useState(false);
    const [loadFilters, setLoadFilters] = useState<FacultyLoadFilterValues>(defaultLoadFilters);
    const [isLoadFilterOpen, setIsLoadFilterOpen] = useState(false);

    const loadFilterMethods = useForm<FacultyLoadFilterValues>({
        defaultValues: defaultLoadFilters
    });

    const { columnDefs: loadColumnDefs } = useFacultyLoadTableConfig();
    const { reset: resetLoadFilterForm } = loadFilterMethods;

    useEffect(function() {
        async function fetchActiveTerm() {
            const result = await getActiveTerm();
            const termId = result.data?.term_id ?? '';

            setActiveTermId(termId);
            setLoadFilters({ term_id: termId });
            resetLoadFilterForm({ term_id: termId });
            setIsTermResolved(true);
        }

        fetchActiveTerm();
    }, [resetLoadFilterForm]);

    function handleLoadFilterSubmit(values: FacultyLoadFilterValues) {
        setLoadFilters(values);
        setIsLoadFilterOpen(false);
    }

    function handleLoadFilterReset() {
        const resetValues: FacultyLoadFilterValues = { term_id: activeTermId };

        loadFilterMethods.reset(resetValues);
        setLoadFilters(resetValues);
    }

    async function fetchFacultyLoad(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listFacultyLoad(page, size, search, sort, loadFilters);
    }

    function handleRowClick(facultyId: string) {
        navigate(`/dean/faculty-load/${facultyId}${loadFilters.term_id
            ? `?termId=${loadFilters.term_id}`
            : ''}`);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Faculty Loading View Selector Tabs */}
            <div className="flex items-center gap-2 border-b border-(--mui-palette-divider) pb-2 shrink-0">
                <button
                    type="button"
                    className={classMerge(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer',
                        activeTab === 'loads'
                            ? 'bg-brand-600 text-white shadow-xs'
                            : 'text-(--mui-palette-text-secondary) hover:text-(--mui-palette-text-primary) hover:bg-(--mui-palette-action-hover)'
                    )}
                    onClick={() => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete('tab');
                        setSearchParams(newParams);
                    }}
                >
                    <ChalkboardTeacherIcon size={18} weight={activeTab === 'loads' ? 'bold' : 'regular'} />
                    <span>Faculty Teaching Loads</span>
                </button>

                <button
                    type="button"
                    className={classMerge(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer',
                        activeTab === 'conflicts'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-(--mui-palette-text-secondary) hover:text-(--mui-palette-text-primary) hover:bg-(--mui-palette-action-hover)'
                    )}
                    onClick={() => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set('tab', 'conflicts');
                        setSearchParams(newParams);
                    }}
                >
                    <WarningIcon size={18} weight={activeTab === 'conflicts' ? 'bold' : 'regular'} />
                    <span>Schedule Conflicts</span>
                </button>
            </div>

            {/* Tab 1: Faculty Teaching Loads */}
            {activeTab === 'loads' && isTermResolved && (
                <div className="flex-1 min-h-0">
                    <CommonTableCard<FacultyLoadRow>
                        cardHeaderProps={{
                            subheader: 'Select a faculty member to see their sections, meeting times, and assign or reassign sections.',
                            title: 'Faculty Loading'
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
                </div>
            )}

            {/* Tab 2: Relocated Schedule Conflicts */}
            {activeTab === 'conflicts' && (
                <div className="flex-1 min-h-0">
                    <ScheduleConflictsManagement />
                </div>
            )}
        </div>
    );
}