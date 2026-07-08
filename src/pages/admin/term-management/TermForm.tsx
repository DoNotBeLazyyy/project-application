import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { ComponentPropsForm } from '@type/common.type';
import { TermFormValues } from '@type/term/term.type';
import { Control, useWatch } from 'react-hook-form';

interface TermFormProps extends ComponentPropsForm {
    control: Control<TermFormValues>;
    disabled?: boolean;
    schoolYearOptions: CommonSelectOption[];
    termTypeOptions: CommonSelectOption[];
}

export default function TermForm({
    control,
    disabled,
    schoolYearOptions,
    termTypeOptions,
    ...formProps
}: TermFormProps) {
    const startDate = useWatch({ control, name: 'start_date' });

    const fields: FormFieldConfig<TermFormValues>[] = [
        {
            disabled,
            name: 'school_year_id',
            options: schoolYearOptions,
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'select'
        },
        {
            disabled,
            name: 'term_type_id',
            options: termTypeOptions,
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'select'
        },
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
                        if (!startDate) return true;
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
            name: 'enrollment_start_date',
            type: 'date',
            fieldProps: {
                disablePast: true
            }
        },
        {
            disabled,
            name: 'enrollment_end_date',
            rules: disabled
                ? undefined
                : {
                    validate: (value) => {
                        if (!value) return true;
                        const enrollStart = control._getWatch('enrollment_start_date') as string;
                        if (!enrollStart) return true;
                        return new Date(value as string) > new Date(enrollStart)
                            || 'Enrollment end date must be after enrollment start date';
                    }
                },
            type: 'date',
            fieldProps: {
                disablePast: true
            }
        },
        {
            disabled,
            name: 'grading_deadline',
            rules: disabled
                ? undefined
                : {
                    validate: (value) => {
                        if (!value) return true;
                        const endDate = control._getWatch('end_date') as string;
                        if (!endDate) return true;
                        return new Date(value as string) > new Date(endDate)
                            || 'Grading deadline must be after end date';
                    }
                },
            type: 'date',
            fieldProps: {
                disablePast: true
            }
        }
    ];

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