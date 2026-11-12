import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { useTermOptions } from '@hooks/use-term-options';
import { ComponentPropsForm } from '@type/common.type';
import { FacultyLoadFilterValues } from '@type/faculty-load.type';
import { Control } from 'react-hook-form';

interface FacultyLoadFilterFormProps extends ComponentPropsForm {
    control: Control<FacultyLoadFilterValues>;
}

export default function FacultyLoadFilterForm({
    control,
    ...formProps
}: FacultyLoadFilterFormProps) {
    const { termOptions } = useTermOptions({ hasAllOption: true });

    const fields: FormFieldConfig<FacultyLoadFilterValues>[] = [
        {
            label: 'Term',
            name: 'term_id',
            options: termOptions,
            type: 'select'
        }
    ];

    return (
        <CommonForm
            containerClassName="flex flex-col gap-4"
            control={control}
            fields={fields}
            formProps={formProps}
        />
    );
}