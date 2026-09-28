import CommonToastEditor, { CommonToastEditorProps } from '@components/editor/CommonToastEditor';
import FormLabel from '@components/form/FormLabel';
import { MakeOptional } from '@type/common.type';
import { ReactNode } from 'react';
import { FieldValues, useController, UseControllerProps } from 'react-hook-form';

export type ValidCommonToastEditorProps<T extends FieldValues = FieldValues> =
    MakeOptional<CommonToastEditorProps, 'value'> &
    UseControllerProps<T> & {
        description?: ReactNode;
        hasHelper?: boolean;
        helperText?: ReactNode;
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
    description,
    hasHelper = true,
    helperText,
    isRequired,
    label,
    name,
    rules,
    ...props
}: ValidCommonToastEditorProps<T>) {
    const {
        field: { onBlur, onChange, value },
        fieldState: { error }
    } = useController({ control, name, rules });

    const labelErrorMessage = label && error
        ? error.message
        : undefined;
    const labelDescription = label && !error
        ? (description ?? helperText)
        : description;
    const inlineHelper = label
        ? undefined
        : (error?.message ?? helperText);

    return (
        <div className="flex flex-col gap-1.5 w-full min-w-0 max-w-full overflow-hidden">
            {label && (
                <FormLabel
                    description={labelDescription}
                    errorMessage={labelErrorMessage}
                    isRequired={isRequired}
                    label={label}
                />
            )}
            <CommonToastEditor
                value={value ?? ''}
                onBlur={onBlur}
                onChange={onChange}
                {...props}
            />
            {hasHelper && inlineHelper && (
                <span
                    className={
                        error
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