import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { YEAR_LEVEL_OPTIONS } from '@constants/year-level.constant';
import { useTermTypeOptions } from '@pages/admin/term-management/type/useTermTypeOptions';
import { useCourseOptions } from '@pages/dean/course-management/useCourseOptions';
import { ComponentPropsForm } from '@type/common.type';
import { CurriculumMapFormValues } from '@type/curriculum-map.type';
import { Control } from 'react-hook-form';

interface CurriculumMapFormProps extends ComponentPropsForm {
    control: Control<CurriculumMapFormValues>;
    disabled?: boolean;
}

export default function CurriculumMapForm({
    control,
    disabled,
    ...formProps
}: CurriculumMapFormProps) {
    const { termTypeOptions } = useTermTypeOptions();
    const { courseOptions } = useCourseOptions({});

    const fields: FormFieldConfig<CurriculumMapFormValues>[] = [
        {
            disabled,
            name: 'course_id',
            options: courseOptions,
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'select'
        },
        {
            disabled,
            name: 'year_level',
            options: YEAR_LEVEL_OPTIONS,
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'select'
        },
        {
            disabled,
            name: 'term_type_id',
            options: termTypeOptions,
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'select'
        },
        {
            disabled,
            name: 'sequence',
            rules: disabled
                ? undefined
                : {
                    required: 'Required',
                    min: { value: 1, message: 'Must be at least 1' }
                },
            type: 'number'
        },
        {
            disabled,
            name: 'is_elective',
            fieldProps: { label: 'Elective' },
            type: 'checkbox'
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