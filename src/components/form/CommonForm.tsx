import { FormField, FormFieldConfig } from '@components/form/FormField';
import FormLabel from '@components/form/FormLabel';
import { ComponentPropsForm } from '@type/common.type';
import { classMerge } from '@utils/css.util';
import { formatFieldLabel, getFieldErrorMessage } from '@utils/form.util';
import { useEffect, useMemo } from 'react';
import { Control, FieldValues, useFormState } from 'react-hook-form';

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

/**
 * Where a field's guidance and validation message appear. `label` hangs both off
 * the label as icons, keeping the form's height fixed; `below` keeps the older
 * text under the control, which reflows the form as messages come and go.
 */
export type FormHelperPlacement = 'label' | 'below';

export interface CommonFormProps<T extends FieldValues> {
    control: Control<T>;
    fields: FormFieldConfig<T>[];
    containerClassName?: string;
    formProps?: ComponentPropsForm;
    hasHelper?: boolean;
    helperPlacement?: FormHelperPlacement;
}

interface CommonFormRowProps<T extends FieldValues> {
    control: Control<T>;
    field: FormFieldConfig<T>;
    hasHelper: boolean;
    helperPlacement: FormHelperPlacement;
    isFirstError?: boolean;
}

/**
 * One labelled field. Split out because reading this field's error needs a hook,
 * which cannot be called from inside the `fields.map` callback.
 */
function CommonFormRow<T extends FieldValues>({
    control,
    field,
    hasHelper,
    helperPlacement,
    isFirstError
}: CommonFormRowProps<T>) {
    const name = field.name as string;
    const isOnLabel = helperPlacement === 'label';
    const { errors } = useFormState({ control, name: field.name });
    const errorMessage = hasHelper && isOnLabel
        ? getFieldErrorMessage(errors, name)
        : undefined;
    // `helperText` on a field config is guidance, not a message about state.
    const { helperText: description } = (field.fieldProps ?? {}) as { helperText?: string };
    // Checkboxes carry their own inline label, so the hanging FormLabel is skipped.
    const isSelfLabelled = field.type === 'checkbox' || field.type === 'checkbox-group';

    return (
        <div
            className={
                classMerge(
                    'flex flex-col gap-1 min-w-0',
                    isSelfLabelled
                        ? 'justify-center'
                        : '',
                    field.gridCols
                        ? COL_SPAN_CLASSES[field.gridCols] ?? ''
                        : ''
                )
            }
        >
            {!isSelfLabelled && (
                <FormLabel
                    defaultOpenErrorTooltip={isFirstError}
                    description={hasHelper && isOnLabel
                        ? description
                        : undefined}
                    errorMessage={errorMessage}
                    isFirstError={isFirstError}
                    isRequired={Boolean(field.rules?.required)}
                    label={field.label ?? formatFieldLabel(name)}
                />
            )}
            {/*
              * When the label owns the messages the control renders none - text
              * appearing under an input resizes it mid-typing and shifts every
              * field below it.
              */}
            <FormField
                control={control}
                field={field}
                hasHelper={hasHelper && !isOnLabel}
            />
        </div>
    );
}

export default function CommonForm<T extends FieldValues>({
    control,
    fields,
    containerClassName = 'flex flex-col gap-4',
    formProps,
    hasHelper = true,
    helperPlacement = 'label'
}: CommonFormProps<T>) {
    const { errors, submitCount } = useFormState({ control });

    // Determine the first field in form order that currently has a validation error
    const firstErrorField = useMemo(() => {
        return fields.find((field) => {
            const err = getFieldErrorMessage(errors, field.name as string);
            return Boolean(err);
        })?.name as string | undefined;
    }, [fields, errors]);

    // Automatically focus and scroll to the first invalid field upon validation failure
    useEffect(() => {
        if (!firstErrorField) return;

        const selector = `[name="${firstErrorField}"], #${firstErrorField}`;
        const targetElement = document.querySelector<HTMLElement>(selector) ||
            document.querySelector<HTMLElement>('[aria-invalid="true"], .Mui-error input, .Mui-error textarea, .Mui-error');

        if (targetElement) {
            targetElement.focus({ preventScroll: false });
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [firstErrorField, submitCount]);

    return (
        <form {...formProps}>
            <div className={containerClassName}>
                {fields.map(function(field) {
                    const isFirstError = field.name === firstErrorField;

                    return (
                        <CommonFormRow
                            control={control}
                            field={field}
                            hasHelper={hasHelper}
                            helperPlacement={helperPlacement}
                            isFirstError={isFirstError}
                            key={field.name as string}
                        />
                    );
                })}
            </div>
        </form>
    );
}