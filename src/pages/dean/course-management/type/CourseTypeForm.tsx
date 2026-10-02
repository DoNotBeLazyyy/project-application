import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { CourseTypeFormValues } from '@type/course/course-type.type';
import { Control } from 'react-hook-form';

interface CourseTypeFormProps extends ComponentPropsForm {
    control: Control<CourseTypeFormValues>;
    disabled?: boolean;
    isCodeDisabled?: boolean;
}

export default function CourseTypeForm({
    control,
    disabled,
    isCodeDisabled,
    ...formProps
}: CourseTypeFormProps) {
    const fields: FormFieldConfig<CourseTypeFormValues>[] = [
        {
            disabled: disabled || isCodeDisabled,
            fieldProps: { helperText: 'Short unique code, e.g. LEC' },
            label: 'Course Type Code',
            name: 'code',
            rules: disabled || isCodeDisabled
                ? undefined
                : { required: 'Code is required' },
            type: 'text'
        },
        {
            disabled,
            fieldProps: { helperText: 'Display name, e.g. Lecture' },
            label: 'Course Type Name',
            name: 'label',
            rules: disabled
                ? undefined
                : { required: 'Label is required' },
            type: 'text'
        },
        {
            disabled,
            label: 'Description',
            name: 'description',
            type: 'text-area'
        }
    ];

    return (
        <CommonForm
            control={control}
            fields={fields}
            formProps={formProps}
            hasHelper
        />
    );
}