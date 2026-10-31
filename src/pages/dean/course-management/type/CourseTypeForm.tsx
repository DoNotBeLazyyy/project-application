import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { CourseTypeFormValues } from '@type/course/course-type.type';
import { generateCourseTypeCode } from '@utils/entity-code.util';
import { useEffect, useRef } from 'react';
import { Control, UseFormSetValue, useWatch } from 'react-hook-form';

interface CourseTypeFormProps extends ComponentPropsForm {
    control: Control<CourseTypeFormValues>;
    disabled?: boolean;
    isCreate?: boolean;
    setValue?: UseFormSetValue<CourseTypeFormValues>;
}

function getCourseTypeFormFields(
    disabled?: boolean
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
                : {
                    required: 'Label is required',
                    validate: (val: unknown) => Boolean(val && String(val)
                        .trim()) || 'Label cannot be empty or whitespace only'
                },
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
    isCreate = false,
    setValue,
    ...formProps
}: CourseTypeFormProps) {
    const fields = getCourseTypeFormFields(disabled);
    const watchedLabel = useWatch({ control, name: 'label' });
    const watchedCode = useWatch({ control, name: 'code' });

    const initialLabelRef = useRef<string | null>(null);
    const initialCodeRef = useRef<string | null>(null);

    useEffect(() => {
        initialLabelRef.current = null;
        initialCodeRef.current = null;
    }, [isCreate]);

    useEffect(() => {
        if (!setValue || disabled) return;

        if (initialLabelRef.current === null) {
            initialLabelRef.current = watchedLabel || '';
            initialCodeRef.current = watchedCode || '';
            return;
        }

        if (isCreate) {
            const generated = generateCourseTypeCode(watchedLabel || '');
            if (generated) {
                setValue('code', generated, { shouldValidate: true, shouldDirty: true });
            }
            else if (!watchedLabel?.trim()) {
                setValue('code', '', { shouldValidate: false, shouldDirty: false });
            }
        }
        else {
            if (watchedLabel !== initialLabelRef.current) {
                const generated = generateCourseTypeCode(watchedLabel || '');
                if (generated) {
                    setValue('code', generated, { shouldValidate: true, shouldDirty: true });
                }
                else if (!watchedLabel?.trim()) {
                    setValue('code', '', { shouldValidate: false, shouldDirty: true });
                }
            }
            else if (initialCodeRef.current !== null && watchedCode !== initialCodeRef.current) {
                setValue('code', initialCodeRef.current, { shouldValidate: true, shouldDirty: false });
            }
        }
    }, [watchedLabel, disabled, isCreate, setValue, watchedCode]);

    return (
        <CommonForm
            control={control}
            fields={fields}
            formProps={formProps}
            hasHelper
        />
    );
}