import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { ProgramLevelFormValues } from '@type/program/program-level.type';
import { generateProgramLevelCode } from '@utils/entity-code.util';
import { useEffect, useRef } from 'react';
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
            const generated = generateProgramLevelCode(watchedLabel || '');
            if (generated) {
                setValue('code', generated, { shouldValidate: true, shouldDirty: true });
            } else if (!watchedLabel?.trim()) {
                setValue('code', '', { shouldValidate: false, shouldDirty: false });
            }
        } else {
            if (watchedLabel !== initialLabelRef.current) {
                const generated = generateProgramLevelCode(watchedLabel || '');
                if (generated) {
                    setValue('code', generated, { shouldValidate: true, shouldDirty: true });
                } else if (!watchedLabel?.trim()) {
                    setValue('code', '', { shouldValidate: false, shouldDirty: true });
                }
            } else if (initialCodeRef.current !== null && watchedCode !== initialCodeRef.current) {
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