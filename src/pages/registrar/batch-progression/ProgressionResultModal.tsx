import CommonActionModal from '@components/modal/CommonActionModal';
import CommonTable from '@components/table/CommonTable';
import { ProgressionRunResult, ProgressionRunRow } from '@type/progression.type';
import { ColDef } from 'ag-grid-community';

const RESULT_COLUMNS: ColDef<ProgressionRunRow>[] = [
    { field: 'student_number', flex: 1, headerName: 'Student No.', minWidth: 130 },
    { field: 'student_name', flex: 2, headerName: 'Student Name', minWidth: 180 },
    {
        colId: 'year_change',
        flex: 1,
        headerName: 'Year Level',
        minWidth: 140,
        valueGetter: (params) => params.data
            ? (params.data.is_promoted
                ? `Year ${params.data.from_year_level} → Year ${params.data.to_year_level}`
                : `Year ${params.data.to_year_level} (unchanged)`)
            : ''
    },
    { field: 'enrolled_count', flex: 1, headerName: 'Enrolled', minWidth: 110 },
    {
        field: 'issues',
        flex: 3,
        headerName: 'Issues',
        minWidth: 260,
        valueGetter: (params) => params.data?.issues.length
            ? params.data.issues.join(' ')
            : 'None'
    }
];

interface ProgressionResultModalProps {
    open: boolean;
    result: ProgressionRunResult | null;
    onClose: () => void;
}

export default function ProgressionResultModal({
    open,
    result,
    onClose
}: ProgressionResultModalProps) {
    return (
        <CommonActionModal
            cardProps={{
                cardHeaderProps: {
                    subheader: result?.term_label ?? '',
                    title: 'Progression Result'
                }
            }}
            containerClassName="w-[66rem]"
            formButtonsProps={{
                cancelProps: {
                    children: 'Close',
                    onClick: onClose
                }
            }}
            open={open}
            onClose={onClose}
        >
            <div className="flex flex-col gap-5">
                <div className="bg-(--mui-palette-action-hover) grid grid-cols-2 gap-3 p-4 rounded-lg md:grid-cols-4">
                    <div className="flex flex-col">
                        <span className="text-(--mui-palette-text-secondary) text-xs">Students Processed</span>
                        <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                            {result?.total_count ?? 0}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-(--mui-palette-text-secondary) text-xs">Promoted</span>
                        <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                            {result?.promoted_count ?? 0}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-(--mui-palette-text-secondary) text-xs">Enrollments Created</span>
                        <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                            {result?.enrolled_count ?? 0}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-(--mui-palette-text-secondary) text-xs">Skipped</span>
                        <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                            {result?.blocked_count ?? 0}
                        </span>
                    </div>
                </div>
                <div className="h-96">
                    <CommonTable<ProgressionRunRow>
                        leadingColumnDefs={RESULT_COLUMNS}
                        rowData={result?.results ?? []}
                    />
                </div>
            </div>
        </CommonActionModal>
    );
}