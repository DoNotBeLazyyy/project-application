import CommonCardForm from '@components/form/CommonCardForm';
import { FormFieldConfig } from '@components/form/FormField';
import { GradingConfigFormValues } from '@type/grading-config.type';
import { formErrors } from '@utils/form.util';
import { FieldErrors, UseFormReturn } from 'react-hook-form';

const GRADING_CONFIG_FORM_ID = 'grading-config-form';

const configFields: FormFieldConfig<GradingConfigFormValues>[] = [
    {
        name: 'passing_grade',
        rules: {
            required: 'Passing grade is required',
            validate: (value) => {
                const num = Number(value);
                if (isNaN(num)) return 'Must be a valid number';
                if (num < 1.0 || num > 5.0) return 'Must be between 1.0 and 5.0';
                return true;
            }
        },
        type: 'number'
    },
    {
        name: 'max_absence_percentage',
        rules: {
            required: 'Max absence percentage is required',
            validate: (value) => {
                const num = Number(value);
                if (isNaN(num)) return 'Must be a valid number';
                if (num <= 0 || num > 100) return 'Must be between 1 and 100';
                return true;
            }
        },
        type: 'number'
    }
];

interface GeneralTabProps {
    methods: UseFormReturn<GradingConfigFormValues>;
    onSubmit: (values: GradingConfigFormValues) => Promise<void>;
}

export default function GeneralTab({ methods, onSubmit }: GeneralTabProps) {
    function handleError(errors: FieldErrors<GradingConfigFormValues>) {
        formErrors(errors, methods);
    }

    return (
        <CommonCardForm
            cardProps={{
                cardHeaderProps: {
                    subheader: 'Define the minimum passing grade and maximum allowable absences.'
                },
                sx: {
                    boxShadow: 'none',
                    padding: 0,
                    borderRadius: 0
                }
            }}
            formButtonsProps={{
                className: 'justify-start',
                confirmProps: {
                    children: 'Save',
                    form: GRADING_CONFIG_FORM_ID,
                    type: 'submit',
                    variant: 'contained'
                }
            }}
            formProps={{
                containerClassName: 'flex flex-col gap-4 grid grid-cols-2 w-200',
                control: methods.control,
                fields: configFields,
                hasHelper: true,
                formProps: {
                    id: GRADING_CONFIG_FORM_ID,
                    onSubmit: methods.handleSubmit(onSubmit, handleError)
                }
            }}
        />
    );
}