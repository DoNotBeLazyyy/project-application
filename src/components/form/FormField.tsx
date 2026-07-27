import ValidCommonCheckbox from '@components/checkbox/ValidCommonCheckbox';
import ValidCommonDatePicker, { CommonDatePickerProps } from '@components/datepicker/ValidCommonDatepicker';
import { CommonInputProps } from '@components/input/CommonInput';
import { CommonNumberInputProps } from '@components/input/CommonNumberInput';
import ValidCommonInput from '@components/input/ValidCommonInput';
import ValidCommonNumberInput from '@components/input/ValidCommonNumberInput';
import { CommonMultiSelectProps } from '@components/select/CommonMultiSelect';
import { CommonSelectOption, CommonSelectProps } from '@components/select/CommonSelect';
import ValidCommonMultiSelect from '@components/select/ValidCommonMultiSelect';
import ValidCommonSelect from '@components/select/ValidCommonSelect';
import { CommonTextareaProps } from '@components/textarea/CommonTextarea';
import ValidCommonTextarea from '@components/textarea/ValidCommonTextArea';
import { EMAIL_PATTERN } from '@constants/validation.constant';
import { CheckboxProps } from '@mui/material';
import { Control, FieldValues, Path, RegisterOptions } from 'react-hook-form';

type TextFieldConfig<T extends FieldValues> = {
    type: 'text' | 'email' | 'password';
    fieldProps?: Omit<CommonInputProps, 'defaultValue'>;
} & BaseFieldConfig<T>;

type TextFieldNumberConfig<T extends FieldValues> = {
    type: 'number';
    fieldProps?: Omit<CommonNumberInputProps, 'defaultValue'>;
} & BaseFieldConfig<T>;

type SelectFieldConfig<T extends FieldValues> = {
    type: 'select';
    fieldProps?: Omit<CommonSelectProps, 'options' | 'defaultValue'>;
} & BaseFieldConfig<T>;

type MultiSelectFieldConfig<T extends FieldValues> = {
    type: 'multi-select';
    fieldProps?: Omit<CommonMultiSelectProps, 'value' | 'onChange' | 'options'>;
} & BaseFieldConfig<T>;

type TextAreaFieldConfig<T extends FieldValues> = {
    type: 'text-area';
    fieldProps?: Omit<CommonTextareaProps, 'defaultValue'>;
} & BaseFieldConfig<T>;

type DateFieldConfig<T extends FieldValues> = {
    type: 'date';
    fieldProps?: Omit<CommonDatePickerProps, 'defaultValue'>;
} & BaseFieldConfig<T>;

type CheckboxFieldConfig<T extends FieldValues> = {
    type: 'checkbox';
    fieldProps?: Omit<CheckboxProps, 'defaultValue'> & { label?: string };
} & BaseFieldConfig<T>;

interface BaseFieldConfig<T extends FieldValues> {
    name: Path<T>;
    label?: string;
    rules?: Omit<RegisterOptions<T, Path<T>>, 'valueAsNumber' | 'valueAsDate' | 'setValueAs' | 'disabled'>;
    disabled?: boolean;
    options?: CommonSelectOption[];
    placeholder?: string;
    gridCols?: number;
    fullWidth?: boolean;
}

export type FormFieldConfig<T extends FieldValues> =
    | TextFieldConfig<T>
    | TextFieldNumberConfig<T>
    | SelectFieldConfig<T>
    | MultiSelectFieldConfig<T>
    | TextAreaFieldConfig<T>
    | DateFieldConfig<T>
    | CheckboxFieldConfig<T>;

interface FormFieldProps<T extends FieldValues> {
    control: Control<T>;
    field: FormFieldConfig<T>;
    hasHelper?: boolean;
}

export function FormField<T extends FieldValues>({
    control,
    field,
    hasHelper = true
}: FormFieldProps<T>) {
    if (field.type === 'select') {
        return (
            <ValidCommonSelect
                {...field.fieldProps}
                control={control}
                disabled={field.disabled}
                hasHelper={hasHelper}
                name={field.name}
                options={field.options ?? []}
                rules={field.rules}
            />
        );
    }

    if (field.type === 'text-area') {
        return (
            <ValidCommonTextarea
                {...field.fieldProps}
                control={control}
                disabled={field.disabled}
                fullWidth
                hasHelper={hasHelper}
                name={field.name}
                placeholder={field.placeholder}
                rules={field.rules}
            />
        );
    }

    if (field.type === 'date') {
        return (
            <ValidCommonDatePicker
                {...field.fieldProps}
                control={control}
                disabled={field.disabled}
                fullWidth
                hasHelper={hasHelper}
                name={field.name}
                rules={field.rules}
            />
        );
    }

    if (field.type === 'checkbox') {
        return (
            <ValidCommonCheckbox
                {...field.fieldProps}
                control={control}
                disabled={field.disabled}
                hasHelper={hasHelper}
                name={field.name}
                rules={field.rules}
            />
        );
    }

    if (field.type === 'number') {
        return (
            <ValidCommonNumberInput
                {...field.fieldProps}
                control={control}
                disabled={field.disabled}
                fullWidth
                hasHelper={hasHelper}
                name={field.name}
                placeholder={field.placeholder}
                rules={field.rules}
                type="text"
            />
        );
    }

    if (field.type === 'multi-select') {
        return (
            <ValidCommonMultiSelect
                {...field.fieldProps}
                control={control}
                disabled={field.disabled}
                hasHelper={hasHelper}
                name={field.name}
                options={field.options ?? []}
                rules={field.rules}
            />
        );
    }

    const isEmail = field.type === 'email';
    const resolvedRules = isEmail
        ? { ...field.rules, pattern: field.rules?.pattern ?? EMAIL_PATTERN }
        : field.rules;

    return (
        <ValidCommonInput
            {...field.fieldProps}
            control={control}
            disabled={field.disabled}
            fullWidth
            hasHelper={hasHelper}
            name={field.name}
            placeholder={field.placeholder}
            rules={resolvedRules}
            type={isEmail
                ? 'text'
                : field.type}
        />
    );
}