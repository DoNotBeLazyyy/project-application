import CommonButton from '@components/button/CommonButton';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import { CommonSelectOption } from '@components/select/CommonSelect';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { toTargetPath } from '@pages/student/evaluation/useEvaluationTargets';
import AcademicHonorsBanner from '@pages/student/grade/AcademicHonorsBanner';
import MyGradesFilterForm from '@pages/student/grade/MyGradesFilterForm';
import { getStudentInsight } from '@services/analytics.service';
import { getTerms } from '@services/section.service';
import { listStudentGrades } from '@services/student-portal.service';
import { StudentInsight } from '@type/analytics.type';
import { SortStringDto } from '@type/http.type';
import { MyGradeListRow, MyGradesFilterValues } from '@type/student-portal.type';
import { MobileCardColDef } from '@type/table.type';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'course_code', label: 'Course Code' },
    { field: 'course_title', label: 'Course Title' },
    { field: 'section_code', label: 'Section' },
    { field: 'term_label', label: 'Term' },
    { field: 'faculty_name', label: 'Faculty' },
    { field: 'grading_period_sequence', label: 'Grading Period' }
];

const FILTER_FORM_ID = 'filter-my-grades-form';

function formatGrade(value: number | null, isEvaluated: boolean, fallback: string | null = null): string {
    if (!isEvaluated) {
        return 'Locked';
    }

    if (value == null) {
        return fallback ?? '—';
    }

    return String(value);
}

export default function StudentGrades() {
    const navigate = useNavigate();
    const [termOptions, setTermOptions] = useState<CommonSelectOption[]>([]);
    const [activeFilters, setActiveFilters] = useState<MyGradesFilterValues | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [rows, setRows] = useState<MyGradeListRow[]>([]);
    const [insight, setInsight] = useState<StudentInsight | null>(null);
    const [isLoadingInsight, setIsLoadingInsight] = useState(true);

    const filterMethods = useForm<MyGradesFilterValues>({
        defaultValues: { term_id: '' }
    });

    useEffect(function() {
        async function fetchInsight() {
            setIsLoadingInsight(true);
            const result = await getStudentInsight(undefined, activeFilters?.term_id || undefined);
            if (result.data) {
                setInsight(result.data);
            }
            setIsLoadingInsight(false);
        }

        fetchInsight();
    }, [activeFilters?.term_id]);

    useEffect(function() {
        async function fetchTerms() {
            const result = await getTerms();

            if (result.data) {
                setTermOptions(result.data.map((t) => ({ label: t.label, value: t.id })));
            }
        }

        fetchTerms();
    }, []);

    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'course_code',
                flex: 1,
                headerName: 'Course Code',
                mobileCard: 'subtitle',
                sortable: true
            },
            {
                field: 'course_title',
                flex: 3,
                headerName: 'Course Title',
                mobileCard: 'title',
                sortable: true
            },
            {
                field: 'section_code',
                flex: 1,
                headerName: 'Section',
                mobileCard: 'hidden',
                sortable: true
            },
            {
                field: 'term_label',
                flex: 2,
                headerName: 'Term',
                mobileCard: 'hidden',
                sortable: true
            },
            {
                field: 'faculty_name',
                flex: 2,
                headerName: 'Faculty',
                mobileCard: 'hidden',
                sortable: true
            },
            {
                colId: 'grading_period_sequence',
                field: 'grading_period_name',
                flex: 1,
                headerName: 'Period',
                sortable: true
            },
            {
                field: 'raw_grade',
                flex: 1,
                headerName: 'Raw',
                sortable: false,
                valueFormatter: (params) => formatGrade(params.value, params.data?.evaluation_completed === true)
            },
            {
                field: 'final_grade',
                flex: 1,
                headerName: 'Final',
                sortable: false,
                valueFormatter: (params) => formatGrade(params.value, params.data?.evaluation_completed === true)
            },
            {
                field: 'transmuted_grade',
                flex: 1,
                headerName: 'Transmuted',
                sortable: false,
                valueFormatter: (params) => formatGrade(
                    params.value,
                    params.data?.evaluation_completed === true,
                    params.data?.special_grade ?? null
                )
            },
            {
                flex: 2,
                headerName: 'Evaluation',
                sortable: false,
                cellRenderer: (params: { data: MyGradeListRow }) => (
                    <div className="flex gap-2 h-full items-center">
                        {params.data.evaluation_completed
                            ? (
                                <span className="text-(--mui-palette-text-secondary) text-sm">
                                    Completed
                                </span>
                            )
                            : (
                                <CommonButton
                                    color="primary"
                                    size="small"
                                    variant="contained"
                                    onClick={function() {
                                        navigate(toTargetPath(params.data.enrollment_id, params.data.grading_period_id));
                                    }}
                                >
                                    Evaluate
                                </CommonButton>
                            )}
                    </div>
                )
            }
        ];
    }, []);

    async function fetchGrades(
        page: number,
        size: number,
        _search: string,
        sort: SortStringDto[]
    ) {
        const result = await listStudentGrades(page, size, sort, activeFilters?.term_id ?? '');

        if (!result.data) {
            return result;
        }

        const content = result.data.content.map(function(row) {
            return {
                ...row,
                row_id: `${row.enrollment_id}:${row.grading_period_id}`
            };
        });

        setRows(content);

        return {
            data: {
                ...result.data,
                content
            },
            error: null
        };
    }

    function handleRowClick(rowId: string) {
        const [enrollmentId, gradingPeriodId] = rowId.split(':');

        if (!enrollmentId || !gradingPeriodId) {
            return;
        }

        const row = rows.find(function(item) {
            return item.row_id === rowId;
        });

        if (row && !row.evaluation_completed) {
            navigate(toTargetPath(enrollmentId, gradingPeriodId));
            return;
        }

        navigate(`/student/grade/${enrollmentId}/${gradingPeriodId}`);
    }

    function handleFilterSubmit(values: MyGradesFilterValues) {
        setActiveFilters(values);
        setIsFilterOpen(false);
    }

    function handleFilterReset() {
        filterMethods.reset({ term_id: '' });
        setActiveFilters(null);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <AcademicHonorsBanner
                insight={insight}
                isLoading={isLoadingInsight}
            />

            <div className="flex-1 min-h-0">
                <CommonTableCard<MyGradeListRow>
                    cardHeaderProps={{
                        subheader: 'Released grades. Select a row to see its breakdown, or complete the faculty evaluation to unlock a locked row.',
                        title: 'My Grades'
                    }}
                    controls={{ hasInput: false }}
                    dependencies={[activeFilters]}
                    filterModalProps={{
                        cardProps: {
                            cardHeaderProps: {
                                subheader: 'Filter your grades by term.',
                                title: 'Filter Grades'
                            }
                        },
                        confirmText: 'Apply Filters',
                        formId: FILTER_FORM_ID,
                        formContent: (
                            <MyGradesFilterForm
                                control={filterMethods.control}
                                id={FILTER_FORM_ID}
                                termOptions={termOptions}
                                onSubmit={filterMethods.handleSubmit(handleFilterSubmit)}
                            />
                        ),
                        onReset: handleFilterReset,
                        open: isFilterOpen,
                        onClose: function() {
                            setIsFilterOpen(false);
                        }
                    }}
                    sortColumns={SORT_COLUMNS}
                    tableProps={{
                        leadingColumnDefs: columnDefs
                    }}
                    uniqueIdKey="row_id"
                    onFetch={fetchGrades}
                    onFilter={function() {
                        setIsFilterOpen(true);
                    }}
                    onRowClick={handleRowClick}
                />
            </div>
        </div>
    );
}