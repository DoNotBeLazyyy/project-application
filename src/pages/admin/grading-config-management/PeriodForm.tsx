import CommonForm, { CommonFormProps } from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { PeriodFormValues } from '@pages/admin/grading-config-management/PeriodModalForm';
import { Control } from 'react-hook-form';

export interface PeriodFormProps {
    control: Control<PeriodFormValues>;
    disabled?: boolean;
    maxWeight?: number;
    formProps?: CommonFormProps<PeriodFormValues>['formProps'];
}

export default function PeriodForm({
    control,
    disabled = false,
    maxWeight = 100,
    formProps
}: PeriodFormProps) {
    const fields: FormFieldConfig<PeriodFormValues>[] = [
        {
            name: 'name',
            disabled,
            rules: disabled
                ? undefined
                : { required: 'Period name is required' },
            type: 'text'
        },
        {
            name: 'weight',
            disabled,
            rules: disabled
                ? undefined
                : {
                    required: 'Weight is required',
                    min: { value: 1, message: 'Min 1' },
                    max: { value: maxWeight, message: `Max ${maxWeight}` }
                },
            type: 'number',
            fieldProps: {
                max: maxWeight,
                min: 1
            }
        }
    ];

    return (
        <CommonForm
            containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
            control={control}
            fields={fields}
            formProps={formProps}
            hasHelper
            // Excluded from the label-icon treatment: this form keeps its
            // guidance and errors as text beneath each control.
            helperPlacement="below"
        />
    );
}