import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
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

const YEAR_LEVEL_OPTIONS = [
    { label: '1st Year', value: '1' },
    { label: '2nd Year', value: '2' },
    { label: '3rd Year', value: '3' },
    { label: '4th Year', value: '4' },
    { label: '5th Year', value: '5' },
    { label: '6th Year', value: '6' }
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

    const fields: FormFieldConfig<StudentFormValues>[] = [
        ...(isCreate
            ? [{
                disabled,
                name: 'user_id' as const,
                options: userOptions,
                rules: disabled
                    ? undefined
                    : { required: 'Required' },
                type: 'select' as const,
                gridCols: 2
            }]
            : []
        ),
        {
            disabled,
            name: 'student_number',
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'text',
            gridCols: 2
        },
        {
            disabled,
            name: 'program_id',
            options: programOptions,
            type: 'select',
            gridCols: 2
        },
        {
            disabled,
            name: 'year_level',
            options: YEAR_LEVEL_OPTIONS,
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'select',
            gridCols: 2
        },
        {
            disabled,
            name: 'admitted_at',
            type: 'date',
            gridCols: 2
        },
        ...(!isCreate
            ? [{
                disabled,
                name: 'status' as const,
                options: STATUS_OPTIONS,
                rules: disabled
                    ? undefined
                    : { required: 'Required' },
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
        />
    );
}