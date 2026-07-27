import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { YEAR_LEVEL_OPTIONS } from '@constants/year-level.constant';
import { useProgramOptions } from '@pages/dean/program-management/useProgramOptions';
import { getUsersByRoles } from '@services/user.service';
import { ComponentPropsForm } from '@type/common.type';
import { StudentFormValues, StudentStatus } from '@type/student.type';
import { UserOption } from '@type/user.type';
import { useEffect, useState } from 'react';
import { Control } from 'react-hook-form';

const STATUS_OPTIONS: { label: string; value: StudentStatus }[] = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
    { label: 'LOA', value: 'LOA' },
    { label: 'Graduated', value: 'Graduated' },
    { label: 'Expelled', value: 'Expelled' }
];

interface StudentFormProps extends ComponentPropsForm {
    control: Control<StudentFormValues>;
    disabled?: boolean;
    isCreate?: boolean;
}

export default function StudentForm({
    control,
    disabled,
    isCreate,
    ...formProps
}: StudentFormProps) {
    const { programOptions } = useProgramOptions();
    const [userOptions, setUserOptions] = useState<CommonSelectOption[]>([]);

    useEffect(function() {
        async function fetchUsers() {
            const result = await getUsersByRoles(['Student']);

            if (result.data) {
                setUserOptions(
                    result.data.map((user: UserOption) => ({
                        label: user.full_name,
                        value: user.id
                    }))
                );
            }
        }

        if (isCreate) {
            fetchUsers();
        }
    }, [isCreate]);

    const today = new Date()
        .toISOString()
        .slice(0, 10);

    const fields: FormFieldConfig<StudentFormValues>[] = [
        ...(isCreate
            ? [{
                disabled,
                fieldProps: { helperText: 'Select the user account to link to this student record' },
                name: 'user_id' as const,
                options: userOptions,
                rules: disabled
                    ? undefined
                    : { required: 'Please select a user account' },
                type: 'select' as const,
                gridCols: 2
            }]
            : []
        ),
        {
            disabled,
            fieldProps: { helperText: 'Unique school-issued number, e.g. 2024-00123' },
            name: 'student_number',
            rules: disabled
                ? undefined
                : {
                    required: 'Student number is required',
                    minLength: {
                        value: 3,
                        message: 'Must be at least 3 characters'
                    },
                    maxLength: {
                        value: 20,
                        message: 'Must be at most 20 characters'
                    },
                    pattern: {
                        value: /^[A-Za-z0-9-]+$/,
                        message: 'Only letters, numbers and dashes are allowed'
                    }
                },
            type: 'text',
            gridCols: 2
        },
        {
            disabled,
            fieldProps: { helperText: 'The program the student is enrolled in' },
            name: 'program_id',
            options: programOptions,
            rules: disabled
                ? undefined
                : { required: 'Please select a program' },
            type: 'select',
            gridCols: 2
        },
        {
            disabled,
            fieldProps: { helperText: 'The student\'s current year level' },
            name: 'year_level',
            options: YEAR_LEVEL_OPTIONS,
            rules: disabled
                ? undefined
                : { required: 'Please select a year level' },
            type: 'select',
            gridCols: 2
        },
        {
            disabled,
            fieldProps: { helperText: 'Date the student was admitted (cannot be in the future)' },
            name: 'admitted_at',
            rules: disabled
                ? undefined
                : {
                    validate: (value) =>
                        !value || (value as string) <= today
                            ? true
                            : 'Admission date cannot be in the future'
                },
            type: 'date',
            gridCols: 2
        },
        ...(!isCreate
            ? [{
                disabled,
                fieldProps: { helperText: 'Current enrollment standing of the student' },
                name: 'status' as const,
                options: STATUS_OPTIONS,
                rules: disabled
                    ? undefined
                    : { required: 'Please select a status' },
                type: 'select' as const,
                gridCols: 2
            }]
            : []
        )
    ];

    return (
        <CommonForm
            containerClassName="gap-4 grid grid-cols-2"
            control={control}
            fields={fields}
            formProps={formProps}
            hasHelper
        />
    );
}