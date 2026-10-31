import CommonToastEditor, { CommonToastEditorProps } from '@components/editor/CommonToastEditor';
import FormLabel from '@components/form/FormLabel';
import { MakeOptional } from '@type/common.type';
import {
    checkForMessage,
    clearFieldError,
    ensureSubmitValidationMode,
    FORM_ERROR_EVENT,
    FormErrorEventDetail,
    formatFieldLabel
} from '@utils/form.util';
import { ReactNode, useEffect, useRef } from 'react';
import { FieldValues, useController, UseControllerProps } from 'react-hook-form';

export type ValidCommonToastEditorProps<T extends FieldValues = FieldValues> =
    MakeOptional<CommonToastEditorProps, 'value'> &
    UseControllerProps<T> & {
        defaultOpenErrorTooltip?: boolean;
        description?: ReactNode;
        hasHelper?: boolean;
        helperText?: ReactNode;
        isFirstError?: boolean;
        isRequired?: boolean;
        label?: ReactNode;
    };

/**
 * ValidCommonToastEditor
 *
 * Form controller component integrating CommonToastEditor with React Hook Form,
 * supporting standardized form labels, tooltips, helper text, and validation states.
 */
export default function ValidCommonToastEditor<T extends FieldValues = FieldValues>({
    control,
    defaultOpenErrorTooltip,
    description,
    hasHelper = true,
    helperText,
    isFirstError: isFirstErrorProp,
    isRequired,
    label,
    name,
    rules,
    onChange: onExternalChange,
    ...props
}: ValidCommonToastEditorProps<T>) {
    ensureSubmitValidationMode(control);
    const {
        field: { onBlur, onChange, value },
        fieldState,
        formState
    } = useController({
        control, name, rules
    });

    const firstErrorKey = checkForMessage(formState.errors).firstError?.key;
    const isFirstError = isFirstErrorProp ?? Boolean(
        fieldState.error && (
            firstErrorKey === name
            || (name === 'description' && firstErrorKey === 'content')
            || (name === 'content' && firstErrorKey === 'description')
        )
    );

    const resolvedErrorMessage = fieldState.error
        ? (fieldState.error.message && fieldState.error.message.trim().length > 0
            ? fieldState.error.message
            : `${formatFieldLabel(name)} is required.`)
        : undefined;

    // Take focus only right after a submit; fixing another field must not pull focus here
    const seenSubmitCountRef = useRef(formState.submitCount);

    useEffect(() => {
        const isNewSubmit = formState.submitCount !== seenSubmitCountRef.current;
        seenSubmitCountRef.current = formState.submitCount;

        if (isFirstError && !props.disabled && isNewSubmit) {
            const timer = setTimeout(() => {
                const container = document.querySelector<HTMLElement>(`[data-field-name~="${name}"], [name="${name}"], #${name}`);
                const editor = container?.querySelector<HTMLElement>('.toastui-editor-contents, [contenteditable="true"], .ProseMirror');
                if (editor) {
                    editor.focus({ preventScroll: true });
                }
                const scrollTarget = container || editor;
                if (scrollTarget && typeof scrollTarget.scrollIntoView === 'function') {
                    scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isFirstError, formState.submitCount, name, props.disabled]);

    useEffect(() => {
        function handleFormError(event: Event) {
            if (props.disabled) return;
            const detail = (event as CustomEvent<FormErrorEventDetail>).detail;
            const isMatch = detail?.firstErrorField === name
                || (name === 'description' && detail?.firstErrorField === 'content')
                || (name === 'content' && detail?.firstErrorField === 'description')
                || (fieldState.error && isFirstError);

            if (isMatch) {
                const container = document.querySelector<HTMLElement>(`[data-field-name~="${name}"], [name="${name}"], #${name}`);
                const editor = container?.querySelector<HTMLElement>('.toastui-editor-contents, [contenteditable="true"], .ProseMirror');
                if (editor) {
                    editor.focus({ preventScroll: true });
                }
                const scrollTarget = container || editor;
                if (scrollTarget && typeof scrollTarget.scrollIntoView === 'function') {
                    scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }

        if (typeof window !== 'undefined') {
            window.addEventListener(FORM_ERROR_EVENT, handleFormError);
            return () => window.removeEventListener(FORM_ERROR_EVENT, handleFormError);
        }
    }, [name, isFirstError, fieldState.error, props.disabled]);

    function handleChange(val: string) {
        if (fieldState.error) {
            clearFieldError(control, name);
            if (name === 'description') {
                clearFieldError(control, 'content');
            }
            else if (name === 'content') {
                clearFieldError(control, 'description');
            }
        }
        onChange(val);
        onExternalChange?.(val);
    }

    const labelErrorMessage = label && fieldState.error
        ? resolvedErrorMessage
        : undefined;
    const labelDescription = label && !fieldState.error
        ? (description ?? helperText)
        : description;
    const inlineHelper = label
        ? undefined
        : (resolvedErrorMessage ?? helperText);

    const aliasName = name === 'description'
        ? 'content'
        : (name === 'content'
            ? 'description'
            : '');
    const fieldNameAttr = `${name} ${aliasName}`.trim();

    return (
        <div
            className="flex flex-col gap-1.5 w-full min-w-0 max-w-full overflow-hidden"
            data-field-name={fieldNameAttr}
            id={name}
        >
            {label && (
                <FormLabel
                    defaultOpenErrorTooltip={defaultOpenErrorTooltip ?? isFirstError}
                    description={labelDescription}
                    errorMessage={labelErrorMessage}
                    isFirstError={isFirstError}
                    isRequired={isRequired}
                    label={label}
                />
            )}
            <CommonToastEditor
                {...props}
                value={value ?? ''}
                onBlur={onBlur}
                onChange={handleChange}
            />
            {hasHelper && inlineHelper && (
                <span
                    className={
                        fieldState.error
                            ? 'text-(--mui-palette-error-main) text-xs'
                            : 'text-(--mui-palette-text-secondary) text-xs'
                    }
                >
                    {inlineHelper}
                </span>
            )}
        </div>
    );
}