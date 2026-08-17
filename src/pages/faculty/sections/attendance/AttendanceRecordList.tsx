import CommonButton from '@components/button/CommonButton';
import CommonSelect from '@components/select/CommonSelect';
import CommonTable from '@components/table/CommonTable';
import { AttendanceRecord, AttendanceRecordUpdate, AttendanceSession, AttendanceStatus } from '@type/faculty.type';
import { ChangeEventInputTextarea } from '@type/common.type';
import { MobileCardColDef } from '@type/table.type';
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
    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                colId: 'student_number',
                flex: 2,
                headerName: 'Student No.',
                mobileCard: 'subtitle',
                sortable: false,
                valueGetter: (params) => {
                    const record = records.find((r) => r.id === params.data?.id);
                    return record?.student_number ?? '—';
                }
            },
            {
                colId: 'full_name',
                flex: 3,
                headerName: 'Full Name',
                mobileCard: 'title',
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
                <div className="flex flex-col">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        {new Date(selectedSession.session_date)
                            .toLocaleDateString('en-PH', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                    </span>
                    {!isDirty
                        ? (
                            <span className="text-(--mui-palette-text-secondary) text-xs">
                                All attendance changes are saved. Change a status to enable saving.
                            </span>
                        )
                        : null}
                </div>
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