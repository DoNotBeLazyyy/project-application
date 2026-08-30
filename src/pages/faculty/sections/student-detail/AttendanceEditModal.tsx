import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import CommonSelect from '@components/select/CommonSelect';
import { attendanceStatusVariant, formatSessionDate } from '@pages/faculty/sections/student-detail/studentDetailFormat';
import { XIcon } from '@phosphor-icons/react';
import { saveAttendanceRecords } from '@services/faculty.service';
import { ChangeEventInputTextarea } from '@type/common.type';
import { AttendanceStatus, StudentAttendanceRow } from '@type/faculty.type';
import { useEffect, useState } from 'react';

const STATUS_OPTIONS: { label: string; value: AttendanceStatus }[] = [
    { label: 'Present', value: 'Present' },
    { label: 'Absent', value: 'Absent' },
    { label: 'Late', value: 'Late' },
    { label: 'Excused', value: 'Excused' }
];

interface AttendanceEditModalProps {
    record: StudentAttendanceRow | null;
    onClose: () => void;
    onSaved: () => void;
}

export default function AttendanceEditModal({ record, onClose, onSaved }: AttendanceEditModalProps) {
    const [status, setStatus] = useState<AttendanceStatus>('Present');
    const [remarks, setRemarks] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const isUnchanged = Boolean(record)
        && status === record?.status
        && remarks === (record?.remarks ?? '');

    useEffect(function() {
        if (record) {
            setStatus(record.status);
            setRemarks(record.remarks ?? '');
        }
    }, [record]);

    async function handleSave() {
        if (!record) {
            return;
        }

        setIsSaving(true);

        try {
            const result = await saveAttendanceRecords(record.session_id, [
                {
                    id: record.record_id,
                    status,
                    remarks
                }
            ]);

            if (!result.error) {
                onSaved();
                onClose();
            }
        }
        finally {
            setIsSaving(false);
        }
    }

    return (
        <CommonModal
            cardProps={{ className: 'flex flex-col gap-5 w-full sm:w-[min(92vw,460px)]' }}
            open={Boolean(record)}
            onClose={onClose}
        >
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                    <span className="text-(--mui-palette-text-secondary) text-xs uppercase">
                        Edit Attendance
                    </span>
                    <h2 className="font-semibold text-(--mui-palette-text-primary) text-base">
                        {record
                            ? formatSessionDate(record.session_date)
                            : ''}
                    </h2>
                </div>
                <button
                    className="hover:bg-(--mui-palette-action-hover) p-1 rounded text-(--mui-palette-text-secondary) transition-colors"
                    title="Close"
                    onClick={onClose}
                >
                    <XIcon size={18} weight="bold" />
                </button>
            </div>

            {record?.notes && (
                <p className="bg-(--mui-palette-action-hover) p-2 rounded text-(--mui-palette-text-secondary) text-sm">
                    {record.notes}
                </p>
            )}

            <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-center justify-between">
                    <label className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Status
                    </label>
                    <CommonBadgeStatus
                        label={status}
                        variant={attendanceStatusVariant(status)}
                    />
                </div>
                <CommonSelect
                    fullWidth
                    options={STATUS_OPTIONS}
                    size="small"
                    value={status}
                    onChange={function(e: ChangeEventInputTextarea) {
                        setStatus(e.target.value as AttendanceStatus);
                    }}
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="font-medium text-(--mui-palette-text-primary) text-sm">
                    Remarks
                </label>
                <textarea
                    className="border border-(--mui-palette-divider) focus:border-(--mui-palette-primary-main) outline-none px-3 py-2 resize-none rounded text-sm transition-colors"
                    placeholder="Optional remarks..."
                    rows={3}
                    value={remarks}
                    onChange={function(e) {
                        setRemarks(e.target.value);
                    }}
                />
            </div>

            <div className="flex gap-2 justify-end">
                <CommonButton
                    color="inherit"
                    size="small"
                    variant="outlined"
                    onClick={onClose}
                >
                    Cancel
                </CommonButton>
                <CommonButton
                    disabled={isSaving || isUnchanged}
                    size="small"
                    variant="contained"
                    onClick={handleSave}
                >
                    {isSaving
                        ? 'Saving...'
                        : 'Save'}
                </CommonButton>
            </div>
        </CommonModal>
    );
}