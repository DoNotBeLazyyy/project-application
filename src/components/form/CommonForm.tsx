import FormErrorSummary from '@components/form/FormErrorSummary';
import { FormField, FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { classMerge } from '@utils/css.util';
import { formatFieldLabel } from '@utils/form.util';
import { Control, FieldValues } from 'react-hook-form';

const COL_SPAN_CLASSES: Record<number, string> = {
    1: 'col-span-full md:col-span-1',
    2: 'col-span-full md:col-span-2',
    3: 'col-span-full md:col-span-3',
    4: 'col-span-full md:col-span-4',
    5: 'col-span-full md:col-span-5',
    6: 'col-span-full md:col-span-6',
    7: 'col-span-full md:col-span-7',
    8: 'col-span-full md:col-span-8',
    9: 'col-span-full md:col-span-9',
    10: 'col-span-full md:col-span-10',
    11: 'col-span-full md:col-span-11',
    12: 'col-span-full md:col-span-12'
};

export interface CommonFormProps<T extends FieldValues> {
    control: Control<T>;
    fields: FormFieldConfig<T>[];
    containerClassName?: string;
    formProps?: ComponentPropsForm;
    hasErrorSummary?: boolean;
    hasHelper?: boolean;
}

export default function CommonForm<T extends FieldValues>({
    control,
    fields,
    containerClassName = 'flex flex-col gap-4',
    formProps,
    hasErrorSummary = true,
    hasHelper = true
}: CommonFormProps<T>) {
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
                                    {field.label ?? formatFieldLabel(field.name as string)}
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
            {hasErrorSummary && (
                <FormErrorSummary
                    className="mt-4"
                    control={control}
                />
            )}
        </form>
    );
}