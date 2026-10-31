import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonModal from '@components/modal/CommonModal';
import DiscardChangesPromptModal from '@components/modal/DiscardChangesPromptModal';
import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import { useFormDraft } from '@hooks/useFormDraft';
import { attendanceStatusVariant, formatSessionDate } from '@pages/faculty/sections/student-detail/studentDetailFormat';
import { XIcon } from '@phosphor-icons/react';
import { saveAttendanceRecords } from '@services/faculty.service';
import { useToastStore } from '@stores/toast.store';
import { AttendanceStatus, StudentAttendanceRow } from '@type/faculty.type';
import { DEFAULT_FORM_OPTIONS, formErrors } from '@utils/form.util';
import { useEffect, useState } from 'react';
import { FieldErrors, useForm, useWatch } from 'react-hook-form';

const STATUS_OPTIONS: { label: string; value: AttendanceStatus }[] = [
    { label: 'Present', value: 'Present' },
    { label: 'Absent', value: 'Absent' },
    { label: 'Late', value: 'Late' },
    { label: 'Excused', value: 'Excused' }
];

interface AttendanceEditFormValues {
    status: AttendanceStatus;
    remarks: string;
}

const ATTENDANCE_EDIT_FORM_ID = 'attendance-edit-form';

const ATTENDANCE_EDIT_FIELDS: FormFieldConfig<AttendanceEditFormValues>[] = [
    {
        label: 'Status',
        name: 'status',
        options: STATUS_OPTIONS,
        rules: { required: 'Required' },
        type: 'select'
    },
    {
        label: 'Remarks',
        name: 'remarks',
        placeholder: 'Optional remarks...',
        type: 'text-area'
    }
];

interface AttendanceEditModalProps {
    record: StudentAttendanceRow | null;
    onClose: VoidFunction;
    onSaved: VoidFunction;
}

export default function AttendanceEditModal({ record, onClose, onSaved }: AttendanceEditModalProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [isDiscardOpen, setIsDiscardOpen] = useState(false);

    const methods = useForm<AttendanceEditFormValues>({
        ...DEFAULT_FORM_OPTIONS,
        defaultValues: { remarks: '', status: 'Present' }
    });
    const status = useWatch({ control: methods.control, name: 'status' });
    const remarks = useWatch({ control: methods.control, name: 'remarks' });

    const draftGuard = useFormDraft({
        control: methods.control,
        enabled: Boolean(record),
        formId: record?.record_id
            ? `attendance-edit-modal-${record.record_id}`
            : 'attendance-edit-modal'
    });

    const isUnchanged = Boolean(record)
        && status === record?.status
        && (remarks ?? '') === (record?.remarks ?? '');

    useEffect(function() {
        if (record) {
            methods.reset({ remarks: record.remarks ?? '', status: record.status });
        }
        else {
            setIsDiscardOpen(false);
        }
    }, [record]);

    function handleRequestClose() {
        if (isSaving) return;
        if (draftGuard.hasRealChanges) {
            setIsDiscardOpen(true);
            return;
        }
        draftGuard.clearDraft();
        onClose();
    }

    function handleConfirmDiscard() {
        draftGuard.clearDraft();
        setIsDiscardOpen(false);
        onClose();
    }

    function handleInvalid(errors: FieldErrors<AttendanceEditFormValues>) {
        formErrors(errors, methods);
    }

    async function handleSave(values: AttendanceEditFormValues) {
        if (!record) {
            return;
        }

        setIsSaving(true);

        try {
            const result = await saveAttendanceRecords(record.session_id, [
                {
                    id: record.record_id,
                    remarks: values.remarks.trim(),
                    status: values.status
                }
            ]);

            if (result.error) {
                useToastStore.getState()
                    .showToast(result.error.message || 'Failed to update attendance record.', 'error');
            }
            else {
                draftGuard.clearDraft();
                useToastStore.getState()
                    .showToast('Attendance record updated successfully.', 'success');
                onSaved();
                onClose();
            }
        }
        catch {
            useToastStore.getState()
                .showToast('An unexpected error occurred while updating attendance.', 'error');
        }
        finally {
            setIsSaving(false);
        }
    }

    return (
        <>
            <CommonModal
                cardProps={{ className: 'flex flex-col gap-5 w-full sm:w-[min(92vw,460px)]' }}
                open={Boolean(record)}
                onClose={handleRequestClose}
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
                        onClick={handleRequestClose}
                    >
                        <XIcon
                            size={18}
                            weight="bold"
                        />
                    </button>
                </div>

                {record?.notes && (
                    <p className="bg-(--mui-palette-action-hover) p-2 rounded text-(--mui-palette-text-secondary) text-sm">
                        {record.notes}
                    </p>
                )}

                <div className="flex justify-end">
                    <CommonBadgeStatus
                        label={status}
                        variant={attendanceStatusVariant(status)}
                    />
                </div>

                <CommonForm
                    control={methods.control}
                    enableDraftRecovery={false}
                    fields={ATTENDANCE_EDIT_FIELDS}
                    formProps={{
                        id: ATTENDANCE_EDIT_FORM_ID,
                        onSubmit: methods.handleSubmit(handleSave, handleInvalid)
                    }}
                />

                <div className="flex gap-2 justify-end">
                    <CommonButton
                        color="inherit"
                        disabled={isSaving}
                        size="small"
                        variant="outlined"
                        onClick={handleRequestClose}
                    >
                        Cancel
                    </CommonButton>
                    <CommonButton
                        disabled={isSaving || isUnchanged}
                        form={ATTENDANCE_EDIT_FORM_ID}
                        loading={isSaving}
                        size="small"
                        type="submit"
                        variant="contained"
                    >
                        {isSaving
                            ? 'Saving...'
                            : 'Save'}
                    </CommonButton>
                </div>
            </CommonModal>

            <DiscardChangesPromptModal
                open={isDiscardOpen}
                onContinueEditing={() => setIsDiscardOpen(false)}
                onDiscard={handleConfirmDiscard}
            />

            <DraftRecoveryPromptModal
                open={draftGuard.isPromptOpen}
                onContinue={draftGuard.handleContinue}
                onDiscard={draftGuard.handleDiscard}
            />
        </>
    );
}