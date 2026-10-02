import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { ProgramLevelFormValues } from '@type/program/program-level.type';
import { Control } from 'react-hook-form';

interface ProgramLevelFormProps extends ComponentPropsForm {
    control: Control<ProgramLevelFormValues>;
    disabled?: boolean;
    isCodeDisabled?: boolean;
}

export default function ProgramLevelForm({
    control,
    disabled,
    isCodeDisabled,
    ...formProps
}: ProgramLevelFormProps) {
    const fields: FormFieldConfig<ProgramLevelFormValues>[] = [
        {
            disabled: disabled || isCodeDisabled,
            fieldProps: { helperText: 'Short unique code, e.g. UG' },
            label: 'Program Level Code',
            name: 'code',
            rules: disabled || isCodeDisabled
                ? undefined
                : { required: 'Code is required' },
            type: 'text'
        },
        {
            disabled,
            fieldProps: { helperText: 'Display name, e.g. Undergraduate' },
            label: 'Program Level Name',
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