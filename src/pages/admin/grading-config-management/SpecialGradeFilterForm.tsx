import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { SpecialGradeFilterValues } from '@type/grading-config.type';
import { Control } from 'react-hook-form';

const ACTIVE_OPTIONS = [
    { label: 'All', value: 'All' },
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' }
];

const PASSING_OPTIONS = [
    { label: 'All', value: 'All' },
    { label: 'Passing Grade', value: 'Passing' },
    { label: 'Non-Passing / Failed', value: 'Non-Passing' }
];

const COMPLETION_OPTIONS = [
    { label: 'All', value: 'All' },
    { label: 'Requires Completion', value: 'Required' },
    { label: 'No Completion Required', value: 'Not Required' }
];

interface SpecialGradeFilterFormProps extends ComponentPropsForm {
    control: Control<SpecialGradeFilterValues>;
}

export default function SpecialGradeFilterForm({
    control,
    ...formProps
}: SpecialGradeFilterFormProps) {
    const fields: FormFieldConfig<SpecialGradeFilterValues>[] = [
        {
            name: 'is_active',
            options: ACTIVE_OPTIONS,
            type: 'select'
        },
        {
            name: 'is_passing',
            options: PASSING_OPTIONS,
            type: 'select'
        },
        {
            name: 'requires_completion',
            options: COMPLETION_OPTIONS,
            type: 'select'
        }
    ];

    return (
        <CommonForm
            control={control}
            fields={fields}
            formProps={formProps}
        />
    );
}