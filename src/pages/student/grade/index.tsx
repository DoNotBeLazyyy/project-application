import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import { CommonSelectOption } from '@components/select/CommonSelect';
import ValidCommonSelect from '@components/select/ValidCommonSelect';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { toTargetPath } from '@pages/student/evaluation/useEvaluationTargets';
import { getTerms } from '@services/section.service';
import { listStudentGrades } from '@services/student-portal.service';
import { SortStringDto } from '@type/http.type';
import { MyGradeListRow, MyGradesFilterValues } from '@type/student-portal.type';
import { ColDef } from 'ag-grid-community';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'course_code', label: 'Course Code' },
    { field: 'course_title', label: 'Course Title' },
    { field: 'term_label', label: 'Term' },
    { field: 'grading_period_sequence', label: 'Grading Period' }
];

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
    const [activeTermId, setActiveTermId] = useState('');

    const filterMethods = useForm<MyGradesFilterValues>({
        defaultValues: { term_id: '' }
    });

    const watchedTermId = filterMethods.watch('term_id');

    useEffect(function() {
        async function fetchTerms() {
            const result = await getTerms();

            if (result.data) {
                const options = result.data.map((t) => ({ label: t.label, value: t.id }));
                setTermOptions(options);

                if (options.length > 0) {
                    filterMethods.setValue('term_id', options[0].value);
                    setActiveTermId(options[0].value);
                }
            }
        }

        fetchTerms();
    }, []);

    useEffect(function() {
        setActiveTermId(watchedTermId);
    }, [watchedTermId]);

    const columnDefs = useMemo<ColDef<MyGradeListRow>[]>(function() {
        return [
            {
                field: 'course_code',
                flex: 1,
                headerName: 'Course Code',
                sortable: true
            },
            {
                field: 'course_title',
                flex: 3,
                headerName: 'Course Title',
                sortable: true
            },
            {
                field: 'section_code',
                flex: 1,
                headerName: 'Section',
                sortable: false
            },
            {
                field: 'faculty_name',
                flex: 2,
                headerName: 'Faculty',
                sortable: false
            },
            {
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
                                    color="warning"
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
        const result = await listStudentGrades(page, size, sort, activeTermId);

        if (!result.data) {
            return result;
        }

        return {
            data: {
                ...result.data,
                content: result.data.content.map(function(row) {
                    return {
                        ...row,
                        row_id: `${row.enrollment_id}:${row.grading_period_id}`
                    };
                })
            },
            error: null
        };
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonCard className="flex gap-3 items-center p-3">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm whitespace-nowrap">
                    Term
                </span>
                <div className="w-72">
                    <ValidCommonSelect
                        control={filterMethods.control}
                        fullWidth
                        name="term_id"
                        options={termOptions}
                        size="small"
                    />
                </div>
            </CommonCard>
            <div className="flex-1 min-h-0">
                <CommonTableCard<MyGradeListRow>
                    cardHeaderProps={{
                        subheader: 'Released grades. Complete the faculty evaluation to unlock a locked row.',
                        title: 'My Grades'
                    }}
                    dependencies={[activeTermId]}
                    sortColumns={SORT_COLUMNS}
                    tableProps={{
                        leadingColumnDefs: columnDefs
                    }}
                    uniqueIdKey="row_id"
                    onFetch={fetchGrades}
                />
            </div>
        </div>
    );
}