import { CommonChip } from '@components/badge/CommonChip';
import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import CommonModal from '@components/modal/CommonModal';
import CommonSelect from '@components/select/CommonSelect';
import {
    BellIcon,
    CheckCircleIcon,
    GraduationCapIcon,
    IdentificationCardIcon,
    PencilSimpleIcon,
    WarningCircleIcon,
    XCircleIcon
} from '@phosphor-icons/react';
import { CIVIL_STATUS_OPTIONS, GENDER_OPTIONS } from '@pages/shared/profile/constants/profile.constant';
import NotifyStudentModal from '@pages/registrar/student-verification/components/NotifyStudentModal';
import { approveStudentProfileRequest, rejectStudentProfileRequest } from '@services/registrar-verification.service';
import { useToastStore } from '@stores/toast.store';
import { ProfileFormValues } from '@type/profile.type';
import { StudentProfileRequestRow } from '@type/registrar-verification.type';
import { useEffect, useState } from 'react';

interface StudentProfileVerificationModalProps {
    open: boolean;
    onClose: () => void;
    request: StudentProfileRequestRow | null;
    onSuccess?: () => void;
}

const FIELD_LABELS: Record<keyof ProfileFormValues, string> = {
    first_name: 'First Name',
    middle_name: 'Middle Name',
    last_name: 'Last Name',
    suffix: 'Suffix',
    preferred_name: 'Preferred Name',
    mobile_number: 'Mobile Number',
    date_of_birth: 'Date of Birth',
    gender: 'Gender',
    civil_status: 'Civil Status',
    nationality: 'Nationality',
    address_line1: 'Address Line 1',
    address_line2: 'Address Line 2',
    city: 'City / Municipality',
    province: 'Province',
    postal_code: 'Postal Code'
};

const ALL_FIELDS = Object.keys(FIELD_LABELS) as (keyof ProfileFormValues)[];

export default function StudentProfileVerificationModal({
    open,
    onClose,
    request,
    onSuccess
}: StudentProfileVerificationModalProps) {
    const [editableValues, setEditableValues] = useState<ProfileFormValues>({} as ProfileFormValues);
    const [registrarNotes, setRegistrarNotes] = useState('');
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [isFalseInfoFlag, setIsFalseInfoFlag] = useState(false);
    const [isNotifyOpen, setIsNotifyOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!request) return;
        const requested = request.requested_changes || {};
        const approved = request.approved_changes || {};
        const baseValues = request.status === 'Approved with Edits' ? approved : requested;

        setEditableValues({
            address_line1: baseValues.address_line1 || '',
            address_line2: baseValues.address_line2 || '',
            city: baseValues.city || '',
            civil_status: baseValues.civil_status || '',
            date_of_birth: baseValues.date_of_birth || '',
            first_name: baseValues.first_name || '',
            gender: baseValues.gender || '',
            last_name: baseValues.last_name || '',
            middle_name: baseValues.middle_name || '',
            mobile_number: baseValues.mobile_number || '',
            nationality: baseValues.nationality || '',
            postal_code: baseValues.postal_code || '',
            preferred_name: baseValues.preferred_name || '',
            province: baseValues.province || '',
            suffix: baseValues.suffix || ''
        });

        setRegistrarNotes(request.registrar_notes || '');
        setIsRejectOpen(false);
        setRejectReason('');
        setIsFalseInfoFlag(false);
    }, [request, open]);

    if (!request) return null;

    const isPending = request.status === 'Pending';
    const current = request.current_values || {};
    const requested = request.requested_changes || {};

    // Detect if registrar made edits to the student's requested values
    const hasRegistrarEdits = ALL_FIELDS.some(
        (key) => (editableValues[key] || '') !== (requested[key] || '')
    );

    function handleFieldChange(field: keyof ProfileFormValues, value: string) {
        setEditableValues((prev) => ({
            ...prev,
            [field]: value
        }));
    }

    async function handleApprove() {
        if (!request) return;

        if (!editableValues.first_name.trim() || !editableValues.last_name.trim()) {
            useToastStore.getState().showToast('First name and last name are required.', 'error');
            return;
        }

        setIsSubmitting(true);
        const result = await approveStudentProfileRequest(
            request.id,
            hasRegistrarEdits ? editableValues : null,
            registrarNotes.trim() || null
        );
        setIsSubmitting(false);

        if (!result.error) {
            useToastStore.getState().showToast(
                hasRegistrarEdits
                    ? 'Student profile changes approved with registrar adjustments and recorded in Registrar Log.'
                    : 'Student profile verified and approved successfully. Logged in Registrar Log.',
                'success'
            );
            onSuccess?.();
            onClose();
        }
    }

    async function handleRejectSubmit() {
        if (!request) return;
        if (!rejectReason.trim()) {
            useToastStore.getState().showToast('Please provide a reason for rejection.', 'error');
            return;
        }

        setIsSubmitting(true);
        const result = await rejectStudentProfileRequest(request.id, rejectReason.trim(), isFalseInfoFlag);
        setIsSubmitting(false);

        if (!result.error) {
            useToastStore.getState().showToast(
                isFalseInfoFlag
                    ? 'Profile change request rejected as false information and recorded in Registrar Log.'
                    : 'Profile change request rejected and recorded in Registrar Log.',
                'info'
            );
            setIsRejectOpen(false);
            onSuccess?.();
            onClose();
        }
    }

    return (
        <>
            <CommonModal
                fullWidth
                maxWidth="lg"
                open={open}
                onClose={onClose}
                cardProps={{
                    className: 'flex flex-col max-h-[92dvh] w-full max-w-5xl overflow-hidden',
                    cardHeaderProps: {
                        title: `Verify Student Profile: ${request.student_name}`,
                        subheader: `Student No: ${request.student_number} • Submitted ${new Date(request.created_at).toLocaleString()}`
                    }
                }}
            >
                <div className="flex flex-1 flex-col gap-4 min-h-0 overflow-y-auto p-4 sm:p-6 pt-0 sm:pt-0">
                    {/* Header Summary Banner */}
                    <div className="border border-(--mui-palette-divider) bg-(--mui-palette-background-default) p-4 rounded-lg flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-(--mui-palette-primary-main)/10 text-(--mui-palette-primary-main) flex items-center justify-center font-bold text-sm">
                                {request.student_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm text-(--mui-palette-text-primary) m-0">
                                    {request.student_name}
                                </h3>
                                <p className="text-xs text-(--mui-palette-text-secondary) m-0 mt-0.5">
                                    {request.student_email}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 text-xs">
                            <div className="flex items-center gap-1.5">
                                <IdentificationCardIcon size={18} className="text-(--mui-palette-primary-main)" />
                                <div>
                                    <span className="text-(--mui-palette-text-secondary) block text-[11px]">Student No</span>
                                    <span className="font-semibold text-(--mui-palette-text-primary)">{request.student_number}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <GraduationCapIcon size={18} className="text-(--mui-palette-info-main)" />
                                <div>
                                    <span className="text-(--mui-palette-text-secondary) block text-[11px]">Academic Program</span>
                                    <span className="font-semibold text-(--mui-palette-text-primary)">
                                        {request.program_code} (Year {request.year_level})
                                    </span>
                                </div>
                            </div>

                            <div>
                                <span className="text-(--mui-palette-text-secondary) block text-[11px]">Status</span>
                                <CommonChip
                                    label={request.status}
                                    size="small"
                                    variant="light"
                                    color={
                                        request.status === 'Pending'
                                            ? 'warning'
                                            : request.status === 'Approved'
                                                ? 'success'
                                                : request.status === 'Approved with Edits'
                                                    ? 'primary'
                                                    : 'error'
                                    }
                                />
                            </div>
                        </div>

                        {/* Top quick actions */}
                        <div className="flex items-center gap-2">
                            <CommonButton
                                color="warning"
                                icon={<BellIcon size={16} />}
                                size="small"
                                variant="outlined"
                                onClick={() => setIsNotifyOpen(true)}
                            >
                                Notify Student
                            </CommonButton>
                        </div>
                    </div>

                    {/* Pending Instructions / Status alert */}
                    {isPending ? (
                        <div className="border border-(--mui-palette-info-main) bg-(--mui-palette-info-light) p-3 rounded-lg flex items-start gap-2.5 text-xs text-(--mui-palette-text-primary)">
                            <PencilSimpleIcon size={20} className="text-(--mui-palette-info-main) shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold m-0 text-sm">Registrar Verification & Edit Mode</p>
                                <p className="m-0 mt-0.5 text-(--mui-palette-text-secondary)">
                                    Compare the student's current profile against their submitted changes below. You can directly edit any field in the "Registrar Verified Value" column if corrections are needed before approving. All changes and notices will be audited in the Registrar Log.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="border border-(--mui-palette-divider) bg-(--mui-palette-background-default) p-3 rounded-lg text-xs text-(--mui-palette-text-secondary) flex items-center justify-between">
                            <div>
                                <span>Reviewed by: <strong className="text-(--mui-palette-text-primary)">{request.reviewer_name}</strong></span>
                                {request.reviewed_at && (
                                    <span className="ml-2">on {new Date(request.reviewed_at).toLocaleString()}</span>
                                )}
                            </div>
                            {request.rejection_reason && (
                                <div className="text-(--mui-palette-error-main)">
                                    <strong>Rejection Reason:</strong> {request.rejection_reason}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Side-by-side verification table */}
                    <div className="border border-(--mui-palette-divider) rounded-lg overflow-hidden">
                        <div className="grid grid-cols-12 bg-(--mui-palette-background-default) px-3 py-2 text-xs font-semibold text-(--mui-palette-text-secondary) border-b border-(--mui-palette-divider)">
                            <div className="col-span-3">Profile Field</div>
                            <div className="col-span-4">Current Value</div>
                            <div className="col-span-5">
                                {isPending ? 'Registrar Verified Value (Editable)' : 'Final Approved Value'}
                            </div>
                        </div>

                        <div className="divide-y divide-(--mui-palette-divider) text-xs">
                            {ALL_FIELDS.map((field) => {
                                const currVal = current[field] || '—';
                                const reqVal = requested[field] || '—';
                                const editVal = editableValues[field] || '';
                                const isModifiedByStudent = (requested[field] || '') !== (current[field] || '');
                                const isEditedByRegistrar = (editableValues[field] || '') !== (requested[field] || '');

                                return (
                                    <div
                                        key={field}
                                        className={`grid grid-cols-12 px-3 py-2.5 items-center transition-colors ${
                                            isModifiedByStudent
                                                ? 'bg-(--mui-palette-warning-light)/25'
                                                : isEditedByRegistrar
                                                    ? 'bg-(--mui-palette-info-light)/25'
                                                    : ''
                                        }`}
                                    >
                                        <div className="col-span-3 font-medium text-(--mui-palette-text-primary) flex items-center gap-1.5 flex-wrap">
                                            <span>{FIELD_LABELS[field]}</span>
                                            {isModifiedByStudent && (
                                                <CommonChip label="Changed" size="small" variant="light" color="warning" />
                                            )}
                                            {isPending && isEditedByRegistrar && (
                                                <CommonChip label="Registrar Edited" size="small" variant="light" color="primary" />
                                            )}
                                        </div>

                                        <div className="col-span-4 text-(--mui-palette-text-secondary) pr-3 break-words">
                                            {currVal}
                                        </div>

                                        <div className="col-span-5 pr-2">
                                            {isPending ? (
                                                field === 'gender' ? (
                                                    <CommonSelect
                                                        fullWidth
                                                        options={GENDER_OPTIONS}
                                                        size="small"
                                                        value={editVal}
                                                        onChange={(e) => handleFieldChange('gender', e.target.value as string)}
                                                    />
                                                ) : field === 'civil_status' ? (
                                                    <CommonSelect
                                                        fullWidth
                                                        options={CIVIL_STATUS_OPTIONS}
                                                        size="small"
                                                        value={editVal}
                                                        onChange={(e) => handleFieldChange('civil_status', e.target.value as string)}
                                                    />
                                                ) : field === 'date_of_birth' ? (
                                                    <CommonInput
                                                        fullWidth
                                                        size="small"
                                                        type="date"
                                                        value={editVal}
                                                        onChange={(e) => handleFieldChange('date_of_birth', e.target.value)}
                                                    />
                                                ) : (
                                                    <CommonInput
                                                        fullWidth
                                                        size="small"
                                                        value={editVal}
                                                        onChange={(e) => handleFieldChange(field, e.target.value)}
                                                    />
                                                )
                                            ) : (
                                                <span className="font-medium text-(--mui-palette-text-primary) break-words">
                                                    {request.status === 'Approved with Edits'
                                                        ? (request.approved_changes?.[field] || reqVal)
                                                        : reqVal}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Registrar Notes */}
                    <div className="flex flex-col gap-1 mt-1">
                        <label className="text-xs font-semibold text-(--mui-palette-text-primary)">
                            Registrar Notes & Remarks {isPending && '(Optional — recorded in registrar audit log)'}
                        </label>
                        {isPending ? (
                            <CommonInput
                                fullWidth
                                placeholder="e.g., Verified against PSA copy, adjusted spelling of province..."
                                size="small"
                                value={registrarNotes}
                                onChange={(e) => setRegistrarNotes(e.target.value)}
                            />
                        ) : (
                            <p className="text-xs text-(--mui-palette-text-secondary) m-0 p-2 bg-(--mui-palette-background-default) rounded border border-(--mui-palette-divider)">
                                {registrarNotes || 'No registrar remarks recorded.'}
                            </p>
                        )}
                    </div>

                    {/* Rejection Drawer / Form */}
                    {isRejectOpen && (
                        <div className="border border-(--mui-palette-error-main) bg-(--mui-palette-error-light) p-4 rounded-lg flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-(--mui-palette-error-main) font-semibold text-sm">
                                <WarningCircleIcon size={20} />
                                <span>Reject Profile Change Request</span>
                            </div>
                            <p className="text-xs text-(--mui-palette-text-secondary) m-0">
                                Please specify the reason for rejection. This reason will be recorded in the Registrar Log and sent to the student as an official notification.
                            </p>
                            <CommonInput
                                fullWidth
                                label="Rejection Reason"
                                placeholder="e.g. Inconsistent date of birth; invalid legal document; incorrect civil status..."
                                required
                                size="small"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                            />
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="false-info-check"
                                    checked={isFalseInfoFlag}
                                    onChange={(e) => setIsFalseInfoFlag(e.target.checked)}
                                    className="cursor-pointer"
                                />
                                <label htmlFor="false-info-check" className="text-xs text-(--mui-palette-text-primary) cursor-pointer select-none">
                                    Flag as <strong>False or Inaccurate Information</strong> (sends high-priority warning alert to student)
                                </label>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <CommonButton
                                    color="inherit"
                                    size="small"
                                    variant="outlined"
                                    onClick={() => setIsRejectOpen(false)}
                                >
                                    Cancel
                                </CommonButton>
                                <CommonButton
                                    color="error"
                                    disabled={isSubmitting || !rejectReason.trim()}
                                    size="small"
                                    variant="contained"
                                    onClick={handleRejectSubmit}
                                >
                                    {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                                </CommonButton>
                            </div>
                        </div>
                    )}

                    {/* Bottom Action Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-(--mui-palette-divider) mt-auto">
                        <CommonButton
                            color="inherit"
                            disabled={isSubmitting}
                            size="small"
                            variant="outlined"
                            onClick={onClose}
                        >
                            Close
                        </CommonButton>

                        {isPending && !isRejectOpen && (
                            <div className="flex items-center gap-2">
                                <CommonButton
                                    color="error"
                                    disabled={isSubmitting}
                                    icon={<XCircleIcon size={16} />}
                                    size="small"
                                    variant="outlined"
                                    onClick={() => setIsRejectOpen(true)}
                                >
                                    Reject Request
                                </CommonButton>
                                <CommonButton
                                    disabled={isSubmitting}
                                    icon={<CheckCircleIcon size={16} />}
                                    size="small"
                                    variant="contained"
                                    onClick={handleApprove}
                                >
                                    {isSubmitting
                                        ? 'Processing...'
                                        : hasRegistrarEdits
                                            ? 'Save Edits & Approve'
                                            : 'Approve Profile'}
                                </CommonButton>
                            </div>
                        )}
                    </div>
                </div>
            </CommonModal>

            <NotifyStudentModal
                open={isNotifyOpen}
                studentId={request.student_id}
                studentName={request.student_name}
                studentNumber={request.student_number}
                onClose={() => setIsNotifyOpen(false)}
                onSuccess={() => onSuccess?.()}
            />
        </>
    );
}
