import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { ProgramLevelFormValues } from '@type/program/program-level.type';
import { generateProgramLevelCode } from '@utils/entity-code.util';
import { useEffect } from 'react';
import { Control, UseFormSetValue, useWatch } from 'react-hook-form';

interface ProgramLevelFormProps extends ComponentPropsForm {
    control: Control<ProgramLevelFormValues>;
    disabled?: boolean;
    isCodeDisabled?: boolean;
    isCreate?: boolean;
    setValue?: UseFormSetValue<ProgramLevelFormValues>;
}

export function getProgramLevelFormFields(
    disabled?: boolean,
    _isCodeDisabled?: boolean
): FormFieldConfig<ProgramLevelFormValues>[] {
    return [
        {
            disabled: true,
            fieldProps: { helperText: 'System-generated unique program level code' },
            label: 'Program Level Code',
            name: 'code',
            type: 'text'
        },
        {
            disabled,
            fieldProps: { helperText: 'Display name, e.g. Undergraduate' },
            label: 'Program Level Name',
            name: 'label',
            rules: disabled
                ? undefined
                : {
                    required: 'Label is required',
                    validate: (val: any) => Boolean(val && String(val).trim()) || 'Label cannot be empty or whitespace only'
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

export default function ProgramLevelForm({
    control,
    disabled,
    isCodeDisabled,
    isCreate = false,
    setValue,
    ...formProps
}: ProgramLevelFormProps) {
    const fields = getProgramLevelFormFields(disabled, isCodeDisabled);
    const watchedLabel = useWatch({ control, name: 'label' });

    useEffect(() => {
        if (!setValue || disabled || !isCreate) return;
        const generated = generateProgramLevelCode(watchedLabel || '');
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