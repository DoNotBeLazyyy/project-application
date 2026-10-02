import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import FacultyLoadFilterForm from '@pages/dean/faculty-load/FacultyLoadFilterForm';
import FacultyLoadWizardModal from '@pages/dean/faculty-load/FacultyLoadWizardModal';
import { useFacultyLoadTableConfig } from '@pages/dean/faculty-load/hooks/useFacultyLoadTableConfig';
import { listFacultyLoad } from '@services/faculty-load.service';
import { getActiveTerm } from '@services/term/term.service';
import { FacultyLoadFilterValues, FacultyLoadRow } from '@type/faculty-load.type';
import { SortStringDto } from '@type/http.type';
import { useCallback, useEffect, useState } from 'react';
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
    const queryFacultyId = searchParams.get('facultyId');

    const [activeTermId, setActiveTermId] = useState('');
    const [isTermResolved, setIsTermResolved] = useState(false);
    const [loadFilters, setLoadFilters] = useState<FacultyLoadFilterValues>(defaultLoadFilters);
    const [isLoadFilterOpen, setIsLoadFilterOpen] = useState(false);

    // Detail Stepper Modal state
    const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(queryFacultyId);
    const [isDetailOpen, setIsDetailOpen] = useState(Boolean(queryFacultyId));

    const loadFilterMethods = useForm<FacultyLoadFilterValues>({
        defaultValues: defaultLoadFilters
    });

    const handleOpenView = useCallback((facultyId: string) => {
        setSelectedFacultyId(facultyId);
        setIsDetailOpen(true);
    }, []);

    const handleOpenEdit = useCallback((facultyId: string) => {
        navigate(`/dean/section-management?createSection=true&facultyId=${facultyId}`);
    }, [navigate]);

    const { columnDefs: loadColumnDefs, tableActionConfig } = useFacultyLoadTableConfig({
        onEdit: handleOpenEdit,
        onView: handleOpenView
    });

    const { reset: resetLoadFilterForm } = loadFilterMethods;

    useEffect(function() {
        async function fetchActiveTerm() {
            const result = await getActiveTerm();
            const termId = result.data?.term_id ?? '';

            setActiveTermId(termId);
            setLoadFilters({ term_id: '' });
            resetLoadFilterForm({ term_id: '' });
            setIsTermResolved(true);
        }

        fetchActiveTerm();
    }, [resetLoadFilterForm]);

    // Handle initial query param facultyId
    useEffect(() => {
        if (queryFacultyId) {
            setSelectedFacultyId(queryFacultyId);
            setIsDetailReadOnly(true);
            setIsDetailOpen(true);
        }
    }, [queryFacultyId]);

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

    function handleCloseDetail() {
        setIsDetailOpen(false);
        setSelectedFacultyId(null);
        if (queryFacultyId) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('facultyId');
            setSearchParams(nextParams, { replace: true });
        }
    }

    function handleDetailSuccess() {
        setLoadFilters((prev) => ({ ...prev }));
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            {isTermResolved && (
                <div className="flex-1 min-h-0">
                    <CommonTableCard<FacultyLoadRow>
                        cardHeaderProps={{
                            subheader: 'Review faculty workload, assigned sections, and conflict schedule in the detail modal stepper.',
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
                        tableActionConfig={tableActionConfig}
                        tableProps={{
                            leadingColumnDefs: loadColumnDefs
                        }}
                        uniqueIdKey="id"
                        onFetch={fetchFacultyLoad}
                        onFilter={function() {
                            setIsLoadFilterOpen(true);
                        }}
                        onRowClick={handleOpenView}
                    />
                </div>
            )}

            {/* Stepper Modal for Faculty Load Detail (Read & Write mode) */}
            <FacultyLoadWizardModal
                facultyId={selectedFacultyId}
                initialReadOnly={isDetailReadOnly}
                open={isDetailOpen}
                termId={loadFilters.term_id}
                onClose={handleCloseDetail}
                onSuccess={handleDetailSuccess}
            />
        </div>
    );
}