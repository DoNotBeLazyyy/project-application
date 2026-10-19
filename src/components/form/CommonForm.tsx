import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import { FormField, FormFieldConfig } from '@components/form/FormField';
import FormLabel from '@components/form/FormLabel';
import { useFormDraft } from '@hooks/useFormDraft';
import { ComponentPropsForm } from '@type/common.type';
import { classMerge } from '@utils/css.util';
import {
    announceFormError, ensureSubmitValidationMode, focusAndOpenFirstErrorField, formatFieldLabel, getFieldErrorMessage
} from '@utils/form.util';
import { useEffect, useMemo } from 'react';
import {
    Control, FieldErrors, FieldValues, useFormState
} from 'react-hook-form';

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
    component?: 'form' | 'div';
    control: Control<T>;
    fields: FormFieldConfig<T>[];
    containerClassName?: string;
    enableDraftRecovery?: boolean;
    formProps?: ComponentPropsForm;
    hasHelper?: boolean;
    helperPlacement?: FormHelperPlacement;
    defaultOpenErrorTooltip?: boolean;
    autoOpenFirstErrorTooltip?: boolean;
}

interface CommonFormRowProps<T extends FieldValues> {
    control: Control<T>;
    field: FormFieldConfig<T>;
    hasHelper: boolean;
    helperPlacement: FormHelperPlacement;
    isFirstError?: boolean;
    defaultOpenErrorTooltip?: boolean;
    formErrors?: FieldErrors<T>;
}

/**
 * One labelled field. Split out because reading this field's error needs a hook,
 * which cannot be called from inside the `fields.map` callback.
 */
function CommonFormRow<T extends FieldValues>({
    control,
    defaultOpenErrorTooltip,
    field,
    formErrors: formWideErrors,
    hasHelper,
    helperPlacement,
    isFirstError
}: CommonFormRowProps<T>) {
    const name = field.name as string;
    const isOnLabel = helperPlacement === 'label';
    const { errors: rowErrors } = useFormState({ control, name: field.name });
    const errorMessage = hasHelper && isOnLabel
        ? (getFieldErrorMessage(formWideErrors ?? ({} as FieldErrors<T>), name) ?? getFieldErrorMessage(rowErrors, name))
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
                    autoOpenErrorTooltip={defaultOpenErrorTooltip}
                    defaultOpenErrorTooltip={defaultOpenErrorTooltip}
                    description={hasHelper && isOnLabel
                        ? description
                        : undefined}
                    errorMessage={errorMessage}
                    isFirstError={isFirstError}
                    isRequired={Boolean(field.rules?.required)}
                    label={field.label ?? (field.fieldProps as { label?: string })?.label ?? formatFieldLabel(name)}
                />
            )}
            {/*
              * When the label owns the messages the control renders none - text
              * appearing under an input resizes it mid-typing and shifts every
              * field below it.
              */}
            <FormField
                control={control}
                defaultOpenErrorTooltip={defaultOpenErrorTooltip}
                field={field}
                hasHelper={hasHelper && !isOnLabel}
            />
        </div>
    );
}

export default function CommonForm<T extends FieldValues>({
    component = 'form',
    control,
    fields,
    containerClassName = 'flex flex-col gap-4',
    enableDraftRecovery,
    formProps,
    hasHelper = true,
    helperPlacement = 'label',
    defaultOpenErrorTooltip,
    autoOpenFirstErrorTooltip
}: CommonFormProps<T>) {
    ensureSubmitValidationMode(control);
    const { errors, submitCount } = useFormState({ control });

    const isViewOnly = fields.length > 0 && fields.every((f) => f.disabled);
    const isFilterForm = Boolean(formProps?.id && /filter/i.test(formProps.id));
    const shouldEnableDraft = enableDraftRecovery ?? (!isViewOnly && !isFilterForm);

    const {
        handleContinue,
        handleDiscard,
        isPromptOpen
    } = useFormDraft({
        control,
        enabled: shouldEnableDraft,
        fields,
        formId: formProps?.id,
        isAutoFormDraft: true
    });

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

        focusAndOpenFirstErrorField(firstErrorField);
        announceFormError({
            count: Object.keys(errors).length,
            message: `${formatFieldLabel(firstErrorField)} is required.`,
            firstErrorField
        });
    }, [firstErrorField, submitCount]);

    const resolvedAutoOpenErrorTooltip = defaultOpenErrorTooltip ?? autoOpenFirstErrorTooltip ?? true;

    const content = (
        <div className={containerClassName}>
            {fields.map(function(field) {
                const isFirstError = field.name === firstErrorField;

                return (
                    <CommonFormRow
                        control={control}
                        defaultOpenErrorTooltip={resolvedAutoOpenErrorTooltip ? isFirstError : false}
                        field={field}
                        formErrors={errors}
                        hasHelper={hasHelper}
                        helperPlacement={helperPlacement}
                        isFirstError={resolvedAutoOpenErrorTooltip ? isFirstError : false}
                        key={field.name as string}
                    />
                );
            })}
        </div>
    );

    const formElement = component === 'div' ? (
        content
    ) : (
        <form
            {...formProps}
            className={classMerge('w-full', formProps?.className)}
        >
            {content}
        </form>
    );

    return (
        <>
            {formElement}
            {shouldEnableDraft && (
                <DraftRecoveryPromptModal
                    open={isPromptOpen}
                    onContinue={handleContinue}
                    onDiscard={handleDiscard}
                />
            )}
        </>
    );
}