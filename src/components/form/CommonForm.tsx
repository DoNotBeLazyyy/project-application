import { FormField, FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { classMerge } from '@utils/css.util';
import { Control, FieldValues } from 'react-hook-form';

export interface CommonFormProps<T extends FieldValues> {
    control: Control<T>;
    fields: FormFieldConfig<T>[];
    containerClassName?: string;
    formProps?: ComponentPropsForm;
}

export default function CommonForm<T extends FieldValues>({
    control,
    fields,
    containerClassName = 'flex flex-col gap-4',
    formProps
}: CommonFormProps<T>) {
    function formatLabel(name: string) {
        return name
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, function(str) {
                return str.toUpperCase();
            })
            .trim();
    }

    return (
        <form {...formProps}>
            <div className={containerClassName}>
                {fields.map(function(field) {
                    return (
                        <div
                            className={
                                classMerge(
                                    'flex flex-col gap-1',
                                    field.gridCols
                                        ? `col-span-${field.gridCols}`
                                        : ''
                                )
                            }
                            key={field.name as string}
                        >
                            {field.type !== 'checkbox' && (
                                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                    {formatLabel(field.name as string)}
                                </span>
                            )}
                            <FormField
                                control={control}
                                field={field}
                            />
                        </div>
                    );
                })}
            </div>
        </form>
    );
}