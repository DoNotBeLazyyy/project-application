import { WarningCircleIcon } from '@phosphor-icons/react';
import { classMerge } from '@utils/css.util';
import { checkForMessage, formatFieldLabel } from '@utils/form.util';
import { Control, FieldValues, useFormState } from 'react-hook-form';

export interface FormErrorSummaryProps<T extends FieldValues> {
    control: Control<T>;
    className?: string;
}

export default function FormErrorSummary<T extends FieldValues>({
    control,
    className
}: FormErrorSummaryProps<T>) {
    const { errors, submitCount } = useFormState({ control });
    const { count, list } = checkForMessage<T>(errors);

    if (submitCount === 0 || count === 0) {
        return null;
    }

    const headline = count === 1
        ? '1 field needs your attention before saving.'
        : `${count} fields need your attention before saving.`;

    return (
        <div
            className={
                classMerge(
                    'bg-(--mui-palette-error-main)/10 border border-(--mui-palette-error-main) flex flex-col gap-2 p-3 rounded-lg',
                    className
                )
            }
            role="alert"
        >
            <div className="flex gap-2 items-center text-(--mui-palette-error-main)">
                <WarningCircleIcon size={16} weight="fill" />
                <p className="font-semibold text-sm">{headline}</p>
            </div>
            <ul className="flex flex-col gap-0.5 list-disc pl-6">
                {list.map(function(item) {
                    return (
                        <li
                            className="text-(--mui-palette-error-main) text-xs"
                            key={item.key as string}
                        >
                            <span className="font-medium">
                                {formatFieldLabel(item.key as string)}
                            </span>
                            {item.message
                                ? ` — ${item.message}`
                                : ''}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}