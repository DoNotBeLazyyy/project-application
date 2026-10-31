import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonModal from '@components/modal/CommonModal';
import { CIVIL_STATUS_OPTIONS, GENDER_OPTIONS } from '@pages/shared/profile/constants/profile.constant';
import {
    BuildingsIcon,
    GraduationCapIcon,
    SignOutIcon,
    UserCircleIcon
} from '@phosphor-icons/react';
import { initAuthSession, logout } from '@services/auth.service';
import { completeUserProfile } from '@services/profile.service';
import { useAppStore } from '@stores/app.store';
import { useToastStore } from '@stores/toast.store';
import {
    DEFAULT_FORM_OPTIONS,
    formErrors,
    MOBILE_NUMBER_RULE,
    POSTAL_CODE_RULE
} from '@utils/form.util';
import { useEffect, useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

interface UserProfilePromptModalProps {
    // Hides Skip and Close so the user must finish or sign out
    isMandatory?: boolean;
    // Shows the modal
    open: boolean;
    onClose?: VoidFunction;
    onSuccess?: VoidFunction;
}

interface UserProfileFormValues {
    address_line1: string;
    address_line2: string;
    city: string;
    civil_status: string;
    date_of_birth: string;
    first_name: string;
    gender: string;
    last_name: string;
    middle_name: string;
    mobile_number: string;
    nationality: string;
    postal_code: string;
    preferred_name: string;
    province: string;
    suffix: string;
}

const EMPTY_VALUES: UserProfileFormValues = {
    address_line1: '',
    address_line2: '',
    city: '',
    civil_status: '',
    date_of_birth: '',
    first_name: '',
    gender: '',
    last_name: '',
    middle_name: '',
    mobile_number: '',
    nationality: '',
    postal_code: '',
    preferred_name: '',
    province: '',
    suffix: ''
};

/**
 * Builds a validator that rejects text made of spaces only.
 *
 * @param label - Field name used in the message.
 * @returns
 */
function requireText(label: string) {
    return (value: string | number) => String(value ?? '')
        .trim() !== '' || `${label} is required`;
}

/**
 * Trims a value and turns an empty result into undefined.
 *
 * @param value - Raw field value.
 * @returns
 */
function trimToUndefined(value: string): string | undefined {
    return value.trim() || undefined;
}

/**
 * Lists the fields of the profile form.
 *
 * @param isDisabled - Disables every field while saving.
 * @returns
 */
function buildFields(isDisabled: boolean): FormFieldConfig<UserProfileFormValues>[] {
    const today = new Date()
        .toISOString()
        .slice(0, 10);

    return [
        {
            disabled: isDisabled,
            label: 'First Name',
            name: 'first_name',
            rules: {
                required: 'First name is required',
                validate: requireText('First name')
            },
            type: 'text'
        },
        {
            disabled: isDisabled,
            label: 'Middle Name',
            name: 'middle_name',
            type: 'text'
        },
        {
            disabled: isDisabled,
            label: 'Last Name',
            name: 'last_name',
            rules: {
                required: 'Last name is required',
                validate: requireText('Last name')
            },
            type: 'text'
        },
        {
            disabled: isDisabled,
            label: 'Suffix',
            name: 'suffix',
            placeholder: 'e.g. Jr., III',
            type: 'text'
        },
        {
            disabled: isDisabled,
            label: 'Preferred Name',
            name: 'preferred_name',
            type: 'text'
        },
        {
            disabled: isDisabled,
            label: 'Mobile Number',
            name: 'mobile_number',
            placeholder: 'e.g. 0917 123 4567',
            rules: { pattern: MOBILE_NUMBER_RULE },
            type: 'text'
        },
        {
            disabled: isDisabled,
            label: 'Date of Birth',
            name: 'date_of_birth',
            rules: {
                validate: (value: string | number) => !value
                    || String(value) <= today
                    || 'Date of birth cannot be in the future'
            },
            type: 'date'
        },
        {
            disabled: isDisabled,
            label: 'Gender',
            name: 'gender',
            options: GENDER_OPTIONS,
            type: 'select'
        },
        {
            disabled: isDisabled,
            label: 'Civil Status',
            name: 'civil_status',
            options: CIVIL_STATUS_OPTIONS,
            type: 'select'
        },
        {
            disabled: isDisabled,
            label: 'Nationality',
            name: 'nationality',
            placeholder: 'e.g. Filipino',
            type: 'text'
        },
        {
            disabled: isDisabled,
            label: 'Address Line 1',
            name: 'address_line1',
            placeholder: 'House, unit, street',
            type: 'text'
        },
        {
            disabled: isDisabled,
            label: 'Address Line 2',
            name: 'address_line2',
            placeholder: 'Barangay, subdivision',
            type: 'text'
        },
        {
            disabled: isDisabled,
            label: 'City / Municipality',
            name: 'city',
            type: 'text'
        },
        {
            disabled: isDisabled,
            label: 'Province',
            name: 'province',
            type: 'text'
        },
        {
            disabled: isDisabled,
            label: 'Postal Code',
            name: 'postal_code',
            rules: { pattern: POSTAL_CODE_RULE },
            type: 'text'
        }
    ];
}

/**
 * UserProfilePromptModal
 * Asks a newly activated user to complete their name and personal details.
 */
export default function UserProfilePromptModal({
    isMandatory = true,
    open,
    onClose,
    onSuccess
}: UserProfilePromptModalProps) {
    const navigate = useNavigate();
    const userProfile = useAppStore((state) => state.userProfile);
    const activeRole = useAppStore((state) => state.activeRole);
    const availableRoles = useAppStore((state) => state.availableRoles);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const methods = useForm<UserProfileFormValues>({
        ...DEFAULT_FORM_OPTIONS,
        defaultValues: EMPTY_VALUES
    });

    const isDean = activeRole === 'Dean' || availableRoles.some((role) => role.code === 'Dean');
    const isStudent = activeRole === 'Student' || availableRoles.some((role) => role.code === 'Student');
    const fields = buildFields(isSubmitting);

    useEffect(() => {
        if (!open || !userProfile) return;

        methods.reset({
            ...EMPTY_VALUES,
            first_name: userProfile.first_name ?? '',
            last_name: userProfile.last_name ?? '',
            middle_name: userProfile.middle_name ?? '',
            mobile_number: userProfile.mobile_number ?? '',
            preferred_name: userProfile.preferred_name ?? '',
            suffix: userProfile.suffix ?? ''
        });
    }, [open, userProfile, methods]);

    /**
     * Signs the user out from the prompt.
     */
    async function handleSignOutClick() {
        await logout();
        navigate('/login');
    }

    /**
     * Saves the profile and reloads the session.
     *
     * @param values - Validated form values.
     */
    async function handleValidSubmit(values: UserProfileFormValues) {
        setIsSubmitting(true);
        const result = await completeUserProfile({
            address_line1: trimToUndefined(values.address_line1),
            address_line2: trimToUndefined(values.address_line2),
            city: trimToUndefined(values.city),
            civil_status: values.civil_status || undefined,
            date_of_birth: values.date_of_birth || undefined,
            first_name: values.first_name.trim(),
            gender: values.gender || undefined,
            last_name: values.last_name.trim(),
            middle_name: trimToUndefined(values.middle_name),
            mobile_number: trimToUndefined(values.mobile_number),
            nationality: trimToUndefined(values.nationality),
            postal_code: trimToUndefined(values.postal_code),
            preferred_name: trimToUndefined(values.preferred_name),
            province: trimToUndefined(values.province),
            suffix: trimToUndefined(values.suffix)
        });
        setIsSubmitting(false);

        if (result.error) {
            useToastStore.getState()
                .showToast(result.error.message || 'Failed to complete profile.', 'error');
            return;
        }

        useToastStore.getState()
            .showToast('Profile completed. Welcome aboard.', 'success');
        await initAuthSession();
        onSuccess?.();
        onClose?.();
    }

    /**
     * Focuses the first field with an error.
     *
     * @param errors - Errors from the form.
     */
    function handleInvalidSubmit(errors: FieldErrors<UserProfileFormValues>) {
        formErrors(errors, methods);
    }

    /**
     * Validates and submits the form.
     */
    function handleSaveClick() {
        methods.handleSubmit(handleValidSubmit, handleInvalidSubmit)();
    }

    return (
        <CommonModal
            cardProps={{
                cardHeaderProps: {
                    subheader: 'Please fill in your user profile information.',
                    title: 'Complete Your Profile Information'
                },
                className: 'flex flex-col max-h-[100dvh] sm:max-h-[85dvh] overflow-hidden w-full'
            }}
            fullWidth
            maxWidth="md"
            open={open}
            onClose={isMandatory
                ? undefined
                : onClose}
        >
            <div className="flex flex-1 flex-col gap-5 min-h-0 overflow-y-auto p-4 pb-6 pt-0 sm:p-6 sm:pt-0">
                <div className="bg-(--mui-palette-primary-50) border border-(--mui-palette-primary-200) flex gap-3 items-start p-3.5 rounded-(--mui-tokens-radius-md)">
                    <UserCircleIcon
                        className="shrink-0 text-(--mui-palette-primary-main)"
                        size={24}
                    />
                    <div className="flex flex-col gap-1 text-xs">
                        <p className="font-semibold text-(--mui-palette-primary-900) text-sm">
                            Welcome to AU-JAS!
                        </p>
                        <p className="text-(--mui-palette-text-secondary)">
                            Before you can use the system, please complete your user profile.
                        </p>
                    </div>
                </div>

                {isDean && (
                    <div className="bg-(--mui-palette-secondary-50) border border-(--mui-palette-secondary-200) flex flex-col gap-2 p-4 rounded-(--mui-tokens-radius-md)">
                        <div className="flex font-semibold gap-2 items-center text-(--mui-palette-secondary-main) text-sm">
                            <BuildingsIcon size={20} />
                            <span>
                                Governing Department
                            </span>
                        </div>
                        <p className="text-(--mui-palette-text-secondary) text-xs">
                            {userProfile?.department_name
                                ? `Assigned to ${userProfile.department_code} · ${userProfile.department_name} by the Administrator.`
                                : 'Your academic department will be assigned by the Administrator.'}
                        </p>
                    </div>
                )}

                {isStudent && (
                    <div className="bg-(--mui-palette-info-50) border border-(--mui-palette-info-200) flex flex-col gap-2 p-4 rounded-(--mui-tokens-radius-md)">
                        <div className="flex font-semibold gap-2 items-center text-(--mui-palette-info-main) text-sm">
                            <GraduationCapIcon size={20} />
                            <span>
                                Academic Program & Year Level
                            </span>
                        </div>
                        <p className="text-(--mui-palette-text-secondary) text-xs">
                            The Registrar&apos;s Office assigns your program and year level after verification.
                        </p>
                    </div>
                )}

                <CommonForm
                    component="div"
                    containerClassName="gap-4 grid grid-cols-1 sm:grid-cols-2"
                    control={methods.control}
                    enableDraftRecovery={false}
                    fields={fields}
                    hasHelper
                />

                <div className="border-(--mui-palette-divider) border-t flex items-center justify-between pt-4">
                    {isMandatory
                        ? (
                            <CommonButton
                                color="error"
                                disabled={isSubmitting}
                                size="small"
                                startIcon={<SignOutIcon size={18} />}
                                variant="outlined"
                                onClick={handleSignOutClick}
                            >
                                Sign Out
                            </CommonButton>
                        )
                        : <span />}
                    <div className="flex gap-3 items-center">
                        {!isMandatory && onClose && (
                            <CommonButton
                                disabled={isSubmitting}
                                size="small"
                                variant="outlined"
                                onClick={onClose}
                            >
                                Skip for Now
                            </CommonButton>
                        )}
                        <CommonButton
                            color="primary"
                            disabled={isSubmitting}
                            loading={isSubmitting}
                            size="small"
                            variant="contained"
                            onClick={handleSaveClick}
                        >
                            Save & Continue
                        </CommonButton>
                    </div>
                </div>
            </div>
        </CommonModal>
    );
}