import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { YEAR_LEVEL_OPTIONS } from '@constants/year-level.constant';
import { ComponentPropsForm } from '@type/common.type';
import { ProgressionFormValues } from '@type/progression.type';
import { Control } from 'react-hook-form';

interface ProgressionCohortFormProps extends ComponentPropsForm {
    control: Control<ProgressionFormValues>;
    programOptions: CommonSelectOption[];
    termOptions: CommonSelectOption[];
}

export default function ProgressionCohortForm({
    control,
    programOptions,
    termOptions,
    ...formProps
}: ProgressionCohortFormProps) {
    const fields: FormFieldConfig<ProgressionFormValues>[] = [
        {
            name: 'term_id',
            label: 'Target Term',
            options: termOptions,
            type: 'select',
            fieldProps: {
                helperText: 'The term students are progressed into. Year level advances only when this term starts a new school year.'
            },
            rules: { required: 'Target term is required.' }
        },
        {
            name: 'program_ids',
            label: 'Programs',
            options: programOptions,
            type: 'multi-select',
            fieldProps: {
                helperText: 'Leave empty to include every program.'
            }
        },
        {
            name: 'year_levels',
            label: 'Current Year Levels',
            options: YEAR_LEVEL_OPTIONS,
            type: 'multi-select',
            fieldProps: {
                helperText: 'Filters on the year level the students hold today, before progression.'
            }
        },
        {
            name: 'reason',
            label: 'Reason',
            placeholder: 'e.g. Regular batch progression',
            type: 'text',
            fieldProps: {
                helperText: 'Recorded on each student lifecycle entry. Blank uses a default note.'
            }
        },
        {
            name: 'auto_enroll',
            type: 'checkbox',
            fieldProps: {
                label: 'Auto-enroll into the curriculum subjects of the new year level'
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
        />
    );
}