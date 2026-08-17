import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { ComponentPropsForm } from '@type/common.type';
import { MyGradesFilterValues } from '@type/student-portal.type';
import { Control } from 'react-hook-form';

interface MyGradesFilterFormProps extends ComponentPropsForm {
    control: Control<MyGradesFilterValues>;
    termOptions: CommonSelectOption[];
}

export default function MyGradesFilterForm({
    control,
    termOptions,
    ...formProps
}: MyGradesFilterFormProps) {
    const fields: FormFieldConfig<MyGradesFilterValues>[] = [
        {
            label: 'Term',
            name: 'term_id',
            options: [{ label: 'All Terms', value: '' }, ...termOptions],
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