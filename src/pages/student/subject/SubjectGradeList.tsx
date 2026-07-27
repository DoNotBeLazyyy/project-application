import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonTable from '@components/table/CommonTable';
import { toTargetPath } from '@pages/student/evaluation/useEvaluationTargets';
import { SubjectGradeItem } from '@type/student-portal.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface SubjectGradeListProps {
    enrollmentId: string;
    grades: SubjectGradeItem[];
}

function formatGrade(value: number | null): string {
    return value != null
        ? String(value)
        : '—';
}

export default function SubjectGradeList({ enrollmentId, grades }: SubjectGradeListProps) {
    const navigate = useNavigate();

    const columnDefs = useMemo<ColDef<SubjectGradeItem>[]>(function() {
        function isReleased(item: SubjectGradeItem): boolean {
            return item.is_visible && item.evaluation_completed;
        }

        return [
            {
                field: 'grading_period_name',
                flex: 2,
                headerName: 'Grading Period',
                sortable: false
            },
            {
                field: 'raw_grade',
                flex: 1,
                headerName: 'Raw',
                sortable: false,
                valueFormatter: (params) => isReleased(params.data as SubjectGradeItem)
                    ? formatGrade(params.value)
                    : '—'
            },
            {
                field: 'final_grade',
                flex: 1,
                headerName: 'Final',
                sortable: false,
                valueFormatter: (params) => isReleased(params.data as SubjectGradeItem)
                    ? formatGrade(params.value)
                    : '—'
            },
            {
                field: 'transmuted_grade',
                flex: 1,
                headerName: 'Transmuted',
                sortable: false,
                valueFormatter: (params) => isReleased(params.data as SubjectGradeItem)
                    ? (params.value != null
                        ? String(params.value)
                        : params.data?.special_grade ?? '—')
                    : '—'
            },
            {
                headerName: 'Status',
                flex: 2,
                sortable: false,
                cellRenderer: (params: { data: SubjectGradeItem }) => {
                    const grade = params.data;
                    const needsEvaluation = grade.is_visible && !grade.evaluation_completed;

                    if (isReleased(grade)) {
                        return (
                            <div className="flex h-full items-center">
                                <CommonBadgeStatus label="Released" variant="success" />
                            </div>
                        );
                    }

                    if (needsEvaluation) {
                        return (
                            <div className="flex gap-2 h-full items-center">
                                <CommonButton
                                    color="warning"
                                    size="small"
                                    variant="contained"
                                    onClick={function() {
                                        navigate(toTargetPath(enrollmentId, grade.grading_period_id));
                                    }}
                                >
                                    Evaluate to view
                                </CommonButton>
                            </div>
                        );
                    }

                    return (
                        <div className="flex h-full items-center">
                            <CommonBadgeStatus label="Not yet released" variant="error" />
                        </div>
                    );
                }
            }
        ];
    }, [enrollmentId]);

    return (
        <div className="flex flex-1 flex-col gap-3 min-h-0">
            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                Grades
            </span>
            {grades.length === 0
                ? (
                    <div className="flex flex-1 flex-col gap-1 items-center justify-center py-10 text-center">
                        <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                            No grades to show yet
                        </span>
                        <span className="max-w-md text-(--mui-palette-text-secondary) text-xs">
                            Grades appear here once your instructor has set up grading periods for this section and released them. Check back later in the term.
                        </span>
                    </div>
                )
                : (
                    <div className="flex-1 min-h-0">
                        <CommonTable<SubjectGradeItem>
                            leadingColumnDefs={columnDefs}
                            rowData={grades}
                        />
                    </div>
                )}
        </div>
    );
}