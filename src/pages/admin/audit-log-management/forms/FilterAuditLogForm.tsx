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
    eventOptions?: CommonSelectOption[];
    operatorOptions?: CommonSelectOption[];
    actionOptions?: CommonSelectOption[];
}

export default function FilterAuditLogForm({
    control,
    tableOptions,
    eventOptions = [],
    operatorOptions = [],
    actionOptions = ACTION_OPTIONS,
    ...formProps
}: FilterAuditLogFormProps) {
    const fields: FormFieldConfig<AuditLogFilterValues>[] = [
        {
            label: 'Action Type',
            name: 'action',
            options: actionOptions,
            type: 'select'
        },
        {
            label: 'Transaction Event',
            name: 'event_name',
            options: [{ label: 'All Events', value: 'All' }, ...eventOptions],
            type: 'select'
        },
        {
            label: 'Target Entity / Table',
            name: 'table_name',
            options: [{ label: 'All Tables', value: 'All' }, ...tableOptions],
            type: 'select'
        },
        {
            label: 'Operator / Performed By',
            name: 'changed_by',
            options: [{ label: 'All Operators', value: 'All' }, ...operatorOptions],
            type: 'select'
        },
        {
            label: 'Date From',
            name: 'date_from',
            type: 'date'
        },
        {
            label: 'Date To',
            name: 'date_to',
            type: 'date'
        }
    ];

    return (
        <CommonForm
            control={control}
            fields={fields}
            formProps={formProps}
        />
    );
}