import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { ACTION_OPTIONS } from '@pages/admin/audit-log-management/constants/audit-log.constant';
import { AuditLogFilterValues } from '@type/audit-log.type';
import { ComponentPropsForm } from '@type/common.type';
import { Control } from 'react-hook-form';

interface FilterAuditLogFormProps extends ComponentPropsForm {
    control: Control<AuditLogFilterValues>;
    tableOptions: CommonSelectOption[];
}

export default function FilterAuditLogForm({
    control,
    tableOptions,
    ...formProps
}: FilterAuditLogFormProps) {
    const fields: FormFieldConfig<AuditLogFilterValues>[] = [
        {
            name: 'action',
            options: ACTION_OPTIONS,
            type: 'select'
        },
        {
            label: 'Table',
            name: 'table_name',
            options: [{ label: 'All Tables', value: 'All' }, ...tableOptions],
            type: 'select'
        },
        {
            label: 'From',
            name: 'date_from',
            type: 'date'
        },
        {
            label: 'To',
            name: 'date_to',
            type: 'date'
        }
    ];

    return <CommonForm
        control={control}
        fields={fields}
        formProps={formProps}
    />;
}