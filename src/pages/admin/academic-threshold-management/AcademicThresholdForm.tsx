import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { AcademicThresholdCategory, AcademicThresholdFormValues } from '@type/academic-threshold.type';
import { ComponentPropsForm } from '@type/common.type';
import { Control } from 'react-hook-form';

interface AcademicThresholdFormProps extends ComponentPropsForm {
    control: Control<AcademicThresholdFormValues>;
    /**
     * Which fields the rule actually carries: Standing has no "no failing grade"
     * condition, and only Scholarship awards a discount.
     */
    category: AcademicThresholdCategory;
    disabled?: boolean;
}

/**
 * The cutoff editor behind the update modal. Code, label and category are set by
 * the seeded ladder and are not editable here - only the numbers, the failing
 * grade condition, and whether the tier is in force.
 */
export default function AcademicThresholdForm({
    category,
    control,
    disabled,
    ...formProps
}: AcademicThresholdFormProps) {
    const fields: FormFieldConfig<AcademicThresholdFormValues>[] = [
        {
            disabled,
            fieldProps: { helperText: 'Lowest GWA in this band. Leave blank for an open-ended ceiling.' },
            label: 'Minimum GWA',
            name: 'min_gwa',
            rules: disabled
                ? undefined
                : {
                    validate: function(value: unknown, formValues: AcademicThresholdFormValues) {
                        if (value === '' || value === null || value === undefined) {
                            return true;
                        }

                        const minGwa = Number(value);

                        if (Number.isNaN(minGwa) || minGwa < 1 || minGwa > 5) {
                            return 'Minimum GWA must be between 1.00 and 5.00';
                        }

                        if (formValues.max_gwa !== '' && minGwa > Number(formValues.max_gwa)) {
                            return 'Minimum GWA cannot be greater than the maximum';
                        }

                        return true;
                    }
                },
            type: 'number'
        },
        {
            disabled,
            fieldProps: { helperText: 'Highest GWA that still qualifies for this tier.' },
            label: 'Maximum GWA',
            name: 'max_gwa',
            rules: disabled
                ? undefined
                : {
                    required: 'Maximum GWA is required',
                    min: { value: 1, message: 'Must be at least 1.00' },
                    max: { value: 5, message: 'Cannot exceed 5.00' }
                },
            type: 'number'
        },
        ...(category === 'Scholarship'
            ? [{
                disabled,
                fieldProps: { helperText: 'Tuition discount percent awarded at this tier.' },
                gridCols: 2,
                label: 'Discount %',
                name: 'scholarship_discount_pct' as const,
                rules: disabled
                    ? undefined
                    : {
                        min: { value: 0, message: 'Cannot be negative' },
                        max: { value: 100, message: 'Cannot exceed 100' }
                    },
                type: 'number' as const
            }]
            : []),
        ...(category === 'Standing'
            ? []
            : [{
                disabled,
                fieldProps: { label: 'Requires no failing grade' },
                name: 'requires_no_failing' as const,
                type: 'checkbox' as const
            }]),
        {
            disabled,
            fieldProps: { label: 'Active' },
            name: 'is_active',
            type: 'checkbox'
        }
    ];

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