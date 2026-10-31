import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonModal from '@components/modal/CommonModal';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { GraduationCapIcon, IdentificationCardIcon } from '@phosphor-icons/react';
import { CIVIL_STATUS_OPTIONS, GENDER_OPTIONS } from '@pages/shared/profile/constants/profile.constant';
import { initAuthSession } from '@services/auth.service';
import { createMyStudentProfile } from '@services/profile.service';
import { getPrograms } from '@services/program/program.service';
import { useToastStore } from '@stores/toast.store';
import { MyProfile } from '@type/profile.type';
import { formErrors, MOBILE_NUMBER_RULE, POSTAL_CODE_RULE } from '@utils/form.util';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

const YEAR_LEVEL_OPTIONS: CommonSelectOption[] = [
    { label: '1st Year', value: 1 },
    { label: '2nd Year', value: 2 },
    { label: '3rd Year', value: 3 },
    { label: '4th Year', value: 4 },
    { label: '5th Year', value: 5 },
    { label: '6th Year', value: 6 }
];

export interface StudentProfilePromptModalProps {
    open: boolean;
    onClose?: () => void;
    onSuccess?: () => void;
    currentProfile?: MyProfile | null;
    isMandatory?: boolean;
}

interface StudentProfileFormValues {
    first_name: string;
    middle_name: string;
    last_name: string;
    suffix: string;
    program_id: string;
    year_level: number;
    mobile_number: string;
    date_of_birth: string;
    gender: string;
    civil_status: string;
    nationality: string;
    address_line1: string;
    city: string;
    province: string;
    postal_code: string;
}

function toFormValues(profile?: MyProfile | null): StudentProfileFormValues {
    return {
        first_name: profile?.first_name ?? '',
        middle_name: profile?.middle_name ?? '',
        last_name: profile?.last_name ?? '',
        suffix: profile?.suffix ?? '',
        program_id: '',
        year_level: 1,
        mobile_number: profile?.mobile_number ?? '',
        date_of_birth: profile?.date_of_birth ?? '',
        gender: profile?.gender ?? '',
        civil_status: profile?.civil_status ?? '',
        nationality: profile?.nationality ?? '',
        address_line1: profile?.address_line1 ?? '',
        city: profile?.city ?? '',
        province: profile?.province ?? '',
        postal_code: profile?.postal_code ?? ''
    };
}

function notBlank(label: string) {
    return function(value: string | number) {
        return String(value ?? '').trim() !== '' || `${label} is required`;
    };
}

function trimmedOrUndefined(value: string): string | undefined {
    return value.trim() || undefined;
}

export default function StudentProfilePromptModal({
    open,
    onClose,
    onSuccess,
    currentProfile,
    isMandatory = false
}: StudentProfilePromptModalProps) {
    const [programOptions, setProgramOptions] = useState<CommonSelectOption[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);

    const methods = useForm<StudentProfileFormValues>({ defaultValues: toFormValues(currentProfile) });
    const { control, handleSubmit, reset } = methods;

    useEffect(function() {
        if (!open) return;

        reset(toFormValues(currentProfile));

        async function fetchPrograms() {
            setIsLoadingPrograms(true);
            const result = await getPrograms();
            if (result.data) {
                setProgramOptions(
                    result.data.map(function(program) {
                        return {
                            label: `${program.code} · ${program.label}`,
                            value: program.id
                        };
                    })
                );
            }
            setIsLoadingPrograms(false);
        }

        fetchPrograms();
    }, [open, currentProfile, reset]);

    const today = new Date().toISOString()
        .slice(0, 10);

    const fields: FormFieldConfig<StudentProfileFormValues>[] = [
        {
            disabled: isSubmitting,
            label: 'First Name',
            name: 'first_name',
            rules: { required: 'First name is required', validate: notBlank('First name') },
            type: 'text'
        },
        {
            disabled: isSubmitting,
            label: 'Middle Name',
            name: 'middle_name',
            type: 'text'
        },
        {
            disabled: isSubmitting,
            label: 'Last Name',
            name: 'last_name',
            rules: { required: 'Last name is required', validate: notBlank('Last name') },
            type: 'text'
        },
        {
            disabled: isSubmitting,
            label: 'Suffix',
            name: 'suffix',
            placeholder: 'e.g. Jr., III',
            type: 'text'
        },
        {
            disabled: isSubmitting || isLoadingPrograms,
            label: 'Academic Program',
            name: 'program_id',
            options: programOptions,
            type: 'select'
        },
        {
            disabled: isSubmitting,
            label: 'Year Level',
            name: 'year_level',
            options: YEAR_LEVEL_OPTIONS,
            rules: { required: 'Year level is required' },
            type: 'select'
        },
        {
            disabled: isSubmitting,
            label: 'Mobile Number',
            name: 'mobile_number',
            rules: { pattern: MOBILE_NUMBER_RULE },
            type: 'text'
        },
        {
            disabled: isSubmitting,
            label: 'Date of Birth',
            name: 'date_of_birth',
            rules: {
                validate: function(value: string | number) {
                    return !value || String(value) <= today || 'Date of birth cannot be in the future';
                }
            },
            type: 'date'
        },
        {
            disabled: isSubmitting,
            label: 'Gender',
            name: 'gender',
            options: GENDER_OPTIONS,
            type: 'select'
        },
        {
            disabled: isSubmitting,
            label: 'Civil Status',
            name: 'civil_status',
            options: CIVIL_STATUS_OPTIONS,
            type: 'select'
        },
        {
            disabled: isSubmitting,
            label: 'Nationality',
            name: 'nationality',
            placeholder: 'e.g. Filipino',
            type: 'text'
        },
        {
            disabled: isSubmitting,
            label: 'Address',
            name: 'address_line1',
            placeholder: 'House no., street, barangay',
            type: 'text'
        },
        {
            disabled: isSubmitting,
            label: 'City / Municipality',
            name: 'city',
            type: 'text'
        },
        {
            disabled: isSubmitting,
            label: 'Province',
            name: 'province',
            type: 'text'
        },
        {
            disabled: isSubmitting,
            label: 'Postal Code',
            name: 'postal_code',
            rules: { pattern: POSTAL_CODE_RULE },
            type: 'text'
        }
    ];

    async function saveProfile(values: StudentProfileFormValues) {
        setIsSubmitting(true);
        const result = await createMyStudentProfile({
            address_line1: trimmedOrUndefined(values.address_line1),
            city: trimmedOrUndefined(values.city),
            civil_status: values.civil_status || undefined,
            date_of_birth: values.date_of_birth || undefined,
            first_name: values.first_name.trim(),
            gender: values.gender || undefined,
            last_name: values.last_name.trim(),
            middle_name: trimmedOrUndefined(values.middle_name),
            mobile_number: trimmedOrUndefined(values.mobile_number),
            nationality: trimmedOrUndefined(values.nationality),
            postal_code: trimmedOrUndefined(values.postal_code),
            program_id: values.program_id || undefined,
            province: trimmedOrUndefined(values.province),
            suffix: trimmedOrUndefined(values.suffix),
            year_level: Number(values.year_level)
        });
        setIsSubmitting(false);

        if (!result.error) {
            const assignedNo = result.data?.student_number;
            const successMsg = assignedNo
                ? `Student profile set up successfully! System Generated Student No: ${assignedNo}`
                : 'Student profile set up successfully!';
            useToastStore.getState().showToast(successMsg, 'success');
            await initAuthSession();
            onSuccess?.();
            if (onClose) onClose();
        }
    }

    return (
        <CommonModal
            fullWidth
            maxWidth="md"
            open={open}
            onClose={isMandatory ? undefined : onClose}
            cardProps={{
                className: 'flex flex-col max-h-[100dvh] sm:max-h-[85dvh] w-full max-w-2xl overflow-hidden',
                cardHeaderProps: {
                    title: 'Complete Your Student Profile',
                    subheader: 'Please fill in your student information to activate your student account.'
                }
            }}
        >
            <div className="flex flex-1 flex-col gap-5 min-h-0 overflow-y-auto p-4 sm:p-6 pt-0 sm:pt-0 pb-6">
                <div className="border border-(--mui-palette-info-main) bg-(--mui-palette-info-light) p-3 rounded-lg flex items-start gap-3 text-xs text-(--mui-palette-text-primary)">
                    <GraduationCapIcon size={24} className="text-(--mui-palette-info-main) shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold m-0 text-sm">Welcome Student!</p>
                        <p className="m-0 mt-0.5 text-(--mui-palette-text-secondary)">
                            You currently do not have an active student profile. Please complete the form below to register your student details.
                        </p>
                    </div>
                </div>

                <div className="border border-(--mui-palette-divider) p-3 rounded-lg bg-(--mui-palette-background-default) flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <IdentificationCardIcon size={20} className="text-(--mui-palette-primary-main)" />
                        <span className="text-xs font-medium text-(--mui-palette-text-secondary)">Student Number:</span>
                    </div>
                    <span className="font-mono text-xs font-semibold px-2 py-1 bg-(--mui-palette-action-hover) rounded text-(--mui-palette-primary-main) border border-(--mui-palette-divider)">
                        System Generated
                    </span>
                </div>

                <CommonForm
                    component="div"
                    containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
                    control={control}
                    enableDraftRecovery={false}
                    fields={fields}
                    hasHelper
                />

                <div className="flex gap-2 justify-end mt-2">
                    {!isMandatory && onClose && (
                        <CommonButton
                            color="inherit"
                            disabled={isSubmitting}
                            size="small"
                            variant="outlined"
                            onClick={onClose}
                        >
                            Cancel
                        </CommonButton>
                    )}
                    <CommonButton
                        disabled={isSubmitting}
                        loading={isSubmitting}
                        size="small"
                        variant="contained"
                        onClick={handleSubmit(saveProfile, function(errors) {
                            formErrors(errors, methods);
                        })}
                    >
                        {isSubmitting ? 'Saving Profile...' : 'Save & Create Profile'}
                    </CommonButton>
                </div>
            </div>
        </CommonModal>
    );
}
