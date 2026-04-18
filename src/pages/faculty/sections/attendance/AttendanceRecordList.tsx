import CommonButton from '@components/button/CommonButton';
import CommonSelect from '@components/select/CommonSelect';
import CommonTable from '@components/table/CommonTable';
import { AttendanceRecord, AttendanceRecordUpdate, AttendanceSession, AttendanceStatus } from '@type/faculty.type';
import { ChangeEventInputTextarea } from '@type/common.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

const STATUS_OPTIONS: { label: string; value: AttendanceStatus }[] = [
    { label: 'Present', value: 'Present' },
    { label: 'Absent', value: 'Absent' },
    { label: 'Late', value: 'Late' },
    { label: 'Excused', value: 'Excused' }
];

interface AttendanceRecordListProps {
    draftRecords: AttendanceRecordUpdate[];
    isDirty: boolean;
    records: AttendanceRecord[];
    selectedSession: AttendanceSession;
    onSave: () => Promise<void>;
    onStatusChange: (recordId: string, status: AttendanceStatus) => void;
}

export default function AttendanceRecordList({
    draftRecords,
    isDirty,
    records,
    selectedSession,
    onSave,
    onStatusChange
}: AttendanceRecordListProps) {
    const columnDefs = useMemo<ColDef<AttendanceRecordUpdate>[]>(function() {
        return [
            {
                flex: 2,
                headerName: 'Student No.',
                sortable: false,
                valueGetter: (params) => {
                    const record = records.find((r) => r.id === params.data?.id);
                    return record?.student_number ?? '—';
                }
            },
            {
                flex: 3,
                headerName: 'Full Name',
                sortable: false,
                valueGetter: (params) => {
                    const record = records.find((r) => r.id === params.data?.id);
                    return record?.full_name ?? '—';
                }
            },
            {
                field: 'status',
                flex: 2,
                headerName: 'Status',
                sortable: false,
                cellRenderer: (params: { data: AttendanceRecordUpdate }) => (
                    <div className="flex h-full items-center">
                        <CommonSelect
                            fullWidth
                            options={STATUS_OPTIONS}
                            size="small"
                            value={params.data.status}
                            onChange={function(e: ChangeEventInputTextarea) {
                                onStatusChange(params.data.id, e.target.value as AttendanceStatus);
                            }}
                        />
                    </div>
                )
            }
        ];
    }, [records, onStatusChange]);

    return (
        <div className="flex flex-col flex-1 gap-3 min-w-0">
            <div className="flex items-center justify-between">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    {new Date(selectedSession.session_date)
                        .toLocaleDateString('en-PH', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                </span>
                <CommonButton
                    disabled={!isDirty}
                    size="small"
                    variant="contained"
                    onClick={onSave}
                >
                    Save Attendance
                </CommonButton>
            </div>
            <div className="flex-1 min-h-0">
                <CommonTable<AttendanceRecordUpdate>
                    leadingColumnDefs={columnDefs}
                    rowData={draftRecords}
                />
            </div>
        </div>
    );
}