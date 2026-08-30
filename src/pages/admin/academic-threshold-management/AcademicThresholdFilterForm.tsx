import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { AcademicThresholdFilterValues } from '@type/academic-threshold.type';
import { ComponentPropsForm } from '@type/common.type';
import { ACADEMIC_THRESHOLD_CATEGORIES } from '@utils/academic-threshold.util';
import { Control } from 'react-hook-form';

const CATEGORY_OPTIONS = [
    { label: 'All', value: 'All' },
    ...ACADEMIC_THRESHOLD_CATEGORIES.map(function(category) {
        return { label: category, value: category };
    })
];

const ACTIVE_OPTIONS = [
    { label: 'All', value: 'All' },
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' }
];

interface AcademicThresholdFilterFormProps extends ComponentPropsForm {
    control: Control<AcademicThresholdFilterValues>;
}

export default function AcademicThresholdFilterForm({
    control,
    ...formProps
}: AcademicThresholdFilterFormProps) {
    const fields: FormFieldConfig<AcademicThresholdFilterValues>[] = [
        {
            label: 'Category',
            name: 'category',
            options: CATEGORY_OPTIONS,
            type: 'select'
        },
        {
            label: 'Status',
            name: 'is_active',
            options: ACTIVE_OPTIONS,
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