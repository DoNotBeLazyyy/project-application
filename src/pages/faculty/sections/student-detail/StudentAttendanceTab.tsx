import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonTable from '@components/table/CommonTable';
import AttendanceEditModal from '@pages/faculty/sections/student-detail/AttendanceEditModal';
import { attendanceStatusVariant, formatDate } from '@pages/faculty/sections/student-detail/studentDetailFormat';
import { getStudentAttendance } from '@services/faculty.service';
import { StudentAttendanceRow, StudentEvaluationAttendance } from '@type/faculty.type';
import { ColDef, RowClickedEvent } from 'ag-grid-community';
import { useEffect, useMemo, useState } from 'react';

interface StudentAttendanceTabProps {
    enrollmentId: string;
    summary: StudentEvaluationAttendance;
    onChanged: () => void;
}

interface AttendanceStatProps {
    accent?: boolean;
    label: string;
    value: string;
}

function AttendanceStat({ accent, label, value }: AttendanceStatProps) {
    return (
        <div className="bg-(--mui-palette-action-hover) flex flex-col gap-1 p-3 rounded-lg">
            <span
                className={accent
                    ? 'font-semibold text-(--mui-palette-primary-main) text-xl'
                    : 'font-semibold text-(--mui-palette-text-primary) text-xl'}
            >
                {value}
            </span>
            <span className="text-(--mui-palette-text-secondary) text-xs">
                {label}
            </span>
        </div>
    );
}

export default function StudentAttendanceTab({ enrollmentId, summary, onChanged }: StudentAttendanceTabProps) {
    const [rows, setRows] = useState<StudentAttendanceRow[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<StudentAttendanceRow | null>(null);

    async function fetchRows() {
        const result = await getStudentAttendance(enrollmentId);

        if (result.data) {
            setRows(result.data);
        }
    }

    useEffect(function() {
        fetchRows();
    }, [enrollmentId]);

    const rate = summary.recorded > 0
        ? Math.round(((summary.present + summary.late) / summary.recorded) * 100)
        : 0;

    const columnDefs = useMemo<ColDef<StudentAttendanceRow>[]>(function() {
        return [
            {
                field: 'session_date',
                flex: 2,
                headerName: 'Class Day',
                sortable: true,
                valueFormatter: (params) => formatDate(params.value)
            },
            {
                field: 'status',
                flex: 1,
                headerName: 'Status',
                sortable: true,
                cellRenderer: (params: { data: StudentAttendanceRow }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.status}
                            variant={attendanceStatusVariant(params.data.status)}
                        />
                    </div>
                )
            },
            {
                field: 'remarks',
                flex: 3,
                headerName: 'Remarks',
                sortable: false,
                valueFormatter: (params) => params.value ?? '—'
            }
        ];
    }, []);

    function handleRowClicked(event: RowClickedEvent<StudentAttendanceRow>) {
        if (event.data) {
            setSelectedRecord(event.data);
        }
    }

    return (
        <div className="flex flex-1 flex-col gap-3 min-h-0">
            <div className="gap-3 grid grid-cols-3 sm:grid-cols-5">
                <AttendanceStat accent label="Attendance Rate" value={`${rate}%`} />
                <AttendanceStat label="Present" value={String(summary.present)} />
                <AttendanceStat label="Late" value={String(summary.late)} />
                <AttendanceStat label="Absent" value={String(summary.absent)} />
                <AttendanceStat label="Excused" value={String(summary.excused)} />
            </div>
            <p className="text-(--mui-palette-text-secondary) text-xs">
                {summary.recorded} of {summary.total_sessions} sessions recorded · select a row to edit
            </p>
            <div className="flex-1 min-h-0">
                <CommonTable<StudentAttendanceRow>
                    leadingColumnDefs={columnDefs}
                    rowData={rows}
                    onRowClicked={handleRowClicked}
                />
            </div>
            <AttendanceEditModal
                record={selectedRecord}
                onClose={function() {
                    setSelectedRecord(null);
                }}
                onSaved={function() {
                    fetchRows();
                    onChanged();
                }}
            />
        </div>
    );
}