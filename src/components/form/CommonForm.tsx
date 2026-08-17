import { FormField, FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { classMerge } from '@utils/css.util';
import { Control, FieldValues } from 'react-hook-form';

const COL_SPAN_CLASSES: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    5: 'col-span-5',
    6: 'col-span-6',
    7: 'col-span-7',
    8: 'col-span-8',
    9: 'col-span-9',
    10: 'col-span-10',
    11: 'col-span-11',
    12: 'col-span-12'
};

export interface CommonFormProps<T extends FieldValues> {
    control: Control<T>;
    fields: FormFieldConfig<T>[];
    containerClassName?: string;
    formProps?: ComponentPropsForm;
    hasHelper?: boolean;
}

export default function CommonForm<T extends FieldValues>({
    control,
    fields,
    containerClassName = 'flex flex-col gap-4',
    formProps,
    hasHelper = true
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
                                    'flex flex-col gap-1 min-w-0',
                                    field.type === 'checkbox'
                                        ? 'justify-center'
                                        : '',
                                    field.gridCols
                                        ? COL_SPAN_CLASSES[field.gridCols] ?? ''
                                        : ''
                                )
                            }
                            key={field.name as string}
                        >
                            {field.type !== 'checkbox' && (
                                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                    {field.label ?? formatLabel(field.name as string)}
                                </span>
                            )}
                            <FormField
                                control={control}
                                field={field}
                                hasHelper={hasHelper}
                            />
                        </div>
                    );
                })}
            </div>
        </form>
    );
}