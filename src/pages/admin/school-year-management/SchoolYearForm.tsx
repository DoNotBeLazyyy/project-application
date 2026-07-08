import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { SchoolYearFormValues } from '@type/school-year.type';
import { useEffect } from 'react';
import { Control, useWatch } from 'react-hook-form';

interface SchoolYearFormProps extends ComponentPropsForm {
    control: Control<SchoolYearFormValues>;
    disabled?: boolean;
    isNew?: boolean;
    setValue: (field: keyof SchoolYearFormValues, value: string | boolean) => void;
}

export default function SchoolYearForm({
    control,
    disabled,
    isNew,
    setValue,
    ...formProps
}: SchoolYearFormProps) {
    const startDate = useWatch({ control, name: 'start_date' });
    const endDate = useWatch({ control, name: 'end_date' });
    const fields: FormFieldConfig<SchoolYearFormValues>[] = [
        {
            disabled,
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
            disabled,
            name: 'code',
            rules: disabled
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
            name: 'is_active',
            type: 'checkbox',
            fieldProps: {
                label: 'Set as active school year'
            }
        }
    ];

    useEffect(() => {
        if (!isNew || !startDate || !endDate) {
            return;
        }

        const startYear = new Date(startDate)
            .getFullYear();
        const endYear = new Date(endDate)
            .getFullYear();

        if (!isNaN(startYear) && !isNaN(endYear)) {
            setValue('code', `SY-${startYear}-${endYear}`);
            setValue('label', `School Year ${startYear}-${endYear}`);
        }
    }, [startDate, endDate, isNew]);

    return (
        <CommonForm
            containerClassName="gap-4 grid grid-cols-2"
            control={control}
            fields={fields}
            formProps={formProps}
            hasHelper
        />
    );
}