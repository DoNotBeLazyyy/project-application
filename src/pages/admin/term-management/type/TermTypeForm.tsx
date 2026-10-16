import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { TermTypeFormValues } from '@type/term/term-type.type';
import { generateTermTypeCode } from '@utils/entity-code.util';
import { useEffect } from 'react';
import { Control, UseFormSetValue, useWatch } from 'react-hook-form';

interface TermTypeFormProps extends ComponentPropsForm {
    control: Control<TermTypeFormValues>;
    disabled?: boolean;
    isCodeDisabled?: boolean;
    isCreate?: boolean;
    setValue?: UseFormSetValue<TermTypeFormValues>;
}

export function getTermTypeFormFields(
    disabled?: boolean,
    _isCodeDisabled?: boolean
): FormFieldConfig<TermTypeFormValues>[] {
    return [
        {
            disabled: true,
            fieldProps: { helperText: 'System-generated unique term type code' },
            label: 'Code',
            name: 'code',
            placeholder: 'e.g. SEM-1',
            type: 'text'
        },
        {
            disabled,
            fieldProps: { helperText: 'Full display name of this academic term type' },
            label: 'Term Type Name',
            name: 'label',
            placeholder: 'e.g. 1st Semester',
            rules: disabled
                ? undefined
                : {
                    required: 'Term type name is required',
                    validate: (val: any) => Boolean(val && String(val).trim()) || 'Term type name cannot be empty or whitespace only'
                },
            type: 'text'
        },
        {
            disabled,
            fieldProps: { helperText: 'Optional description of this academic term' },
            label: 'Description',
            name: 'description',
            placeholder: 'e.g. Regular first academic semester',
            type: 'text-area'
        }
    ];
}

export default function TermTypeForm({
    control,
    disabled,
    isCodeDisabled,
    isCreate = false,
    setValue,
    ...formProps
}: TermTypeFormProps) {
    const fields = getTermTypeFormFields(disabled, isCodeDisabled);
    const watchedLabel = useWatch({ control, name: 'label' });

    useEffect(() => {
        if (!setValue || disabled || !isCreate) return;
        const generated = generateTermTypeCode(watchedLabel || '');
        if (generated) {
            setValue('code', generated, { shouldValidate: true, shouldDirty: true });
        } else if (!watchedLabel?.trim()) {
            setValue('code', '', { shouldValidate: false, shouldDirty: false });
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