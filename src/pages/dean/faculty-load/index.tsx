import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import FacultyLoadFilterForm from '@pages/dean/faculty-load/FacultyLoadFilterForm';
import { useFacultyLoadTableConfig } from '@pages/dean/faculty-load/hooks/useFacultyLoadTableConfig';
import { listFacultyLoad } from '@services/faculty-load.service';
import { getActiveTerm } from '@services/term/term.service';
import { FacultyLoadFilterValues, FacultyLoadRow } from '@type/faculty-load.type';
import { SortStringDto } from '@type/http.type';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

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
            {isTermResolved && (
                <CommonTableCard<FacultyLoadRow>
                    cardHeaderProps={{
                        subheader: 'Select a faculty member to see their sections and meeting times.',
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
            )}
        </div>
    );
}