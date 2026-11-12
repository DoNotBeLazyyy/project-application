import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { CommonChip } from '@components/badge/CommonChip';
import CommonButton from '@components/button/CommonButton';
import ValidCommonDatePicker from '@components/datepicker/ValidCommonDatepicker';
import FormLabel from '@components/form/FormLabel';
import ModalCloseIcon from '@components/icons/ModalCloseIcon';
import ValidCommonInput from '@components/input/ValidCommonInput';
import CommonModal from '@components/modal/CommonModal';
import DiscardChangesPromptModal from '@components/modal/DiscardChangesPromptModal';
import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import ValidCommonSelect from '@components/select/ValidCommonSelect';
import ValidCommonTextarea from '@components/textarea/ValidCommonTextArea';
import { useFormDraft } from '@hooks/use-form-draft';
import { useMediaQuery } from '@mui/material';
import { CIVIL_STATUS_OPTIONS, GENDER_OPTIONS } from '@pages/shared/profile/constants/profile.constant';
import {
    BuildingsIcon,
    CheckCircleIcon,
    PencilSimpleIcon,
    ShieldCheckIcon,
    XCircleIcon
} from '@phosphor-icons/react';
import { approveStaffProfileRequest, rejectStaffProfileRequest } from '@services/admin-verification.service';
import { useToastStore } from '@stores/toast.store';
import { StaffProfileRequestRow } from '@type/admin-verification.type';
import { ProfileFormValues } from '@type/profile.type';
import { DEFAULT_FORM_OPTIONS, formErrors, MOBILE_NUMBER_RULE, POSTAL_CODE_RULE } from '@utils/form.util';
import { useEffect, useState } from 'react';
import { FieldErrors, useForm, useWatch } from 'react-hook-form';

interface StaffProfileVerificationModalProps {
    open: boolean;
    onClose: VoidFunction;
    request: StaffProfileRequestRow | null;
    onSuccess?: VoidFunction;
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

type ProfileValueMap = Partial<Record<keyof ProfileFormValues, string>>;

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

interface StaffVerificationFormValues extends ProfileFormValues {
    admin_notes: string;
    reject_reason: string;
}

const NON_PROFILE_KEYS = new Set(['admin_notes', 'reject_reason']);

/**
 * The profile part of the form, without the admin notes and reject reason.
 */
function pickProfileValues(values: StaffVerificationFormValues): ProfileFormValues {
    return Object.fromEntries(
        Object.entries(values)
            .filter(([key]) => !NON_PROFILE_KEYS.has(key))
    ) as unknown as ProfileFormValues;
}

function buildInitialEditableValues(request: StaffProfileRequestRow | null): ProfileFormValues {
    const current = (request?.current_values || {}) as ProfileValueMap;
    const requested = (request?.requested_changes || {}) as ProfileValueMap;
    const approved = (request?.approved_changes || {}) as ProfileValueMap;
    const baseTarget: ProfileValueMap = request?.status === 'Approved with Edits'
        ? approved
        : requested;
    const baseValues: ProfileValueMap = { ...current, ...baseTarget };

    return {
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
    };
}

/**
 * Starting form values for a request: the requested (or approved) profile plus the notes.
 */
function buildInitialFormValues(request: StaffProfileRequestRow | null): StaffVerificationFormValues {
    return {
        ...buildInitialEditableValues(request),
        admin_notes: request?.admin_notes || '',
        reject_reason: ''
    };
}

/**
 * Checks a profile field the same way the staff member's own profile form does. First and last
 * name may stay blank only when the current profile has one, because the server then keeps it.
 *
 * @returns The error message, or null when the value is fine.
 */
function getFieldProblem(field: keyof ProfileFormValues, value: unknown, currentValue?: string): string | null {
    const text = String(value ?? '')
        .trim();

    if (field === 'first_name' || field === 'last_name') {
        const hasName = text !== '' || String(currentValue ?? '')
            .trim() !== '';
        return hasName
            ? null
            : `${FIELD_LABELS[field]} is required.`;
    }
    if (field === 'mobile_number' && text && !MOBILE_NUMBER_RULE.value.test(text)) {
        return MOBILE_NUMBER_RULE.message;
    }
    if (field === 'postal_code' && text && !POSTAL_CODE_RULE.value.test(text)) {
        return POSTAL_CODE_RULE.message;
    }
    return null;
}

const VALIDATED_FIELDS: (keyof ProfileFormValues)[] = ['first_name', 'last_name', 'mobile_number', 'postal_code'];

export default function StaffProfileVerificationModal({
    open,
    onClose,
    request,
    onSuccess
}: StaffProfileVerificationModalProps) {
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showOnlyChanged, setShowOnlyChanged] = useState(true);
    const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
    const [isConfirmRejectCloseOpen, setIsConfirmRejectCloseOpen] = useState(false);

    // Only one layout is rendered, so each field has a single input
    const isDesktop = useMediaQuery('(min-width:768px)');
    const methods = useForm<StaffVerificationFormValues>({ ...DEFAULT_FORM_OPTIONS, defaultValues: buildInitialFormValues(request) });
    const { control } = methods;
    const watchedValues = useWatch({ control });
    const editableValues = watchedValues as Partial<StaffVerificationFormValues>;
    const rejectReason = watchedValues.reject_reason ?? '';

    const isPending = request?.status === 'Pending';

    // Runs before the draft check below, so a saved draft is compared with this request's values
    useEffect(() => {
        if (!request) return;
        methods.reset(buildInitialFormValues(request));
        setIsRejectOpen(false);
        setShowOnlyChanged(true);
    }, [request, open]);

    const draftGuard = useFormDraft({
        control,
        enabled: open && Boolean(isPending && request?.id),
        formId: request?.id
            ? `staff-profile-verification-${request.id}`
            : 'staff-profile-verification',
        onRestore: (restored) => {
            if (String(restored.reject_reason ?? '')
                .trim()) setIsRejectOpen(true);
        }
    });

    if (!request) return null;

    const current = (request.current_values || {}) as ProfileValueMap;
    const requested = (request.requested_changes || {}) as ProfileValueMap;
    const approved = (request.approved_changes || {}) as ProfileValueMap;
    const targetChanges: ProfileValueMap = request.status === 'Approved with Edits'
        ? approved
        : requested;

    const baselineValues = DISPLAY_FIELDS.reduce((acc, key) => {
        acc[key] = (targetChanges[key] !== undefined
            ? targetChanges[key]
            : current[key]) || '';
        return acc;
    }, {} as Record<keyof ProfileFormValues, string>);

    const hasAdminEdits = DISPLAY_FIELDS.some(
        (key) => String(editableValues[key] ?? '') !== (baselineValues[key] || '')
    );

    const changedFields = DISPLAY_FIELDS.filter((field) => {
        const curr = current[field] || '';
        const req = requested[field] || '';
        const app = approved[field] || '';
        return curr !== req || (request.status === 'Approved with Edits' && curr !== app);
    });

    const fieldsToDisplay = showOnlyChanged
        ? changedFields
        : DISPLAY_FIELDS;

    function handleAttemptClose() {
        if (isSubmitting) return;
        if (isPending && draftGuard.hasRealChanges) {
            setIsConfirmCloseOpen(true);
            return;
        }
        draftGuard.clearDraft();
        onClose();
    }

    function handleDiscardChanges() {
        setIsConfirmCloseOpen(false);
        draftGuard.clearDraft();
        methods.reset(buildInitialFormValues(request));
        setIsRejectOpen(false);
        onClose();
    }

    /**
     * Clears the reject reason and closes the reject dialog.
     */
    function closeRejectDialog() {
        methods.setValue('reject_reason', '');
        methods.clearErrors('reject_reason');
        setIsRejectOpen(false);
    }

    function handleAttemptRejectClose() {
        if (isSubmitting) return;
        if (rejectReason.trim()) {
            setIsConfirmRejectCloseOpen(true);
            return;
        }
        closeRejectDialog();
    }

    function handleDiscardRejectChanges() {
        setIsConfirmRejectCloseOpen(false);
        closeRejectDialog();
    }

    function getFieldRules(field: keyof ProfileFormValues) {
        if (!VALIDATED_FIELDS.includes(field)) {
            return undefined;
        }
        return {
            validate: (value: unknown) => getFieldProblem(field, value, current[field]) ?? true
        };
    }

    function renderEditableField(field: keyof ProfileFormValues) {
        if (field === 'gender' || field === 'civil_status') {
            return (
                <ValidCommonSelect
                    control={control}
                    fullWidth
                    name={field}
                    options={field === 'gender'
                        ? GENDER_OPTIONS
                        : CIVIL_STATUS_OPTIONS}
                    size="small"
                />
            );
        }

        if (field === 'date_of_birth') {
            return (
                <ValidCommonDatePicker
                    control={control}
                    disableFuture
                    name="date_of_birth"
                />
            );
        }

        return (
            <ValidCommonInput
                control={control}
                fullWidth
                name={field}
                rules={getFieldRules(field)}
                size="small"
            />
        );
    }

    async function handleApprove() {
        if (!request) return;

        // Checks every field, also the ones "show changed fields only" hides
        const values = methods.getValues();
        const problems: FieldErrors<StaffVerificationFormValues> = {};
        methods.clearErrors(DISPLAY_FIELDS);
        VALIDATED_FIELDS.forEach((field) => {
            const message = getFieldProblem(field, values[field], current[field]);
            if (message) {
                problems[field] = { message, type: 'validate' };
                methods.setError(field, { message, type: 'validate' });
            }
        });

        const problemFields = Object.keys(problems) as (keyof ProfileFormValues)[];
        if (problemFields.length > 0) {
            // A field with an error may be hidden by "show changed fields only", so show every field
            if (problemFields.some((field) => !fieldsToDisplay.includes(field))) {
                setShowOnlyChanged(false);
            }
            formErrors(problems, methods);
            return;
        }

        setIsSubmitting(true);
        // Silent call: this screen shows exactly one message for the result
        const result = await approveStaffProfileRequest(
            request.id,
            hasAdminEdits
                ? pickProfileValues(values)
                : null,
            values.admin_notes.trim() || null
        );
        setIsSubmitting(false);

        if (!result.error) {
            draftGuard.clearDraft();
            useToastStore.getState()
                .showToast(
                    hasAdminEdits
                        ? 'Staff profile changes approved with administrator edits and applied.'
                        : 'Staff profile changes approved and updated successfully.',
                    'success'
                );
            onSuccess?.();
            onClose();
            return;
        }

        useToastStore.getState()
            .showToast(result.error.message || 'The request could not be approved. Please try again.', 'error');
    }

    async function handleRejectSubmit() {
        if (!request) return;
        const isValid = await methods.trigger('reject_reason');
        if (!isValid) {
            formErrors(methods.formState.errors, methods);
            return;
        }

        setIsSubmitting(true);
        // Silent call: this screen shows exactly one message for the result
        const result = await rejectStaffProfileRequest(request.id, rejectReason.trim());
        setIsSubmitting(false);

        if (!result.error) {
            draftGuard.clearDraft();
            useToastStore.getState()
                .showToast('Profile change request rejected.', 'info');
            setIsRejectOpen(false);
            onSuccess?.();
            onClose();
            return;
        }

        useToastStore.getState()
            .showToast(result.error.message || 'The request could not be rejected. Please try again.', 'error');
    }

    return (
        <>
            <CommonModal
                cardProps={{
                    className: 'flex flex-col h-[100dvh] sm:h-[90dvh] max-h-[100dvh] sm:max-h-[90dvh] w-full max-w-5xl overflow-hidden',
                    defaultActionProps: {
                        onClick: handleAttemptClose
                    },
                    cardHeaderProps: {
                        action: <ModalCloseIcon onClick={handleAttemptClose} />,
                        className: 'shrink-0 p-3.5 sm:p-5 pb-2 sm:pb-3',
                        subheader: `Role: ${request.role_code} • Submitted ${new Date(request.created_at)
                            .toLocaleString()}`,
                        title: `Review Staff Profile: ${request.user_name}`
                    }
                }}
                fullWidth
                maxWidth="lg"
                open={open}
                onClose={handleAttemptClose}
            >
                <div className="flex flex-1 flex-col gap-3 sm:gap-4 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-6 pt-0 sm:pt-0">
                    {/* Header Summary Banner */}
                    <div className="border border-(--mui-palette-divider) bg-(--mui-palette-background-default) p-3 sm:p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-(--mui-palette-primary-main)/10 text-(--mui-palette-primary-main) flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                                {request.user_name.slice(0, 2)
                                    .toUpperCase()}
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
                                <ShieldCheckIcon
                                    className="text-(--mui-palette-primary-main) shrink-0"
                                    size={16}
                                />
                                <div>
                                    <span className="text-(--mui-palette-text-secondary) block text-[10px] sm:text-[11px]">Staff Role</span>
                                    <span className="font-semibold text-(--mui-palette-text-primary) text-xs">{request.role_code}</span>
                                </div>
                            </div>

                            {request.department_name && (
                                <div className="flex items-center gap-1.5">
                                    <BuildingsIcon
                                        className="text-(--mui-palette-info-main) shrink-0"
                                        size={16}
                                    />
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
                    {isPending
                        ? (
                            <div className="border border-(--mui-palette-info-main) bg-(--mui-palette-info-light) p-2.5 sm:p-3 rounded-lg flex items-start gap-2.5 text-xs text-(--mui-palette-text-primary) shrink-0">
                                <PencilSimpleIcon
                                    className="text-(--mui-palette-info-main) shrink-0 mt-0.5"
                                    size={18}
                                />
                                <div>
                                    <p className="font-semibold m-0 text-xs sm:text-sm">Administrator Verification & Edit Mode</p>
                                    <p className="m-0 mt-0.5 text-(--mui-palette-text-secondary) text-[11px] sm:text-xs">
                                    Compare current profile data against requested changes for this {request.role_code}. You may adjust any values directly in the editable fields before approving, or reject the request with remarks.
                                    </p>
                                </div>
                            </div>
                        )
                        : (
                            <div className="border border-(--mui-palette-divider) bg-(--mui-palette-background-default) p-2.5 sm:p-3 rounded-lg text-xs text-(--mui-palette-text-secondary) flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shrink-0">
                                <div>
                                    <span>Reviewed by: <strong className="text-(--mui-palette-text-primary)">{request.reviewer_name || 'Administrator'}</strong></span>
                                    {request.reviewed_at && (
                                        <span className="ml-2">on {new Date(request.reviewed_at)
                                            .toLocaleString()}</span>
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
                            className="text-[11px] font-medium text-(--mui-palette-primary-main) hover:underline cursor-pointer bg-transparent border-0 p-0"
                            type="button"
                            onClick={() => setShowOnlyChanged(!showOnlyChanged)}
                        >
                            {showOnlyChanged
                                ? `Show all fields (${DISPLAY_FIELDS.length})`
                                : `Show changed fields only (${changedFields.length})`}
                        </button>
                    </div>

                    {fieldsToDisplay.length === 0
                        ? (
                            <div className="p-6 text-center text-xs text-(--mui-palette-text-secondary) border border-dashed border-(--mui-palette-divider) rounded-lg shrink-0">
                                <p className="m-0 mb-1 font-medium text-(--mui-palette-text-primary)">No modified fields detected.</p>
                                <p className="m-0 mb-3 text-[11px]">The requested profile values match the current profile values.</p>
                                <button
                                    className="text-xs font-medium text-(--mui-palette-primary-main) hover:underline cursor-pointer bg-transparent border-0 p-0"
                                    type="button"
                                    onClick={() => setShowOnlyChanged(false)}
                                >
                                    View all profile fields ({DISPLAY_FIELDS.length})
                                </button>
                            </div>
                        )
                        : (
                            <>
                                {/* Desktop Side-by-side verification table */}
                                {isDesktop && (
                                    <div className="border border-(--mui-palette-divider) rounded-lg overflow-hidden shrink-0">
                                        <div className="grid grid-cols-12 bg-(--mui-palette-background-default) px-3 py-2 text-xs font-semibold text-(--mui-palette-text-secondary) border-b border-(--mui-palette-divider)">
                                            <div className="col-span-3">Profile Field</div>
                                            <div className="col-span-4">Current Value</div>
                                            <div className="col-span-5">
                                                {isPending
                                                    ? 'Verified Value (Editable)'
                                                    : 'Final Approved Value'}
                                            </div>
                                        </div>

                                        <div className="divide-y divide-(--mui-palette-divider) text-xs">
                                            {fieldsToDisplay.map((field) => {
                                                const currVal = current[field] || '—';
                                                const reqVal = requested[field] || '—';
                                                const isModified = (requested[field] || '') !== (current[field] || '');
                                                const isEditedByAdmin = String(editableValues[field] ?? '') !== (requested[field] || '');

                                                return (
                                                    <div
                                                        className={`grid grid-cols-12 px-3 py-2.5 items-center transition-colors ${
                                                            isModified
                                                                ? 'bg-(--mui-palette-warning-light)/25'
                                                                : isEditedByAdmin
                                                                    ? 'bg-(--mui-palette-info-light)/25'
                                                                    : ''
                                                        }`}
                                                        key={field}
                                                    >
                                                        <div className="col-span-3 font-medium text-(--mui-palette-text-primary) flex items-center gap-1.5 flex-wrap">
                                                            <span>{FIELD_LABELS[field] || field}</span>
                                                            {isModified && (
                                                                <CommonChip
                                                                    label="Changed"
                                                                    size="small"
                                                                    variant="light"
                                                                />
                                                            )}
                                                            {isPending && isEditedByAdmin && (
                                                                <CommonChip
                                                                    label="Admin Edited"
                                                                    size="small"
                                                                    variant="light"
                                                                />
                                                            )}
                                                        </div>

                                                        <div className="col-span-4 text-(--mui-palette-text-secondary) pr-3 break-words">
                                                            {currVal}
                                                        </div>

                                                        <div className="col-span-5 pr-2">
                                                            {isPending
                                                                ? (
                                                                    renderEditableField(field)
                                                                )
                                                                : (
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
                                )}

                                {/* Mobile Responsive Field Cards */}
                                {!isDesktop && (
                                    <div className="flex flex-col gap-2.5">
                                        {fieldsToDisplay.map((field) => {
                                            const currVal = current[field] || '—';
                                            const reqVal = requested[field] || '—';
                                            const isModified = (requested[field] || '') !== (current[field] || '');
                                            const isEditedByAdmin = String(editableValues[field] ?? '') !== (requested[field] || '');

                                            return (
                                                <div
                                                    className={`border rounded-lg p-3 transition-colors ${
                                                        isModified
                                                            ? 'border-(--mui-palette-warning-main)/40 bg-(--mui-palette-warning-light)/15'
                                                            : isEditedByAdmin
                                                                ? 'border-(--mui-palette-info-main)/40 bg-(--mui-palette-info-light)/15'
                                                                : 'border-(--mui-palette-divider) bg-(--mui-palette-background-default)/50'
                                                    }`}
                                                    key={`mobile-${field}`}
                                                >
                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                        <span className="font-semibold text-xs text-(--mui-palette-text-primary)">
                                                            {FIELD_LABELS[field] || field}
                                                        </span>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {isModified && (
                                                                <CommonChip
                                                                    label="Changed"
                                                                    size="small"
                                                                    variant="light"
                                                                />
                                                            )}
                                                            {isPending && isEditedByAdmin && (
                                                                <CommonChip
                                                                    label="Admin Edited"
                                                                    size="small"
                                                                    variant="light"
                                                                />
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
                                                            {isPending
                                                                ? 'Verified Value (Editable):'
                                                                : 'Final Approved Value:'}
                                                        </span>
                                                        {isPending
                                                            ? (
                                                                renderEditableField(field)
                                                            )
                                                            : (
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
                                )}
                            </>
                        )}

                    {/* Admin Notes */}
                    <div className="flex flex-col gap-1 mt-1 shrink-0">
                        {isPending
                            ? (
                                <ValidCommonInput
                                    control={control}
                                    fullWidth
                                    label="Administrator Notes & Remarks (Optional)"
                                    name="admin_notes"
                                    placeholder="e.g., Verified credentials and approved modifications..."
                                />
                            )
                            : (
                                <>
                                    <FormLabel label="Administrator Notes & Remarks" />
                                    <p className="text-xs text-(--mui-palette-text-secondary) m-0">
                                        {request.admin_notes || 'No administrative notes recorded.'}
                                    </p>
                                </>
                            )}
                    </div>
                </div>

                {/* Footer Actions */}
                {isPending && (
                    <div className="shrink-0 border-t border-(--mui-palette-divider) p-3 sm:p-4 flex items-center justify-end gap-2 bg-(--mui-palette-background-default)">
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
                            loading={isSubmitting}
                            size="small"
                            startIcon={<CheckCircleIcon size={16} />}
                            variant="contained"
                            onClick={handleApprove}
                        >
                            {hasAdminEdits
                                ? 'Approve with Edits'
                                : 'Approve Profile'}
                        </CommonButton>
                    </div>
                )}
            </CommonModal>

            {/* Rejection Prompt Modal */}
            <CommonModal
                cardProps={{
                    defaultActionProps: {
                        onClick: handleAttemptRejectClose
                    },
                    cardHeaderProps: {
                        action: <ModalCloseIcon onClick={handleAttemptRejectClose} />,
                        subheader: `Specify the reason why ${request.user_name}'s profile change is being declined.`,
                        title: 'Reject Profile Change'
                    }
                }}
                maxWidth="sm"
                open={isRejectOpen}
                onClose={handleAttemptRejectClose}
            >
                <div className="p-4 flex flex-col gap-3">
                    <ValidCommonTextarea
                        control={control}
                        fullWidth
                        isRequired
                        label="Rejection Reason"
                        name="reject_reason"
                        placeholder="State the reason clearly (e.g., Discrepancy in legal name; please upload proof of name change)..."
                        rules={{
                            validate: (value: unknown) => String(value ?? '')
                                .trim() !== '' || 'Please provide a reason for rejection.'
                        }}
                    />

                    <div className="flex items-center justify-end gap-2 mt-2">
                        <CommonButton
                            color="inherit"
                            disabled={isSubmitting}
                            size="small"
                            variant="outlined"
                            onClick={handleAttemptRejectClose}
                        >
                            Back
                        </CommonButton>
                        <CommonButton
                            color="error"
                            disabled={isSubmitting || !rejectReason.trim()}
                            loading={isSubmitting}
                            size="small"
                            variant="contained"
                            onClick={handleRejectSubmit}
                        >
                            Confirm Rejection
                        </CommonButton>
                    </div>
                </div>
            </CommonModal>

            <DraftRecoveryPromptModal
                open={draftGuard.isPromptOpen}
                onContinue={draftGuard.handleContinue}
                onDiscard={draftGuard.handleDiscard}
            />
            <DiscardChangesPromptModal
                open={isConfirmCloseOpen}
                onContinueEditing={() => setIsConfirmCloseOpen(false)}
                onDiscard={handleDiscardChanges}
            />
            <DiscardChangesPromptModal
                open={isConfirmRejectCloseOpen}
                onContinueEditing={() => setIsConfirmRejectCloseOpen(false)}
                onDiscard={handleDiscardRejectChanges}
            />
        </>
    );
}