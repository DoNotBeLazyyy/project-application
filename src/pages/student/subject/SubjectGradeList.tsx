import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonTable from '@components/table/CommonTable';
import { toTargetPath } from '@pages/student/evaluation/use-evaluation-targets';
import { SubjectGradeItem } from '@type/student-portal.type';
import { MobileCardColDef } from '@type/table.type';
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

    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        function isReleased(item: SubjectGradeItem): boolean {
            return item.status === 'Released' || (item.is_visible && item.evaluation_completed);
        }

        return [
            {
                field: 'grading_period_name',
                flex: 2,
                headerName: 'Grading Period',
                mobileCard: 'title',
                sortable: false
            },
            {
                field: 'raw_grade',
                flex: 1,
                headerName: 'Raw',
                mobileCard: 'meta',
                sortable: false,
                valueFormatter: (params) => {
                    const grade = params.data as SubjectGradeItem;
                    if (isReleased(grade)) {
                        return formatGrade(params.value);
                    }
                    if (grade.is_visible || grade.status === 'Approved') {
                        return 'Locked';
                    }
                    return '—';
                }
            },
            {
                field: 'final_grade',
                flex: 1,
                headerName: 'Final',
                mobileCard: 'meta',
                sortable: false,
                valueFormatter: (params) => {
                    const grade = params.data as SubjectGradeItem;
                    if (isReleased(grade)) {
                        return formatGrade(params.value);
                    }
                    if (grade.is_visible || grade.status === 'Approved') {
                        return 'Locked';
                    }
                    return '—';
                }
            },
            {
                field: 'transmuted_grade',
                flex: 1,
                headerName: 'Transmuted',
                mobileCard: 'meta',
                sortable: false,
                valueFormatter: (params) => {
                    const grade = params.data as SubjectGradeItem;
                    if (isReleased(grade)) {
                        return params.value != null
                            ? String(params.value)
                            : (grade.special_grade ?? '—');
                    }
                    if (grade.is_visible || grade.status === 'Approved') {
                        return 'Locked';
                    }
                    return '—';
                }
            },
            {
                colId: 'status',
                headerName: 'Status',
                flex: 2,
                mobileCard: 'meta',
                sortable: false,
                cellRenderer: (params: { data: SubjectGradeItem }) => {
                    const grade = params.data;
                    const released = isReleased(grade);
                    const needsEvaluation = !released && (grade.is_visible || grade.status === 'Approved');

                    if (released) {
                        return (
                            <div className="flex flex-wrap gap-2 h-full items-center">
                                <CommonBadgeStatus
                                    label="Released"
                                    variant="success"
                                />
                                <CommonButton
                                    color="inherit"
                                    size="small"
                                    variant="outlined"
                                    onClick={function() {
                                        navigate(`/student/grade/${enrollmentId}/${grade.grading_period_id}`);
                                    }}
                                >
                                    View breakdown
                                </CommonButton>
                            </div>
                        );
                    }

                    if (needsEvaluation) {
                        return (
                            <div className="flex flex-wrap gap-2 h-full items-center">
                                <CommonBadgeStatus
                                    label="Evaluation Required"
                                    variant="warning"
                                />
                                <CommonButton
                                    color="primary"
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
                            <CommonBadgeStatus
                                label="Pending Registrar Release"
                                variant="warning"
                            />
                        </div>
                    );
                }
            }
        ];
    }, [enrollmentId]);

    return (
        <div className="flex flex-1 flex-col gap-3 min-h-0">
            <div className="flex flex-col gap-1 bg-slate-50 dark:bg-zinc-800/50 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-800">
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    Official Term Grades
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                    Continuous quiz and activity scores can be tracked under the <strong>Assessments</strong> tab in real time. Official term grades appear here once submitted by faculty and released by the Registrar.
                </span>
            </div>
            {grades.length === 0
                ? (
                    <div className="flex flex-1 flex-col gap-2 items-center justify-center py-12 text-center border border-slate-200 dark:border-zinc-800 rounded-2xl bg-slate-50/50 dark:bg-zinc-900/50">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                            No grades to show yet
                        </span>
                        <span className="max-w-md text-slate-500 text-xs">
                            Grades appear here once your instructor has set up grading periods for this section and they have been released by the Registrar.
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