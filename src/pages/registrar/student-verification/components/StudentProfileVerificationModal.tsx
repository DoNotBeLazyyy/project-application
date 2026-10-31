import { CommonChip } from '@components/badge/CommonChip';
import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import ValidCommonCheckbox from '@components/checkbox/ValidCommonCheckbox';
import ValidCommonDatePicker from '@components/datepicker/ValidCommonDatepicker';
import ModalCloseIcon from '@components/icons/ModalCloseIcon';
import ValidCommonInput from '@components/input/ValidCommonInput';
import ValidCommonNumberInput from '@components/input/ValidCommonNumberInput';
import CommonModal from '@components/modal/CommonModal';
import DiscardChangesPromptModal from '@components/modal/DiscardChangesPromptModal';
import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import ValidCommonSelect from '@components/select/ValidCommonSelect';
import { useFormDraft } from '@hooks/useFormDraft';
import { useMediaQuery } from '@mui/material';
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
import { DEFAULT_FORM_OPTIONS, formErrors, MOBILE_NUMBER_RULE, POSTAL_CODE_RULE } from '@utils/form.util';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

interface StudentProfileVerificationModalProps {
    open: boolean;
    onClose: () => void;
    request: StudentProfileRequestRow | null;
    onSuccess?: () => void;
}

const FIELD_LABELS: Record<string, string> = {
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
    postal_code: 'Postal Code',
    program_name: 'Academic Program',
    year_level: 'Year Level',
    program_id: 'Program',
    program_code: 'Program Code'
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
    'postal_code',
    'program_name',
    'year_level'
];

interface VerificationFormValues extends ProfileFormValues {
    registrar_notes: string;
    reject_reason: string;
    is_false_info: boolean;
}

// fn_approve_student_profile_request keeps the current name when first/last name is blank,
// casts date_of_birth to DATE and year_level to SMALLINT (students CHECK 1-6). program_name is
// display-only: the function reads program_id, so typing a program name would be silently dropped.
const READ_ONLY_FIELDS: (keyof ProfileFormValues)[] = ['program_name'];

function buildInitialFormValues(request: StudentProfileRequestRow | null): VerificationFormValues {
    return {
        ...buildInitialStudentEditableValues(request),
        is_false_info: false,
        registrar_notes: request?.registrar_notes || '',
        reject_reason: ''
    };
}

const NON_PROFILE_KEYS = new Set(['is_false_info', 'registrar_notes', 'reject_reason']);

function pickProfileValues(values: VerificationFormValues): ProfileFormValues {
    return Object.fromEntries(
        Object.entries(values).filter(([key]) => !NON_PROFILE_KEYS.has(key))
    ) as unknown as ProfileFormValues;
}

function buildInitialStudentEditableValues(request: StudentProfileRequestRow | null): ProfileFormValues {
    const requested = (request?.requested_changes || {}) as Record<string, any>;
    const approved = (request?.approved_changes || {}) as Record<string, any>;
    const baseValues: Record<string, any> = request?.status === 'Approved with Edits' ? approved : requested;

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
        suffix: baseValues.suffix || '',
        program_id: baseValues.program_id || '',
        program_code: baseValues.program_code || '',
        program_name: baseValues.program_name || '',
        year_level: baseValues.year_level ? String(baseValues.year_level) : ''
    };
}

export default function StudentProfileVerificationModal({
    open,
    onClose,
    request,
    onSuccess
}: StudentProfileVerificationModalProps) {
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [isNotifyOpen, setIsNotifyOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showOnlyChanged, setShowOnlyChanged] = useState(true);
    const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);

    const isDesktop = useMediaQuery('(min-width:768px)');
    const methods = useForm<VerificationFormValues>({ ...DEFAULT_FORM_OPTIONS, defaultValues: buildInitialFormValues(request) });
    const { control } = methods;
    const watchedValues = useWatch({ control });
    const editableValues = watchedValues as Partial<VerificationFormValues>;
    const registrarNotes = watchedValues.registrar_notes ?? '';
    const rejectReason = watchedValues.reject_reason ?? '';
    const isFalseInfoFlag = Boolean(watchedValues.is_false_info);

    const isPending = request?.status === 'Pending';

    const draftGuard = useFormDraft({
        control,
        enabled: open && Boolean(isPending && request?.id),
        formId: request?.id ? `student-profile-verification-${request.id}` : 'student-profile-verification',
        onRestore: (restored) => {
            if (String(restored.reject_reason ?? '').trim() || restored.is_false_info) setIsRejectOpen(true);
        }
    });

    useEffect(() => {
        if (!request) return;
        methods.reset(buildInitialFormValues(request));
        setIsRejectOpen(false);
        setShowOnlyChanged(true);
    }, [request, open]);

    if (!request) return null;

    const current = request.current_values || {};
    const requested = request.requested_changes || {};

    // Detect if registrar made edits to the student's requested values
    const hasRegistrarEdits = DISPLAY_FIELDS.some(
        (key) => String(editableValues[key] ?? '') !== String(requested[key] ?? '')
    );

    const changedFields = DISPLAY_FIELDS.filter((field) => {
        const curr = String(current[field] || '');
        const req = String(requested[field] || '');
        const app = String((request.approved_changes as any)?.[field] || '');
        return curr !== req || (request.status === 'Approved with Edits' && curr !== app);
    });

    const fieldsToDisplay = showOnlyChanged ? changedFields : DISPLAY_FIELDS;

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

    function getFieldRules(field: keyof ProfileFormValues) {
        if (field === 'first_name' || field === 'last_name') {
            return {
                validate: (value: unknown) => String(value ?? '').trim() !== '' || `${FIELD_LABELS[field]} is required.`
            };
        }
        // Same format checks as the student's own profile form
        if (field === 'mobile_number') {
            return { pattern: MOBILE_NUMBER_RULE };
        }
        if (field === 'postal_code') {
            return { pattern: POSTAL_CODE_RULE };
        }
        if (field === 'year_level') {
            return {
                validate: function(value: unknown) {
                    if (value === '' || value === null || value === undefined) return true;
                    const level = Number(value);
                    return (Number.isInteger(level) && level >= 1 && level <= 6) || 'Year level must be a whole number from 1 to 6.';
                }
            };
        }
        return undefined;
    }

    function renderEditableField(field: keyof ProfileFormValues) {
        if (READ_ONLY_FIELDS.includes(field)) {
            return (
                <span className="font-medium text-(--mui-palette-text-primary) break-words">
                    {String(editableValues[field] || '—')}
                </span>
            );
        }

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

        if (field === 'year_level') {
            return (
                <ValidCommonNumberInput
                    control={control}
                    fullWidth
                    maxDecimals={0}
                    name="year_level"
                    rules={getFieldRules(field)}
                    size="small"
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

        const isValid = await methods.trigger(DISPLAY_FIELDS);
        if (!isValid) {
            setShowOnlyChanged(false);
            formErrors(methods.formState.errors, methods);
            return;
        }

        const values = methods.getValues();

        setIsSubmitting(true);
        const result = await approveStudentProfileRequest(
            request.id,
            hasRegistrarEdits ? pickProfileValues(values) : null,
            values.registrar_notes.trim() || null
        );
        setIsSubmitting(false);

        if (!result.error) {
            draftGuard.clearDraft();
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
        const isValid = await methods.trigger('reject_reason');
        if (!isValid) {
            formErrors(methods.formState.errors, methods);
            return;
        }

        setIsSubmitting(true);
        const result = await rejectStudentProfileRequest(request.id, rejectReason.trim(), isFalseInfoFlag);
        setIsSubmitting(false);

        if (!result.error) {
            draftGuard.clearDraft();
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
                onClose={handleAttemptClose}
                cardProps={{
                    className: 'flex flex-col h-[100dvh] sm:h-[90dvh] max-h-[100dvh] sm:max-h-[90dvh] w-full max-w-5xl overflow-hidden',
                    defaultActionProps: {
                        onClick: handleAttemptClose
                    },
                    cardHeaderProps: {
                        action: <ModalCloseIcon onClick={handleAttemptClose} />,
                        className: 'shrink-0 p-3.5 sm:p-5 pb-2 sm:pb-3',
                        title: `Verify Student Profile: ${request.student_name}`,
                        subheader: `Student No: ${request.student_number} • Submitted ${new Date(request.created_at).toLocaleString()}`
                    }
                }}
            >
                <div className="flex flex-1 flex-col gap-3 sm:gap-4 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-6 pt-0 sm:pt-0">
                    {/* Header Summary Banner */}
                    <div className="border border-(--mui-palette-divider) bg-(--mui-palette-background-default) p-3 sm:p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-(--mui-palette-primary-main)/10 text-(--mui-palette-primary-main) flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                                {request.student_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-semibold text-xs sm:text-sm text-(--mui-palette-text-primary) m-0 truncate">
                                    {request.student_name}
                                </h3>
                                <p className="text-[11px] sm:text-xs text-(--mui-palette-text-secondary) m-0 mt-0.5 truncate">
                                    {request.student_email}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs pt-2 sm:pt-0 border-t sm:border-t-0 border-(--mui-palette-divider)">
                            <div className="flex items-center gap-1.5">
                                <IdentificationCardIcon size={16} className="text-(--mui-palette-primary-main) shrink-0" />
                                <div>
                                    <span className="text-(--mui-palette-text-secondary) block text-[10px] sm:text-[11px]">Student No</span>
                                    <span className="font-semibold text-(--mui-palette-text-primary) text-xs">{request.student_number}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <GraduationCapIcon size={16} className="text-(--mui-palette-info-main) shrink-0" />
                                <div>
                                    <span className="text-(--mui-palette-text-secondary) block text-[10px] sm:text-[11px]">Academic Program</span>
                                    <span className="font-semibold text-(--mui-palette-text-primary) text-xs">
                                        {request.program_code} (Year {request.year_level})
                                    </span>
                                </div>
                            </div>

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
                                                : 'error'
                                    }
                                />
                            </div>

                            {/* Top quick actions */}
                            <div className="flex items-center gap-2">
                                <CommonButton
                                    color="warning"
                                    size="small"
                                    startIcon={<BellIcon size={15} />}
                                    variant="outlined"
                                    onClick={() => setIsNotifyOpen(true)}
                                >
                                    Notify
                                </CommonButton>
                            </div>
                        </div>
                    </div>

                    {/* Pending Instructions / Status alert */}
                    {isPending ? (
                        <div className="border border-(--mui-palette-info-main) bg-(--mui-palette-info-light) p-2.5 sm:p-3 rounded-lg flex items-start gap-2.5 text-xs text-(--mui-palette-text-primary) shrink-0">
                            <PencilSimpleIcon size={18} className="text-(--mui-palette-info-main) shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold m-0 text-xs sm:text-sm">Registrar Verification & Edit Mode</p>
                                <p className="m-0 mt-0.5 text-(--mui-palette-text-secondary) text-[11px] sm:text-xs">
                                    Compare the student's current profile against their submitted changes. You can directly edit any field before approving. All changes and notices will be audited in the Registrar Log.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="border border-(--mui-palette-divider) bg-(--mui-palette-background-default) p-2.5 sm:p-3 rounded-lg text-xs text-(--mui-palette-text-secondary) flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shrink-0">
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
                            {isDesktop && (
                            <div className="border border-(--mui-palette-divider) rounded-lg overflow-hidden shrink-0">
                                <div className="grid grid-cols-12 bg-(--mui-palette-background-default) px-3 py-2 text-xs font-semibold text-(--mui-palette-text-secondary) border-b border-(--mui-palette-divider)">
                                    <div className="col-span-3">Profile Field</div>
                                    <div className="col-span-4">Current Value</div>
                                    <div className="col-span-5">
                                        {isPending ? 'Registrar Verified Value (Editable)' : 'Final Approved Value'}
                                    </div>
                                </div>

                                <div className="divide-y divide-(--mui-palette-divider) text-xs">
                                    {fieldsToDisplay.map((field) => {
                                        const currVal = current[field] || '—';
                                        const reqVal = requested[field] || '—';
                                        const isModifiedByStudent = (requested[field] || '') !== (current[field] || '');
                                        const isEditedByRegistrar = String(editableValues[field] ?? '') !== String(requested[field] ?? '');

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
                                                        <CommonChip label="Changed" size="small" variant="light" />
                                                    )}
                                                    {isPending && isEditedByRegistrar && (
                                                        <CommonChip label="Registrar Edited" size="small" variant="light" />
                                                    )}
                                                </div>

                                                <div className="col-span-4 text-(--mui-palette-text-secondary) pr-3 break-words">
                                                    {currVal}
                                                </div>

                                                <div className="col-span-5 pr-2">
                                                    {isPending ? (
                                                        renderEditableField(field)
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
                            )}

                            {/* Mobile Responsive Field Cards */}
                            {!isDesktop && (
                            <div className="flex flex-col gap-2.5">
                                {fieldsToDisplay.map((field) => {
                                    const currVal = current[field] || '—';
                                    const reqVal = requested[field] || '—';
                                    const isModifiedByStudent = (requested[field] || '') !== (current[field] || '');
                                    const isEditedByRegistrar = String(editableValues[field] ?? '') !== String(requested[field] ?? '');

                                    return (
                                        <div
                                            key={`mobile-${field}`}
                                            className={`border rounded-lg p-3 transition-colors ${
                                                isModifiedByStudent
                                                    ? 'border-(--mui-palette-warning-main)/40 bg-(--mui-palette-warning-light)/15'
                                                    : isEditedByRegistrar
                                                        ? 'border-(--mui-palette-info-main)/40 bg-(--mui-palette-info-light)/15'
                                                        : 'border-(--mui-palette-divider) bg-(--mui-palette-background-default)/50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <span className="font-semibold text-xs text-(--mui-palette-text-primary)">
                                                    {FIELD_LABELS[field]}
                                                </span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {isModifiedByStudent && (
                                                        <CommonChip label="Changed" size="small" variant="light" />
                                                    )}
                                                    {isPending && isEditedByRegistrar && (
                                                        <CommonChip label="Registrar Edited" size="small" variant="light" />
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
                                                    renderEditableField(field)
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
                            )}
                        </>
                    )}

                    {/* Registrar Notes */}
                    <div className="flex flex-col gap-1 mt-1 shrink-0">
                        {isPending ? (
                            <ValidCommonInput
                                control={control}
                                fullWidth
                                helperText="Optional — recorded in the registrar audit log."
                                label="Registrar Notes & Remarks"
                                name="registrar_notes"
                                placeholder="e.g., Verified against PSA copy, adjusted spelling of province..."
                            />
                        ) : (
                            <p className="text-xs text-(--mui-palette-text-secondary) m-0 p-2 bg-(--mui-palette-background-default) rounded border border-(--mui-palette-divider)">
                                {registrarNotes || 'No registrar remarks recorded.'}
                            </p>
                        )}
                    </div>

                    {/* Rejection Drawer / Form */}
                    {isRejectOpen && (
                        <div className="border border-(--mui-palette-error-main) bg-(--mui-palette-error-light) p-3 sm:p-4 rounded-lg flex flex-col gap-3 shrink-0">
                            <div className="flex items-center gap-2 text-(--mui-palette-error-main) font-semibold text-sm">
                                <WarningCircleIcon size={20} />
                                <span>Reject Profile Change Request</span>
                            </div>
                            <p className="text-xs text-(--mui-palette-text-secondary) m-0">
                                Please specify the reason for rejection. This reason will be recorded in the Registrar Log and sent to the student as an official notification.
                            </p>
                            <ValidCommonInput
                                control={control}
                                fullWidth
                                isRequired
                                label="Rejection Reason"
                                name="reject_reason"
                                placeholder="e.g. Inconsistent date of birth; invalid legal document; incorrect civil status..."
                                rules={{
                                    validate: (value) => String(value ?? '').trim() !== '' || 'Please provide a reason for rejection.'
                                }}
                            />
                            <ValidCommonCheckbox
                                control={control}
                                label="Flag as False or Inaccurate Information (sends high-priority warning alert to student)"
                                name="is_false_info"
                            />
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
                                    disabled={isSubmitting}
                                    loading={isSubmitting}
                                    size="small"
                                    variant="contained"
                                    onClick={handleRejectSubmit}
                                >
                                    {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                                </CommonButton>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Action Footer */}
                <div className="shrink-0 border-t border-(--mui-palette-divider) p-3 sm:p-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-3 bg-(--mui-palette-background-default)">
                    <CommonButton
                        color="inherit"
                        disabled={isSubmitting}
                        size="small"
                        variant="outlined"
                        onClick={handleAttemptClose}
                        className="order-2 sm:order-1"
                    >
                        Close
                    </CommonButton>

                    {isPending && !isRejectOpen && (
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
                                disabled={isSubmitting}
                                loading={isSubmitting}
                                size="small"
                                startIcon={<CheckCircleIcon size={16} />}
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
            </CommonModal>

            <NotifyStudentModal
                open={isNotifyOpen}
                studentId={request.student_id}
                studentName={request.student_name}
                studentNumber={request.student_number}
                onClose={() => setIsNotifyOpen(false)}
                onSuccess={() => onSuccess?.()}
            />

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
        </>
    );
}

