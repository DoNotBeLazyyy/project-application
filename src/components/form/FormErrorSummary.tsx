import { Control, FieldValues } from 'react-hook-form';

export interface FormErrorSummaryProps<T extends FieldValues> {
    control: Control<T>;
    className?: string;
}

/**
 * FormErrorSummary is deprecated and renders null as validation errors
 * are displayed directly on form fields and field labels.
 */
export default function FormErrorSummary<T extends FieldValues>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _props: FormErrorSummaryProps<T>
) {
    return null;
}