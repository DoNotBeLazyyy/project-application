import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { CommonChip } from '@components/badge/CommonChip';
import CommonButton from '@components/button/CommonButton';
import { CommonDatePicker } from '@components/datepicker/ValidCommonDatepicker';
import CommonInput from '@components/input/CommonInput';
import CommonModal from '@components/modal/CommonModal';
import CommonSelect from '@components/select/CommonSelect';
import { CIVIL_STATUS_OPTIONS, GENDER_OPTIONS } from '@pages/shared/profile/constants/profile.constant';
import {
    BuildingsIcon,
    CheckCircleIcon,
    PencilSimpleIcon,
    ShieldCheckIcon,
    UserCircleIcon,
    WarningCircleIcon,
    XCircleIcon
} from '@phosphor-icons/react';
import { approveStaffProfileRequest, rejectStaffProfileRequest } from '@services/admin-verification.service';
import { useToastStore } from '@stores/toast.store';
import { StaffProfileRequestRow } from '@type/admin-verification.type';
import { ProfileFormValues } from '@type/profile.type';
import { useEffect, useState } from 'react';

interface StaffProfileVerificationModalProps {
    open: boolean;
    onClose: () => void;
    request: StaffProfileRequestRow | null;
    onSuccess?: () => void;
}

const FIELD_LABELS: Record<string, string> = {
    address_line1: 'Address Line 1',
    address_line2: 'Address Line 2',
    city: 'City / Municipality',
    civil_status: 'Civil Status',
    date_of_birth: 'Date of Birth',
    department_name: 'Department',
    first_name: 'First Name',
    gender: 'Gender',
    last_name: 'Last Name',
    middle_name: 'Middle Name',
    mobile_number: 'Mobile Number',
    nationality: 'Nationality',
    postal_code: 'Postal Code',
    preferred_name: 'Preferred Name',
    province: 'Province',
    suffix: 'Suffix'
};

const DISPLAY_FIELDS: (keyof ProfileFormValues)[] = [
    'first_name',
    'middle_name',
    'last_name',
    'suffix',
    'preferred_name',
    'mobile_number',
    'date_of_birth',
    'gender',
    'civil_status',
    'nationality',
    'address_line1',
    'address_line2',
    'city',
    'province',
    'postal_code'
];

export default function StaffProfileVerificationModal({
    open,
    onClose,
    request,
    onSuccess
}: StaffProfileVerificationModalProps) {
    const [editableValues, setEditableValues] = useState<ProfileFormValues>({} as ProfileFormValues);
    const [adminNotes, setAdminNotes] = useState('');
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!request) return;
        const requested = (request.requested_changes || {}) as Record<string, any>;
        const approved = (request.approved_changes || {}) as Record<string, any>;
        const baseValues: Record<string, any> = request.status === 'Approved with Edits' ? approved : requested;

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

        setAdminNotes(request.admin_notes || '');
        setIsRejectOpen(false);
        setRejectReason('');
    }, [request, open]);

    if (!request) return null;

    const isPending = request.status === 'Pending';
    const current = (request.current_values || {}) as Record<string, any>;
    const requested = (request.requested_changes || {}) as Record<string, any>;

    const hasAdminEdits = DISPLAY_FIELDS.some(
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

        if (!editableValues.first_name?.trim() || !editableValues.last_name?.trim()) {
            useToastStore.getState().showToast('First name and last name are required.', 'error');
            return;
        }

        setIsSubmitting(true);
        const result = await approveStaffProfileRequest(
            request.id,
            hasAdminEdits ? editableValues : null,
            adminNotes.trim() || null
        );
        setIsSubmitting(false);

        if (!result.error) {
            useToastStore.getState().showToast(
                hasAdminEdits
                    ? 'Staff profile changes approved with administrator edits and applied.'
                    : 'Staff profile changes approved and updated successfully.',
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
        const result = await rejectStaffProfileRequest(request.id, rejectReason.trim());
        setIsSubmitting(false);

        if (!result.error) {
            useToastStore.getState().showToast('Profile change request rejected.', 'info');
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
                        subheader: `Role: ${request.role_code} • Submitted ${new Date(request.created_at).toLocaleString()}`,
                        title: `Review Staff Profile: ${request.user_name}`
                    }
                }}
            >
                <div className="flex flex-1 flex-col gap-4 min-h-0 overflow-y-auto p-4 sm:p-6 pt-0 sm:pt-0">
                    {/* Header Summary Banner */}
                    <div className="border border-(--mui-palette-divider) bg-(--mui-palette-background-default) p-4 rounded-lg flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-(--mui-palette-primary-main)/10 text-(--mui-palette-primary-main) flex items-center justify-center font-bold text-sm">
                                {request.user_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm text-(--mui-palette-text-primary) m-0">
                                    {request.user_name}
                                </h3>
                                <p className="text-xs text-(--mui-palette-text-secondary) m-0 mt-0.5">
                                    {request.user_email}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 text-xs">
                            <div className="flex items-center gap-1.5">
                                <ShieldCheckIcon size={18} className="text-(--mui-palette-primary-main)" />
                                <div>
                                    <span className="text-(--mui-palette-text-secondary) block text-[11px]">Staff Role</span>
                                    <span className="font-semibold text-(--mui-palette-text-primary)">{request.role_code}</span>
                                </div>
                            </div>

                            {request.department_name && (
                                <div className="flex items-center gap-1.5">
                                    <BuildingsIcon size={18} className="text-(--mui-palette-info-main)" />
                                    <div>
                                        <span className="text-(--mui-palette-text-secondary) block text-[11px]">Department</span>
                                        <span className="font-semibold text-(--mui-palette-text-primary)">
                                            {request.department_name} ({request.department_code})
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div>
                                <span className="text-(--mui-palette-text-secondary) block text-[11px]">Status</span>
                                <CommonBadgeStatus
                                    label={request.status}
                                    size="small"
                                    variant={
                                        request.status === 'Pending'
                                            ? 'warning'
                                            : request.status === 'Approved' || request.status === 'Approved with Edits'
                                                ? 'success'
                                                : request.status === 'Cancelled'
                                                    ? 'info'
                                                    : 'error'
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* Pending Instructions / Status alert */}
                    {isPending ? (
                        <div className="border border-(--mui-palette-info-main) bg-(--mui-palette-info-light) p-3 rounded-lg flex items-start gap-2.5 text-xs text-(--mui-palette-text-primary)">
                            <PencilSimpleIcon size={20} className="text-(--mui-palette-info-main) shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold m-0 text-sm">Administrator Verification & Edit Mode</p>
                                <p className="m-0 mt-0.5 text-(--mui-palette-text-secondary)">
                                    Compare current profile data against requested changes for this {request.role_code}. You may adjust any values directly in the editable column before approving, or reject the request with a detailed explanation.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="border border-(--mui-palette-divider) bg-(--mui-palette-background-default) p-3 rounded-lg text-xs text-(--mui-palette-text-secondary) flex items-center justify-between">
                            <div>
                                <span>Reviewed by: <strong className="text-(--mui-palette-text-primary)">{request.reviewer_name || 'Administrator'}</strong></span>
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
                                {isPending ? 'Verified Value (Editable)' : 'Final Approved Value'}
                            </div>
                        </div>

                        <div className="divide-y divide-(--mui-palette-divider) text-xs">
                            {DISPLAY_FIELDS.map((field) => {
                                const currVal = current[field] || '—';
                                const reqVal = requested[field] || '—';
                                const editVal = editableValues[field] || '';
                                const isModified = (requested[field] || '') !== (current[field] || '');
                                const isEditedByAdmin = (editableValues[field] || '') !== (requested[field] || '');

                                return (
                                    <div
                                        key={field}
                                        className={`grid grid-cols-12 px-3 py-2.5 items-center transition-colors ${
                                            isModified
                                                ? 'bg-(--mui-palette-warning-light)/25'
                                                : isEditedByAdmin
                                                    ? 'bg-(--mui-palette-info-light)/25'
                                                    : ''
                                        }`}
                                    >
                                        <div className="col-span-3 font-medium text-(--mui-palette-text-primary) flex items-center gap-1.5 flex-wrap">
                                            <span>{FIELD_LABELS[field] || field}</span>
                                            {isModified && (
                                                <CommonChip label="Changed" size="small" variant="light" />
                                            )}
                                            {isPending && isEditedByAdmin && (
                                                <CommonChip label="Admin Edited" size="small" variant="light" />
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
                                                        value={String(editVal)}
                                                        onChange={(e) => handleFieldChange('gender', e.target.value as string)}
                                                    />
                                                ) : field === 'civil_status' ? (
                                                    <CommonSelect
                                                        fullWidth
                                                        options={CIVIL_STATUS_OPTIONS}
                                                        size="small"
                                                        value={String(editVal)}
                                                        onChange={(e) => handleFieldChange('civil_status', e.target.value as string)}
                                                    />
                                                ) : field === 'date_of_birth' ? (
                                                    <CommonDatePicker
                                                        value={String(editVal || '')}
                                                        onChange={(val) => handleFieldChange('date_of_birth', val)}
                                                    />
                                                ) : (
                                                    <CommonInput
                                                        fullWidth
                                                        size="small"
                                                        value={String(editVal)}
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

                    {/* Admin Notes */}
                    <div className="flex flex-col gap-1 mt-1">
                        <label className="text-xs font-semibold text-(--mui-palette-text-primary)">
                            Administrator Notes & Remarks {isPending && '(Optional)'}
                        </label>
                        {isPending ? (
                            <CommonInput
                                fullWidth
                                placeholder="e.g., Verified credentials and approved modifications..."
                                size="small"
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                            />
                        ) : (
                            <p className="text-xs text-(--mui-palette-text-secondary) m-0">
                                {request.admin_notes || 'No administrative notes recorded.'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="border-t border-(--mui-palette-divider) p-4 flex items-center justify-between gap-3 bg-(--mui-palette-background-default)">
                    <CommonButton color="inherit" size="small" variant="outlined" onClick={onClose}>
                        Close
                    </CommonButton>

                    {isPending && (
                        <div className="flex items-center gap-2">
                            <CommonButton
                                color="error"
                                disabled={isSubmitting}
                                size="small"
                                startIcon={<XCircleIcon size={16} />}
                                variant="outlined"
                                onClick={() => setIsRejectOpen(true)}
                            >
                                Reject Request
                            </CommonButton>

                            <CommonButton
                                color="success"
                                disabled={isSubmitting}
                                size="small"
                                startIcon={<CheckCircleIcon size={16} />}
                                variant="contained"
                                onClick={handleApprove}
                            >
                                {hasAdminEdits ? 'Approve with Edits' : 'Approve Profile'}
                            </CommonButton>
                        </div>
                    )}
                </div>
            </CommonModal>

            {/* Rejection Prompt Modal */}
            <CommonModal
                maxWidth="sm"
                open={isRejectOpen}
                onClose={() => setIsRejectOpen(false)}
                cardProps={{
                    cardHeaderProps: {
                        subheader: `Specify the reason why ${request.user_name}'s profile change is being declined.`,
                        title: 'Reject Profile Change'
                    }
                }}
            >
                <div className="p-4 flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-(--mui-palette-text-primary)">
                            Rejection Reason <span className="text-(--mui-palette-error-main)">*</span>
                        </label>
                        <CommonInput
                            fullWidth
                            multiline
                            minRows={3}
                            placeholder="State the reason clearly (e.g., Discrepancy in legal name; please upload proof of name change)..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-2">
                        <CommonButton
                            color="inherit"
                            disabled={isSubmitting}
                            size="small"
                            variant="outlined"
                            onClick={() => setIsRejectOpen(false)}
                        >
                            Back
                        </CommonButton>
                        <CommonButton
                            color="error"
                            disabled={isSubmitting || !rejectReason.trim()}
                            size="small"
                            variant="contained"
                            onClick={handleRejectSubmit}
                        >
                            Confirm Rejection
                        </CommonButton>
                    </div>
                </div>
            </CommonModal>
        </>
    );
}
