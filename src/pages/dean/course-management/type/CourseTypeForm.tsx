import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { CourseTypeFormValues } from '@type/course/course-type.type';
import { generateCourseTypeCode } from '@utils/entity-code.util';
import { useEffect } from 'react';
import { Control, UseFormSetValue, useWatch } from 'react-hook-form';

interface CourseTypeFormProps extends ComponentPropsForm {
    control: Control<CourseTypeFormValues>;
    disabled?: boolean;
    isCodeDisabled?: boolean;
    isCreate?: boolean;
    setValue?: UseFormSetValue<CourseTypeFormValues>;
}

export function getCourseTypeFormFields(
    disabled?: boolean,
    _isCodeDisabled?: boolean
): FormFieldConfig<CourseTypeFormValues>[] {
    return [
        {
            disabled: true,
            fieldProps: { helperText: 'System-generated unique course type code' },
            label: 'Course Type Code',
            name: 'code',
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
}

export default function CourseTypeForm({
    control,
    disabled,
    isCodeDisabled,
    isCreate = false,
    setValue,
    ...formProps
}: CourseTypeFormProps) {
    const fields = getCourseTypeFormFields(disabled, isCodeDisabled);
    const watchedLabel = useWatch({ control, name: 'label' });

    useEffect(() => {
        if (!setValue || disabled || !isCreate) return;
        const generated = generateCourseTypeCode(watchedLabel || '');
        if (generated) {
            setValue('code', generated, { shouldValidate: true, shouldDirty: true });
        }
    }, [watchedLabel, disabled, isCreate, setValue]);

    return (
        <CommonForm
            control={control}
            fields={fields}
            formProps={formProps}
            hasHelper
        />
    );
}