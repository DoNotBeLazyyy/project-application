import CommonButton from '@components/button/CommonButton';
import CommonTable from '@components/table/CommonTable';
import { CalculatorIcon } from '@phosphor-icons/react';
import { GradeSheetRow, GradingComponent } from '@type/faculty.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';

interface GradeSheetPanelProps {
    components: GradingComponent[];
    gradeSheet: GradeSheetRow[];
    onCalculate: () => Promise<void>;
}

export default function GradeSheetPanel({
    components,
    gradeSheet,
    onCalculate
}: GradeSheetPanelProps) {
    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'student_number',
                flex: 1,
                headerName: 'Student No.',
                mobileCard: 'subtitle',
                sortable: false
            },
            {
                field: 'full_name',
                flex: 2,
                headerName: 'Full Name',
                mobileCard: 'title',
                sortable: false
            },
            {
                field: 'raw_grade',
                flex: 1,
                headerName: 'Raw Grade',
                sortable: false,
                valueFormatter: (params) => params.value != null
                    ? `${params.value}%`
                    : '—'
            },
            {
                field: 'transmuted_grade',
                flex: 1,
                headerName: 'Transmuted',
                sortable: false,
                valueFormatter: (params) => params.value != null
                    ? String(params.value)
                    : '—'
            },
            {
                field: 'status',
                flex: 1,
                headerName: 'Status',
                sortable: false,
                valueFormatter: (params) => params.value ?? '—'
            }
        ];
    }, []);

    return (
        <div className="flex flex-col flex-1 gap-3 min-w-0">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Grade Sheet
                    </span>
                    {components.length === 0
                        ? (
                            <span className="text-(--mui-palette-warning-main) text-xs">
                                Add at least one grading component before grades can be calculated.
                            </span>
                        )
                        : null}
                </div>
                <CommonButton
                    disabled={components.length === 0}
                    size="small"
                    startIcon={<CalculatorIcon size={14} weight="bold" />}
                    variant="outlined"
                    onClick={onCalculate}
                >
                    Calculate Grades
                </CommonButton>
            </div>
            <div className="flex-1 min-h-0">
                <CommonTable<GradeSheetRow>
                    leadingColumnDefs={columnDefs}
                    rowData={gradeSheet}
                />
            </div>
        </div>
    );
}