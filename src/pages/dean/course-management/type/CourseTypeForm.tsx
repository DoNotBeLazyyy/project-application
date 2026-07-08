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
            name: 'code',
            rules: disabled || isCodeDisabled
                ? undefined
                : { required: 'Required' },
            type: 'text'
        },
        {
            disabled,
            name: 'label',
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'text'
        },
        {
            disabled,
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