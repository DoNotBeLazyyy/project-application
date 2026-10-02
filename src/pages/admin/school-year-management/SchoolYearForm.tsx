import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { SchoolYearFormValues } from '@type/school-year.type';
import { useEffect } from 'react';
import { Control, UseFormSetValue, useFormState, useWatch } from 'react-hook-form';

interface SchoolYearFormProps extends ComponentPropsForm {
    control: Control<SchoolYearFormValues>;
    disabled?: boolean;
    isCodeDisabled?: boolean;
    isNew?: boolean;
    setValue?: UseFormSetValue<SchoolYearFormValues>;
}

export default function SchoolYearForm({
    control,
    disabled,
    isCodeDisabled,
    isNew,
    setValue,
    ...formProps
}: SchoolYearFormProps) {
    const startDate = useWatch({ control, name: 'start_date' });
    const endDate = useWatch({ control, name: 'end_date' });
    const { dirtyFields } = useFormState({ control, name: ['code', 'label'] });
    const fields: FormFieldConfig<SchoolYearFormValues>[] = [
        {
            disabled,
            label: 'Start Date',
            name: 'start_date',
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'date',
            fieldProps: {
                disablePast: true
            }
        },
        {
            disabled,
            label: 'End Date',
            name: 'end_date',
            rules: disabled
                ? undefined
                : {
                    required: 'Required',
                    validate: (value) => {
                        if (!startDate) {
                            return true;
                        }
                        return new Date(value as string) > new Date(startDate)
                            || 'End date must be after start date';
                    }
                },
            type: 'date',
            fieldProps: {
                disablePast: true
            }
        },
        {
            disabled: true,
            fieldProps: { helperText: 'Auto-generated based on Start Date and End Date.' },
            label: 'Academic Year Code',
            name: 'code',
            rules: undefined,
            type: 'text'
        },
        {
            disabled: true,
            fieldProps: { helperText: 'Auto-generated based on Start Date and End Date.' },
            label: 'Academic Year Label',
            name: 'label',
            rules: undefined,
            type: 'text'
        },
        {
            disabled,
            label: 'Active Status',
            name: 'is_active',
            type: 'checkbox',
            fieldProps: {
                label: 'Set as active school year'
            }
        }
    ];

    useEffect(() => {
        if (!isNew || !startDate || !endDate || !setValue) {
            return;
        }

        const startYear = new Date(startDate)
            .getFullYear();
        const endYear = new Date(endDate)
            .getFullYear();

        if (isNaN(startYear) || isNaN(endYear)) {
            return;
        }

        if (!dirtyFields.code) {
            setValue('code', `SY-${startYear}-${endYear}`);
        }

        if (!dirtyFields.label) {
            setValue('label', `School Year ${startYear}-${endYear}`);
        }
    }, [startDate, endDate, isNew, setValue]);

    return (
        <CommonForm
            containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
            control={control}
            fields={fields}
            formProps={formProps}
            hasHelper
        />
    );
}