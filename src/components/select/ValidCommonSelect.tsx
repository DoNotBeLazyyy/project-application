import CommonSelect, { CommonSelectProps } from '@components/select/CommonSelect';
import { InputChangeEvent } from '@type/common.type';
import { checkForMessage } from '@utils/form.util';
import { useRef, useState } from 'react';
import { FieldValues, useController, UseControllerProps } from 'react-hook-form';

export type ValidCommonSelectProps<T extends FieldValues = FieldValues> =
    Omit<CommonSelectProps, 'value'> & UseControllerProps<T> & {
        hasHelper?: boolean;
    };

export default function ValidCommonSelect<T extends FieldValues = FieldValues>({
    control,
    name,
    rules,
    error: errorProp,
    hasHelper = true,
    helperText: helperTextProp,
    disabled,
    readOnly,
    onChange: onDefaultChange,
    ...props
}: ValidCommonSelectProps<T>) {
    const {
        field: { ref, value, onChange },
        fieldState,
        formState
    } = useController({ control, name, rules });
    const [isOpen, setIsOpen] = useState(false);
    const isClosing = useRef(false);

    const firstErrorKey = checkForMessage(formState.errors).firstError?.key;
    const isFirstError = Boolean(fieldState.error && firstErrorKey === name);

    const isNonInteractive = Boolean(disabled || readOnly);

    function handleChange(event: InputChangeEvent) {
        if (isNonInteractive) return;
        onChange(event);
        onDefaultChange?.(event);
    }

    function handleClose() {
        isClosing.current = true;

        setIsOpen(false);
        setTimeout(() => {
            isClosing.current = false;
        }, 300);
    }

    function handleOpen() {
        if (isNonInteractive) return;
        setIsOpen(true);
    }

    function handleFocus() {
        if (isNonInteractive) return;
        if (!isOpen && !isClosing.current) {
            setIsOpen(true);
        }
    }

    return (
        <CommonSelect
            name={name}
            {...props}
            defaultOpenErrorTooltip={props.defaultOpenErrorTooltip ?? isFirstError}
            disabled={disabled}
            error={errorProp ?? !!fieldState.error}
            helperText={
                hasHelper
                    ? fieldState.error?.message ?? helperTextProp
                    : undefined
            }
            inputRef={ref}
            isFirstError={props.isFirstError ?? isFirstError}
            isRequired={props.isRequired || Boolean(rules?.required)}
            readOnly={readOnly}
            slotProps={{
                ...props.slotProps,
                select: {
                    ...props.slotProps?.select,
                    open: isNonInteractive
                        ? false
                        : isOpen,
                    onOpen: handleOpen,
                    onClose: handleClose
                },
                htmlInput: {
                    onFocus: handleFocus
                }
            }}
            value={value}
            onChange={handleChange}
        />
    );
}