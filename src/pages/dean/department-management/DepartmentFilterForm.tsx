import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { DepartmentFilterValues } from '@type/department.type';
import { Control } from 'react-hook-form';

const HAS_HEAD_OPTIONS = [
    { label: 'All', value: 'All' },
    { label: 'Has Head', value: 'true' },
    { label: 'No Head Assigned', value: 'false' }
];

interface DepartmentFilterFormProps extends ComponentPropsForm {
    control: Control<DepartmentFilterValues>;
}

export default function DepartmentFilterForm({
    control,
    ...formProps
}: DepartmentFilterFormProps) {
    const fields: FormFieldConfig<DepartmentFilterValues>[] = [
        {
            name: 'has_head',
            options: HAS_HEAD_OPTIONS,
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