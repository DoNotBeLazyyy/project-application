import CommonSelect, { CommonSelectProps } from '@components/select/CommonSelect';
import { InputChangeEvent } from '@type/common.type';
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
    hasHelper,
    helperText: helperTextProp,
    onChange: onDefaultChange,
    ...props
}: ValidCommonSelectProps<T>) {
    const {
        field: { ref, value, onChange },
        fieldState
    } = useController({ control, name, rules });
    const [isOpen, setIsOpen] = useState(false);
    const isClosing = useRef(false);

    function handleChange(event: InputChangeEvent) {
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
        setIsOpen(true);
    }

    function handleFocus() {
        if (!isOpen && !isClosing.current) {
            setIsOpen(true);
        }
    }

    return (
        <CommonSelect
            {...props}
            error={errorProp ?? !!fieldState.error}
            helperText={
                hasHelper
                    ? helperTextProp ?? fieldState.error?.message
                    : undefined
            }
            inputRef={ref}
            slotProps={{
                ...props.slotProps,
                select: {
                    ...props.slotProps?.select,
                    open: isOpen,
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