import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { CIVIL_STATUS_OPTIONS, GENDER_OPTIONS } from '@pages/shared/profile/constants/profile.constant';
import { ComponentPropsForm } from '@type/common.type';
import { ProfileFormValues } from '@type/profile.type';
import { Control } from 'react-hook-form';

const YEAR_LEVEL_OPTIONS: CommonSelectOption[] = [
    { label: '1st Year', value: 1 },
    { label: '2nd Year', value: 2 },
    { label: '3rd Year', value: 3 },
    { label: '4th Year', value: 4 },
    { label: '5th Year', value: 5 },
    { label: '6th Year', value: 6 }
];

interface ProfileDetailsFormProps extends ComponentPropsForm {
    control: Control<ProfileFormValues>;
    isStudentUser?: boolean;
    isDeanUser?: boolean;
    programOptions?: CommonSelectOption[];
    disabled?: boolean;
}

export default function ProfileDetailsForm({
    control,
    isStudentUser = false,
    isDeanUser = false,
    programOptions = [],
    disabled = false,
    ...formProps
}: ProfileDetailsFormProps) {
    const baseFields: FormFieldConfig<ProfileFormValues>[] = [
        {
            label: 'First Name',
            name: 'first_name',
            rules: {
                required: 'First name is required',
                validate: (v: any) => Boolean(v && String(v).trim()) || 'First name cannot be empty or whitespace only'
            },
            type: 'text',
            fieldProps: { helperText: 'Your legal given name.' }
        },
        {
            label: 'Middle Name',
            name: 'middle_name',
            type: 'text',
            fieldProps: { helperText: 'Optional.' }
        },
        {
            label: 'Last Name',
            name: 'last_name',
            rules: {
                required: 'Last name is required',
                validate: (v: any) => Boolean(v && String(v).trim()) || 'Last name cannot be empty or whitespace only'
            },
            type: 'text',
            fieldProps: { helperText: 'Your legal family name.' }
        },
        {
            label: 'Suffix',
            name: 'suffix',
            type: 'text',
            fieldProps: { helperText: 'Jr., Sr., III — optional.' }
        },
        {
            label: 'Preferred Name',
            name: 'preferred_name',
            type: 'text',
            fieldProps: { helperText: 'How you would like to be addressed.' }
        },
        {
            label: 'Mobile Number',
            name: 'mobile_number',
            type: 'text',
            fieldProps: { helperText: 'Reachable contact number.' }
        },
        {
            label: 'Date of Birth',
            name: 'date_of_birth',
            type: 'date',
            fieldProps: { disableFuture: true }
        },
        {
            label: 'Gender',
            name: 'gender',
            options: GENDER_OPTIONS,
            type: 'select'
        },
        {
            label: 'Civil Status',
            name: 'civil_status',
            options: CIVIL_STATUS_OPTIONS,
            type: 'select'
        },
        {
            label: 'Nationality',
            name: 'nationality',
            type: 'text',
            fieldProps: { helperText: 'Country of citizenship.' }
        }
    ];

    const studentFields: FormFieldConfig<ProfileFormValues>[] = isStudentUser ? [
        {
            disabled: true,
            label: 'Student Number',
            name: 'student_number',
            type: 'text',
            fieldProps: {
                helperText: 'System generated student number (read-only).'
            }
        },
        {
            disabled: true,
            label: 'Program',
            name: 'program_id',
            options: programOptions,
            type: 'select',
            fieldProps: { helperText: 'Academic program assigned by the Registrar (read-only).' }
        },
        {
            disabled: true,
            label: 'Year Level',
            name: 'year_level',
            options: YEAR_LEVEL_OPTIONS,
            type: 'select',
            fieldProps: { helperText: 'Current academic level (assigned by Registrar / auto-updated with curriculum).' }
        }
    ] : [];

    const deanFields: FormFieldConfig<ProfileFormValues>[] = isDeanUser ? [
        {
            disabled: true,
            label: 'Assigned Department',
            name: 'department_name',
            type: 'text',
            fieldProps: {
                helperText: 'Academic department assigned by Administrator (read-only).'
            }
        }
    ] : [];

    const addressFields: FormFieldConfig<ProfileFormValues>[] = [
        {
            label: 'Address Line 1',
            name: 'address_line1',
            type: 'text',
            fieldProps: { helperText: 'House or unit number and street.' }
        },
        {
            label: 'Address Line 2',
            name: 'address_line2',
            type: 'text',
            fieldProps: { helperText: 'Barangay, subdivision — optional.' }
        },
        {
            label: 'City',
            name: 'city',
            type: 'text',
            fieldProps: { helperText: 'City or municipality.' }
        },
        {
            label: 'Province',
            name: 'province',
            type: 'text',
            fieldProps: { helperText: 'Province.' }
        },
        {
            label: 'Postal Code',
            name: 'postal_code',
            type: 'text',
            fieldProps: { helperText: 'ZIP code.' }
        }
    ];

    const rawFields = [...baseFields, ...studentFields, ...deanFields, ...addressFields];
    const fields: FormFieldConfig<ProfileFormValues>[] = disabled
        ? rawFields.map((f) => ({
            ...f,
            fieldProps: {
                ...(f.fieldProps as Record<string, unknown>),
                disabled: true
            }
        })) as FormFieldConfig<ProfileFormValues>[]
        : rawFields;

    return <CommonForm
        containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
        control={control}
        fields={fields}
        formProps={formProps}
        hasHelper
    />;
}