import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { CommonChip } from '@components/badge/CommonChip';
import CommonButton from '@components/button/CommonButton';
import { CommonDatePicker } from '@components/datepicker/ValidCommonDatepicker';
import ModalCloseIcon from '@components/icons/ModalCloseIcon';
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
    const [showOnlyChanged, setShowOnlyChanged] = useState(true);

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
        setShowOnlyChanged(true);
    }, [request, open]);

    if (!request) return null;

    const isPending = request.status === 'Pending';
    const current = (request.current_values || {}) as Record<string, any>;
    const requested = (request.requested_changes || {}) as Record<string, any>;

    const hasAdminEdits = DISPLAY_FIELDS.some(
        (key) => (editableValues[key] || '') !== (requested[key] || '')
    );

    const changedFields = DISPLAY_FIELDS.filter((field) => {
        const curr = current[field] || '';
        const req = requested[field] || '';
        const app = (request.approved_changes as any)?.[field] || '';
        return curr !== req || (request.status === 'Approved with Edits' && curr !== app);
    });

    const fieldsToDisplay = showOnlyChanged ? changedFields : DISPLAY_FIELDS;

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
                    className: 'flex flex-col h-[100dvh] sm:h-[90dvh] max-h-[100dvh] sm:max-h-[90dvh] w-full max-w-5xl overflow-hidden',
                    defaultActionProps: {
                        onClick: onClose
                    },
                    cardHeaderProps: {
                        action: <ModalCloseIcon onClick={onClose} />,
                        className: 'shrink-0 p-3.5 sm:p-5 pb-2 sm:pb-3',
                        subheader: `Role: ${request.role_code} • Submitted ${new Date(request.created_at).toLocaleString()}`,
                        title: `Review Staff Profile: ${request.user_name}`
                    }
                }}
            >
                <div className="flex flex-1 flex-col gap-3 sm:gap-4 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-6 pt-0 sm:pt-0">
                    {/* Header Summary Banner */}
                    <div className="border border-(--mui-palette-divider) bg-(--mui-palette-background-default) p-3 sm:p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-(--mui-palette-primary-main)/10 text-(--mui-palette-primary-main) flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                                {request.user_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-semibold text-xs sm:text-sm text-(--mui-palette-text-primary) m-0 truncate">
                                    {request.user_name}
                                </h3>
                                <p className="text-[11px] sm:text-xs text-(--mui-palette-text-secondary) m-0 mt-0.5 truncate">
                                    {request.user_email}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs pt-2 sm:pt-0 border-t sm:border-t-0 border-(--mui-palette-divider)">
                            <div className="flex items-center gap-1.5">
                                <ShieldCheckIcon size={16} className="text-(--mui-palette-primary-main) shrink-0" />
                                <div>
                                    <span className="text-(--mui-palette-text-secondary) block text-[10px] sm:text-[11px]">Staff Role</span>
                                    <span className="font-semibold text-(--mui-palette-text-primary) text-xs">{request.role_code}</span>
                                </div>
                            </div>

                            {request.department_name && (
                                <div className="flex items-center gap-1.5">
                                    <BuildingsIcon size={16} className="text-(--mui-palette-info-main) shrink-0" />
                                    <div>
                                        <span className="text-(--mui-palette-text-secondary) block text-[10px] sm:text-[11px]">Department</span>
                                        <span className="font-semibold text-(--mui-palette-text-primary) text-xs">
                                            {request.department_name} ({request.department_code})
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div>
                                <span className="text-(--mui-palette-text-secondary) block text-[10px] sm:text-[11px]">Status</span>
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
                        <div className="border border-(--mui-palette-info-main) bg-(--mui-palette-info-light) p-2.5 sm:p-3 rounded-lg flex items-start gap-2.5 text-xs text-(--mui-palette-text-primary) shrink-0">
                            <PencilSimpleIcon size={18} className="text-(--mui-palette-info-main) shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold m-0 text-xs sm:text-sm">Administrator Verification & Edit Mode</p>
                                <p className="m-0 mt-0.5 text-(--mui-palette-text-secondary) text-[11px] sm:text-xs">
                                    Compare current profile data against requested changes for this {request.role_code}. You may adjust any values directly in the editable fields before approving, or reject the request with remarks.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="border border-(--mui-palette-divider) bg-(--mui-palette-background-default) p-2.5 sm:p-3 rounded-lg text-xs text-(--mui-palette-text-secondary) flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shrink-0">
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

                    {/* Verification Fields Section Header / Filter Toggle */}
                    <div className="flex items-center justify-between gap-2 shrink-0 px-0.5 pt-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-(--mui-palette-text-primary)">
                                {showOnlyChanged
                                    ? `Fields with Requested Changes (${changedFields.length})`
                                    : `All Profile Fields (${DISPLAY_FIELDS.length})`}
                            </span>
                            {changedFields.length === 0 && (
                                <span className="text-[11px] text-(--mui-palette-text-secondary)">
                                    (No changes detected)
                                </span>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowOnlyChanged(!showOnlyChanged)}
                            className="text-[11px] font-medium text-(--mui-palette-primary-main) hover:underline cursor-pointer bg-transparent border-0 p-0"
                        >
                            {showOnlyChanged
                                ? `Show all fields (${DISPLAY_FIELDS.length})`
                                : `Show changed fields only (${changedFields.length})`}
                        </button>
                    </div>

                    {fieldsToDisplay.length === 0 ? (
                        <div className="p-6 text-center text-xs text-(--mui-palette-text-secondary) border border-dashed border-(--mui-palette-divider) rounded-lg shrink-0">
                            <p className="m-0 mb-1 font-medium text-(--mui-palette-text-primary)">No modified fields detected.</p>
                            <p className="m-0 mb-3 text-[11px]">The requested profile values match the current profile values.</p>
                            <button
                                type="button"
                                onClick={() => setShowOnlyChanged(false)}
                                className="text-xs font-medium text-(--mui-palette-primary-main) hover:underline cursor-pointer bg-transparent border-0 p-0"
                            >
                                View all profile fields ({DISPLAY_FIELDS.length})
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Side-by-side verification table */}
                            <div className="hidden md:block border border-(--mui-palette-divider) rounded-lg overflow-hidden shrink-0">
                                <div className="grid grid-cols-12 bg-(--mui-palette-background-default) px-3 py-2 text-xs font-semibold text-(--mui-palette-text-secondary) border-b border-(--mui-palette-divider)">
                                    <div className="col-span-3">Profile Field</div>
                                    <div className="col-span-4">Current Value</div>
                                    <div className="col-span-5">
                                        {isPending ? 'Verified Value (Editable)' : 'Final Approved Value'}
                                    </div>
                                </div>

                                <div className="divide-y divide-(--mui-palette-divider) text-xs">
                                    {fieldsToDisplay.map((field) => {
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

                            {/* Mobile Responsive Field Cards */}
                            <div className="flex flex-col gap-2.5 md:hidden">
                                {fieldsToDisplay.map((field) => {
                                    const currVal = current[field] || '—';
                                    const reqVal = requested[field] || '—';
                                    const editVal = editableValues[field] || '';
                                    const isModified = (requested[field] || '') !== (current[field] || '');
                                    const isEditedByAdmin = (editableValues[field] || '') !== (requested[field] || '');

                                    return (
                                        <div
                                            key={`mobile-${field}`}
                                            className={`border rounded-lg p-3 transition-colors ${
                                                isModified
                                                    ? 'border-(--mui-palette-warning-main)/40 bg-(--mui-palette-warning-light)/15'
                                                    : isEditedByAdmin
                                                        ? 'border-(--mui-palette-info-main)/40 bg-(--mui-palette-info-light)/15'
                                                        : 'border-(--mui-palette-divider) bg-(--mui-palette-background-default)/50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <span className="font-semibold text-xs text-(--mui-palette-text-primary)">
                                                    {FIELD_LABELS[field] || field}
                                                </span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {isModified && (
                                                        <CommonChip label="Changed" size="small" variant="light" />
                                                    )}
                                                    {isPending && isEditedByAdmin && (
                                                        <CommonChip label="Admin Edited" size="small" variant="light" />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) rounded p-2 mb-2 text-xs">
                                                <span className="text-[10px] text-(--mui-palette-text-secondary) block mb-0.5">
                                                    Current Value:
                                                </span>
                                                <span className="font-medium text-(--mui-palette-text-primary) break-words">
                                                    {currVal}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="text-[10px] font-medium text-(--mui-palette-text-secondary) block mb-1">
                                                    {isPending ? 'Verified Value (Editable):' : 'Final Approved Value:'}
                                                </span>
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
                                                    <div className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) rounded p-2 text-xs font-medium text-(--mui-palette-text-primary) break-words">
                                                        {request.status === 'Approved with Edits'
                                                            ? (request.approved_changes?.[field] || reqVal)
                                                            : reqVal}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* Admin Notes */}
                    <div className="flex flex-col gap-1 mt-1 shrink-0">
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
                <div className="shrink-0 border-t border-(--mui-palette-divider) p-3 sm:p-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-3 bg-(--mui-palette-background-default)">
                    <CommonButton color="inherit" size="small" variant="outlined" onClick={onClose} className="order-2 sm:order-1">
                        Close
                    </CommonButton>

                    {isPending && (
                        <div className="flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto justify-end">
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
                    defaultActionProps: {
                        onClick: () => setIsRejectOpen(false)
                    },
                    cardHeaderProps: {
                        action: <ModalCloseIcon onClick={() => setIsRejectOpen(false)} />,
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
