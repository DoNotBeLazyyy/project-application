import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonTable from '@components/table/CommonTable';
import GradeBreakdownModal from '@pages/faculty/sections/student-detail/GradeBreakdownModal';
import { formatScore, gradeStatusVariant } from '@pages/faculty/sections/student-detail/studentDetailFormat';
import { StudentEvaluationGrade } from '@type/faculty.type';
import { ColDef, RowClickedEvent } from 'ag-grid-community';
import { useMemo, useState } from 'react';

interface StudentGradeTabProps {
    enrollmentId: string;
    grades: StudentEvaluationGrade[];
}

export default function StudentGradeTab({ enrollmentId, grades }: StudentGradeTabProps) {
    const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

    const columnDefs = useMemo<ColDef<StudentEvaluationGrade>[]>(function() {
        return [
            {
                field: 'grading_period_name',
                flex: 2,
                headerName: 'Grading Period',
                sortable: false
            },
            {
                field: 'weight',
                flex: 1,
                headerName: 'Weight',
                sortable: false,
                valueFormatter: (params) => `${params.value}%`
            },
            {
                field: 'raw_grade',
                flex: 1,
                headerName: 'Raw',
                sortable: false,
                valueFormatter: (params) => formatScore(params.value)
            },
            {
                field: 'final_grade',
                flex: 1,
                headerName: 'Final',
                sortable: false,
                valueFormatter: (params) => formatScore(params.value)
            },
            {
                field: 'transmuted_grade',
                flex: 1,
                headerName: 'Transmuted',
                sortable: false,
                valueGetter: (params) => params.data?.special_grade
                    ?? (params.data?.transmuted_grade !== null && params.data?.transmuted_grade !== undefined
                        ? String(params.data.transmuted_grade)
                        : '—')
            },
            {
                field: 'status',
                flex: 1,
                headerName: 'Status',
                sortable: false,
                cellRenderer: (params: { data: StudentEvaluationGrade }) => (
                    params.data.status
                        ? (
                            <div className="flex h-full items-center">
                                <CommonBadgeStatus
                                    label={params.data.status}
                                    variant={gradeStatusVariant(params.data.status)}
                                />
                            </div>
                        )
                        : (
                            <span className="text-(--mui-palette-text-disabled)">—</span>
                        )
                )
            }
        ];
    }, []);

    function handleRowClicked(event: RowClickedEvent<StudentEvaluationGrade>) {
        if (event.data) {
            setSelectedPeriodId(event.data.grading_period_id);
        }
    }

    return (
        <div className="flex flex-1 flex-col gap-3 min-h-0">
            <p className="text-(--mui-palette-text-secondary) text-xs">
                Select a grading period to view its component breakdown.
            </p>
            <div className="flex-1 min-h-0">
                <CommonTable<StudentEvaluationGrade>
                    leadingColumnDefs={columnDefs}
                    rowData={grades}
                    onRowClicked={handleRowClicked}
                />
            </div>
            <GradeBreakdownModal
                enrollmentId={enrollmentId}
                gradingPeriodId={selectedPeriodId}
                onClose={function() {
                    setSelectedPeriodId(null);
                }}
            />
        </div>
    );
}